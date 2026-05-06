// ═══════════════════════════════════════════════════════
//  combat.js — 射撃・シャボン玉・爆発・ダメージ判定
// ═══════════════════════════════════════════════════════
'use strict';

function requestFire(type) {
    if (!G.isStarted || G.isDead) return;

    const startPos = G.playerBody.position.clone();
    const camDir = new THREE.Vector3();
    G.camera.getWorldDirection(camDir);
    const dir = camDir.normalize();

    if (type === 0) {
        const spawnX = startPos.x + dir.x * 0.6;
        const spawnY = startPos.y + 0.75;
        const spawnZ = startPos.z + dir.z * 0.6;
        const speed = config.projectileSpeed;

        const props = {
            radiusMult: config.projectileRadiusMult || 1.0,
            passWall: config.projectilePassWall || false,
            bounces: config.projectileBounces || 0,
            rangeMult: config.projectileRangeMult || 1.0,
            damage: config.damageProjectile || 1,
            isNeedle: config.projectileIsNeedle || false,
            speed: config.projectileSpeed || 20.0
        };

        const ownerName = resolveName(G.playerBody);
        
        const fire = (dx, dy, dz) => {
            const vx = dx * speed;
            const vy = dy * speed;
            const vz = dz * speed;
            if (G.isHost || !G.isOnline) {
                fireProjectile(spawnX, spawnY, spawnZ, vx, vy, vz, G.playerBody, null, props);
            } else {
                broadcastEvent(10, { type: 0, x: spawnX, y: spawnY, z: spawnZ, vx, vy, vz, ownerName, props });
            }
        };

        const split = config.projectileSplit || 1;
        if (split === 1) {
            fire(dir.x, dir.y, dir.z);
        } else if (split === 2) {
            const axis = new THREE.Vector3(0, 1, 0);
            const d1 = dir.clone().applyAxisAngle(axis, Math.PI / 12);
            const d2 = dir.clone().applyAxisAngle(axis, -Math.PI / 12);
            fire(d1.x, d1.y, d1.z);
            fire(d2.x, d2.y, d2.z);
        } else if (split === 3) {
            const axis = new THREE.Vector3(0, 1, 0);
            const d1 = dir.clone().applyAxisAngle(axis, Math.PI / 12);
            const d2 = dir.clone().applyAxisAngle(axis, -Math.PI / 12);
            fire(dir.x, dir.y, dir.z);
            fire(d1.x, d1.y, d1.z);
            fire(d2.x, d2.y, d2.z);
        } else if (split === 12) {
            const axis = new THREE.Vector3(0, 1, 0);
            // Also spread them slightly upwards/downwards if we wanted, but horizontal is fine
            for (let i = 0; i < 12; i++) {
                const d = dir.clone().applyAxisAngle(axis, (Math.PI * 2 / 12) * i);
                fire(d.x, d.y, d.z);
            }
        }
    } else {
        const bx = startPos.x;
        const by = startPos.y + 1.5;
        const bz = startPos.z;

        const vx = 0;
        const vy = config.bubbleSpeedY;
        const vz = 0;

        const props = {
            damage: config.damageBubble || 1
        };

        const ownerName = resolveName(G.playerBody);
        
        const fireB = (ox, oz) => {
            if (G.isHost || !G.isOnline) {
                createBubble(bx + ox, by, bz + oz, vx, vy, vz, G.playerBody, null, null, props);
            } else {
                broadcastEvent(10, { type: 1, x: bx + ox, y: by, z: bz + oz, vx, vy, vz, ownerName, props });
            }
        };

        const bSplit = config.bubbleSplit || 1;
        if (bSplit === 1) {
            fireB(0, 0);
        } else if (bSplit === 2) {
            const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
            fireB(right.x * 0.8, right.z * 0.8);
            fireB(-right.x * 0.8, -right.z * 0.8);
        }
    }
}

function fireProjectile(startX, startY, startZ, velX, velY, velZ, owner = null, remoteNetId = null, props = null) {
    const netId = G.isHost ? "proj-" + (G.netIdCounter++) : remoteNetId;
    const pProps = props || {
        radiusMult: config.projectileRadiusMult || 1.0,
        passWall: config.projectilePassWall || false,
        bounces: config.projectileBounces || 0,
        rangeMult: config.projectileRangeMult || 1.0,
        damage: config.damageProjectile || 1
    };
    
    const p = {
        mesh: spawnProjectileMesh(netId, startX, startY, startZ, pProps.radiusMult, pProps.isNeedle),
        position: new THREE.Vector3(startX, startY, startZ),
        velocity: new THREE.Vector3(velX, velY, velZ),
        spawnTime: Date.now(),
        ownerBody: owner,
        netId: netId,
        _hitFlag: false,
        _hitBody: null,
        props: pProps
    };
    p.mesh.position.set(startX, startY, startZ);
    if (velX !== 0 || velY !== 0 || velZ !== 0) {
        p.mesh.lookAt(startX + velX, startY + velY, startZ + velZ);
    }
    G.projectiles.push(p);

    if (G.isHost) {
        const ownerName = resolveName(owner);
        broadcastEvent(11, { netId, type: 0, x: startX, y: startY, z: startZ, vx: velX, vy: velY, vz: velZ, ownerName, props: pProps });
    }
}

function resolveName(body) {
    if (body === G.playerBody) return G.myPeerId;
    const ent = G.entities.find(e => e.body === body);
    if (ent) return ent.name;
    for (const [id, netEnt] of G.networkEntities) {
        if (netEnt.body === body) return id;
    }
    return null;
}

function resolveBody(name) {
    if (!name) return null;
    const strName = String(name).trim();
    const myIdStr = G.myPeerId ? String(G.myPeerId).trim() : "";
    if (strName === "PLAYER" || (myIdStr && strName === myIdStr)) return G.playerBody;
    const ent = G.entities.find(e => e.name === strName);
    if (ent) return ent.body;
    const netEnt = G.networkEntities.get(strName);
    return netEnt ? netEnt.body : null;
}

function createBubble(startX, startY, startZ, velX, velY, velZ, owner = null, remoteNetId = null, ownerNameFromEvent = null, props = null) {
    const netId = G.isHost ? "bub-" + (G.netIdCounter++) : remoteNetId;
    const mesh = spawnBubbleMesh(netId, startX, startY, startZ);
    const pProps = props || {
        damage: config.damageBubble || 1
    };

    let ownerLayer = 0;
    const ownerEnt = G.entities.find(e => e.body === owner);
    if (ownerEnt) {
        ownerLayer = (1 << (ownerEnt.entIndex + 1));
    } else {
        for (const [id, netEnt] of G.networkEntities) {
            if (netEnt.body === owner) {
                ownerLayer = (1 << (netEnt.entIndex + 1));
                break;
            }
        }
    }

    const body = G.world.add({
        type: 'sphere', size: [2], pos: [startX, startY, startZ], move: true,
        belongsTo: BUBBLE_LAYER,
        collidesWith: 0x1FFFE ^ ownerLayer,
        density: 0.1, friction: 0.1, restitution: 0.5
    });
    body.linearVelocity.set(velX, velY, velZ);

    const finalOwnerId = ownerNameFromEvent || resolveName(owner);
    G.bubbles.push({
        body,
        mesh,
        spawnY: startY,
        netId,
        ownerBody: owner,
        ownerId: finalOwnerId,
        spawnTime: Date.now(),
        props: pProps
    });

    if (G.isHost) {
        const ownerName = finalOwnerId;
        broadcastEvent(11, { netId, type: 1, x: startX, y: startY, z: startZ, vx: velX, vy: velY, vz: velZ, ownerName, props: pProps });
    }
}

function spawnProjectileMesh(netId, x, y, z, radiusMult = 1.0, isNeedle = false) {
    let mesh;
    if (G.projectilePool.length > 0) {
        mesh = G.projectilePool.pop();
        mesh.visible = true;
    } else {
        mesh = new THREE.Mesh(G.sharedProjectileGeo, G.sharedProjectileMat);
        mesh.castShadow = true;
        G.scene.add(mesh);
    }
    mesh.geometry = isNeedle ? G.sharedNeedleGeo : G.sharedProjectileGeo;
    mesh.position.set(x, y, z);
    mesh.scale.set(radiusMult, radiusMult, radiusMult);
    if (netId) G.netObjects.set(netId, mesh);
    return mesh;
}

function spawnBubbleMesh(netId, x, y, z) {
    let mesh;
    if (G.bubblePool.length > 0) {
        mesh = G.bubblePool.pop();
        mesh.visible = true;
    } else {
        if (G.bubbleModel) {
            mesh = G.bubbleModel.clone();
            mesh.scale.set(2, 2, 2)
        } else {
            const mat = new THREE.MeshPhysicalMaterial({
                color: 0xffffff, transparent: true, opacity: 0.3,
                metalness: 0, roughness: 0, transmission: 0.9, thickness: 0.5, ior: 1.1, side: THREE.DoubleSide
            });
            mesh = new THREE.Mesh(G.sharedBubbleGeo, mat);
        }

        const xrayMat = new THREE.MeshBasicMaterial({
            color: 0xffaa33, transparent: true, opacity: 0.5,
            depthFunc: THREE.GreaterDepth, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc
        });
        const xray = new THREE.Mesh(G.sharedBubbleGeo, xrayMat);
        const s = 1 / mesh.scale.x;
        xray.scale.set(s, s, s);

        mesh.add(xray);
        G.scene.add(mesh);
    }
    mesh.position.set(x, y, z);
    if (netId) G.netObjects.set(netId, mesh);
    return mesh;
}

function getCameraTargetPoint(maxDist = 100) {
    const raycaster = new THREE.Raycaster();
    const ndcX = -20 / window.innerWidth;
    const ndcY = 0;
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, G.camera);

    const targetObjects = [];
    G.scene.traverse(obj => {
        if (obj.isMesh && obj !== G.playerMesh && !obj.name.startsWith("XRAY")) {
            let isOwnXray = false;
            G.playerMesh.traverse(child => { if (child === obj) isOwnXray = true; });
            if (!isOwnXray) targetObjects.push(obj);
        }
    });

    const intersects = raycaster.intersectObjects(targetObjects, true);
    if (intersects.length > 0) return intersects[0].point;
    return new THREE.Vector3().copy(G.camera.position).addScaledVector(raycaster.ray.direction, maxDist);
}

function createExplosion(x, y, z) {
    let mesh;
    if (G.explosionPool.length > 0) {
        mesh = G.explosionPool.pop();
        mesh.visible = true;
    } else {
        const mat = G.sharedExplosionMat.clone();
        mesh = new THREE.Mesh(G.sharedExplosionGeo, mat);
        G.scene.add(mesh);
    }
    mesh.position.set(x, y, z);
    G.explosions.push({ mesh, scale: 1, life: 1.0, driftY: -0.1 });
}

function updateSoapBubbles() {
    for (let i = G.bubbles.length - 1; i >= 0; i--) {
        const b = G.bubbles[i];
        const pos = b.body.position;
        b.mesh.position.set(pos.x, pos.y, pos.z);

        const exploded = b._hitFlag || false;

        if (exploded || pos.y - b.spawnY > 100) {
            if (exploded && b._hitBody && (G.isHost || !G.isOnline)) {
                const dx = b._hitBody.position.x - pos.x;
                const dy = b._hitBody.position.y - pos.y;
                const dz = b._hitBody.position.z - pos.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
                b._hitBody.linearVelocity.x += (dx / dist) * 22;
                b._hitBody.linearVelocity.y -= 20;
                b._hitBody.linearVelocity.z += (dz / dist) * 22;
            }
            if (exploded) {
                createExplosion(pos.x, pos.y, pos.z);
            }
            if (G.isHost && b.netId) {
                broadcastEvent(13, { netId: b.netId, type: 1, x: pos.x, y: pos.y, z: pos.z });
            }
            b.mesh.visible = false;
            G.bubblePool.push(b.mesh);
            if (b.netId) G.netObjects.delete(b.netId);
            G.world.removeRigidBody(b.body);

            b.body = null;
            b.mesh = null;
            G.bubbles.splice(i, 1);
        }
    }

    for (let i = G.explosions.length - 1; i >= 0; i--) {
        const exp = G.explosions[i];
        exp.scale += 1.8;
        exp.life -= 0.05;
        exp.mesh.scale.set(exp.scale, exp.scale * 0.8, exp.scale);
        if (exp.driftY) exp.mesh.position.y += exp.driftY;
        exp.mesh.material.opacity = exp.life;
        if (exp.life <= 0) {
            exp.mesh.visible = false;
            G.explosionPool.push(exp.mesh);
            G.explosions.splice(i, 1);
        }
    }
}
