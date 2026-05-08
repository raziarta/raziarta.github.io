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
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            display: none;
            padding: 40px;
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
        <div style="display: flex; flex-direction: column; height: 100%; max-width: 1200px; margin: 0 auto;">
            <!-- Header -->
            <div style="border-bottom: 3px solid #111; margin-bottom: 20px; padding-bottom: 5px;">
                <div style="font-size: 10px; font-weight: bold; color: #555;">■ SCREEN TITLE</div>
                <h1 style="font-size: 36px; font-weight: 900; letter-spacing: 2px; margin: 0; text-transform: uppercase;">RACE RECORDS</h1>
            </div>

            <div style="display: flex; flex: 1; gap: 30px; overflow: hidden;">
                <!-- Left Menu -->
                <div style="width: 320px; display: flex; flex-direction: column; gap: 8px;">
                    <div style="font-size: 10px; font-weight: bold; color: #555; margin-bottom: -5px;">■ RECORDS</div>
                    
                    <div style="background: #111; color: white; font-weight: bold; font-size: 15px; display: flex;">
                        <div style="padding: 10px 15px; flex: 1;">GAME MODE</div>
                        <div style="padding: 10px 15px; background: #222; text-align: right; width: 140px;">ASCENT</div>
                    </div>
                    
                    <!-- セレクタ部分 (WipeOut風の赤背景ハイライト) -->
                    <div style="background: #e60000; color: white; font-weight: bold; font-size: 15px; display: flex; position: relative;">
                        <div style="padding: 10px 15px; flex: 1;">GOAL HEIGHT</div>
                        <div style="padding: 10px 15px; background: #cc0000; display: flex; justify-content: space-between; align-items: center; width: 140px;">
                            <span style="cursor:pointer; padding: 0 5px;" onclick="changeRecordsHeight(-1)">◀</span>
                            <span>${currentHeight}m</span>
                            <span style="cursor:pointer; padding: 0 5px;" onclick="changeRecordsHeight(1)">▶</span>
                        </div>
                    </div>

                    <div style="flex: 1;"></div> <!-- spacer -->

                    <button onclick="clearAllRecords()" style="background: #ddd; border: none; padding: 12px; font-weight: bold; cursor: pointer; text-align: left; font-size: 13px; margin-bottom: 8px;">
                        ■ CLEAR ALL RECORDS
                    </button>
                    <button onclick="closeRecordsUI()" style="background: #111; color: white; border: none; padding: 15px; font-weight: bold; cursor: pointer; font-size: 16px; letter-spacing: 1px;">
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
                                <th style="padding: 10px 12px; width: 60px; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">▸ POS</th>
                                <th style="padding: 10px 12px; width: 120px; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">▸ TIME</th>
                                <th style="padding: 10px 12px; width: 150px; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">▸ DATE</th>
                                <th style="padding: 10px 12px; width: 100px; border-right: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">▸ DENSITY</th>
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
            const timeStr = formatTime(r.time);
            
            // WipeOut風の交互背景色
            const bgColor = (idx % 2 === 0) ? '#e8e8e8' : '#d8d8d8';
            
            // ラップタイム (4列グリッド - 1行4件)
            let lapsHtml = '';
            if (r.laps && r.laps.length > 0) {
                lapsHtml = `<div style="display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid rgba(0, 0, 0, 0.55); font-size: 11px; color: #444; font-family: monospace;">`;
                let prevTime = 0;
                r.laps.forEach((lap, lIdx) => {
                    const split = lap.time - prevTime;
                    prevTime = lap.time;
                    
                    const cumTimeStr = formatTime(lap.time);
                    const splitStr = split.toFixed(2);
                    
                    // 左側の線（列の区切り）
                    const borderLeft = (lIdx % 4 !== 0) ? 'border-left: 1px solid rgba(0,0,0,0.1);' : '';
                    // 2行目以降の上線（行の区切り）
                    const borderTop = (lIdx >= 4) ? 'border-top: 1px solid rgba(0,0,0,0.1);' : '';
                    
                    lapsHtml += `<div style="padding: 8px 4px; ${borderLeft} ${borderTop} text-align: center; background: rgba(255,255,255,0.1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <span style="font-size: 9px; opacity: 0.6;">${lap.distance}m</span>
                        <span style="font-weight: bold; margin: 0 4px;">${cumTimeStr}</span>
                        <span style="font-size: 10px; color: #844; font-style: italic;">(+${splitStr}s)</span>
                    </div>`;
                });
                lapsHtml += `</div>`;
            }

            // 古い記録にはdensityがない場合があるのでフォールバック
            const densStr = (r.density !== undefined) ? r.density.toFixed(2) : '-';
            const sizeStr = (r.mapsize !== undefined) ? r.mapsize : '-';

            html += `
                <tr style="background: ${bgColor};">
                    <td style="padding: 8px 12px; vertical-align: middle; font-size: 16px; border-right: 1px solid rgba(0,0,0,0.08);">${idx + 1}</td>
                    <td style="padding: 8px 12px; vertical-align: middle; font-size: 16px; color: #cc0000; font-family: monospace; border-right: 1px solid rgba(0,0,0,0.08);">${timeStr}</td>
                    <td style="padding: 8px 12px; vertical-align: middle; font-size: 13px; color: #333; border-right: 1px solid rgba(0,0,0,0.08);">${r.date}</td>
                    <td style="padding: 8px 12px; vertical-align: middle; font-size: 13px; color: #555; border-right: 1px solid rgba(0,0,0,0.08);">${densStr}</td>
                    <td style="padding: 8px 12px; vertical-align: middle; font-size: 13px; color: #555;">${sizeStr}</td>
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
}
