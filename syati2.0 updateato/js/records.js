// ═══════════════════════════════════════════════════════
//  records.js — 記録の保存と閲覧
// ═══════════════════════════════════════════════════════
'use strict';

const STORAGE_KEY = 'raziarta_ascent_records';

/**
 * 記録を保存する
 * @param {number} height 到達高度(m)
 * @param {number} timeSec かかった時間(秒)
 */
function saveRecord(height, timeSec) {
    const records = getRecords();
    const newRecord = {
        height: height,
        time: timeSec,
        date: new Date().toLocaleString('ja-JP', { 
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        })
    };
    records.push(newRecord);
    // 高度降順 -> タイム昇順でソート
    records.sort((a, b) => b.height - a.height || a.time - b.time);
    // 最新50件のみ保持
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 50)));
}

/**
 * 記録を取得する
 */
function getRecords() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

/**
 * 記録を表示するUIを生成/更新する
 */
function showRecordsUI() {
    let container = document.getElementById('records-panel');
    if (!container) {
        container = document.createElement('div');
        container.id = 'records-panel';
        container.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(10, 10, 20, 0.95);
            border: 1px solid rgba(100, 180, 255, 0.3);
            border-radius: 12px;
            padding: 30px;
            color: white;
            z-index: 200;
            width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 0 50px rgba(0,0,0,0.8);
            display: none;
            backdrop-filter: blur(10px);
            pointer-events: auto;
        `;
        document.body.appendChild(container);
    }

    const records = getRecords();
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
            <h2 style="font-size:18px; letter-spacing:2px; color:#64b4ff;">BEST RECORDS</h2>
            <button onclick="document.getElementById('records-panel').style.display='none'" style="background:none; border:none; color:#556; cursor:pointer; font-size:20px;">×</button>
        </div>
    `;

    if (records.length === 0) {
        html += `<div style="text-align:center; color:#556; padding:20px;">No records yet.</div>`;
    } else {
        html += `<table style="width:100%; border-collapse:collapse; font-size:13px;">
            <tr style="color:#556; text-align:left; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <th style="padding:8px 0;">HEIGHT</th>
                <th>TIME</th>
                <th>DATE</th>
            </tr>`;
        records.forEach(r => {
            const m = Math.floor(r.time / 60);
            const s = r.time % 60;
            const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
            html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                <td style="padding:10px 0; color:#fff; font-weight:bold;">${r.height}m</td>
                <td style="color:#aaccaa;">${timeStr}</td>
                <td style="color:#556; font-size:11px;">${r.date}</td>
            </tr>`;
        });
        html += `</table>`;
        html += `<button onclick="if(confirm('Clear all records?')){localStorage.removeItem('${STORAGE_KEY}'); showRecordsUI();}" style="margin-top:20px; width:100%; background:rgba(255,50,50,0.1); border:1px solid rgba(255,50,50,0.2); color:#f55; padding:8px; border-radius:4px; font-size:11px; cursor:pointer;">CLEAR ALL</button>`;
    }

    container.innerHTML = html;
    container.style.display = 'block';
}
