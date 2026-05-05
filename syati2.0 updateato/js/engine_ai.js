// ═══════════════════════════════════════════════════════
//  engine_ai.js — AI行動ループ + 弾丸更新
//  登頂に完全特化したヒューリスティック + NN学習
// ═══════════════════════════════════════════════════════
'use strict';

// デバッグ用ログバッファ
if (!G.aiLogBuffer) G.aiLogBuffer = [];
G.aiLog = "";

// ── ブロック探索ヘルパー ──
// 指定座標の近隣で「着地可能な面」を探す（上が空いているブロック）
function findLandableBlocks(pos, searchH, searchUp, searchDown) {
    const px = Math.floor(pos.x), py = Math.floor(pos.y), pz = Math.floor(pos.z);
    const results = [];
    const minY = Math.max(0, py - searchDown);
    const maxY = py + searchUp;

    for (let gx = px - searchH; gx <= px + searchH; gx++) {
        for (let gz = pz - searchH; gz <= pz + searchH; gz++) {
            for (let gy = minY; gy <= maxY; gy++) {
                const b = G.mapGrid.get(`${gx},${gy},${gz}`);
                if (!b) continue;
                // 上2マスが空いていること（着地可能）
                if (G.mapGrid.has(`${gx},${gy + 1},${gz}`) || G.mapGrid.has(`${gx},${gy + 2},${gz}`)) continue;
                results.push(b);
            }
        }
    }
    return results;
}

// ── メインAIループ ──
function animateAI(dt) {
    G.entities.forEach(ent => {
        if (!ent.isAI) return;
        const body = ent.body, pos = body.position, vel = body.linearVelocity;

        // 死亡中は何もしない
        if (ent.isDead) {
            ent.deathTimer -= dt;
            if (ent.deathTimer <= 0) ent.isDead = false;
            ent.mesh.position.set(pos.x, pos.y - 0.37, pos.z);
            body.linearVelocity.set(0, 0, 0);
            return;
        }

        // ── メッシュ同期 ──
        ent.mesh.position.set(pos.x, pos.y - 0.37, pos.z);
        if (Math.abs(vel.x) > 0.1 || Math.abs(vel.z) > 0.1) {
            const ta = Math.atan2(vel.x, vel.z);
            ent.mesh.quaternion.slerp(
                new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ta), 0.15
            );
        }

        // ── スタック検出 ──
        if (!ent.lastPos) ent.lastPos = { x: pos.x, y: pos.y, z: pos.z };
        const dxm = pos.x - ent.lastPos.x, dym = pos.y - ent.lastPos.y, dzm = pos.z - ent.lastPos.z;
        const distMoved = Math.sqrt(dxm * dxm + dym * dym + dzm * dzm);
        if (distMoved < 0.3) ent.stuckTimer++;
        else { ent.stuckTimer = 0; ent.lastPos.x = pos.x; ent.lastPos.y = pos.y; ent.lastPos.z = pos.z; }

        // ── 接地判定の救済 ──
        // engine.js は mapGrid しか見ないため、初期フロア（y=0付近）では手動で接地とする
        if (pos.y < 0.45) ent.isGrounded = true;

        if (ent.jumpIgnoreTimer && ent.jumpIgnoreTimer > 0) {
            ent.isGrounded = false;
            ent.jumpIgnoreTimer--;
        }

        // ── 頭上チェック（ジャンプ可否） ──
        const px = Math.floor(pos.x), pz = Math.floor(pos.z);
        const checkY = Math.floor(pos.y); 
        let hasOverhead = false;
        // 2マス以上上にブロックがある場合のみ「天井」とみなす（すぐ上の足場は無視）
        for (let dy = 2; dy <= 3; dy++) {
            if (G.mapGrid.has(`${px},${checkY + dy},${pz}`)) {
                hasOverhead = true; break;
            }
        }
        ent.debugHasOverhead = hasOverhead;

        // ── 接地・ジャンプ状態管理 ──
        // engine.js が ent.isGrounded を設定済み。ここでは上書きしない。
        if (ent.isGrounded) { 
            ent.jumpCount = 0; 
            ent.isJumping = false; 
        }
        else if (ent.isJumping && ent.jumpTimer < config.maxHoldTime && vel.y > 0) {
            // 天井判定に関わらず、物理的にぶつかるまではブーストを継続（プレイヤーと同じ挙動）
            vel.y += config.holdBoost;
            ent.jumpTimer++;
        } else {
            ent.isJumping = false;
        }

        // ── NN / ヒューリスティック切り替え ──
        const useNN = document.getElementById('ai-nn-mode') && document.getElementById('ai-nn-mode').checked;
        const collectData = document.getElementById('ai-collect-data') && document.getElementById('ai-collect-data').checked;
        let currentState = null, nnAction = null;
        let isJumpTriggered = false, mx = 0, mz = 0;

        if (typeof getAIObservation === 'function') {
            currentState = getAIObservation(ent, G.playerBody);
            if (useNN) {
                nnAction = predictAIAction(currentState);
                mx = nnAction[0] * 5;
                mz = nnAction[1] * 5;
                if (nnAction[2] > 0.1) isJumpTriggered = true;
            }
        }

        // ═══════════════════════════════════════════════
        //  ヒューリスティック登頂アルゴリズム (NNモード時はスキップ)
        // ═══════════════════════════════════════════════
        if (!useNN) {
            // ── ターゲット選択 ──
            // ジャンプ中（空中）はターゲットを固定して挙動を安定させる
            // ただし、長時間スタックしている場合は強制的に再評価
            const isAirborne = !ent.isGrounded || ent.isJumping;
            const needNewTarget = !ent.targetPos
                || (ent.targetPos.y <= pos.y - 0.2)   // 既に到達済み or 下にある
                || (ent.stuckTimer > 40)                // スタック
                || (!isAirborne && Math.random() < 0.02); // 地上にいる時だけ低確率で再評価

            if (needNewTarget) {
                // スタックしてターゲットを再評価する場合、現在のターゲットをブラックリストに入れる（無限ループ防止）
                if (ent.stuckTimer > 40 && ent.targetPos) {
                    const bk = `${ent.targetPos.x},${ent.targetPos.y},${ent.targetPos.z}`;
                    ent.jumpBlacklist.set(bk, Date.now());
                }

                // ブラックリストの期限切れをクリーン
                if (ent.jumpBlacklist.size > 0) {
                    const now = Date.now();
                    ent.jumpBlacklist.forEach((ts, key) => { if (now - ts > 8000) ent.jumpBlacklist.delete(key); });
                }

                // プレイヤー追従モード（教師あり学習用）
                const followPlayer = document.getElementById('ai-follow-player') && document.getElementById('ai-follow-player').checked;
                
                if (followPlayer && G.playerBody) {
                    ent.targetPos = G.playerBody.position.clone();
                    ent.stuckTimer = 0;
                } else {
                    // 通常のブロック探索
                    const nextMembrane = G.membranes.find(m => m.y > pos.y);
                    const goalX = nextMembrane ? nextMembrane.mesh.position.x : config.areaSize / 2;
                    const goalZ = nextMembrane ? nextMembrane.mesh.position.z : config.areaSize / 2;

                    const candidates = findLandableBlocks(pos, 8, 6, 2);
                    let bestTarget = null, bestScore = -Infinity;

                    for (const b of candidates) {
                        const dy = b.position.y - pos.y;
                        const ddx = b.position.x - pos.x, ddz = b.position.z - pos.z;
                        const distHSq = ddx * ddx + ddz * ddz;

                        if (distHSq < 0.1) continue;
                        const bk = `${b.position.x},${b.position.y},${b.position.z}`;
                        if (ent.jumpBlacklist.has(bk)) continue;

                        let score = 0;
                        if (dy > 0.1 && dy <= 2.8) {
                            score = 1000 + dy * 500 - distHSq * 15;
                            const dtgSq = Math.pow(b.position.x - goalX, 2) + Math.pow(b.position.z - goalZ, 2);
                            score -= dtgSq * 0.1;
                        }
                        else if (dy > 2.8 && dy <= 6.0) {
                            score = dy * 10 - distHSq * 50;
                        }
                        else if (dy >= -1.5 && dy <= 0.1) {
                            score = -50 + dy * 10 - distHSq * 5;
                        } else continue;

                        if (score > bestScore) {
                            bestScore = score;
                            bestTarget = b.position;
                        }
                    }

                    if (bestTarget) {
                        ent.targetPos = bestTarget.clone();
                        ent.stuckTimer = 0;
                    } else if (ent.stuckTimer > 60) {
                        ent.targetPos = new THREE.Vector3(
                            pos.x + (Math.random() - 0.5) * 6,
                            pos.y + 2,
                            pos.z + (Math.random() - 0.5) * 6
                        );
                        ent.stuckTimer = 0;
                        ent.jumpBlacklist.clear();
                    } else {
                        ent.targetPos = new THREE.Vector3(goalX, pos.y + 2, goalZ);
                    }
                }
            }

            // ── ターゲットへの移動 ──
            if (ent.targetPos) {
                const ddx = ent.targetPos.x - pos.x;
                const ddz = ent.targetPos.z - pos.z;
                const distH = Math.sqrt(ddx * ddx + ddz * ddz);
                const targetIsUp = ent.targetPos.y > pos.y + 0.15;

                if (distH > 0.1) {
                    mx = ddx / distH;
                    mz = ddz / distH;
                }

                // ── ジャンプ判定 ──
                const dyToTarget = ent.targetPos.y - pos.y;
                let wallAhead = false, gapAhead = false;
                if (distH > 0.2 && ent.isGrounded) {
                    const nx = Math.floor(pos.x + mx * 1.2);
                    const nz = Math.floor(pos.z + mz * 1.2);
                    const ny = Math.floor(pos.y);
                    for (let h = 0; h <= 2; h++) {
                        if (h === 0 && pos.y >= 0.45) continue;
                        if (G.mapGrid.has(`${nx},${ny + h},${nz}`)) { wallAhead = true; break; }
                    }
                    let hasFloor = pos.y < 0.45;
                    if (!hasFloor) {
                        for (let d = 0; d <= 3; d++) {
                            if (G.mapGrid.has(`${nx},${ny - d},${nz}`)) { hasFloor = true; break; }
                        }
                    }
                    if (!hasFloor) gapAhead = true;
                }
                
                ent.debugWallAhead = wallAhead;
                ent.debugGapAhead = gapAhead;

                const shouldJump =
                    (targetIsUp && ent.isGrounded)
                    || (wallAhead && ent.isGrounded)
                    || (gapAhead && distH < 2.5)
                    || (ent.stuckTimer > 8 && ent.isGrounded);

                if (shouldJump) {
                    isJumpTriggered = true;
                }

                if (wallAhead && !targetIsUp && !ent.isJumping) {
                    const bk = `${ent.targetPos.x},${ent.targetPos.y},${ent.targetPos.z}`;
                    ent.jumpBlacklist.set(bk, Date.now());
                    ent.targetPos = null;
                    mx = 0; mz = 0;
                }
            }
        }

        // ═══════════════════════════════════════════════
        //  ジャンプ実行
        // ═══════════════════════════════════════════════
        if (isJumpTriggered && !ent.lastJumpTriggered) {
            if (ent.isGrounded || ent.jumpCount < 2) {
                const force = ent.isGrounded
                    ? config.jumpVelocity
                    : config.jumpVelocity * config.jumpMultiplier;
                vel.y = force;
                ent.jumpCount++;
                ent.isGrounded = false;
                ent.isJumping = true;
                ent.jumpTimer = 0;
                ent.jumpIgnoreTimer = 6;
            }
        }

        // デバッグログ記録 (最初のAIのみ)
        if (ent.entIndex === 1) {
            if (typeof window.aiLogFrame === 'undefined') window.aiLogFrame = 0;
            window.aiLogFrame++;
            
            const t = ent.targetPos;
            const distH = t ? Math.sqrt(Math.pow(t.x - pos.x, 2) + Math.pow(t.z - pos.z, 2)) : 0;
            const dy = t ? t.y - pos.y : 0;
            
            const logEntry = [
                `[F:${window.aiLogFrame}]`,
                `PosY:${pos.y.toFixed(2)}`,
                `VelY:${vel.y.toFixed(2)}`,
                `Grnd:${ent.isGrounded ? 1 : 0}`,
                `JCnt:${ent.jumpCount}`,
                `Wall:${ent.debugWallAhead ? 1 : 0}`,
                `Gap:${ent.debugGapAhead ? 1 : 0}`,
                `Ovhd:${ent.debugHasOverhead ? 1 : 0}`,
                `Stuck:${ent.stuckTimer}`,
                `TgtXYZ:(${t ? t.x.toFixed(0) : '-' },${t ? t.y.toFixed(0) : '-' },${t ? t.z.toFixed(0) : '-' })`,
                `DistH:${distH.toFixed(1)}`,
                `Dy:${dy.toFixed(1)}`,
                `mx:${mx.toFixed(1)}`,
                `mz:${mz.toFixed(1)}`,
                `JmpTrig:${isJumpTriggered ? 1 : 0}`
            ].join(' ');

            G.aiLogBuffer.push(logEntry);
            if (G.aiLogBuffer.length > 200) G.aiLogBuffer.shift();
            G.aiLog = G.aiLogBuffer.join("\n");
        }

        ent.lastJumpTriggered = isJumpTriggered;

        if (isJumpTriggered && ent.isGrounded) {
            ent.lastJumpTriggered = false;
        }

        if (ent.stuckTimer > 80 && ent.stuckTimer % 15 === 0) {
            vel.y = config.jumpVelocity;
            mx = (Math.random() - 0.5) * 6;
            mz = (Math.random() - 0.5) * 6;
            ent.jumpCount = 0;
        }

        const amag = Math.sqrt(mx * mx + mz * mz);
        if (amag > 0) {
            const sp = config.playerSpeed * (ent.isJumping ? 1.05 : 1.0);
            vel.x += ((mx / amag) * sp - vel.x) * 0.2;
            vel.z += ((mz / amag) * sp - vel.z) * 0.2;
        } else {
            vel.x *= 0.8;
            vel.z *= 0.8;
        }
        ent.lastMx = mx;
        ent.lastMz = mz;

        if (collectData && currentState && typeof collectAIExperience === 'function') {
            let reward = 0;
            const dy = pos.y - (ent.lastFrameY || pos.y);
            if (dy > 0.01) reward += dy * 300;
            else if (dy < -0.01) reward += dy * 80;
            if (Math.abs(dy) < 0.005) reward -= 0.2;

            const nextMem = G.membranes.find(m => m.y > pos.y);
            const curNextMemY = nextMem ? nextMem.y : config.goalHeight;
            if (ent.prevNextMemY !== undefined && curNextMemY > ent.prevNextMemY) {
                reward += 1000;
            }
            ent.prevNextMemY = curNextMemY;
            if (ent.isDead) reward -= 500;
            ent.lastFrameY = pos.y;
            const normMx = amag > 0 ? mx / amag : 0;
            const normMz = amag > 0 ? mz / amag : 0;
            collectAIExperience(currentState, [normMx, normMz, isJumpTriggered ? 1 : 0], reward, null);
        }

        // 攻撃ロジック省略
        const fireNow = Date.now();
        const aiCFP = (fireNow - (ent.lastFireTimeProjectile || 0) >= 2000 && (ent.projectileStock || 0) >= 1.0);
        if (ent.stuckTimer < 30) {
            let closest = null, minDS = Infinity;
            const chk = (ep, eb) => {
                if (eb === ent.body) return;
                const dx = ep.x - pos.x, dy = ep.y - pos.y, dz = ep.z - pos.z;
                const ds = dx * dx + dy * dy + dz * dz;
                if (ds < 200 && ds < minDS) { minDS = ds; closest = { pos: ep, distSq: ds }; }
            };
            chk(G.playerBody.position, G.playerBody);
            G.networkEntities.forEach(ne => { if (ne.body) chk(ne.mesh.position, ne.body); });
            if (closest && aiCFP && Math.random() < 0.015) {
                ent.lastFireTimeProjectile = fireNow;
                ent.projectileStock -= 1.0;
                const tp = closest.pos;
                const tdx = tp.x - pos.x, tdy = tp.y - pos.y, tdz = tp.z - pos.z;
                const td = Math.sqrt(minDS);
                if (typeof fireProjectile === 'function') fireProjectile(pos.x, pos.y, pos.z, (tdx / td) * config.projectileSpeed, (tdy / td) * config.projectileSpeed, (tdz / td) * config.projectileSpeed, ent.body);
            }
        }
    });

    const collectData = document.getElementById('ai-collect-data') && document.getElementById('ai-collect-data').checked;
    if (collectData) {
        if (!window.lastAutoTrainTime) window.lastAutoTrainTime = Date.now();
        if (Date.now() - window.lastAutoTrainTime > 30000) {
            window.lastAutoTrainTime = Date.now();
            if (typeof trainAIModel === 'function' && aiReplayBuffer.length >= 32) {
                trainAIModel();
            }
        }
    }
}

function animateProjectiles(dt) {
    for (let i = G.projectiles.length - 1; i >= 0; i--) {
        const p = G.projectiles[i], age = Date.now() - p.spawnTime;
        let exploded = p._hitFlag || false;
        if (!exploded && (G.isHost || !G.isOnline)) {
            const stepDist = p.velocity.length() * dt, steps = Math.max(1, Math.ceil(stepDist / 0.25));
            const dir = p.velocity.clone().normalize(), cPos = p.position.clone();
            for (let s = 1; s <= steps; s++) {
                cPos.addScaledVector(dir, stepDist / steps);
                const gx = Math.floor(cPos.x), gy = Math.floor(cPos.y), gz = Math.floor(cPos.z);
                if (G.mapGrid && G.mapGrid.has(`${gx},${gy},${gz}`)) { 
                    if (config.projectilePassWall) {
                        // pass through
                    } else if (config.projectileBounces > 0 && (p.bounces || 0) < config.projectileBounces) {
                        const bCX = gx + 0.5, bCY = gy + 0.5, bCZ = gz + 0.5;
                        const dx = Math.abs(cPos.x - bCX), dy = Math.abs(cPos.y - bCY), dz = Math.abs(cPos.z - bCZ);
                        if (dx > dy && dx > dz) p.velocity.x *= -1;
                        else if (dy > dx && dy > dz) p.velocity.y *= -1;
                        else p.velocity.z *= -1;
                        p.bounces = (p.bounces || 0) + 1;
                        dir.copy(p.velocity).normalize();
                    } else {
                        p._hitFlag = true; exploded = true; break; 
                    }
                }
                const cr = 0.52 * (config.projectileRadiusMult || 1.0), rSq = cr * cr; let hitEB = null;
                const gDS = (b, pt) => { const dx = b.position.x - pt.x, dy = b.position.y - pt.y, dz = b.position.z - pt.z; return dx * dx + dy * dy + dz * dz; };
                if (p.ownerBody && G.playerBody !== p.ownerBody && gDS(G.playerBody, cPos) < rSq) hitEB = G.playerBody;
                if (!hitEB) G.networkEntities.forEach(e => { if (e.body && e.body !== p.ownerBody && gDS(e.body, cPos) < rSq) hitEB = e.body; });
                if (!hitEB) G.entities.forEach(e => { if (e.body && e.body !== p.ownerBody && gDS(e.body, cPos) < rSq) hitEB = e.body; });
                if (!hitEB) { const bhr = (2.5 + 0.15) ** 2; G.bubbles.forEach(b => { if (b.body && gDS(b.body, cPos) < bhr) { b._hitFlag = true; p._hitFlag = true; exploded = true; } }); }
                if (hitEB) { p._hitFlag = true; p._hitBody = hitEB; exploded = true; break; }
            }
            if (!exploded) p.position.addScaledVector(p.velocity, dt); else p.position.copy(cPos);
        } else if (!exploded && !G.isHost && G.isOnline) p.position.addScaledVector(p.velocity, dt);

        const baseRange = 20.0;
        const maxLifeTime = (baseRange / (config.projectileSpeed || 14.0)) * 1000 * (config.projectileRangeMult || 1.0);
        if (exploded || age > maxLifeTime || p.position.y < -20) {
            if (exploded && p._hitBody && (G.isHost || !G.isOnline)) {
                if (p._hitBody === G.playerBody) takeDamage(config.damageProjectile);
                const dx = p._hitBody.position.x - p.position.x, dy = p._hitBody.position.y - p.position.y, dz = p._hitBody.position.z - p.position.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
                p._hitBody.linearVelocity.x += (dx / d) * 15; p._hitBody.linearVelocity.y -= 12; p._hitBody.linearVelocity.z += (dz / d) * 15;
                G.entities.forEach(ent => {
                    if (ent.isAI && ent.body === p._hitBody) {
                        ent.lives = (ent.lives === undefined ? config.maxLives : ent.lives) - config.damageProjectile;
                        if (ent.lives <= 0) {
                            ent.isDead = true; ent.deathTimer = 3.0;
                            const ch = ent.body.position.y;
                            ent.body.resetPosition(config.areaSize / 2, Math.max(0, Math.floor((ch - 1) / 100) * 100) + 2.0, config.areaSize / 2);
                            ent.body.linearVelocity.set(0, 0, 0); ent.lives = config.maxLives;
                        }
                    }
                });
            }
            if (exploded && typeof createExplosion === 'function') createExplosion(p.position.x, p.position.y, p.position.z);
            if (G.isHost && p.netId) broadcastEvent(13, { netId: p.netId, type: 0, x: p.position.x, y: p.position.y, z: p.position.z });
            p.mesh.visible = false; G.projectilePool.push(p.mesh); if (p.netId) G.netObjects.delete(p.netId);
            G.projectiles.splice(i, 1);
        } else p.mesh.position.copy(p.position);
    }
}
