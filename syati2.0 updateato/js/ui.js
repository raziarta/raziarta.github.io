// ═══════════════════════════════════════════════════════
//  ui.js — UI更新・HUD・名前スプライト・デバッグGUI
// ═══════════════════════════════════════════════════════
'use strict';

function updateLifeHUD() {
    const lifeEl = document.getElementById('life-display');
    if (!lifeEl) return;
    if (G.playerLives <= 0) {
        lifeEl.textContent = '💀';
    } else {
        lifeEl.textContent = '♥'.repeat(Math.max(0, G.playerLives));
    }
    updateAmmoHUD();
}

function updateAmmoHUD() {
    const pGroup = document.getElementById('gauge-shot-group');
    if (pGroup) {
        const maxP = Math.floor(config.maxProjectileStock || 3);
        while (pGroup.children.length < maxP) {
            const idx = pGroup.children.length;
            const seg = document.createElement('div');
            seg.className = 'ammo-segment';
            seg.innerHTML = `<div id="shot-seg-${idx}" class="ammo-segment-inner shot-inner"></div>`;
            pGroup.appendChild(seg);
        }
        for (let i = 0; i < pGroup.children.length; i++) {
            const seg = document.getElementById(`shot-seg-${i}`);
            if (seg) {
                if (i >= maxP) {
                    seg.parentElement.style.display = 'none';
                } else {
                    seg.parentElement.style.display = '';
                    const fill = Math.min(1.0, Math.max(0, G.playerProjectileStock - i));
                    seg.style.width = (fill * 100) + '%';
                }
            }
        }
    }
    const bSeg = document.getElementById('bubble-seg');
    if (bSeg) bSeg.style.width = (G.playerBubbleStock * 100) + '%';
}

function createNameSprite(nameText) {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 54px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(nameText, 1024, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;

    const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(45.0, 5.625, 1);
    sprite.position.y = 6.0;
    sprite.renderOrder = 999;
    return sprite;
}

function logStatus(msg) {
    document.getElementById('mp-status').innerText = msg;
}

function takeDamage(amount) {
    if (G.isDead) return;
    G.playerLives -= amount;
    updateLifeHUD();

    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.inset = '0';
    flash.style.backgroundColor = 'rgba(255,0,0,0.4)';
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '9999';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 100);

    if (G.playerLives <= 0) {
        startDeathSequence();
    }
}

function startDeathSequence() {
    G.isDead = true;
    G.deathTimer = 3.0;
    G.playerLives = 0;
    updateLifeHUD();

    if (!G.deathTextEl) {
        G.deathTextEl = document.createElement('div');
        G.deathTextEl.style.position = 'absolute';
        G.deathTextEl.style.top = '50%';
        G.deathTextEl.style.left = '50%';
        G.deathTextEl.style.transform = 'translate(-50%, -50%)';
        G.deathTextEl.style.color = '#ff3333';
        G.deathTextEl.style.fontSize = '80px';
        G.deathTextEl.style.fontWeight = '800';
        G.deathTextEl.style.textShadow = '0 0 20px rgba(255,0,0,0.5)';
        G.deathTextEl.style.zIndex = '1000';
        G.deathTextEl.style.pointerEvents = 'none';
        document.body.appendChild(G.deathTextEl);
    }
    G.deathTextEl.innerText = 'YOU DIED';
    G.deathTextEl.style.display = 'block';

    G.playerBody.linearVelocity.set(0, 0, 0);
}

function respawnPlayer() {
    G.isDead = false;
    if (G.deathTextEl) G.deathTextEl.style.display = 'none';

    const currentY = G.playerBody.position.y;
    let spawnY = 0;
    let bestDist = 100;

    G.membranes.forEach(m => {
        const dist = currentY - m.y;
        if (dist > 0 && dist <= 100) {
            if (dist < bestDist) {
                spawnY = m.y;
            }
        }
    });

    const spawnX = config.areaSize / 2 + (Math.random() - 0.5) * 2;
    const spawnZ = config.areaSize / 2 + (Math.random() - 0.5) * 2;

    G.entities.forEach(ent => {
        ent.currentMembraneY = -Infinity;
        if (ent.dedicatedMembraneFloor) {
            G.world.removeRigidBody(ent.dedicatedMembraneFloor);
            ent.dedicatedMembraneFloor = null;
        }
    });

    G.playerBody.resetPosition(spawnX, spawnY + 2.0, spawnZ);
    G.playerBody.linearVelocity.set(0, 0, 0);
    G.playerLives = config.maxLives;
    updateLifeHUD();
    logStatus(`リスポーンしました (${Math.floor(spawnY)}m地点)`);
}

const UPGRADE_POOLS = {
    movement: [
        { id: 'm1', name: "スピード", desc: "速度：ややはやい\n跳躍：ふつう", stats: { playerSpeed: 7.3, jumpVelocity: 2.6, jumpMultiplier: 0.65, holdBoost: 0.38, maxHoldTime: 9 } },
        { id: 'm2', name: "ジャンプ", desc: "速度：ふつう\n跳躍：ややたかい", stats: { playerSpeed: 6.0, jumpVelocity: 3.0, jumpMultiplier: 0.65, holdBoost: 0.38, maxHoldTime: 9 } },
        { id: 'm3', name: "アクロバット", desc: "速度：すこしはやい\n空中制御：たかい", stats: { playerSpeed: 6.7, jumpVelocity: 2.7, jumpMultiplier: 0.77, holdBoost: 0.38, maxHoldTime: 9 } },
        { id: 'm4', name: "ムーンウォーク", desc: "速度：すこしはやい\n長押し：ながい", stats: { playerSpeed: 6.3, jumpVelocity: 2.6, jumpMultiplier: 0.65, holdBoost: 0.40, maxHoldTime: 11 } },
        { id: 'm5', name: "バイタリティ", desc: "速度：はやい\n最大ライフ：＋２", stats: { playerSpeed: 7.5, jumpVelocity: 2.6, jumpMultiplier: 0.65, holdBoost: 0.38, maxHoldTime: 9 }, lifeBoost: 2 }
    ],
    projectile: [
        { id: 'p1', name: "マシンガン", desc: "回復速度：とてもはやい\nダメージ：ちいさい", stats: { projectileRecoveryRate: 20.0, damageProjectile: 1, projectileSpeed: 20.0, projectileAutoFire: true } },
        { id: 'p2', name: "ス〇イパー", desc: "弾速：とてもはやい\nダメージ：おおきい", stats: { projectileRecoveryRate: 1.0, damageProjectile: 2, projectileSpeed: 40.0, projectileRangeMult: 2.0 } },
        { id: 'p3', name: "キャノン", desc: "回復速度：おそい\nダメージ：とてもおおきい", stats: { projectileRecoveryRate: 0.5, damageProjectile: 5, projectileSpeed: 15.0 } },
        { id: 'p4', name: "マガジン", desc: "最大装弾数が\n2発増加する", stats: { projectileRecoveryRate: 1.0, damageProjectile: 1, projectileSpeed: 20.0, maxProjectileStock: 5.0 } },
        { id: 'p5', name: "〇ック", desc: "弾のサイズが大きく\nダメージも少し高い", stats: { projectileRecoveryRate: 1.0, damageProjectile: 2, projectileSpeed: 20.0, projectileRadiusMult: 2.5 } },
        { id: 'p6', name: "ジェ〇ニ", desc: "弾が斜め2方向に\n分裂して飛ぶ", stats: { projectileRecoveryRate: 1.0, damageProjectile: 1, projectileSpeed: 20.0, projectileSplit: 2 } },
        { id: 'p7', name: "ト〇プレット", desc: "弾が正面と斜めの\n3方向に飛ぶ", stats: { projectileRecoveryRate: 1.0, damageProjectile: 1, projectileSpeed: 20.0, projectileSplit: 3 } },
        { id: 'p8', name: "〇プレッド", desc: "周囲12方向に\n弾をばらまく", stats: { projectileRecoveryRate: 1.0, damageProjectile: 1, projectileSpeed: 20.0, projectileSplit: 12 } },
        { id: 'p9', name: "ニー〇ル", desc: "弾が壁を\n貫通する", stats: { projectileRecoveryRate: 1.0, damageProjectile: 1, projectileSpeed: 20.0, projectilePassWall: true, projectileIsNeedle: true } },
        { id: 'p10', name: "ペ〇トレ", desc: "高速の弾が\n壁を貫通する", stats: { projectileRecoveryRate: 1.0, damageProjectile: 1, projectileSpeed: 35.0, projectilePassWall: true, projectileIsNeedle: true } },
        { id: 'p11', name: "〇ウンド", desc: "壁で2回まで\n跳ね返る弾", stats: { projectileRecoveryRate: 1.0, damageProjectile: 1, projectileSpeed: 20.0, projectileBounces: 2 } },
        { id: 'p12', name: "〇ング", desc: "弾の射程が\n大幅に伸びる", stats: { projectileRecoveryRate: 1.0, damageProjectile: 1, projectileSpeed: 20.0, projectileRangeMult: 3.0 } }
    ],
    bubble: [
        { id: 'b1', name: "シャワー", desc: "回復速度：とてもはやい\nダメージ：ちいさい", stats: { bubbleRecoveryRate: 2.5, damageBubble: 1, bubbleSpeedY: 5.0 } },
        { id: 'b2', name: "ヘビー", desc: "上昇速度：おそい\nダメージ：とてもおおきい", stats: { bubbleRecoveryRate: 1.0, damageBubble: 5, bubbleSpeedY: 2.5 } },
        { id: 'b3', name: "ロケット", desc: "上昇速度：とてもはやい\nダメージ：ふつう", stats: { bubbleRecoveryRate: 1.0, damageBubble: 2, bubbleSpeedY: 10.0 } },
        { id: 'b4', name: "スロー", desc: "上昇速度：とてもおそい\nじっくりと浮上", stats: { bubbleRecoveryRate: 1.0, damageBubble: 1, bubbleSpeedY: 1.5 } },
        { id: 'b5', name: "ツイン", desc: "シャボン玉を\n同時に2発撃つ", stats: { bubbleRecoveryRate: 1.0, damageBubble: 1, bubbleSpeedY: 5.0, bubbleSplit: 2 } },
        { id: 'b6', name: "ダメージ", desc: "シャボン玉の\nダメージが大幅増加", stats: { bubbleRecoveryRate: 1.0, damageBubble: 3, bubbleSpeedY: 5.0 } },
        { id: 'b7', name: "クイック", desc: "シャボン玉の\nリロード速度向上", stats: { bubbleRecoveryRate: 3.0, damageBubble: 1, bubbleSpeedY: 5.0 } }
    ]
};

let currentUpgradeOptions = [];
let rewardScreenKeydownHandler = null;

function showRewardScreen() {
    const screen = document.getElementById('reward-screen');
    if (!screen) return;
    
    // Pick one random from each category
    const m = UPGRADE_POOLS.movement[Math.floor(Math.random() * UPGRADE_POOLS.movement.length)];
    const p = UPGRADE_POOLS.projectile[Math.floor(Math.random() * UPGRADE_POOLS.projectile.length)];
    const b = UPGRADE_POOLS.bubble[Math.floor(Math.random() * UPGRADE_POOLS.bubble.length)];
    
    const OMAKE_OPTIONS = [
        { text: "おまけなし", type: "none" },
        { text: "おまけでイノーチ", type: "life" },
        { text: "おまけなし", type: "none" }
    ];

    currentUpgradeOptions = [m, p, b].map(opt => ({
        ...opt,
        omake: OMAKE_OPTIONS[Math.floor(Math.random() * OMAKE_OPTIONS.length)]
    }));
    
    const container = document.getElementById('reward-options-container');
    if (container) {
        container.innerHTML = '';
        currentUpgradeOptions.forEach((opt, index) => {
            const num = index + 1;
            const html = `
                <div class="reward-option" onclick="applyUpgrade(${index})" style="width: 260px; height: 320px; padding: 30px 20px; background: #22222d; border: 1px solid #ffcccc; text-align: center; cursor: pointer; transition: 0.2s; position: relative; display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="font-size: 22px; font-weight: normal; color: #fff; letter-spacing: 2px;">${opt.name}</div>
                    <div style="font-size: 16px; color: #fff; line-height: 2.2; font-weight: normal; margin-top: auto; margin-bottom: auto; white-space: pre-wrap;">${opt.desc}</div>
                    <div style="font-size: 15px; color: #fff; font-weight: normal;">${opt.omake.text}</div>
                </div>
            `;
            container.innerHTML += html;
        });
    }
    
    screen.classList.remove('hidden');
    G.isRewarding = true;
    // G.isStarted = false; // 時間を止めない
    // if (G.controls) G.controls.unlock(); // カメラ操作を維持
    
    screen.style.pointerEvents = 'none'; // マウスロック中なのでクリック不可（キー選択のみ）
    
    if (!rewardScreenKeydownHandler) {
        rewardScreenKeydownHandler = (e) => {
            if (screen.classList.contains('hidden')) return;
            if (e.key === '1') applyUpgrade(0);
            if (e.key === '2') applyUpgrade(1);
            if (e.key === '3') applyUpgrade(2);
        };
        window.addEventListener('keydown', rewardScreenKeydownHandler);
    }
}

window.applyUpgrade = function(index) {
    const screen = document.getElementById('reward-screen');
    if (screen) screen.classList.add('hidden');
    G.isRewarding = false;
    
    const opt = currentUpgradeOptions[index];
    if (opt) {
        // Reset defaults before overwriting to ensure clean slate
        config.maxProjectileStock = 3.0;
        config.projectileRadiusMult = 1.0;
        config.projectileSplit = 1;
        config.projectilePassWall = false;
        config.projectileBounces = 0;
        config.projectileRangeMult = 1.0;
        config.projectileAutoFire = false;
        config.projectileIsNeedle = false;
        config.maxBubbleStock = 1.0;
        config.bubbleSplit = 1;

        for (const [key, value] of Object.entries(opt.stats)) {
            config[key] = value;
        }
        
        if (opt.lifeBoost) {
            config.maxLives += opt.lifeBoost;
            G.playerLives += opt.lifeBoost;
        }

        if (opt.omake.type === 'life') {
            G.playerLives++;
        }
        
        updateLifeHUD();
        updateAmmoHUD();
        
        // Update active upgrade display
        if (opt.id.startsWith('m')) {
            const el = document.getElementById('upg-move');
            if (el) el.textContent = `MOVE: ${opt.name}`;
        } else if (opt.id.startsWith('p')) {
            const el = document.getElementById('upg-proj');
            if (el) el.textContent = `PROJ: ${opt.name}`;
        } else if (opt.id.startsWith('b')) {
            const el = document.getElementById('upg-bubb');
            if (el) el.textContent = `BUBB: ${opt.name}`;
        }
    }
    
}

function showNotification(msg) {
    const notif = document.createElement('div');
    notif.style.position = 'absolute';
    notif.style.top = '20%';
    notif.style.left = '50%';
    notif.style.transform = 'translateX(-50%)';
    notif.style.padding = '10px 20px';
    notif.style.background = 'rgba(0,0,0,0.7)';
    notif.style.color = '#fff';
    notif.style.borderRadius = '20px';
    notif.style.fontSize = '14px';
    notif.style.fontWeight = 'bold';
    notif.style.border = '1px solid rgba(255,255,255,0.2)';
    notif.style.zIndex = '3000';
    notif.innerText = msg;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.transition = 'opacity 0.5s, transform 0.5s';
        notif.style.opacity = '0';
        notif.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => notif.remove(), 500);
    }, 2000);
}

function initGUI() {
    const gui = new dat.GUI();
    gui.domElement.style.display = 'none'; // デフォルトで非表示
    document.addEventListener('keydown', (e) => {
        if (e.key === '^') {
            gui.domElement.style.display = gui.domElement.style.display === 'none' ? 'block' : 'none';
        }
    });

    const fEnv = gui.addFolder('Environment');
    const envSettings = {
        exposure: G.renderer.toneMappingExposure,
        ambient: G.ambientLight.intensity,
        sun: G.d1.intensity
    };
    fEnv.add(envSettings, 'exposure', 0.0, 3.0).name('Exposure').onChange(v => {
        G.renderer.toneMappingExposure = v;
    });
    fEnv.add(envSettings, 'ambient', 0.0, 2.0).name('Ambient').onChange(v => {
        G.ambientLight.intensity = v;
    });
    fEnv.add(envSettings, 'sun', 0.0, 2.0).name('Sun (D-Lights)').onChange(v => {
        G.d1.intensity = G.d2.intensity = G.d3.intensity = G.d4.intensity = v;
    });
    fEnv.open();

    const fMove = gui.addFolder('Move');
    fMove.add(config, 'playerSpeed', 1.0, 20.0).name('Speed');
    fMove.open();

    const fJump = gui.addFolder('Jump');
    fJump.add(config, 'jumpVelocity', 1.0, 25.0).name('Power');
    fJump.add(config, 'jumpMultiplier', 0.1, 1.5).name('Air Multi');
    fJump.add(config, 'holdBoost', 0.0, 1.0).name('Hold Boost');
    fJump.add(config, 'maxHoldTime', 0, 60).step(1).name('Max Hold');
    fJump.open();

    const fWorld = gui.addFolder('World');
    fWorld.add(config, 'gravity', -50.0, -1.0).name('Gravity').onChange(v => {
        if (G.world) G.world.gravity.set(0, v, 0);
    });
    fWorld.open();

    const fDebug = gui.addFolder('Debug');
    fDebug.add(config, 'showHitboxes').name('Show Hitboxes');
    
    const testActions = {
        showRandomReward: () => showRewardScreen()
    };
    const fRewards = fDebug.addFolder('Test Rewards');
    fRewards.add(testActions, 'showRandomReward').name('Open Reward Screen');
    
    ['movement', 'projectile', 'bubble'].forEach(category => {
        const catFolder = fRewards.addFolder(category.toUpperCase());
        UPGRADE_POOLS[category].forEach(opt => {
            testActions[opt.id] = () => {
                currentUpgradeOptions = [ { ...opt, omake: { text: "DEBUG TEST", type: "none" } } ];
                applyUpgrade(0);
            };
            catFolder.add(testActions, opt.id).name(opt.name);
        });
    });
    
    fDebug.open();
}
