// === RELICS.JS - 旧世界の遺物 Collection System ===
const Relics = {
  isOpen: false,
  selectedIndex: 0,
  scrollOffset: 0,
  syncMessage: null,
  syncTimer: 0,

  // Relic chips active in current stage
  chips: [],

  entries: [
    // === Stage 0 ===
    { id: 'dog_tag', stage: 0, name: '鎖付きの薄い金属片',
      src: 'assets/sprites/artifacts/dog_tag/dog_tag.png',
      desc: '首から下げるための鎖がついた、薄い金属の板。表面には意味不明な記号が規則的に刻まれている。\n金属は錆びているが、刻印だけは妙にくっきりと残っていた。\nこれで個体を識別していたのだろうか。\n我々は顔と声で仲間を見分けるが、彼らにはそれすらできなかったのか。' },

    // === Stage 1 ===
    { id: 'smartphone', stage: 1, name: '光らない黒い板',
      src: 'assets/sprites/artifacts/smartphone/smartphone.png',
      desc: 'ビルの瓦礫の隙間から見つけた、手のひらに収まる黒い板。\n片面はひび割れた透明な素材で覆われている。\nかつてはここに光が灯り、何かを映し出していたのかもしれない。\n彼らはこの小さな板に、一体何を見ていたのだろう。\n海の広さも、空の深さも、この板の中には収まらないだろうに。' },
    { id: 'hard_hat', stage: 1, name: '頭を覆う硬い半球',
      src: 'assets/sprites/artifacts/hard_hat/hard_hat.png',
      desc: '鮮やかな黄色をした硬い殻。内側に布が張られており、頭部を包み込む形をしている。\n崩れかけたビルの足元に転がっていた。\nこの程度の薄い殻で、あの巨大な建造物の崩落から身を守れると思っていたのだろうか。\n彼らの楽観主義には、ある種の敬意すら覚える。' },

    // === Stage 2 ===
    { id: 'watering_can', stage: 2, name: '空洞にとがったものがついた物体',
      src: 'assets/sprites/artifacts/watering_can/watering_can.png',
      desc: '植物の近くに転がっていた。取っ手がついていて、かつての主が握りやすいように作られたものなのだろう。\n中は空洞で、不自然なほど細く尖った先端から何かを出す構造になっている。\n水……だろうか。植物に水を与えるために、わざわざこんな道具を作ったのか。\n海にいれば水など無限にあるものを。陸に縛られた者の発想は、どこか滑稽だ。' },
    { id: 'broken_tv', stage: 2, name: '何も映さない四角い窓',
      src: 'assets/sprites/artifacts/broken_tv/broken_tv.png',
      desc: '路地裏の奥で見つけた、大きな四角い箱。正面に灰色の板がはめ込まれている。\n「黒い板」の巨大版のようだが、こちらは持ち運べない。\n彼らはこの箱の前に座り、何時間も動かずに過ごしていたらしい。\n自らの足で世界を見に行くことを放棄し、箱の中の偽物の世界を眺めていた。\n……我々には理解しがたい習性だ。だが、それが彼らの「自由」だったのかもしれない。' },

    // === Stage 3 ===
    { id: 'binoculars', stage: 3, name: '二つの筒がつながった覗き穴',
      src: 'assets/sprites/artifacts/binoculars/binoculars.png',
      desc: 'クレーターの縁に落ちていた。二つの筒が並んで固定されており、片方から覗くと遠くのものが大きく見える。\n壊れた片方のレンズには、空の色だけが映っていた。\n遠くを見たいという欲求は理解できる。我々も海面から空を見上げることがあった。\nだが、見るだけで満足し、実際に行こうとはしなかったのだろうか。' },

    // === Stage 4 ===
    { id: 'diving_helmet', stage: 4, name: '球体に窓がついた被り物',
      src: 'assets/sprites/artifacts/diving_helmet/diving_helmet.png',
      desc: '重い金属製の球体。正面に小さな丸い窓がついている。\nこれを頭に被って、海の中に入ろうとしたらしい。\n……愚かとしか言いようがない。\n自分たちの領域でもない深淵に、こんな粗末な装備で踏み込もうとした。\n海は招かれざる客を歓迎しない。それを知らなかったのか、知っていて無視したのか。\nどちらにせよ、その結末は見ての通りだ。' },

    // === Stage 5 ===
    { id: 'flashlight', stage: 5, name: '光を放つ筒',
      src: 'assets/sprites/artifacts/flashlight/flashlight.png',
      desc: '筒状の金属。片方の端から強い光を放つ仕組みになっている。\n深淵の闇を、この程度の人工の光で照らせると思っていたのか。\n海の底に存在する「闇」は、光の届かない場所ではない。光そのものを飲み込む場所だ。\nこの筒を握りしめて暗闇に立ち向かった者の最期を、我々は知っている。' },
    { id: 'research_log', stage: 5, name: '水を吸った薄い葉の束',
      src: 'assets/sprites/artifacts/research_log/research_log.png',
      desc: '薄い白い葉が何枚も重なって束ねられている。表面にびっしりと記号が書かれていたが、水を吸ってほとんど読めない。\nかろうじて「深度」「圧力」「生体反応」といった文字が見える。\n彼らは深淵を「研究」しようとしていた。名前をつけ、数値で測り、理解したつもりになる。\nそれが最も愚かな行為だと、なぜ気づかなかったのか。\n名前をつけたところで、深淵は彼らのものにはならない。' },

    // === Stage 6 ===
    { id: 'compass', stage: 6, name: '小さな箱の中で震える針',
      src: 'assets/sprites/artifacts/compass/compass.png',
      desc: '手のひらに収まる丸い箱。中に細い針が一本、絶えず震えながら一方向を指し示している。\nこの針が指す先に、彼らは何を求めていたのだろう。\n終焉の淵まで来てなお方角を知ろうとする執念。\nだが、ここには「方角」などという概念は意味をなさない。\n上も下も、北も南もない。あるのはただ、虚無だけだ。' },

    // === Stage 7 ===
    { id: 'satellite_piece', stage: 7, name: '空から落ちてきた金属の翼',
      src: 'assets/sprites/artifacts/satellite_piece/satellite_piece.png',
      desc: '薄い金属の板が、太陽光を反射して青白く光っている。\nかつて空の遥か上を漂っていたものの破片らしい。\n彼らは地上を支配するだけでは飽き足らず、空の向こうにまで手を伸ばした。\nその残骸が今、地に落ちて朽ちている。なんとも象徴的な光景だ。' },

    // === Stage 8 ===
    { id: 'music_box', stage: 8, name: '回すと音を出す小さな箱',
      src: 'assets/sprites/artifacts/music_box/music_box.png',
      desc: '精巧な細工が施された小さな箱。横についた取っ手を回すと、金属の歯が弾かれて澄んだ音が鳴る。\n海底に沈んでいたにもかかわらず、まだかろうじて音が出る。\n……不思議な道具だ。何の役にも立たない。武器でもなく、食料を得る道具でもない。\nただ音を出すためだけに、これほどの技術を注いでいる。\n彼らの文明の中で、唯一理解できるものかもしれない。' },

    // === Stage 9 ===
    { id: 'photo_frame', stage: 9, name: '透明な板に閉じ込められた景色',
      src: 'assets/sprites/artifacts/photo_frame/photo_frame.png',
      desc: '四角い枠の中に、透明な板で挟まれた一枚の薄い葉。\nそこには、色あせてはいるが、かつての景色が焼き付けられている。\n青い海、白い砂浜、そしてそこに立つ数体の人間。笑っているように見える。\n……この景色は、もうどこにも存在しない。\nだが、この薄い葉の中にだけは、まだ残っている。\n彼らが最後まで手放さなかったもの。それがこの「記憶」なのだとしたら、\n我々が思うほど、彼らは愚かではなかったのかもしれない。' },
  ],

  getCollected() {
    return JSON.parse(localStorage.getItem('orcaRunRelics') || '[]');
  },

  collect(relicId) {
    const collected = this.getCollected();
    if (!collected.includes(relicId)) {
      collected.push(relicId);
      localStorage.setItem('orcaRunRelics', JSON.stringify(collected));
      this.syncMessage = 'Data Synced';
      this.syncTimer = 180;
      return true;
    }
    return false;
  },

  // Spawn relic chips for a stage
  spawnChips(stageIndex) {
    this.chips = [];
    const stage = LevelManager.getCurrentStage();
    if (stage && stage.relicChips) {
      const collected = this.getCollected();
      stage.relicChips.forEach(chip => {
        if (!collected.includes(chip.relicId)) {
          this.chips.push({
            relicId: chip.relicId,
            x: chip.x,
            y: chip.y,
            hw: 12, hh: 12,
            alive: true,
            frame: 0
          });
        }
      });
    }
  },

  updateChips(player, camX) {
    // Sync message timer
    if (this.syncTimer > 0) this.syncTimer--;
    if (this.syncTimer <= 0) this.syncMessage = null;

    this.chips.forEach(chip => {
      if (!chip.alive) return;
      chip.frame++;
      // Convert chip world position to screen position for collision
      const screenX = chip.x - camX;
      const chipScreen = { x: screenX, y: chip.y, hw: chip.hw, hh: chip.hh };
      if (Physics.aabb(chipScreen, player)) {
        chip.alive = false;
        this.collect(chip.relicId);
        if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
      }
    });
    this.chips = this.chips.filter(c => c.alive);
  },

  drawChips(ctx, camX) {
    this.chips.forEach(chip => {
      const sx = chip.x - camX;
      const sy = chip.y;
      const bob = Math.sin(chip.frame * 0.05) * 4;

      ctx.save();
      ctx.translate(sx, sy + bob);

      // Glow
      ctx.shadowColor = '#44ddff';
      ctx.shadowBlur = 8 + Math.sin(chip.frame * 0.1) * 4;

      // Chip body
      ctx.fillStyle = '#225588';
      ctx.fillRect(-10, -8, 20, 16);
      ctx.fillStyle = '#44ccff';
      ctx.fillRect(-8, -6, 16, 12);

      // Circuit lines
      ctx.strokeStyle = '#225588';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, -6); ctx.lineTo(-4, 6);
      ctx.moveTo(0, -6); ctx.lineTo(0, 6);
      ctx.moveTo(4, -6); ctx.lineTo(4, 6);
      ctx.moveTo(-8, -2); ctx.lineTo(8, -2);
      ctx.moveTo(-8, 2); ctx.lineTo(8, 2);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -2, 4, 4);

      ctx.restore();
    });
  },

  drawSyncMessage(ctx, W, H) {
    if (!this.syncMessage || this.syncTimer <= 0) return;
    const alpha = this.syncTimer > 120 ? Math.min(1, (180 - this.syncTimer) / 30)
                : this.syncTimer < 30 ? this.syncTimer / 30 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#44ccff';
    ctx.textAlign = 'center';
    ctx.fillText(this.syncMessage, W / 2, H * 0.25);
    ctx.restore();
  },

  // === Gallery UI ===
  open() {
    this.isOpen = true;
    this.selectedIndex = 0;
    if (typeof Game !== 'undefined') {
      Game.state = 'RELICS';
      const titleScreen = document.getElementById('title-screen');
      if (titleScreen) titleScreen.classList.add('hidden');
    }
  },

  close() {
    this.isOpen = false;
    if (typeof Game !== 'undefined') Game.resetToTitle();
  },

  draw(ctx) {
    const W = Game.width, H = Game.height;
    const collected = this.getCollected();

    // Background
    ctx.fillStyle = 'rgba(5, 3, 12, 0.95)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < H; i += 4) ctx.fillRect(0, i, W, 1);

    // Title
    ctx.font = '18px "DotGothic16", sans-serif';
    ctx.fillStyle = '#ccaa55';
    ctx.textAlign = 'center';
    ctx.fillText('旧世界の遺物', W / 2, 35);

    // Back button
    const btnW = 100, btnH = 32, btnX = 20, btnY = 15;
    ctx.save();
    ctx.fillStyle = 'rgba(204, 170, 85, 0.2)';
    ctx.strokeStyle = '#ccaa55';
    ctx.lineWidth = 2;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.font = '14px "DotGothic16", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('戻る', btnX + btnW / 2, btnY + 22);
    ctx.restore();

    // List Panel (Left)
    const listX = 20, listY = 55, listW = 260, listH = H - 70;
    ctx.strokeStyle = '#ccaa55';
    ctx.lineWidth = 1;
    ctx.strokeRect(listX, listY, listW, listH);
    ctx.fillStyle = 'rgba(204, 170, 85, 0.05)';
    ctx.fillRect(listX, listY, listW, listH);

    // Detail Panel (Right)
    const detailX = 300, detailY = 55, detailW = W - 320, detailH = H - 70;
    ctx.strokeStyle = '#ccaa55';
    ctx.strokeRect(detailX, detailY, detailW, detailH);
    ctx.fillStyle = 'rgba(204, 170, 85, 0.05)';
    ctx.fillRect(detailX, detailY, detailW, detailH);

    // Draw list grouped by stage
    let y = listY + 10;
    let itemIndex = 0;
    let currentStage = -1;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const isCollected = collected.includes(entry.id);

      if (entry.stage !== currentStage) {
        currentStage = entry.stage;
        ctx.font = '10px "DotGothic16", sans-serif';
        ctx.fillStyle = '#887744';
        ctx.textAlign = 'left';
        ctx.fillText('── ステージ' + currentStage + ' ──', listX + 10, y + 12);
        y += 20;
      }

      const isSelected = this.selectedIndex === i;
      if (isSelected) {
        ctx.fillStyle = 'rgba(204, 170, 85, 0.25)';
        ctx.fillRect(listX + 4, y, listW - 8, 26);
      }

      ctx.font = '13px "DotGothic16", sans-serif';
      ctx.fillStyle = isSelected ? '#ffffff' : (isCollected ? '#ccaa55' : '#555544');
      ctx.textAlign = 'left';
      ctx.fillText(isCollected ? entry.name : '???', listX + 14, y + 18);

      // Store click area
      entry._clickY = y;
      entry._clickH = 26;
      y += 30;
    }

    // Draw detail
    const selected = this.entries[this.selectedIndex];
    if (selected) {
      const isCollected = collected.includes(selected.id);

      ctx.font = '20px "DotGothic16", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(isCollected ? selected.name : '???', detailX + 20, detailY + 35);

      ctx.font = '11px "DotGothic16", sans-serif';
      ctx.fillStyle = '#ccaa55';
      ctx.fillText('ステージ' + selected.stage + ' で発見', detailX + 20, detailY + 52);

        if (isCollected) {
          // Force 'no image' placeholder instead of actual image
          ctx.fillStyle = 'rgba(204, 170, 85, 0.1)';
          ctx.fillRect(detailX + 20, detailY + 65, 120, 120);
          ctx.strokeStyle = '#ccaa55';
          ctx.setLineDash([4, 4]); // Dashed border for extra retro feel
          ctx.strokeRect(detailX + 20, detailY + 65, 120, 120);
          ctx.setLineDash([]);
          
          ctx.fillStyle = '#ccaa55';
          ctx.font = '24px "DotGothic16", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('No Image', detailX + 80, detailY + 135);
          ctx.textAlign = 'left';


        // Description (word wrap)
        ctx.font = '14px "DotGothic16", sans-serif';
        ctx.fillStyle = '#d8d0c0';
        const lines = selected.desc.split('\n');
        let ty = detailY + 200;
        lines.forEach(line => {
          // Simple wrap at panel width
          const maxChars = Math.floor((detailW - 40) / 14);
          for (let c = 0; c < line.length; c += maxChars) {
            ctx.fillText(line.substring(c, c + maxChars), detailX + 20, ty);
            ty += 22;
          }
        });
      } else {
        ctx.fillStyle = '#555544';
        ctx.font = '14px "DotGothic16", sans-serif';
        ctx.fillText('未発見', detailX + 20, detailY + 100);
        ctx.fillText('このステージを探索して遺物を見つけよう', detailX + 20, detailY + 130);
      }

      // Stats
      ctx.save();
      ctx.strokeStyle = 'rgba(204, 170, 85, 0.3)';
      ctx.strokeRect(detailX + 20, detailH + detailY - 50, detailW - 40, 40);
      ctx.font = '11px "DotGothic16", sans-serif';
      ctx.fillStyle = '#887744';
      const total = this.entries.length;
      const found = collected.length;
      ctx.fillText('収集状況: ' + found + ' / ' + total, detailX + 30, detailH + detailY - 28);
      ctx.fillText('STATUS: ' + (isCollected ? 'DATA_SYNCED' : 'NOT_FOUND'), detailX + 30, detailH + detailY - 14);
      ctx.restore();
    }
  },

  handleClick(mx, my) {
    // Back button
    const btnW = 100, btnH = 32, btnX = 20, btnY = 15;
    if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
      if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
      this.close();
      return true;
    }

    // List items
    const listX = 20, listW = 260;
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (entry._clickY !== undefined &&
          mx >= listX && mx <= listX + listW &&
          my >= entry._clickY && my <= entry._clickY + entry._clickH) {
        this.selectedIndex = i;
        if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
        return true;
      }
    }
    return false;
  },

  handleWheel(deltaY) {
    if (!this.isOpen) return;
    if (deltaY > 0) {
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.entries.length - 1);
    } else if (deltaY < 0) {
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
    }
    if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
  }
};
