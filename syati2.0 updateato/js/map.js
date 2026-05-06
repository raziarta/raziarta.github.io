// ═══════════════════════════════════════════════════════
//  map.js — マップ生成・ブロック・膜・チュートリアル・テープ
// ═══════════════════════════════════════════════════════
'use strict';

function createFloor(w = config.areaSize, d = config.areaSize) {
    const cx = w / 2, cz = d / 2;

    const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.5, d),
        new THREE.MeshStandardMaterial({ color: 0x1a2a3a })
    );
    m.position.set(cx, -0.25, cz);
    m.receiveShadow = true;
    G.scene.add(m);

    const floorBody = G.world.add({ type: 'box', size: [w, 0.5, d], pos: [cx, -0.25, cz], move: false, restitution: 0 });
    addHitboxHelper(floorBody, [w, 0.5, d]);

    if (G.currentMode !== 'tutorial') {
        const g = new THREE.GridHelper(Math.max(w, d), Math.max(w, d), 0x1e3044, 0x1e3044);
        g.position.set(cx, 0.002, cz);
        G.scene.add(g);
    }
}

function createInvisibleWalls(customW = null, customD = null) {
    const thickness = 20;
    const height = 100000;
    const centerY = height / 2 - 100;

    const w = customW !== null ? customW : config.areaSize;
    const d = customD !== null ? customD : config.areaSize;

    const pad = 0;

    const wallConfigs = [
        { pos: [w / 2, centerY, -thickness / 2 - pad], size: [w + pad * 2, height, thickness] },
        { pos: [w / 2, centerY, d + thickness / 2 + pad], size: [w + pad * 2, height, thickness] },
        { pos: [-thickness / 2 - pad, centerY, d / 2], size: [thickness, height, d + pad * 2] },
        { pos: [w + thickness / 2 + pad, centerY, d / 2], size: [thickness, height, d + pad * 2] }
    ];

    wallConfigs.forEach(c => {
        const b = G.world.add({
            type: 'box', size: c.size, pos: c.pos, move: false, friction: 0, restitution: 0, belongsTo: 1
        });
        addHitboxHelper(b, c.size);
        G.walls.push({ body: b });
    });
}

function buildTutorialMap() {
    const positions = [];
    const addBlock = (x, y, z) => positions.push({ x, y, z });

    for (let x = 0; x < 27; x++) {
        for (let z = 0; z < 50; z++) addBlock(x, 0, z);
    }

    for (let x = 0; x <= 3; x++) {
        for (let z = 0; z <= 15; z++) {
            for (let y = 1; y <= 3; y++) addBlock(x, y, z);
        }
    }

    for (let x = 0; x <= 3; x++) {
        for (let z = 16; z <= 18; z++) addBlock(x, 1, z);
    }

    for (let x = 0; x <= 8; x++) {
        for (let z = 15; z < 50; z++) addBlock(x, 0, z);
    }
    for (let x = 8; x <= 26; x++) {
        for (let z = 42; z <= 49; z++) addBlock(x, 0, z);
    }

    const pts = [[15, 18], [15, 21], [15, 24], [15, 27], [15, 30], [15, 33], [15, 36], [15, 39], [15, 41], [20, 18], [20, 21], [20, 24], [20, 27], [20, 30], [20, 33], [20, 36], [20, 39], [20, 41], [11, 27], [12, 27]];
    pts.forEach(p => {
        addBlock(p[0], 0, p[1]);
        addBlock(p[0], 1, p[1]);
    });

    for (let i = 0; i < 8; i++) {
        for (let y = 0; y <= i; y++) {
            addBlock(19 + i, y, 49);
        }
    }

    for (let z = 30; z <= 48; z++) {
        for (let y = 0; y <= 7; y++) addBlock(26, y, z);
    }
    for (let i = 0; i < 9; i++) {
        for (let y = 0; y <= (7 + i); y++) {
            addBlock(26 - i, y, 29);
        }
    }

    if (positions.length > 0) {
        const instMesh = new THREE.InstancedMesh(G.sharedBlockGeo, G.sharedBlockMat, positions.length);
        instMesh.castShadow = true;
        instMesh.receiveShadow = true;
        const dummy = new THREE.Object3D();

        positions.forEach((p, idx) => {
            G.world.add({
                type: 'box', size: [1, 1, 1], pos: [p.x + 0.5, p.y + 0.5, p.z + 0.5], move: false, friction: 0.3, restitution: 0.0, belongsTo: 1, collidesWith: ~0
            });
            dummy.position.set(p.x + 0.5, p.y + 0.5, p.z + 0.5);
            dummy.updateMatrix();
            instMesh.setMatrixAt(idx, dummy.matrix);

            let isTop = false;
            if (p.x === 26 && p.z >= 30 && p.z <= 48 && p.y === 7) isTop = true;
            if (p.z === 29 && p.x >= 18 && p.x <= 26 && p.y === (7 + (26 - p.x))) isTop = true;
            if (p.y === 0) isTop = true;

            if (isTop) {
                G.mapGrid.set(`${p.x},${p.y},${p.z}`, {
                    mesh: { visible: true },
                    position: new THREE.Vector3(p.x + 0.5, p.y + 0.5, p.z + 0.5)
                });
            }
        });

        G.scene.add(instMesh);
    }

    const goalHeight = 17.5;
    const cw = 9;
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(cw, cw),
        new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(18 + cw / 2, goalHeight + 0.001, 29 + cw / 2);
    G.scene.add(mesh);
    G.membranes.push({ mesh, body: null, y: goalHeight, w: cw, passed: false });
}

function createBlockTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#7ba8c9';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#e0f0fa';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 242, 242);

    const length = 32;
    const offset = 28;

    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(offset, offset + length); ctx.lineTo(offset, offset); ctx.lineTo(offset + length, offset);
    ctx.moveTo(256 - offset - length, offset); ctx.lineTo(256 - offset, offset); ctx.lineTo(256 - offset, offset + length);
    ctx.moveTo(256 - offset, 256 - offset - length); ctx.lineTo(256 - offset, 256 - offset); ctx.lineTo(256 - offset - length, 256 - offset);
    ctx.moveTo(offset + length, 256 - offset); ctx.lineTo(offset, 256 - offset); ctx.lineTo(offset, 256 - offset - length);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
}

function createTapeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const tbH = (0.06 / 0.4) * 128;
    const msStart = ((0.06 + 0.015) / 0.4) * 128;
    const msH = (0.25 / 0.4) * 128;

    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 512, tbH);
    ctx.fillRect(0, 128 - tbH, 512, tbH);

    const cycle = 64;
    const stripeWidth = 32;
    for (let x = -128; x < 512; x += cycle) {
        ctx.beginPath();
        ctx.moveTo(x, msStart);
        ctx.lineTo(x + stripeWidth, msStart);
        ctx.lineTo(x + stripeWidth + msH, msStart + msH);
        ctx.lineTo(x + msH, msStart + msH);
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(4, 1);
    return tex;
}

const tapeVertexShader = `
uniform float repeatX;
varying vec2 vUv;
varying vec3 vWorldPosition;
void main() {
    vUv = vec2(uv.x * repeatX, uv.y);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const tapeFragmentShader = `
uniform sampler2D map;
uniform vec3 playerPos;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    vec4 texColor = texture2D(map, vUv);
    
    float dist = distance(vWorldPosition.xz, playerPos.xz);
    
    float radius = 1.5;
    float coreRadius = 0.25;
    float maxOpacity = 0.85;
    
    float alpha = 1.0 - smoothstep(coreRadius, radius, dist);
    
    gl_FragColor = vec4(texColor.rgb, texColor.a * alpha * maxOpacity);
}
`;

function initTapes(w = config.areaSize, d = config.areaSize) {
    const offset = 0.18;

    const tapeWidthW = w + offset * 2;
    const geoW = new THREE.PlaneGeometry(tapeWidthW, 0.4);
    const tapeWidthD = d + offset * 2;
    const geoD = new THREE.PlaneGeometry(tapeWidthD, 0.4);

    const texW = createTapeTexture();
    texW.wrapS = THREE.RepeatWrapping;
    const texD = createTapeTexture();
    texD.wrapS = THREE.RepeatWrapping;

    const configs = [
        { side: 'N', rot: 0, pos: [w / 2, 0, -offset], geo: geoW, tw: tapeWidthW, tex: texW },
        { side: 'S', rot: Math.PI, pos: [w / 2, 0, d + offset], geo: geoW, tw: tapeWidthW, tex: texW },
        { side: 'W', rot: Math.PI / 2, pos: [-offset, 0, d / 2], geo: geoD, tw: tapeWidthD, tex: texD },
        { side: 'E', rot: -Math.PI / 2, pos: [w + offset, 0, d / 2], geo: geoD, tw: tapeWidthD, tex: texD }
    ];

    G.warningTapes.length = 0;

    configs.forEach(c => {
        const mat = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: c.tex },
                repeatX: { value: c.tw },
                playerPos: { value: new THREE.Vector3() }
            },
            vertexShader: tapeVertexShader,
            fragmentShader: tapeFragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(c.geo, mat);
        mesh.rotation.y = c.rot;
        mesh.position.set(c.pos[0], 0, c.pos[2]);
        G.scene.add(mesh);
        G.warningTapes.push({ mesh, mat, side: c.side });
    });
}

function createBlock(gx, gy, gz) {
    if (G.freeInstanceIndices.length === 0) return;

    const wx = gx + 0.5;
    const wy = gy + 0.5;
    const wz = gz + 0.5;

    const instIdx = G.freeInstanceIndices.pop();
    G.dummy.position.set(wx, wy, wz);
    G.dummy.scale.set(1, 1, 1);
    G.dummy.updateMatrix();
    G.mapInstancedMesh.setMatrixAt(instIdx, G.dummy.matrix);
    G.mapInstancedMesh.instanceMatrix.needsUpdate = true;

    const body = G.world.add({ type: 'box', size: [1, 1, 1], pos: [wx, wy, wz], move: false, friction: 0.5, restitution: 0 });
    addHitboxHelper(body, [1, 1, 1]);

    const isOuter = (gx === 0 || gx === config.areaSize - 1 || gz === 0 || gz === config.areaSize - 1);

    G.mapObjects.push({ instIdx, body, gy, isOuter, gx, gz, state: 'normal', lowPolyInstIdx: null });
    G.mapGrid.set(`${gx},${gy},${gz}`, { instIdx, position: new THREE.Vector3(wx, wy, wz) });
}

function createMembrane(worldY, customSize = null) {
    const w = customSize !== null ? customSize : config.areaSize;
    const cy = worldY;
    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, w),
        new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(config.areaSize / 2, cy + 0.001, config.areaSize / 2);

    G.scene.add(mesh);
    G.membranes.push({ mesh, body: null, y: cy, w: w, passed: false });
}

// ── チャンク生成 Worker ──
const workerSrc = `
self.onmessage = function(e) {
    const { base, area, density, len, chunkSeed } = e.data;
    
    let a = chunkSeed;
    function random() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    const blocks   = [];
    const occupied = new Set();
    const key      = (x,y,z) => x+','+y+','+z;

    let cx = Math.floor(area/2), cz = Math.floor(area/2), cy = base;
    const endY = base + len;
    while (cy < endY - 2) {
        const dx = Math.round((random()*2-1)*3);
        const dz = Math.round((random()*2-1)*3);
        const dy = 1 + Math.floor(random() * 3);
        cx = Math.max(0, Math.min(area-1, cx+dx));
        cz = Math.max(0, Math.min(area-1, cz+dz));
        cy = Math.min(endY-1, cy+dy);
        blocks.push({ x:cx, y:cy, z:cz });
        occupied.add(key(cx,cy,cz));
        occupied.add(key(cx,cy+1,cz));
        occupied.add(key(cx,cy+2,cz));
    }

    const target = Math.floor(area * area * len * density);
    let tries = 0;
    while (blocks.length < target && tries++ < target * 8) {
        const rx = Math.floor(random()*area);
        const ry = base + Math.floor(random()*len);
        const rz = Math.floor(random()*area);
                    if (!occupied.has(key(rx,ry,rz))) {
            occupied.add(key(rx,ry,rz));
            blocks.push({ x:rx, y:ry, z:rz });
        }
    }
    self.postMessage({ blocks, base });
};
`;

function initWorker() {
    if (G.worker) G.worker.terminate();
    G.worker = new Worker(URL.createObjectURL(new Blob([workerSrc], { type: 'application/javascript' })));
    G.worker.onmessage = (e) => {
        e.data.blocks.forEach(b => G.pendingBlocks.push(b));

        if (!G.mapInitialized && e.data.base === 0) {
            G.mapInitialized = true;
            const occupiedGrid = new Set();
            e.data.blocks.forEach(b => {
                if (b.y === 0 || b.y === 1) occupiedGrid.add(b.x + "," + b.z);
            });

            let vacantSpots = [];
            for (let gx = 1; gx < config.areaSize - 1; gx++) {
                for (let gz = 1; gz < config.areaSize - 1; gz++) {
                    if (!occupiedGrid.has(gx + "," + gz)) {
                        vacantSpots.push({ x: gx + 0.5, z: gz + 0.5 });
                    }
                }
            }

            let prngState = G.randomSeed * 4294967296;
            function nextRandom() {
                prngState += 0x6D2B79F5;
                let t = Math.imul(prngState ^ (prngState >>> 15), prngState | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
            }

            vacantSpots.sort(() => nextRandom() - 0.5);

            G.entities.forEach((ent, idx) => {
                if (vacantSpots[idx]) {
                    ent.body.resetPosition(vacantSpots[idx].x, 0.25, vacantSpots[idx].z);
                }
            });
        }
    };
}

function generateChunk(startY) {
    if (startY > 0) createMembrane(startY);
    if (startY >= config.goalHeight) return;

    G.worker.postMessage({
        base: startY,
        area: config.areaSize,
        density: config.density,
        len: CHUNK,
        chunkSeed: G.randomSeed + startY
    });
}
