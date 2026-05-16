'use strict';


/**
 * タイムトライアル用のゴーストを初期化・生成する
 */
function initGhosts() {
    // 既存のゴーストを削除
    G.ghosts.forEach(g => {
        if (g.mesh && G.scene) G.scene.remove(g.mesh);
        if (g.sprite && G.scene) G.scene.remove(g.sprite);
    });
    G.ghosts = [];

    if (config.raceType !== 'TIME TRIAL') return;

    // localStorageから記録を読み込む（全てのキーをスキャンして現在の条件に合うものを集約）
    G.ghostRecords = [];
    const currentDensityStr = config.density.toFixed(2);

    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ghost_records_')) {
            try {
                const parts = k.split('_');
                const isV3 = parts[2] === 'v3';
                const seed = isV3 ? parts[3] : parts[2];
                const height = parseInt(isV3 ? parts[4] : parts[3]);
                
                // シードと高度が一致するかチェック
                if (String(seed) === String(G.randomSeed) && height === config.goalHeight) {
                    const data = JSON.parse(localStorage.getItem(k));
                    if (Array.isArray(data)) {
                        data.forEach(r => {
                            // サイズと密度も一致するか（または古い形式で未定義か）
                            const rSize = r.areaSize !== undefined ? r.areaSize : 9;
                            const rDens = r.density !== undefined ? Number(r.density).toFixed(2) : '0.16';
                            
                            if (rSize === config.areaSize && rDens === currentDensityStr) {
                                G.ghostRecords.push(r);
                            }
                        });
                    }
                }
            } catch (e) { console.error("[TimeTrial] Error scanning key:", k, e); }
        }
    }

    if (G.ghostRecords.length > 0) {
        // 重複排除（パスが全く同じものは1つにする）
        const uniquePaths = new Set();
        G.ghostRecords = G.ghostRecords.filter(r => {
            const pathKey = r.path ? JSON.stringify(r.path[0]) + r.path.length + r.time : r.time;
            if (uniquePaths.has(pathKey)) return false;
            uniquePaths.add(pathKey);
            return true;
        });

        G.ghostRecords.sort((a, b) => a.time - b.time);
        G.ghostRecords = G.ghostRecords.slice(0, 11);
        console.log(`[TimeTrial] Aggregated ${G.ghostRecords.length} ghosts for Seed:${G.randomSeed} H:${config.goalHeight}`);
    } else {
        console.log(`[TimeTrial] No matching records found for Seed:${G.randomSeed}`);
    }

    // ゴーストメッシュの生成 (遅い順に生成して、最速が一番手前(上)に描画されるようにする)
    const renderOrder = [...G.ghostRecords].reverse();
    renderOrder.forEach((record) => {
        const rank = G.ghostRecords.indexOf(record) + 1;
        createGhostEntity(record, rank);
    });
}

/**
 * ゴースト単体を生成
 */
function createGhostEntity(record, rank) {
    if (!G.playerModel) return;

    const ghostGroup = new THREE.Group();
    const model = G.playerModel.clone();
    
    // 半透明化
    model.traverse(child => {
        if (child.isMesh) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0.4;
            // 順位に応じた色付け（オプション）
            if (rank === 1) child.material.color.setHex(0xffd700); // 金
            else if (rank === 2) child.material.color.setHex(0xc0c0c0); // 銀
            else if (rank === 3) child.material.color.setHex(0xcd7f32); // 銅
        }
    });
    ghostGroup.add(model);

    // 頭上の名前（順位） - 順位によって高さを変えて重なりを防ぐ
    const sprite = createNameSprite(`${rank}位`);
    sprite.position.y = 1.2 + (rank * 0.25); // Rank1=1.45, Rank2=1.70, etc.
    ghostGroup.add(sprite);

    G.scene.add(ghostGroup);
    
    G.ghosts.push({
        mesh: ghostGroup,
        sprite: sprite,
        path: record.path,
        time: record.time,
        rank: rank
    });
}

/**
 * 毎フレームのゴースト位置更新（補間）
 */
function updateGhosts(currentTime) {
    if (config.raceType !== 'TIME TRIAL') return;

    const frameIdx = Math.floor(currentTime * 60); // 60fps想定のフレームインデックス

    G.ghosts.forEach(ghost => {
        const path = ghost.path;
        // 2フレームに1回保存しているので、インデックスを調整
        const dataIdx = Math.floor(frameIdx / 2);
        
        if (dataIdx >= path.length - 1) {
            // 終了地点に固定
            const last = path[path.length - 1];
            ghost.mesh.position.set(last.x, last.y, last.z);
            return;
        }

        const p1 = path[dataIdx];
        const p2 = path[dataIdx + 1];

        // 補間係数 (0.0 - 1.0)
        // dataIdx * 2 が p1 のフレーム、 (dataIdx + 1) * 2 が p2 のフレーム
        const t = (frameIdx % 2 + (currentTime * 60 - frameIdx)) / 2;
        
        // 位置の補間 (0.37下げて接地させる)
        ghost.mesh.position.x = p1.x + (p2.x - p1.x) * t;
        ghost.mesh.position.y = (p1.y + (p2.y - p1.y) * t) - 0.37;
        ghost.mesh.position.z = p1.z + (p2.z - p1.z) * t;

        if (currentTime >= ghost.time) {
            // 記録時間を過ぎた＝完走済み
            const last = ghost.path[ghost.path.length - 1];
            ghost.mesh.position.set(last.x, last.y - 0.37, last.z);
            if (ghost.sprite && ghost.sprite.updateText) {
                ghost.sprite.updateText(`${ghost.rank}位: ${ghost.time.toFixed(2)}s`);
            }
            return;
        }

        // 頭上のスプライト更新 (順位: 高度m)
        const h = Math.max(0, Math.ceil(ghost.mesh.position.y + 0.37));
        if (ghost.sprite && ghost.sprite.updateText) {
            ghost.sprite.updateText(`${ghost.rank}位: ${h}m`);
        }

        // 回転の計算 (進行方向を向く)
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
            const angle = Math.atan2(dx, dz);
            ghost.mesh.rotation.y = angle;
        }
    });
}

/**
 * 現在の走行データを保存
 */
function saveTimeTrialRecord(finishTime) {
    if (!G.timeTrialPath || G.timeTrialPath.length === 0) return;

    const key = `ghost_records_v3_${G.randomSeed}_${config.goalHeight}_${config.areaSize}_${config.density.toFixed(2)}`;
    let saved = localStorage.getItem(key);
    let records = [];
    if (saved) {
        try { records = JSON.parse(saved); } catch (e) { records = []; }
    }

    const newRecord = {
        time: finishTime,
        seed: G.randomSeed,
        goalHeight: config.goalHeight,
        areaSize: config.areaSize,
        density: config.density,
        playerName: 'YOU', // 自分の記録として明記
        path: G.timeTrialPath, // [{x,y,z}, ...] 2フレームごとの座標
        laps: G.laps ? JSON.parse(JSON.stringify(G.laps)) : [], // ラップタイムを複製して保存
        date: new Date().toLocaleString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        })
    };

    records.push(newRecord);
    // タイム順にソートして上位11つを保持
    records.sort((a, b) => a.time - b.time);
    const finalRecords = records.slice(0, 11);
    
    const rank = finalRecords.indexOf(newRecord) + 1;
    if (rank > 0) {
        localStorage.setItem(key, JSON.stringify(finalRecords));
        console.log(`[TimeTrial] NEW RECORD! Time: ${finishTime.toFixed(2)}s | Rank: ${rank}/11 | Path Points: ${G.timeTrialPath.length} | Laps: ${newRecord.laps.length}`);
    } else {
        console.log(`[TimeTrial] Run finished (${finishTime.toFixed(2)}s) but didn't make the top 11.`);
    }
}

/**
 * 毎フレームの座標記録
 */
function recordPlayerPath() {
    if (config.raceType !== 'TIME TRIAL' || !G.isStarted || G.isGoalReached || G.isDead) return;

    G.frameCount++;
    if (G.frameCount % 2 === 0) {
        const pos = G.playerBody.position;
        G.timeTrialPath.push({
            x: Number(pos.x.toFixed(3)),
            y: Number(pos.y.toFixed(3)),
            z: Number(pos.z.toFixed(3))
        });
    }
}

/**
 * サーバー上の ./ghost_data/ から自動的にゴーストデータを読み込む
 * (開発サーバー等のディレクトリリスティング機能を利用)
 */
window.autoLoadGhostData = async function() {
    console.log("[AutoLoad] Fetching ./ghost_data/index.json ...");
    try {
        const response = await fetch('./ghost_data/index.json');
        if (!response.ok) {
            console.warn("[AutoLoad] index.json not found. Please create ghost_data/index.json with a list of files.");
            return;
        }
        
        const fileList = await response.json();
        if (!Array.isArray(fileList)) {
            console.error("[AutoLoad] index.json must be an array of file paths.");
            return;
        }

        console.log(`[AutoLoad] Found ${fileList.length} files in index.json`);

        for (const relativePath of fileList) {
            // パスの正規化 (例: "./ghost_data/Alice/data.json" -> "Alice/data.json")
            let cleanPath = relativePath.replace(/^\.\//, '').replace(/^\//, '');
            if (cleanPath.startsWith('ghost_data/')) {
                cleanPath = cleanPath.substring(11);
            }
            
            const parts = cleanPath.split('/');
            let playerName = "UNKNOWN";
            if (parts.length >= 2) {
                playerName = parts[0]; // フォルダ名をプレイヤー名にする
            } else if (parts.length === 1) {
                playerName = parts[0].split('.')[0] || "UNKNOWN"; // フォルダがない場合はファイル名
            }
            
            // fetch時は元の相対パスを安全に利用する
            const fetchUrl = relativePath.startsWith('http') || relativePath.startsWith('/') || relativePath.startsWith('./') 
                ? relativePath 
                : `./ghost_data/${relativePath}`;
                
            await importJsonFile(fetchUrl, playerName);
        }
        
        if (typeof renderRecordsContent === 'function') renderRecordsContent();
        
    } catch (e) {
        console.error("[AutoLoad] Error reading index.json:", e);
    }
};

async function scanPlayerFolder(playerName) {
    try {
        const response = await fetch(`./ghost_data/${playerName}/`);
        if (!response.ok) return;
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'))
            .map(a => a.getAttribute('href'))
            .filter(href => href && href.endsWith('.json'));

        for (const jsonHref of links) {
            await importJsonFile(`./ghost_data/${playerName}/${jsonHref}`, playerName);
        }
    } catch (e) {}
}

async function importJsonFile(url, playerName) {
    try {
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            let importCount = 0;
            for (const key in data) {
                if (key.startsWith('ghost_records_')) {
                    const existing = localStorage.getItem(key);
                    let merged = data[key];

                    // インポートする全レコードにプレイヤー名を強制上書き
                    merged.forEach(r => {
                        r.playerName = playerName;
                    });
                    
                    if (existing) {
                        try {
                            const old = JSON.parse(existing);
                            const map = new Map();
                            [...old, ...merged].forEach(r => {
                                const pName = r.playerName || 'YOU';
                                const id = `${r.time.toFixed(3)}_${r.seed}_${r.goalHeight}_${pName}`;
                                if (!map.has(id)) map.set(id, r);
                            });
                            merged = Array.from(map.values()).sort((a,b) => a.time - b.time).slice(0, 30);
                        } catch(e) {}
                    }
                    localStorage.setItem(key, JSON.stringify(merged));
                    importCount++;
                }
            }
            console.log(`[AutoLoad] Imported ${importCount} records from ${url} (Player: ${playerName})`);
        }
    } catch (e) {
        console.error("[AutoLoad] Failed to import:", url, e);
    }
}


/**
 * 全てのゴーストデータを一括でJSONとしてエクスポート（ダウンロード）
 */
window.exportGhostData = function() {
    const allData = {};
    let count = 0;

    // localStorage内の全てのゴースト関連データを収集
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ghost_records_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data) {
                    allData[key] = data;
                    count++;
                }
            } catch (e) {
                console.error("[Export] Error parsing key:", key, e);
            }
        }
    }
    
    if (count === 0) {
        alert("エクスポートするゴーストデータが1つも見つかりません。");
        return;
    }

    // ファイル名を作成 (日付入り)
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `all_ghost_records_${dateStr}.json`;
    
    // JSONをBlobとして作成
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);

    console.log(`[Export] Successfully exported ${count} ghost categories to ${fileName}`);
};


