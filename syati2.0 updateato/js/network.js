// ═══════════════════════════════════════════════════════
//  network.js — マルチプレイ (PeerJS)
// ═══════════════════════════════════════════════════════
'use strict';

function packData(eventId, data) {
    if (eventId === 1) {
        return [1, data.id, Math.round(data.x * 100) / 100, Math.round(data.y * 100) / 100, Math.round(data.z * 100) / 100, data.jumps];
    }
    if (eventId === 0) {
        return { event: 0, seed: data.seed, hostId: data.hostId, hostName: data.name };
    }
    if (eventId === 5) {
        return { event: 5, id: data.id, name: data.name };
    }
    if (eventId === 6) {
        return { event: 6, seed: data.seed, mode: data.mode, areaSize: data.areaSize, density: data.density, goalHeight: data.goalHeight, maxLives: data.maxLives, aiCount: data.aiCount };
    }
    if (eventId === 10) {
        // type=0: 弾丸 [radiusMult, passWall, bounces, rangeMult, damage, isNeedle, speed]
        // type=1: シャボン [damage]
        const p = data.props;
        let packedProps = null;
        if (p) packedProps = data.type === 1 ? [p.damage] : [p.radiusMult, p.passWall?1:0, p.bounces, p.rangeMult, p.damage, p.isNeedle?1:0, p.speed];
        return [10, data.type, 
            Math.round(data.x*100)/100, Math.round(data.y*100)/100, Math.round(data.z*100)/100, 
            Math.round(data.vx*100)/100, Math.round(data.vy*100)/100, Math.round(data.vz*100)/100, 
            packedProps];
    }
    if (eventId === 11) {
        // [11, netId, type, x, y, z, vx, vy, vz, [props], ownerName]
        const p = data.props;
        let packedProps = null;
        if (p) packedProps = data.type === 1 ? [p.damage] : [p.radiusMult, p.passWall?1:0, p.bounces, p.rangeMult, p.damage, p.isNeedle?1:0, p.speed];
        return [11, data.netId, data.type, 
            Math.round(data.x*100)/100, Math.round(data.y*100)/100, Math.round(data.z*100)/100, 
            Math.round(data.vx*100)/100, Math.round(data.vy*100)/100, Math.round(data.vz*100)/100, 
            packedProps, data.ownerName || null];
    }
    if (eventId === 12) {
        // [12, [id, x, y, z, ...]]
        return [12, data.list];
    }
    if (eventId === 13) {
        return [13, data.netId, data.type, Math.round(data.x*100)/100, Math.round(data.y*100)/100, Math.round(data.z*100)/100];
    }
}

function unpackData(arr) {
    if (arr.event === 0 || arr.event === 5 || arr.event === 6) return arr;
    if (Array.isArray(arr)) {
        const ev = arr[0];
        if (ev === 1) return { event: 1, id: arr[1], x: arr[2], y: arr[3], z: arr[4], jumps: arr[5] };
        if (ev === 10) {
            const pp = arr[8], type = arr[1];
            const props = pp ? (type === 1 ? { damage: pp[0] } : { radiusMult: pp[0], passWall: !!pp[1], bounces: pp[2], rangeMult: pp[3], damage: pp[4], isNeedle: !!pp[5], speed: pp[6] }) : null;
            return { event: 10, type, x: arr[2], y: arr[3], z: arr[4], vx: arr[5], vy: arr[6], vz: arr[7], props };
        }
        if (ev === 11) {
            const pp = arr[9], type = arr[2];
            const props = pp ? (type === 1 ? { damage: pp[0] } : { radiusMult: pp[0], passWall: !!pp[1], bounces: pp[2], rangeMult: pp[3], damage: pp[4], isNeedle: !!pp[5], speed: pp[6] }) : null;
            return { event: 11, netId: arr[1], type, x: arr[3], y: arr[4], z: arr[5], vx: arr[6], vy: arr[7], vz: arr[8], props, ownerName: arr[10] || null };
        }
        if (ev === 12) return { event: 12, list: arr[1] };
        if (ev === 13) return { event: 13, netId: arr[1], type: arr[2], x: arr[3], y: arr[4], z: arr[5] };
    }
    return arr;
}

function broadcastEvent(eventId, rawData) {
    if (!G.isOnline) return;
    const packed = packData(eventId, rawData);
    if (G.isHost) {
        G.connections.forEach(c => {
            if (c.open) c.send(packed);
        });
    } else if (G.hostConn && G.hostConn.open) {
        G.hostConn.send(packed);
    }
}

function setupHost() {
    logStatus("Creating room...");
    let attempt = 1;
    function tryBind() {
        if (attempt > 10) {
            logStatus("Failed to create room. (Servers full)");
            return;
        }
        const tryId = ROOM_PREFIX + attempt;
        console.log(`[Multiplayer] Attempting to host room: ${tryId}`);
        G.peer = new Peer(tryId, { debug: 3, secure: true });

        G.peer.on('open', (id) => {
            console.log(`[Multiplayer] Successfully opened peer with ID: ${id}`);
            logStatus(`Room Hosted! (Room ID: ${attempt})`);
            G.myPeerId = id;
            G.isHost = true;
            G.isOnline = true;
            G.randomSeed = Math.random();
        });

        G.peer.on('error', (err) => {
            console.error(`[Multiplayer] PeerJS Host Error: ${err.type}`, err);
            if (err.type === 'unavailable-id') {
                console.warn(`[Multiplayer] ID ${tryId} is already taken, trying next...`);
                attempt++;
                G.peer.destroy();
                tryBind();
            } else {
                logStatus("PeerJS Error: " + err.type);
            }
        });

        G.peer.on('disconnected', () => {
            console.warn("[Multiplayer] Peer disconnected from server. Attempting to reconnect...");
            G.peer.reconnect();
        });

        G.peer.on('close', () => {
            console.error("[Multiplayer] Peer connection closed.");
            G.isOnline = false;
        });

        G.peer.on('connection', (conn) => {
            console.log("[Multiplayer] New client connection request from:", conn.peer);
            G.connections.push(conn);
            conn.on('open', () => {
                conn.send(packData(0, { seed: G.randomSeed, hostId: G.myPeerId, name: G.myPlayerName }));
            });
            conn.on('data', (data) => {
                handleNetworkData(data, conn);
            });
            conn.on('close', () => {
                logStatus('プレイヤーが離脱しました: ' + conn.peer);
                const ent = G.networkEntities.get(conn.peer);
                if (ent) {
                    G.scene.remove(ent.mesh);
                    if (G.isHost && ent.body) G.world.removeRigidBody(ent.body);
                    G.networkEntities.delete(conn.peer);
                }
                G.connections = G.connections.filter(c => c !== conn);
            });
        });
    }
    tryBind();
}

function setupClient() {
    console.log("[Multiplayer] Initializing Peer for Client...");
    G.peer = new Peer({ debug: 3, secure: true });

    G.peer.on('open', (id) => {
        console.log(`[Multiplayer] Client Peer opened with ID: ${id}`);
        G.myPeerId = id;
        let attempt = 1;

        function tryConnect() {
            if (attempt > 10) {
                console.error("[Multiplayer] Could not find any hosted rooms after 10 attempts.");
                logStatus("No hosted rooms found.");
                G.peer.destroy();
                return;
            }
            const tryId = ROOM_PREFIX + attempt;
            console.log(`[Multiplayer] Trying to connect to Room ID: ${tryId}...`);
            logStatus(`Searching room ${attempt}...`);
            const conn = G.peer.connect(tryId, { reliable: true });

            conn.on('open', () => {
                console.log(`[Multiplayer] Connected to host: ${conn.peer}`);
                G.hostConn = conn;
                G.isOnline = true;
                logStatus("Connected to Room " + attempt + "!");

                conn.on('data', (data) => {
                    handleNetworkData(data, conn);
                });
            });

            conn.on('error', (err) => {
                console.error(`[Multiplayer] Connection error for ${tryId}:`, err);
            });

            conn.on('close', () => {
                console.warn(`[Multiplayer] Connection to host ${conn.peer} closed.`);
                G.isOnline = false;
                logStatus("Connection closed.");
            });
        }

        G.peer.on('error', (err) => {
            console.error(`[Multiplayer] PeerJS Client Error: ${err.type}`, err);
            if (err.type === 'peer-unavailable') {
                console.warn(`[Multiplayer] Room ${attempt} not found, checking next...`);
                attempt++;
                tryConnect();
            } else {
                logStatus("PeerJS Error: " + err.type);
            }
        });

        G.peer.on('disconnected', () => {
            console.warn("[Multiplayer] Client Peer disconnected. Reconnecting...");
            G.peer.reconnect();
        });

        tryConnect();
    });
}

function handleNetworkData(rawData, sourceConn) {
    const data = unpackData(rawData);
    if (!data) return;

    if (data.event === 0) {
        if (!G.isHost) {
            G.randomSeed = data.seed;
            console.log("Received Seed:", G.randomSeed);
            G.peerNames.set(data.hostId, data.hostName);
            broadcastEvent(5, { id: G.myPeerId, name: G.myPlayerName });
        }
    } else if (data.event === 1) {
        updateNetworkEntity(data, sourceConn);
    } else if (data.event === 5) {
        G.peerNames.set(data.id, data.name);
        if (G.networkEntities.has(data.id)) {
            const ent = G.networkEntities.get(data.id);
            if (ent.sprite) ent.mesh.remove(ent.sprite);
            ent.sprite = createNameSprite(data.name);
            ent.mesh.add(ent.sprite);
        }
        if (G.isHost) {
            broadcastEvent(5, data);

            G.projectiles.forEach(p => {
                if (p.netId != null) broadcastEvent(11, { netId: p.netId, type: 0, x: p.position.x, y: p.position.y, z: p.position.z, vx: p.velocity.x, vy: p.velocity.y, vz: p.velocity.z, props: p.props, ownerName: resolveName(p.ownerBody) });
            });
            G.bubbles.forEach(b => {
                if (b.netId != null && b.body) broadcastEvent(11, { netId: b.netId, type: 1, x: b.body.position.x, y: b.body.position.y, z: b.body.position.z, vx: b.body.linearVelocity.x, vy: b.body.linearVelocity.y, vz: b.body.linearVelocity.z, props: b.props, ownerName: b.ownerId });
            });
        }
    } else if (data.event === 6) {
        if (!G.isHost && !G.isStarted) {
            const incomingAiCount = parseInt(data.aiCount);
            config.aiCount = (incomingAiCount > 0) ? incomingAiCount : false;
            if (data.seed !== undefined) G.randomSeed = data.seed;
            if (data.areaSize !== undefined) config.areaSize = data.areaSize;
            if (data.density !== undefined) config.density = data.density;
            if (data.goalHeight !== undefined) config.goalHeight = data.goalHeight;
            if (data.maxLives !== undefined) config.maxLives = data.maxLives;

            G.isStarted = true;
            G.currentMode = data.mode || 'main';
            G.playerLives = config.maxLives;
            updateLifeHUD();
            if (G.currentMode === 'tutorial') {
                document.getElementById('tutorial-ui').classList.remove('hidden');
            } else {
                document.getElementById('tutorial-ui').classList.add('hidden');
            }
            document.getElementById('multiplayer-ui').classList.add('hidden');
            document.getElementById('start-screen').style.display = 'none';
            init();
            G.startTime = Date.now();
            logStatus('ゲーム開始！画面をクリックして操作を開始してください');
            if (G.controls) {
                try { G.controls.lock(); } catch (e) { }
            }
        }
    } else if (data.event === 10) {
        if (G.isHost) {
            let reqOwnerBody = null;
            const reqOwnerPeerId = sourceConn ? sourceConn.peer : null;
            if (sourceConn) {
                const ent = G.networkEntities.get(sourceConn.peer);
                if (ent) reqOwnerBody = ent.body;
            }
            if (data.type === 0) fireProjectile(data.x, data.y, data.z, data.vx, data.vy, data.vz, reqOwnerBody, null, data.props);
            else createBubble(data.x, data.y, data.z, data.vx, data.vy, data.vz, reqOwnerBody, null, null, data.props);
        }
    } else if (data.event === 11) {
        if (!G.isHost) {
            // 自分が発射したものはローカル生成済みのためスキップ
            const myId = G.myPeerId ? String(G.myPeerId).trim() : "";
            const ownId = data.ownerName ? String(data.ownerName).trim() : "";
            if (myId && ownId === myId) return;

            if (data.type === 0) {
                fireProjectile(data.x, data.y, data.z, data.vx, data.vy, data.vz, resolveBody(data.ownerName), data.netId, data.props);
            } else {
                createBubble(data.x, data.y, data.z, data.vx, data.vy, data.vz, resolveBody(data.ownerName), data.netId, data.ownerName, data.props);
            }
        }
    } else if (data.event === 12) {
        if (!G.isHost) {
            const list = data.list;
            if (!list) return;
            for (let i = 0; i < list.length; i += 4) {
                const id = list[i];
                const x = list[i+1];
                const y = list[i+2];
                const z = list[i+3];
                
                const proj = G.projectiles.find(p => p.netId === id);
                if (proj) {
                    proj.position.set(x, y, z);
                    proj.mesh.position.copy(proj.position);
                } else {
                    const bub = G.bubbles.find(b => b.netId === id);
                    if (bub) {
                        if (bub.body) {
                            bub.body.resetPosition(x, y, z);
                        }
                        bub.mesh.position.set(x, y, z);
                    }
                }
            }
        }
    } else if (data.event === 13) {
        if (!G.isHost) {
            if (data.type === 0) {
                // 弾丸: projectiles配列から正しく削除しプールに戻す
                const idx = G.projectiles.findIndex(p => p.netId === data.netId);
                if (idx !== -1) {
                    const p = G.projectiles[idx];
                    createExplosion(data.x, data.y, data.z);
                    p.mesh.visible = false;
                    G.projectilePool.push(p.mesh);
                    if (p.netId != null) G.netObjects.delete(p.netId);
                    G.projectiles.splice(idx, 1);
                }
            } else {
                // シャボン: bubbles配列から正しく削除しプールに戻す
                const idx = G.bubbles.findIndex(b => b.netId === data.netId);
                if (idx !== -1) {
                    const b = G.bubbles[idx];
                    createExplosion(data.x, data.y, data.z);
                    b.mesh.visible = false;
                    G.bubblePool.push(b.mesh);
                    if (b.netId != null) G.netObjects.delete(b.netId);
                    if (b.body) G.world.removeRigidBody(b.body);
                    b.body = null;
                    b.mesh = null;
                    G.bubbles.splice(idx, 1);
                }
            }
        }
    }
}

function updateNetworkEntity(data, conn = null) {
    if (data.id === G.myPeerId) return;

    if (G.isHost && conn) {
        const rawData = packData(1, data);
        G.connections.forEach(c => {
            if (c !== conn && c.open) c.send(rawData);
        });
    }

    if (!G.networkEntities.has(data.id)) {
        const ent = createNetworkPlayer(data.id);
        G.networkEntities.set(data.id, ent);
    }

    const ent = G.networkEntities.get(data.id);
    if (!ent) return;

    ent.targetNetPos = new THREE.Vector3(data.x, data.y, data.z);
    ent.jumpCount = data.jumps;

    if (G.isHost && ent.body && G.world) {
        ent.body.position.set(data.x, data.y, data.z);
        ent.body.linearVelocity.set(0, 0, 0);
    }
}

function createNetworkPlayer(id) {
    const isAINet = id.startsWith("AI_");
    let mesh;

    if (G.playerModel) {
        mesh = G.playerModel.clone();
        if (isAINet) {
            mesh.traverse(n => {
                if (n.isMesh) {
                    n.material = n.material.clone();
                    n.material.color.set(0x90ee90);
                    n.material.emissive.set(0x225522);
                }
            });
        }
    } else {
        const matColor = isAINet ? 0x90ee90 : 0x4488ff;
        mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 0.5),
            new THREE.MeshStandardMaterial({ color: matColor })
        );
    }

    const container = new THREE.Group();
    container.add(mesh);

    const pName = G.peerNames.get(id) || (isAINet ? "RIVAL AI" : "Player");
    const sprite = createNameSprite(pName);
    container.add(sprite);
    G.scene.add(container);

    let body = null;
    if (G.isHost && G.world) {
        body = G.world.add({
            type: 'sphere',
            size: [0.37],
            pos: [0, -100, 0],
            move: true,
            belongsTo: 1 << 1,
            collidesWith: 1 | BUBBLE_LAYER | PROJECTILE_LAYER,
            density: 1, friction: 0.2, restitution: 0.1
        });
    }

    // entIndexを割り当て（シャボン玉の所有者レイヤー除外に必要）
    if (!G._netEntIndexCounter) G._netEntIndexCounter = 16;
    const entIndex = G._netEntIndexCounter++;

    return { id: id, mesh: container, body: body, targetNetPos: container.position.clone(), sprite: sprite, name: pName, rawMesh: mesh, entIndex: entIndex };
}
