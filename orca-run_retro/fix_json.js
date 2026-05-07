const fs = require('fs');

const stageTexts = {
  1: {
    name: "崩落したビル群",
    number: "ステージ1",
    chapterTitle: "第1章　全てを失った世界",
    subtitles: [
      {dist: 100, text: "人類が滅んだのは、もう随分前のことだ。"},
      {dist: 2000, text: "朽ちたビルの壁に、色褪せたポスターが見える。"},
      {dist: 4000, text: "「シャチのショー、毎日開催！」——かつての記録。"},
      {dist: 7000, text: "見世物だった奴らが、今は街を闊歩している。"},
      {dist: 10000, text: "皮肉なものだ。自由とは、こういうものなのか。"}
    ]
  },
  2: {
    name: "植物に侵食された路地裏",
    number: "ステージ2",
    subtitles: [
      {dist: 100, text: "路地裏を苔が覆い、花が咲いている。"},
      {dist: 3000, text: "錆びたベンチ。ブラウン管のテレビ。誰かの日常の残骸。"},
      {dist: 6000, text: "窓から差し込む光が、静かに塵を照らしている。"},
      {dist: 9000, text: "この場所には、まだ彼らの温もりが残っている気がした。"},
      {dist: 11500, text: "だが、感傷に浸る暇はない。前へ。"}
    ]
  },
  3: {
    name: "巨大クレーターの縁",
    number: "ステージ3",
    subtitles: [
      {dist: 100, text: "巨大なクレーターの縁に辿り着いた。底が見えない。"},
      {dist: 3000, text: "足元が崩れやすい。慎重に進む必要がある。"},
      {dist: 6000, text: "遠くから、地の底から這い出るような咆哮が聞こえる。"},
      {dist: 9000, text: "ついに、ここまで来た。引き返す道はとうにない。"},
      {dist: 13500, text: "巨大な影がうごめいている。覚悟を決めろ。"}
    ]
  },
  4: {
    name: "第一層 - 衰退した遺構",
    number: "ステージ4",
    chapterTitle: "第2章　深淵",
    subtitles: [
      {dist: 100, text: "クレーターの内壁を降りていく。残骸の建物が見える。"},
      {dist: 2500, text: "かつてここにも人がいた。壁にはまだ文字が残っている。"},
      {dist: 5000, text: "光が届かなくなってきた。だが、何かが蠢いている。"},
      {dist: 8000, text: "第一層。地上の名残が、少しずつ消えていく。"}
    ]
  },
  5: {
    name: "第二層 - 異形の回廊",
    number: "ステージ5",
    subtitles: [
      {dist: 100, text: "第二層。音が消えた。自分の足音すら聞こえない。"},
      {dist: 3000, text: "壁に刻まれた文字。読めない言語。人のものではない。"},
      {dist: 6000, text: "異形たちが徘徊している。ここは彼らの領域だ。"},
      {dist: 9000, text: "現実が歪んでいる。進むしかない。"}
    ]
  },
  6: {
    name: "第三層 - 終焉の淵",
    number: "ステージ6",
    subtitles: [
      {dist: 100, text: "第三層。ついに底が見えてきた。"},
      {dist: 3500, text: "空間が歪んでいる。ここはもはや、元の世界ではない。"},
      {dist: 7000, text: "全てが静止しているようだ。だが、確かな悪意を感じる。"},
      {dist: 11000, text: "終わりの時が近い。深淵の主が待っている。"}
    ]
  },
  7: {
    name: "天空の浮遊要塞",
    number: "ステージ7",
    chapterTitle: "第3章　彼方の試練",
    subtitles: [
      {dist: 100, text: "地表を離れ、空へ。雲の隙間から光が射す。"},
      {dist: 3000, text: "上昇気流が吹いている。足場を見極めろ。"},
      {dist: 6000, text: "巨大な鷲が、嵐を従えて向かって来る。"},
      {dist: 9000, text: "上昇開始。雲の上の世界へ。"},
      {dist: 11000, text: "空気が薄い。だが、まだ上がある。"},
      {dist: 14000, text: "嵐の中心。鷲の領域に踏み込んだ。"},
      {dist: 14600, text: "高度を下げ、下層世界へ。決戦の地へ。"}
    ]
  },
  8: {
    name: "沈んだ未来都市",
    number: "ステージ8",
    subtitles: [
      {dist: -900, text: "水の中。かつての都市が、静かに沈んでいる。"},
      {dist: 3000, text: "水圧が体を締め付ける。動きが鈍い。"},
      {dist: 6000, text: "廃墟の奥から、何かの気配。"},
      {dist: 9000, text: "光るクラゲが道を照らす。敵か、味方か。"},
      {dist: 12000, text: "この都市の主が、目を覚ました。"},
      {dist: 15000, text: "巨大な影。逃げ場はない。"}
    ]
  },
  9: {
    name: "惑星の核",
    number: "ステージ9",
    subtitles: [
      {dist: 100, text: "溶岩が脈打っている。"},
      {dist: 3000, text: "マグマの海が足元を流れる。一歩を踏み外せば終わり。"},
      {dist: 6000, text: "結晶体がレーザーを放つ。すべてを焼き尽くそうとしている。"},
      {dist: 9000, text: "岩が崩れている。時間がない。"},
      {dist: 12000, text: "地殻の最深部。ここが世界の中心。"},
      {dist: 13500, text: "炎の巨人が立ちはだかる。最後の試練。"},
      {dist: 16000, text: "全てを乗り越えた先に、何があるのか。"}
    ]
  }
};

for (let i = 1; i <= 9; i++) {
  const file = `data/stages/stage${i}.json`;
  if (!stageTexts[i]) continue;
  try {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace name
    content = content.replace(/"name"\s*:\s*".*/, `"name": "${stageTexts[i].name}",`);
    // Replace number
    content = content.replace(/"number"\s*:\s*".*/, `"number": "${stageTexts[i].number}",`);
    
    // Replace chapterTitle if it exists, or add it if needed
    if (stageTexts[i].chapterTitle) {
      if (content.includes('"chapterTitle"')) {
        content = content.replace(/"chapterTitle"\s*:\s*".*/, `"chapterTitle": "${stageTexts[i].chapterTitle}",`);
      } else {
        // Insert after chapter if it exists
        content = content.replace(/"chapter"\s*:\s*\d+,/, `$& \n  "chapterTitle": "${stageTexts[i].chapterTitle}",`);
      }
    }
    
    // Replace subtitles array
    // It starts with "subtitles": [ and ends with ],
    // Since there are other arrays, we must match carefully.
    // The subtitles array is usually near the end before "objects": [] or "spawnX"
    content = content.replace(/"subtitles"\s*:\s*\[[\s\S]*?\n  \],/, `"subtitles": ${JSON.stringify(stageTexts[i].subtitles, null, 4).replace(/\n/g, '\n  ')},`);
    
    // If the trailing comma was stripped or mismatched, let's just make sure it's valid:
    // If the regex above fails because the end of the array is corrupted, let's try a broader match:
    // "subtitles": [ ... to the end of the file except the last few lines (objects, spawnX, spawnY)
    if (!content.includes(stageTexts[i].subtitles[0].text)) {
        // Fallback for subtitles replacement
        const subIndex = content.indexOf('"subtitles"');
        if (subIndex !== -1) {
            const objIndex = content.indexOf('"objects"', subIndex);
            if (objIndex !== -1) {
                const before = content.substring(0, subIndex);
                const after = content.substring(objIndex);
                content = before + `"subtitles": ${JSON.stringify(stageTexts[i].subtitles, null, 4).replace(/\n/g, '\n  ')},\n  ` + after;
            } else {
                const spawnIndex = content.indexOf('"spawnX"', subIndex);
                if (spawnIndex !== -1) {
                    const before = content.substring(0, subIndex);
                    const after = content.substring(spawnIndex);
                    content = before + `"subtitles": ${JSON.stringify(stageTexts[i].subtitles, null, 4).replace(/\n/g, '\n  ')},\n  ` + after;
                }
            }
        }
    }

    // Still fails? Just write it out.
    fs.writeFileSync(file, content, 'utf8');
    
    // Verify JSON parse
    try {
        JSON.parse(content);
        console.log(`Successfully fixed and verified ${file}`);
    } catch (e) {
        console.log(`Fixed but still invalid JSON ${file}: ${e.message}`);
    }
    
  } catch (err) {
    console.error(`Error on ${file}:`, err.message);
  }
}
