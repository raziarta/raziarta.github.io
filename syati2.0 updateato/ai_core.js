// ai_core.js - TensorFlow.js AI Integration

// グローバルスコープでアクセスできるようにvarを使用
var aiModel = null;
var aiReplayBuffer = [];
const AI_MAX_BUFFER_SIZE = 500000;
const AI_STATE_SIZE = 37; // 5x5 grid (25) + vel(3) + grounded(1) + goalRelY(1) + lastActions(2) + envFlags(5)
const AI_ACTION_SIZE = 3; // [mx, mz, jump] (戦闘系は一旦除外して登りに特化)

// 初期化
async function initAIModel() {
    if (aiModel) return; // 既にロード・初期化済みの場合はスキップ

    aiModel = tf.sequential();
    // 入力層の明示化と強化（層のユニット数を増やし、層を深くする）
    aiModel.add(tf.layers.inputLayer({ inputShape: [AI_STATE_SIZE] }));
    aiModel.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    aiModel.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    aiModel.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    aiModel.add(tf.layers.dense({ units: AI_ACTION_SIZE, activation: 'tanh' })); // -1.0 to 1.0 range
    
    // コンパイル
    aiModel.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
    console.log("[AI Core] TensorFlow.js Neural Network initialized with 37 inputs.");
}

// スクリプト読み込み時に即座に初期化
initAIModel();

// 状態の取得
function getAIObservation(ent, playerBody) {
    const pos = ent.body.position;
    const vel = ent.body.linearVelocity;
    
    // 5x5の周辺高さマップを取得
    const gridSize = 5;
    const half = Math.floor(gridSize / 2);
    const heightMap = [];
    const px = Math.floor(pos.x), py = Math.floor(pos.y), pz = Math.floor(pos.z);
    
    for (let dz = -half; dz <= half; dz++) {
        for (let dx = -half; dx <= half; dx++) {
            let h = -1.0; // デフォルト（足場なし）
            // 足元の数ブロック分を走査して最も高い位置を探す
            for (let dy = 2; dy >= -4; dy--) {
                if (G.mapGrid.has(`${px + dx},${py + dy},${pz + dz}`)) {
                    h = dy / 5.0; // 相対的な高さ
                    break;
                }
            }
            heightMap.push(h);
        }
    }

    const nextMembrane = G.membranes.find(m => m.y > pos.y) || { y: config.goalHeight };
    const goalRelY = (nextMembrane.y - pos.y) / 100;

    const obs = [
        ...heightMap, // 25 inputs
        vel.x / 10, vel.y / 10, vel.z / 10, // 3 inputs
        ent.isGrounded ? 1.0 : 0.0, // 1 input
        goalRelY, // 1 input
        (ent.lastMx || 0) / 5, (ent.lastMz || 0) / 5, // 2 inputs
        ent.debugWallAhead ? 1.0 : 0.0, // 1 input
        ent.debugGapAhead ? 1.0 : 0.0, // 1 input
        ent.debugHasOverhead ? 1.0 : 0.0, // 1 input
        ent.jumpCount || 0, // 1 input
        Math.min((ent.stuckTimer || 0) / 40.0, 1.0) // 1 input
    ];
    return obs;
}

// 行動の予測
function predictAIAction(state) {
    if (!aiModel) return [0, 0, 0, 0, 0];
    
    return tf.tidy(() => {
        const stateTensor = tf.tensor2d([state]);
        const prediction = aiModel.predict(stateTensor);
        return Array.from(prediction.dataSync());
    });
}

// 学習データの収集
function collectAIExperience(state, action, reward, nextState) {
    if (aiReplayBuffer.length >= AI_MAX_BUFFER_SIZE) {
        aiReplayBuffer.shift();
    }
    aiReplayBuffer.push({ state, action, reward, nextState });
}

// 学習の実行（集めた経験からバッチ学習）
async function trainAIModel() {
    try {
        if (!aiModel) {
            console.warn("AIモデルが初期化されていません。");
            return;
        }
        if (aiReplayBuffer.length < 32) {
            return;
        }
        
        document.getElementById('ai-train-status').innerText = "学習中...";
        console.log(`[AI Core] Training on ${aiReplayBuffer.length} samples...`);

        // 簡易的な方策勾配/Q学習の模倣
        // 報酬に基づいたターゲット（行動の微調整）の作成
        const states = aiReplayBuffer.map(e => e.state);
        const targets = aiReplayBuffer.map(e => {
            // 方策勾配的な簡易更新：報酬が高い行動に近づけ、低い行動から遠ざける
            return e.action.map(a => {
                if (e.reward > 0) return a * 0.9 + (a > 0 ? 0.1 : -0.1);
                if (e.reward < 0) return a * 0.8;
                return a;
            });
        });

        const statesTensor = tf.tensor2d(states);
        const targetsTensor = tf.tensor2d(targets);

        await aiModel.fit(statesTensor, targetsTensor, {
            epochs: 5,
            batchSize: 32,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`)
            }
        });

        statesTensor.dispose();
        targetsTensor.dispose();
        
        document.getElementById('ai-train-status').innerText = "学習完了 (Loss: " + aiModel.history?.history?.loss?.[0]?.toFixed(4) + ")";
        console.log("[AI Core] Training complete.");
    } catch (e) {
        console.error("Training Error:", e);
        alert("学習中にエラーが発生しました: " + e.message);
        document.getElementById('ai-train-status').innerText = "学習エラー";
    }
}

// モデルの保存（ブラウザ内）
async function saveAIModelLocally() {
    if (!aiModel) {
        alert("保存するAIモデルがありません。");
        return;
    }
    try {
        await aiModel.save('localstorage://rival-sphere-model');
        console.log("モデルをブラウザ(LocalStorage)に保存しました。");
    } catch(e) {
        console.error("保存に失敗しました: " + e.message);
    }
}

// モデルの読み込み（ブラウザ内）
async function loadAIModelLocally() {
    try {
        const loadedModel = await tf.loadLayersModel('localstorage://rival-sphere-model');
        aiModel = loadedModel;
        aiModel.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
        console.log("[AI Core] Model loaded from LocalStorage.");
        document.getElementById('ai-train-status').innerText = "モデルロード済";
    } catch (e) {
        console.warn("保存されたモデルが見つからないか、読み込みに失敗しました。");
    }
}

// モデルのエクスポート（ファイルとしてダウンロード）
async function downloadAIModel() {
    if (!aiModel) {
        alert("ダウンロードするAIモデルがありません。");
        return;
    }
    try {
        await aiModel.save('downloads://rival-sphere-model');
        alert("モデルファイル(JSON/BIN)をダウンロードしました。\nmodel/ai/ フォルダに配置して読み込ませることができます。");
    } catch(e) {
        alert("ダウンロードに失敗しました: " + e.message);
    }
}
