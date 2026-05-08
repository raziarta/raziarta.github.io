// ═══════════════════════════════════════════════════════
//  engine.js — メインゲームループ (animate)
//  元の変数名はそのまま維持（G.経由ではなくグローバル参照）
//  ※ index.html から読み込む順番で依存関係を解決
// ═══════════════════════════════════════════════════════
'use strict';

// ── 毎フレーム再利用する一時オブジェクト（GC圧力削減） ──
const _tmpQ = new THREE.Quaternion();
const _tmpAxisY = new THREE.Vector3(0, 1, 0);
const _tmpFwd = new THREE.Vector3();
const _tmpRight = new THREE.Vector3();
const _tmpOffset = new THREE.Vector3();
const _tmpDp = new THREE.Vector3();
let _rewardScreenEl = null;

function animate() {
    if (!G.isStarted) return;
    G.animFrameId = requestAnimationFrame(animate);

    const now = performance.now();
    let dt = (now - G.lastAnimTime) / 1000;
    if (dt > 0.1 || G.lastAnimTime === 0) dt = 1/60;
    G.lastAnimTime = now;

    G.bubbles.forEach(b => { b._hitFlag = false; b._hitBody = null; });
    G.bubbles.forEach(b => {
        if (b.body) {
            // ホスト/オフライン: 物理bodyで上昇
            b.body.linearVelocity.y = 8.0;
            b.body.linearVelocity.x *= 0.987;
            b.body.linearVelocity.z *= 0.987;
        } else {
            // クライアント: メッシュ位置を速度予測で更新
            b.mesh.position.y += 8.0 * dt;
        }
    });

    G.world.step();

    // シャボン玉衝突判定
    if (G.isHost || !G.isOnline) {
        G.bubbles.forEach(b => {
            if (b._hitFlag) return;
            let link = b.body.contactLink;
            while (link) {
                if (link.contact && link.contact.touching) {
                    const other = (link.contact.body1 === b.body) ? link.contact.body2 : link.contact.body1;
                    if (!(other.belongsTo & 1) && other !== b.ownerBody) {
                        b._hitFlag = true;
                        b._hitBody = other;
                        G.entities.forEach(ent => {
                            if (ent.isAI && ent.body === other) {
                                const bDamage = b.props ? b.props.damage : config.damageBubble;
                                ent.lives = (ent.lives === undefined ? config.maxLives : ent.lives) - bDamage;
                                if (ent.lives <= 0) {
                                    ent.isDead = true; ent.deathTimer = 3.0;
                                    const ch = ent.body.position.y;
                                    ent.body.resetPosition(config.areaSize/2, Math.max(0, Math.floor((ch-1)/100)*100) + 2.0, config.areaSize/2);
                                    ent.body.linearVelocity.set(0,0,0); ent.lives = config.maxLives;
                                }
                            } else if (other === G.playerBody) { takeDamage(b.props ? b.props.damage : config.damageBubble); }
                        });
                        break;
                    }
                }
                link = link.next;
            }
        });
    }

    const pos = G.playerBody.position;
    const vel = G.playerBody.linearVelocity;
    if (G.playerBody.quaternion) G.playerBody.quaternion.set(0,0,0,1);
    if (G.playerBody.angularVelocity) { G.playerBody.angularVelocity.x=0; G.playerBody.angularVelocity.y=0; G.playerBody.angularVelocity.z=0; }

    G.playerMesh.position.set(pos.x, pos.y - 0.37, pos.z);
    if (Math.abs(vel.x) > 0.1 || Math.abs(vel.z) > 0.1) {
        const ta = Math.atan2(vel.x, vel.z);
        G.playerMesh.quaternion.slerp(_tmpQ.setFromAxisAngle(_tmpAxisY, ta), 0.15);
    }

    let contactFloor = false;
    let link = G.playerBody.contactLink;
    while (link != null) {
        if (link.contact && link.contact.touching) {
            let otherBody = link.body;
            if (!G.walls.some(w => w.body === otherBody) && pos.y - otherBody.position.y > 0.43) contactFloor = true;
        }
        link = link.next;
    }

    const wasGrounded = G.isGrounded;
    G.isGrounded = (contactFloor && Math.abs(vel.y) < 0.1);
    if (G.isGrounded && !wasGrounded) G.minJumpInterval = 0;
    if (!_rewardScreenEl) _rewardScreenEl = document.getElementById('reward-screen');
    const isRewarding = _rewardScreenEl ? !_rewardScreenEl.classList.contains('hidden') : false;

    if (!isRewarding) handleJump(G.keys.space);
    if (G.isGrounded) { G.jumpCount = 0; G.isJumping = false; }

    _tmpFwd.set(0,0,-1).applyQuaternion(G.camera.quaternion); _tmpFwd.y=0; _tmpFwd.normalize();
    _tmpRight.crossVectors(_tmpFwd, _tmpAxisY).normalize();
    let mx=0, mz=0;
    if (!G.isDead && !isRewarding) {
        if (G.keys.w) { mx+=_tmpFwd.x; mz+=_tmpFwd.z; }
        if (G.keys.s) { mx-=_tmpFwd.x; mz-=_tmpFwd.z; }
        if (G.keys.d) { mx+=_tmpRight.x; mz+=_tmpRight.z; }
        if (G.keys.a) { mx-=_tmpRight.x; mz-=_tmpRight.z; }
    }
    const mag = Math.sqrt(mx*mx+mz*mz);
    if (mag>0) { vel.x+=((mx/mag)*config.playerSpeed-vel.x)*0.14; vel.z+=((mz/mag)*config.playerSpeed-vel.z)*0.14; }
    else { vel.x*=0.8; vel.z*=0.8; }

    _tmpOffset.set(0,0.97,G.camDist).applyQuaternion(G.camera.quaternion);
    G.camera.position.set(pos.x+_tmpOffset.x, pos.y+_tmpOffset.y, pos.z+_tmpOffset.z);

    // 実際の光から3Dモデルの影を落とすため、平行光源(D1)をプレイヤーに追従させる（光の向き・強さは不変）
    if (G.d1) {
        G.d1.position.set(pos.x + 100, pos.y + 150, pos.z + 100);
        G.d1.target.position.set(pos.x, pos.y, pos.z);
        G.d1.target.updateMatrixWorld();
    }

    G.warningTapes.forEach(t => { t.mesh.position.y=pos.y; t.mat.uniforms.playerPos.value.copy(pos); });

    G.hitboxHelpers.forEach(h => {
        h.mesh.visible = config.showHitboxes;
        if (config.showHitboxes) {
            h.mesh.position.set(h.body.position.x, h.body.position.y, h.body.position.z);
            if (h.body.quaternion) h.mesh.quaternion.set(h.body.quaternion.x, h.body.quaternion.y, h.body.quaternion.z, h.body.quaternion.w);
        }
    });

    let highestY = -Infinity, lowestY = Infinity;

    // エンティティ更新（接地判定・膜判定）
    G.entities.forEach(ent => {
        const body=ent.body, epos=body.position, evel=body.linearVelocity;
        if (epos.y>highestY) highestY=epos.y;
        if (epos.y<lowestY) lowestY=epos.y;
        if (body.quaternion) body.quaternion.set(0,0,0,1);
        if (body.angularVelocity) { body.angularVelocity.x=0; body.angularVelocity.y=0; body.angularVelocity.z=0; }

        let isEntGrounded=false;
        const pyBot=epos.y-0.37, bY=Math.floor(pyBot-0.01), bTop=bY+1.0;
        if (Math.abs(pyBot-bTop)<0.12) { const gx=Math.floor(epos.x), gz=Math.floor(epos.z); if (G.mapGrid.has(`${gx},${bY},${gz}`)) isEntGrounded=true; }
        if (!isEntGrounded) {
            G.membranes.forEach(m => {
                if (Math.abs(pyBot-m.y)<0.12) { const mw=m.w||config.areaSize; if (Math.abs(epos.x-m.mesh.position.x)<=mw/2 && Math.abs(epos.z-m.mesh.position.z)<=mw/2) isEntGrounded=true; }
            });
        }
        if (isEntGrounded) ent.groundContactFrames++; else ent.groundContactFrames=0;
        isEntGrounded = (ent.groundContactFrames>=3);

        if (ent.maxMembraneY===undefined) ent.maxMembraneY=-Infinity;
        const entBot=epos.y-0.37;
        G.membranes.forEach(m => {
            const isAbove=(entBot>=m.y-0.8 && evel.y<=0.1);
            const isEntDead=ent.isAI?ent.isDead:G.isDead;
            if (isAbove && !isEntDead) {
                if (ent.currentMembraneY!==m.y) {
                    if (ent.dedicatedMembraneFloor) G.world.removeRigidBody(ent.dedicatedMembraneFloor);
                    const mw=m.w||config.areaSize, mPos=m.mesh.position;
                    ent.dedicatedMembraneFloor=G.world.add({type:'box',size:[mw,5.0,mw],pos:[mPos.x,m.y-2.5,mPos.z],move:false,belongsTo:1<<(ent.entIndex+17),collidesWith:1<<(ent.entIndex+1),restitution:0,friction:0.5});
                    ent.currentMembraneY=m.y;
                }
            } else if (ent.currentMembraneY===m.y) {
                if (ent.dedicatedMembraneFloor) { G.world.removeRigidBody(ent.dedicatedMembraneFloor); ent.dedicatedMembraneFloor=null; }
                ent.currentMembraneY=-Infinity;
            }
        });
        if (ent.isAI) ent.isGrounded=isEntGrounded;
        else { const wg=G.isGrounded; G.isGrounded=isEntGrounded; if (G.isGrounded&&!wg) G.minJumpInterval=0; }
    });

    // UI更新
    let listHtml = G.entities.map(e=>`<span style="color:${e.isAI?'#90ee90':'#64b4ff'}">${e.name}</span>: ${Math.max(0,Math.floor(e.body.position.y))}m`).join('<br>');
    G.networkEntities.forEach(ent => {
        const name=ent.name||(ent.id.startsWith('AI_')?'RIVAL AI':'Player');
        listHtml+=`<br><span style="color:${ent.id.startsWith('AI_')?'#90ee90':'#ffaa33'}">${name}</span>: ${Math.max(0,Math.floor(ent.mesh.position.y))}m`;
    });
    if (G.entityListEl) G.entityListEl.innerHTML = listHtml;

    // AI行動ループ
    animateAI(dt);

    // チャンク生成
    while (G.nextChunkY < highestY + 150) {
        if (G.currentMode==='tutorial') break;
        if (G.nextChunkY>=config.goalHeight) break;
        G.nextChunkY+=CHUNK;
        if (G.nextChunkY<=config.goalHeight) generateChunk(G.nextChunkY);
    }
    for (let i=G.pendingBlocks.length-1;i>=0;i--) { if (G.pendingBlocks[i].y<highestY+100) { const b=G.pendingBlocks.splice(i,1)[0]; createBlock(b.x,b.y,b.z); } }

    // ブロックLOD・消去処理
    const pY = pos.y;
    for (let i = G.mapObjects.length - 1; i >= 0; i--) {
        const obj = G.mapObjects[i];
        
        // 安全対策
        if (obj.state === undefined) obj.state = 'normal';
        if (obj.lowPolyInstIdx === undefined) obj.lowPolyInstIdx = null;

        const dy = obj.gy - pY;

        let isNearActiveEntity = false;
        if (dy >= -15 && dy <= 15) {
            isNearActiveEntity = true;
        } else {
            // 各AIの周囲（上下10m）も当たり判定を有効にする
            for (const ent of G.entities) {
                if (ent.isAI && Math.abs(obj.gy - ent.body.position.y) <= 10) {
                    isNearActiveEntity = true;
                    break;
                }
            }
        }

        if (isNearActiveEntity) {
            // 通常版
            if (obj.state !== 'normal') {
                obj.state = 'normal';
                if (obj.lowPolyInstIdx !== null) {
                    G.dummy.scale.set(0, 0, 0); G.dummy.updateMatrix();
                    if (G.lowPolyMapInstancedMesh) {
                        G.lowPolyMapInstancedMesh.setMatrixAt(obj.lowPolyInstIdx, G.dummy.matrix);
                        G.lowPolyMapInstancedMesh.instanceMatrix.needsUpdate = true;
                    }
                    G.freeLowPolyInstanceIndices.push(obj.lowPolyInstIdx);
                    obj.lowPolyInstIdx = null;
                }
                if (obj.instIdx === null && G.freeInstanceIndices.length > 0) {
                    obj.instIdx = G.freeInstanceIndices.pop();
                    G.dummy.position.set(obj.gx + 0.5, obj.gy + 0.5, obj.gz + 0.5);
                    G.dummy.scale.set(1, 1, 1); G.dummy.updateMatrix();
                    if (G.mapInstancedMesh) {
                        G.mapInstancedMesh.setMatrixAt(obj.instIdx, G.dummy.matrix);
                        G.mapInstancedMesh.instanceMatrix.needsUpdate = true;
                    }
                    // mapGrid の情報を更新（AIが参照するため）
                    const gridEntry = G.mapGrid.get(`${obj.gx},${obj.gy},${obj.gz}`);
                    if (gridEntry) gridEntry.instIdx = obj.instIdx;
                }
                if (!obj.body) {
                    obj.body = G.world.add({ type: 'box', size: [1, 1, 1], pos: [obj.gx + 0.5, obj.gy + 0.5, obj.gz + 0.5], move: false, friction: 0.5, restitution: 0 });
                }
            }
        } else if (dy >= -50) {
            // 軽い版 (下方向 30〜50m または 上方向 20m以上)
            // ※ 上空のブロックを完全に消去してしまうと上に登れなくなるため、20mより上はすべて軽量版として残す
            if (obj.state !== 'lowpoly') {
                obj.state = 'lowpoly';
                if (obj.instIdx !== null) {
                    G.dummy.scale.set(0, 0, 0); G.dummy.updateMatrix();
                    if (G.mapInstancedMesh) {
                        G.mapInstancedMesh.setMatrixAt(obj.instIdx, G.dummy.matrix);
                        G.mapInstancedMesh.instanceMatrix.needsUpdate = true;
                    }
                    G.freeInstanceIndices.push(obj.instIdx);
                    obj.instIdx = null;
                }
                if (obj.lowPolyInstIdx === null && G.freeLowPolyInstanceIndices.length > 0) {
                    obj.lowPolyInstIdx = G.freeLowPolyInstanceIndices.pop();
                    G.dummy.position.set(obj.gx + 0.5, obj.gy + 0.5, obj.gz + 0.5);
                    G.dummy.scale.set(1, 1, 1); G.dummy.updateMatrix();
                    if (G.lowPolyMapInstancedMesh) {
                        G.lowPolyMapInstancedMesh.setMatrixAt(obj.lowPolyInstIdx, G.dummy.matrix);
                        G.lowPolyMapInstancedMesh.instanceMatrix.needsUpdate = true;
                    }
                }
                if (obj.body) {
                    const hIdx = G.hitboxHelpers.findIndex(h => h.body === obj.body);
                    if (hIdx !== -1) { G.scene.remove(G.hitboxHelpers[hIdx].mesh); G.hitboxHelpers.splice(hIdx, 1); }
                    G.world.removeRigidBody(obj.body);
                    obj.body = null;
                }
            }
        } else {
            // 完全消去 (下方向に50m以上離れている)
            G.mapGrid.delete(`${obj.gx},${obj.gy},${obj.gz}`);
            if (obj.instIdx !== null) {
                G.dummy.scale.set(0, 0, 0); G.dummy.updateMatrix();
                if (G.mapInstancedMesh) {
                    G.mapInstancedMesh.setMatrixAt(obj.instIdx, G.dummy.matrix);
                    G.mapInstancedMesh.instanceMatrix.needsUpdate = true;
                }
                G.freeInstanceIndices.push(obj.instIdx);
            }
            if (obj.lowPolyInstIdx !== null) {
                G.dummy.scale.set(0, 0, 0); G.dummy.updateMatrix();
                if (G.lowPolyMapInstancedMesh) {
                    G.lowPolyMapInstancedMesh.setMatrixAt(obj.lowPolyInstIdx, G.dummy.matrix);
                    G.lowPolyMapInstancedMesh.instanceMatrix.needsUpdate = true;
                }
                G.freeLowPolyInstanceIndices.push(obj.lowPolyInstIdx);
            }
            if (obj.body) {
                const hIdx = G.hitboxHelpers.findIndex(h => h.body === obj.body);
                if (hIdx !== -1) { G.scene.remove(G.hitboxHelpers[hIdx].mesh); G.hitboxHelpers.splice(hIdx, 1); }
                G.world.removeRigidBody(obj.body);
            }
            G.mapObjects.splice(i, 1);
        }
    }

    // フォグ
    if (G.camera.position.y<-0.51) { G.scene.fog.color.set(0x001122); G.scene.fog.near=0; G.scene.fog.far=40; }
    else { G.scene.fog.color.set(0x001122); G.scene.fog.near=0; G.scene.fog.far=75; }

    // HUD
    if (G.heightEl) G.heightEl.textContent = Math.max(0,Math.floor(pos.y))+'m';
    const elapsedPrecise = (Date.now() - G.startTime) / 1000;
    const elapsed = Math.floor(elapsedPrecise);
    if (G.timeEl) G.timeEl.textContent = `${Math.floor(elapsed/60).toString().padStart(2,'0')}:${(elapsed%60).toString().padStart(2,'0')}`;
    if (G.airEl) G.airEl.classList.toggle('hidden', G.isGrounded || G.jumpCount>=G.maxJumps);

    // マイルストーン達成判定 (50mごと)
    if (G.isStarted && !G.isGoalReached && G.currentMode === 'main' && pos.y >= G.nextMilestoneY) {
        if (!G.lapTimes) G.lapTimes = [];
        G.lapTimes.push({ distance: G.nextMilestoneY, time: elapsedPrecise });
        showRewardScreen();
        G.nextMilestoneY += 50;
    }

    // ゴール到達判定
    if (G.isStarted && !G.isGoalReached && G.currentMode === 'main' && pos.y >= config.goalHeight) {
        G.isGoalReached = true;
        if (!G.lapTimes) G.lapTimes = [];
        // ゴール距離がマイルストーンと重ならない場合のみ追加
        if (G.lapTimes.length === 0 || G.lapTimes[G.lapTimes.length - 1].distance !== config.goalHeight) {
            G.lapTimes.push({ distance: config.goalHeight, time: elapsedPrecise });
        }
        saveRecord(config.goalHeight, elapsedPrecise, G.lapTimes, config.density, config.areaSize);
    }

    // 落下リセット
    if (pos.y<-10) {
        let sx,sz,sy;
        if (G.currentMode==='tutorial') { sx=1.5;sz=1.5;sy=5.0; } else { sx=config.areaSize/2+0.5;sz=config.areaSize/2+0.5;sy=0.25; }
        G.playerBody.resetPosition(sx,sy,sz); vel.x=vel.y=vel.z=0;
    }

    // ネットワークプレイヤー補間
    G.networkEntities.forEach(ent => {
        if (ent.targetNetPos) {
            _tmpDp.copy(ent.targetNetPos); _tmpDp.y-=0.37;
            const dx=_tmpDp.x-ent.mesh.position.x, dz=_tmpDp.z-ent.mesh.position.z;
            if (Math.abs(dx)>0.01||Math.abs(dz)>0.01) ent.mesh.quaternion.slerp(_tmpQ.setFromAxisAngle(_tmpAxisY,Math.atan2(dx,dz)),0.15);
            ent.mesh.position.lerp(_tmpDp,0.2);
        }
    });

    // 弾丸自動発射
    if (G.isStarted && config.projectileAutoFire && G.controls && G.controls.isLocked && G.isRewarding === false) {
        if (G.keys.shift || G.keys.rightClick) {
            const now = Date.now();
            const projCooldown = 500 / (config.projectileRecoveryRate || 1);
            if (now - G.lastFireTimeProjectile >= projCooldown && G.playerProjectileStock >= 1.0) {
                G.lastFireTimeProjectile = now;
                G.playerProjectileStock -= 1.0;
                updateAmmoHUD();
                requestFire(0);
            }
        }
    }
    
    // 弾丸更新
    animateProjectiles(dt);

    // ダメージ判定
    if (G.isStarted && G.playerLives>0) {
        G.projectiles.forEach(p => {
            if (p.ownerBody!==G.playerBody && !p._hitFlag) {
                const dx=p.position.x-G.playerBody.position.x,dy=p.position.y-G.playerBody.position.y,dz=p.position.z-G.playerBody.position.z;
                if (dx*dx+dy*dy+dz*dz<0.35) { p._hitFlag=true; takeDamage(p.props ? p.props.damage : config.damageProjectile); }
            }
        });
        G.bubbles.forEach(b => {
            if (!b.body) return;
            const myId=G.myPeerId?String(G.myPeerId).trim():"", bOwnerId=b.ownerId?String(b.ownerId).trim():"";
            const isMyBubble=(b.ownerBody===G.playerBody)||(myId&&bOwnerId===myId);
            if (!isMyBubble&&!b._hitFlag&&(Date.now()-(b.spawnTime||0))>300) {
                const dx=b.body.position.x-G.playerBody.position.x,dy=b.body.position.y-G.playerBody.position.y,dz=b.body.position.z-G.playerBody.position.z;
                if (dx*dx+dy*dy+dz*dz<8.2) { b._hitFlag=true; takeDamage(b.props ? b.props.damage : config.damageBubble); }
            }
        });
    }
    updateSoapBubbles();

    // ホスト権威同期（20fps = 3フレームに1回、弾丸+シャボン両方）
    if (G.isHost&&G.isStarted) {
        if (!window.syncCounter) window.syncCounter=0; window.syncCounter++;
        if (window.syncCounter%3===0) {
            const sl=[];
            G.projectiles.forEach(p=>{
                if(p.netId != null) {
                    sl.push(p.netId, Math.round(p.position.x*100)/100, Math.round(p.position.y*100)/100, Math.round(p.position.z*100)/100);
                }
            });
            G.bubbles.forEach(b=>{
                if(b.netId != null && b.body) {
                    sl.push(b.netId, Math.round(b.body.position.x*100)/100, Math.round(b.body.position.y*100)/100, Math.round(b.body.position.z*100)/100);
                }
            });
            if (sl.length>0) broadcastEvent(12,{list:sl});
        }
    }

    // プレイヤー座標同期（20fps = 3フレームに1回、受信側はlerp補間で十分スムーズ）
    if (G.isOnline) {
        if (!window._posSyncCounter) window._posSyncCounter = 0;
        window._posSyncCounter++;
        if (window._posSyncCounter % 3 === 0) {
            broadcastEvent(1,{id:G.myPeerId,x:G.playerBody.position.x,y:G.playerBody.position.y,z:G.playerBody.position.z,jumps:G.jumpCount});
        }
    }

    // 死亡処理
    if (G.isDead) {
        G.deathTimer-=dt;
        if (G.deathTimer<=0) respawnPlayer();
        else G.deathTextEl.innerText='YOU DIED\n'+Math.ceil(G.deathTimer);
        G.playerBody.linearVelocity.set(0,0,0);
    }

    // ストック回復
    const pMov=(Math.abs(vel.x)>0.1||Math.abs(vel.z)>0.1);
    const pRecRate = pMov ? (config.projectileRecoveryRate / 8) : config.projectileRecoveryRate;
    G.playerProjectileStock=Math.min(3.0,G.playerProjectileStock+pRecRate*(1/3)*dt);
    G.playerBubbleStock=Math.min(1.0,G.playerBubbleStock+(config.bubbleRecoveryRate/10)*dt);
    updateAmmoHUD();
    G.entities.forEach(ent=>{
        if(ent.isAI&&!ent.isDead){const av=ent.body.linearVelocity,am=(Math.abs(av.x)>0.1||Math.abs(av.z)>0.1);const eRecRate=am?(config.projectileRecoveryRate/8):config.projectileRecoveryRate;ent.projectileStock=Math.min(3.0,(ent.projectileStock||0)+eRecRate*(1/3)*dt);ent.bubbleStock=Math.min(1.0,(ent.bubbleStock||0)+(config.bubbleRecoveryRate/10)*dt);}
    });

    // 鳥システム
    if (G.isStarted&&window.birds) {
        if (now-window.lastBirdSpawnTime>config.birdSpawnInterval) { window.lastBirdSpawnTime=now; if(window.spawnBirds)window.spawnBirds(); }
        for (let i=window.birds.length-1;i>=0;i--) {
            const b=window.birds[i]; b.mesh.position.addScaledVector(b.dir,b.speed*dt); b.distance+=b.speed*dt;
            if (b.mixer) b.mixer.update(dt);
            b.wingPhase+=15*dt;
            if (b.wingL) b.wingL.rotation.y=Math.sin(b.wingPhase)*0.5;
            if (b.wingR) b.wingR.rotation.y=-Math.sin(b.wingPhase)*0.5;
            if(b.distance>250){G.scene.remove(b.mesh);window.birds.splice(i,1);}
        }
    }
    if (G.water) {
        G.water.material.uniforms['time'].value += dt;
    }
    G.renderer.render(G.scene, G.camera);
}
