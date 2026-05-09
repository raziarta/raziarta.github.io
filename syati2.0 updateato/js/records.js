// ═══════════════════════════════════════════════════════
//  records.js — 記録の保存と閲覧
// ═══════════════════════════════════════════════════════
'use strict';

const STORAGE_KEY = 'raziarta_ascent_records';

/**
 * 記録を保存する
 * @param {number} height 到達高度(m)
 * @param {number} timeSec かかった時間(秒)
 * @param {Array} laps ラップタイムの配列
 * @param {number} density ブロックの密度
 * @param {number} mapsize マップのサイズ
 */
function saveRecord(height, timeSec, laps = [], density = 0.5, mapsize = 50) {
    const records = getRecords();
    const newRecord = {
        height: height,
        time: timeSec,
        laps: laps,
        density: density,
        mapsize: mapsize,
        date: new Date().toLocaleString('ja-JP', { 
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        })
    };
    records.push(newRecord);
    // 高度降順 -> タイム昇順でソート
    records.sort((a, b) => b.height - a.height || a.time - b.time);
    // 最新100件のみ保持
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 100)));
}

/**
 * 記録を取得する
 */
function getRecords() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// --- 記録閲覧UIのグローバル状態 ---
window._recordHeights = [];
window._currentHeightIndex = 0;
window._recordsMenuIdx = 0; // 0:GoalHeight, 1:Clear, 2:Back

/**
 * 記録を表示するUIを生成/更新する
 */
function showRecordsUI() {
    let container = document.getElementById('records-panel');
    if (!container) {
        container = document.createElement('div');
        container.id = 'records-panel';
        // 全画面の白/薄灰色ベースのWipeOut風スタイル
        container.style.cssText = `
            position: absolute;
            inset: 0;
            background: #f4f4f4;
            color: #111;
            z-index: 99999;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            display: none;
            padding: 0;
            pointer-events: auto;
            user-select: none;
        `;
        document.body.appendChild(container);
    }

    const records = getRecords();
    
    // 高度ごとにグループ化
    const grouped = {};
    records.forEach(r => {
        if (!grouped[r.height]) grouped[r.height] = [];
        grouped[r.height].push(r);
    });

    window._recordHeights = Object.keys(grouped).map(Number).sort((a,b) => b - a);
    if (window._recordHeights.length === 0) {
        window._recordHeights = [400]; // レコードがない場合のデフォルト
    }

    // 現在のインデックスをクランプ
    if (window._currentHeightIndex < 0) window._currentHeightIndex = 0;
    if (window._currentHeightIndex >= window._recordHeights.length) window._currentHeightIndex = window._recordHeights.length - 1;
    
    renderRecordsContent();
    container.style.display = 'block';
}

/**
 * UIの切り替え用
 */
window.changeRecordsHeight = function(dir) {
    if (window._recordHeights.length <= 1) return;
    window._currentHeightIndex += dir;
    if (window._currentHeightIndex < 0) window._currentHeightIndex = window._recordHeights.length - 1;
    if (window._currentHeightIndex >= window._recordHeights.length) window._currentHeightIndex = 0;
    renderRecordsContent();
};

window.closeRecordsUI = function() {
    const el = document.getElementById('records-panel');
    if (el) el.style.display = 'none';
};

window.clearAllRecords = function() {
    if (confirm('Clear all records?')) {
        localStorage.removeItem(STORAGE_KEY);
        showRecordsUI();
    }
};

/**
 * HTMLの描画更新
 */
function renderRecordsContent() {
    const container = document.getElementById('records-panel');
    if (!container) return;

    const records = getRecords();
    const grouped = {};
    records.forEach(r => {
        if (!grouped[r.height]) grouped[r.height] = [];
        grouped[r.height].push(r);
    });

    const currentHeight = window._recordHeights[window._currentHeightIndex];
    const currentRecords = grouped[currentHeight] || [];

    let html = `
        <div style="display: flex; flex-direction: column; height: 100%; width: calc(100% - 160px); position: relative;">
            <!-- Header (メインメニューの .menu-header と共通のレイアウト) -->
            <div class="menu-header" style="position: absolute; top: 20px; left: 80px; width: calc(100% - 160px); border-bottom-color: #111;">
                <div class="screen-title">■ SCREEN TITLE</div>
                <div class="main-title" style="color: #111;">RACE RECORDS</div>
            </div>

            <div style="display: flex; gap: 40px; overflow: hidden; flex: 1; margin-top: 140px; margin-left: 80px;">
                <!-- Sidebar -->
                <div style="width: 288px; display: flex; flex-direction: column; gap: 12px;">
                    <div style="font-size: 10px; font-weight: bold; color: #555; margin-bottom: -5px;">■ RECORDS</div>
                    
                    <div style="background: #111; color: white; font-weight: bold; font-size: 14px; display: flex;">
                        <div style="padding: 8px 12px; flex: 1;">GAME MODE</div>
                        <div style="padding: 8px 12px; background: #222; text-align: right; width: 120px;">ASCENT</div>
                    </div>
                    
                    <!-- セレクタ部分 (WipeOut風のハイライト) -->
                    <div id="records-item-0" style="background: #555; color: white; font-weight: bold; font-size: 14px; display: flex; position: relative; transition: all 0.3s ease-out; transform: scale(1); transform-origin: left center; z-index: 1;">
                        <div style="padding: 8px 12px; flex: 1;">GOAL HEIGHT</div>
                        <div id="records-height-box" style="padding: 8px 12px; background: #444; display: flex; justify-content: space-between; align-items: center; width: 120px;">
                            <span style="cursor:pointer; padding: 0 5px;" onclick="changeRecordsHeight(-1)">◀</span>
                            <span id="records-height-text">${currentHeight}m</span>
                            <span style="cursor:pointer; padding: 0 5px;" onclick="changeRecordsHeight(1)">▶</span>
                        </div>
                    </div>

                    <div style="flex: 1;"></div> <!-- spacer -->

                    <button id="records-item-1" onclick="clearAllRecords()" style="background: #ddd; color: #475569; border: none; padding: 10px 12px; font-weight: bold; cursor: pointer; text-align: left; font-size: 12px; margin-bottom: 5px; transition: all 0.3s ease-out; transform: scale(1); transform-origin: left center; z-index: 1;">
                        ■ CLEAR ALL RECORDS
                    </button>
                    <button id="records-item-2" onclick="closeRecordsUI()" style="background: #111; color: white; border: none; padding: 12px; font-weight: bold; cursor: pointer; font-size: 15px; letter-spacing: 1px; transition: all 0.3s ease-out; transform: scale(1); transform-origin: left center; z-index: 1;">
                        BACK TO MENU
                    </button>
                </div>

                <!-- Right Table -->
                <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                    <div style="text-align: right; font-size: 12px; font-weight: bold; margin-bottom: 5px; color: #333;">
                        ${currentRecords.length} RECORDS POSTED
                    </div>
                    <div style="flex: 1; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px; font-weight: bold;">
                            <tr style="background: #111; color: white; text-align: left;">
                                <th style="padding: 10px 12px; width: 60px; border-right: 1px solid #333; white-space: nowrap;">▸ POS</th>
                                <th style="padding: 10px 12px; width: 120px; border-right: 1px solid #333; white-space: nowrap;">▸ TIME</th>
                                <th style="padding: 10px 12px; width: 150px; border-right: 1px solid #333; white-space: nowrap;">▸ DATE</th>
                                <th style="padding: 10px 12px; width: 100px; border-right: 1px solid #333; white-space: nowrap;">▸ DENSITY</th>
                                <th style="padding: 10px 12px; white-space: nowrap;">▸ MAPSIZE</th>
                            </tr>
    `;

    if (currentRecords.length === 0) {
        html += `<tr><td colspan="5" style="padding: 30px; text-align: center; color: #888;">NO RECORDS FOR THIS HEIGHT</td></tr>`;
    } else {
        currentRecords.forEach((r, idx) => {
            const formatTime = (sec) => {
                const m = Math.floor(sec / 60);
                const s = (sec % 60).toFixed(2);
                return `${m}:${s.padStart(5, '0')}`;
            };
            const timeStr = formatTime(r.elapsedPrecise || r.time);
            const bgColor = (idx % 2 === 0) ? '#f4f4f4' : '#fff';
            
            // ラップタイム (4列グリッド - 1行4件)
            let lapsHtml = '';
            if (r.laps && r.laps.length > 0) {
                lapsHtml = `<div style="display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid #ddd; font-size: 11px; color: #666; font-family: monospace;">`;
                let prevTime = 0;
                r.laps.forEach((lap, lIdx) => {
                    const split = lap.time - prevTime;
                    prevTime = lap.time;
                    
                    const cumTimeStr = formatTime(lap.time);
                    const splitStr = split.toFixed(2);
                    
                    // 左側の線（列の区切り）
                    const borderLeft = (lIdx % 4 !== 0) ? 'border-left: 1px solid #eee;' : '';
                    // 2行目以降の上線（行の区切り）
                    const borderTop = (lIdx >= 4) ? 'border-top: 1px solid #eee;' : '';
                    
                    lapsHtml += `<div style="padding: 8px 4px; ${borderLeft} ${borderTop} text-align: center; background: rgba(0,0,0,0.02); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <span style="font-size: 9px; opacity: 0.6; color: #888;">${lap.distance}m</span>
                        <span style="font-weight: bold; margin: 0 4px; color: #111;">${cumTimeStr}</span>
                        <span style="font-size: 10px; color: #e60000; font-style: italic;">(+${splitStr}s)</span>
                    </div>`;
                });
                lapsHtml += `</div>`;
            }

            // 古い記録にはdensityがない場合があるのでフォールバック
            const densStr = (r.density !== undefined) ? r.density.toFixed(2) : '-';
            const sizeStr = (r.mapsize !== undefined) ? r.mapsize : '-';

            html += `
                <tr style="background: ${bgColor}; color: #333;">
                    <td style="padding: 8px 12px; vertical-align: middle; font-size: 16px; border-right: 1px solid #eee;">${idx + 1}</td>
                    <td style="padding: 8px 12px; vertical-align: middle; font-size: 16px; color: #e60000; font-family: monospace; border-right: 1px solid #eee;">${timeStr}</td>
                    <td style="padding: 8px 12px; vertical-align: middle; font-size: 13px; color: #666; border-right: 1px solid #eee;">${r.date}</td>
                    <td style="padding: 8px 12px; vertical-align: middle; font-size: 13px; color: #666; border-right: 1px solid #eee;">${densStr}</td>
                    <td style="padding: 8px 12px; vertical-align: middle; font-size: 13px; color: #666;">${sizeStr}</td>
                </tr>
            `;
            
            if (lapsHtml) {
                html += `
                <tr style="background: ${bgColor}; border-bottom: 13px solid #f4f4f4;">
                    <td colspan="5" style="padding: 0 12px 0 12px;">
                        ${lapsHtml}
                    </td>
                </tr>
                `;
            } else {
                html += `<tr style="border-bottom: 3px solid #f4f4f4;"></tr>`;
            }
        });
    }

    html += `
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    
    // 初回のビジュアル適用
    updateRecordsMenuVisual();
}

/**
 * レコード画面のサイドバー選択ビジュアルのみを更新 (アニメーション用)
 */
function updateRecordsMenuVisual() {
    const items = [
        document.getElementById('records-item-0'),
        document.getElementById('records-item-1'),
        document.getElementById('records-item-2')
    ];
    
    items.forEach((el, idx) => {
        if (!el) return;
        const isActive = (idx === window._recordsMenuIdx);
        
        if (idx === 0) {
            el.style.background = isActive ? '#0ea5e9' : '#555';
            const box = document.getElementById('records-height-box');
            if (box) box.style.background = isActive ? '#0284c7' : '#444';
        } else if (idx === 1) {
            el.style.background = isActive ? '#0ea5e9' : '#ddd';
            el.style.color = isActive ? '#fff' : '#475569';
        } else if (idx === 2) {
            el.style.background = isActive ? '#0ea5e9' : '#111';
        }
        
        el.style.transform = isActive ? 'scale(1.08)' : 'scale(1)';
        el.style.zIndex = isActive ? '10' : '1';
    });
}

/**
 * レコード画面用のキーボード操作ハンドラ
 */
window.handleRecordsKey = function(e) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        window._recordsMenuIdx = (window._recordsMenuIdx - 1 + 3) % 3;
        updateRecordsMenuVisual();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        window._recordsMenuIdx = (window._recordsMenuIdx + 1) % 3;
        updateRecordsMenuVisual();
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (window._recordsMenuIdx === 0) {
            changeRecordsHeight(-1);
            // 高度テキストだけ更新して全体リロードを避ける
            const heightText = document.getElementById('records-height-text');
            if (heightText) heightText.innerText = window._recordHeights[window._currentHeightIndex] + 'm';
        }
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (window._recordsMenuIdx === 0) {
            changeRecordsHeight(1);
            const heightText = document.getElementById('records-height-text');
            if (heightText) heightText.innerText = window._recordHeights[window._currentHeightIndex] + 'm';
        }
    } else if (e.key === 'Enter' || e.key === ' ') {
        if (window._recordsMenuIdx === 1) clearAllRecords();
        else if (window._recordsMenuIdx === 2) closeRecordsUI();
    } else if (e.key === 'Escape') {
        closeRecordsUI();
    }
};
