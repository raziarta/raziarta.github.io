// ═══════════════════════════════════════════════════════
//  player.js — プレイヤー生成・入力・コントロール
// ═══════════════════════════════════════════════════════
'use strict';

'use strict';

function addHitboxHelper(body, size, type = 'box') {
    const geo = (type === 'sphere')
        ? new THREE.SphereGeometry(size[0], 12, 12)
        : new THREE.BoxGeometry(size[0], size[1], size[2]);

    const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, depthTest: false, transparent: true, opacity: 0.8 }));
    wire.renderOrder = 999;
    G.scene.add(wire);
    G.hitboxHelpers.push({ mesh: wire, body: body });
    return wire;
}

function createPlayer(entIndex = 0) {
    const spawnX = config.areaSize / 2 + 0.5;
    const spawnY = 0.25;
    const spawnZ = config.areaSize / 2 + 0.5;

    const belongsToLayer = 1 << (entIndex + 1);
    const dedicatedFloorLayer = 1 << (entIndex + 17);
    const collidesWithLayer = 1 | dedicatedFloorLayer | BUBBLE_LAYER | PROJECTILE_LAYER;

    G.playerBody = G.world.add({
        type: 'sphere',
        size: [0.37],
        pos: [spawnX, spawnY, spawnZ],
        move: true,
        belongsTo: belongsToLayer,
        collidesWith: collidesWithLayer,
        density: 1, friction: 0.7, restitution: 0
    });
    G.playerBody.allowSleep = false;

    addHitboxHelper(G.playerBody, [0.37], 'sphere');

    if (G.playerModel) {
        G.playerMesh = G.playerModel.clone();
    } else {
        G.playerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x64b4ff, emissive: 0x224488, metalness: 0.68, roughness: 0.3 })
        );
    }
    G.playerMesh.castShadow = true;

    const xrayMat = new THREE.MeshBasicMaterial({
        color: 0xffaa33,
        transparent: true,
        opacity: 0.5,
        depthFunc: THREE.GreaterDepth,
        depthWrite: false,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.NotEqualStencilFunc
    });

    let xrayMesh;
    if (G.playerModel) {
        xrayMesh = G.playerModel.clone();
        xrayMesh.scale.set(1, 1, 1);
        xrayMesh.traverse((node) => {
            if (node.isMesh) {
                node.material = xrayMat;
            }
        });
    } else {
        xrayMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), xrayMat);
    }
    G.playerMesh.add(xrayMesh);

    G.playerMesh.add(xrayMesh);

    G.scene.add(G.playerMesh);

    G.entities.push({
        name: G.myPlayerName || G.myPeerId || 'GUEST',
        body: G.playerBody,
        mesh: G.playerMesh,
        isAI: false,
        entIndex: entIndex,
        groundContactFrames: 0,
        currentMembraneY: -Infinity,
        dedicatedMembraneFloor: null
    });
}

function handleJump(isSpacePressed) {
    const vel = G.playerBody.linearVelocity;

    if (isSpacePressed && !G.lastSpaceState) {
        if (G.isGrounded || G.jumpCount < G.maxJumps) {
            const force = G.isGrounded ? config.jumpVelocity : config.jumpVelocity * config.jumpMultiplier;
            vel.y = force;
            G.jumpCount++;
            G.isGrounded = false;
            G.isJumping = true;
            G.jumpTimer = 0;
            G.minJumpInterval = 0;
        }
    }

    if (isSpacePressed && G.isJumping && vel.y > 0) {
        if (G.jumpTimer < config.maxHoldTime) {
            vel.y += config.holdBoost;
            G.jumpTimer++;
        }
    } else {
        G.isJumping = false;
    }

    G.lastSpaceState = isSpacePressed;
}

function setupControls() {
    G.controls = new THREE.PointerLockControls(G.camera, document.body);

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') G.keys.w = false;
        if (e.code === 'KeyA') G.keys.a = false;
        if (e.code === 'KeyS') G.keys.s = false;
        if (e.code === 'KeyD') G.keys.d = false;
        if (e.code === 'Space') G.keys.space = false;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') G.keys.shift = false;
    });
    window.addEventListener('mousedown', (e) => {
        if (e.button === 0 && G.controls.isLocked) G.keys.space = true;
        if (e.button === 2 && G.controls.isLocked) {
            G.keys.rightClick = true;
            if (!document.getElementById('reward-screen').classList.contains('hidden')) return;

            if (config.projectileRequiresScope && !G.isScopedIn) {
                G.isScopedIn = true;
                G.camera.fov = 30;
                G.camera.updateProjectionMatrix();
                const overlay = document.getElementById('scope-overlay');
                if (overlay) overlay.style.display = 'block';
                return; // スコープインするだけで発射しない
            }

            const now = Date.now();
            const projCooldown = 500 / (config.projectileRecoveryRate || 1);
            if (now - G.lastFireTimeProjectile >= projCooldown && G.playerProjectileStock >= 1.0) {
                G.lastFireTimeProjectile = now;
                G.playerProjectileStock -= 1.0;
                updateAmmoHUD();
                requestFire(0);
            }
        }
    });
    window.addEventListener('mouseup', (e) => {
        if (e.button === 0) G.keys.space = false;
        if (e.button === 2) G.keys.rightClick = false;
    });
    window.addEventListener('contextmenu', (e) => {
        if (G.controls.isLocked) e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
        if (!G.isStarted) return;
        if (e.code === 'KeyW') G.keys.w = true;
        if (e.code === 'KeyA') G.keys.a = true;
        if (e.code === 'KeyS') G.keys.s = true;
        if (e.code === 'KeyD') G.keys.d = true;
        if (e.code === 'Space') { e.preventDefault(); G.keys.space = true; }
        
        if (G.controls.isLocked) {
            if (e.key === 'b' || e.key === 'B' || e.key === 'q' || e.key === 'Q') {
                if (!document.getElementById('reward-screen').classList.contains('hidden')) return;
                const now = Date.now();
                const bubbleCooldown = 500 / (config.bubbleRecoveryRate || 1);
                if (now - G.lastFireTimeBubble >= bubbleCooldown && G.playerBubbleStock >= 1.0) {
                    G.lastFireTimeBubble = now;
                    G.playerBubbleStock -= 1.0;
                    updateAmmoHUD();
                    requestFire(1);
                }
            }
        }
    });

    window.addEventListener('wheel', (e) => {
        if (G.controls.isLocked) {
            // スコープモード用に追加で 0.0 までスクロール可能にする
            G.camDist = Math.max(0.0, Math.min(5.0, G.camDist + e.deltaY * 0.005));
        }
    }, { passive: true });

    window.addEventListener('resize', () => {
        G.camera.aspect = window.innerWidth / window.innerHeight;
        G.camera.updateProjectionMatrix();
        if (G.renderer) G.renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
