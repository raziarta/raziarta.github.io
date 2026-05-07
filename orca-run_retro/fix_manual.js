const fs = require('fs');
const texts = {
  2: `"name": "植物に侵食された路地裏",\n  "number": "ステージ2",`,
  4: `"name": "第一層 - 衰退した遺構",\n  "number": "ステージ4",\n  "chapter": 2,\n  "chapterTitle": "第2章　深淵",`,
  5: `"name": "第二層 - 異形の回廊",\n  "number": "ステージ5",`,
  7: `"name": "天空の浮遊要塞",\n  "number": "ステージ7",\n  "chapter": 3,\n  "chapterTitle": "第3章　彼方の試練",`,
  8: `"name": "沈んだ未来都市",\n  "number": "ステージ8",`,
  9: `"name": "惑星の核",\n  "number": "ステージ9",`
};

for (const id in texts) {
  let f = `data/stages/stage${id}.json`;
  let content = fs.readFileSync(f, 'utf8');
  let lengthIdx = content.indexOf('"length"');
  if (lengthIdx !== -1) {
    let top = '{\n  ' + texts[id] + '\n  ';
    let newContent = top + content.substring(lengthIdx);
    fs.writeFileSync(f, newContent, 'utf8');
    try {
        JSON.parse(newContent);
        console.log(`Success ${f}`);
    } catch (e) {
        console.log(`Still bad ${f}: ${e.message}`);
    }
  }
}
