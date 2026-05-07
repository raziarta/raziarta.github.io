// === BESTIARY.JS - Character Encyclopedia ===
const Bestiary = {
  isOpen: false,
  selectedId: 'orca',
  scrollOffset: 0,
  categories: ['ch1', 'ch2', 'ch3', 'player'],
  
  entries: [
    { id: 'orca', name: 'シャチ（プレイヤー）', category: 'player',
      desc: '本作の主人公。高度な知能を持つ海洋哺乳類。\n特殊なスーツを纏い、汚染された海を駆け抜ける。',
      src: 'assets/sprites/player/orca_stand.png', unlockCondition: 'always' },
    
    // === Chapter 1 Enemies ===
    { id: 'tire_shark', name: 'タイヤサメ', category: 'ch1',
      desc: 'タイヤに棲みついたサメ。地上を転がって移動する。\n歯車のように噛みついてくる。',
      src: 'assets/sprites/enemies/tire_shark/tire_shark_1.png', unlockCondition: 1 },
    { id: 'signal_jelly', name: '信号機クラゲ', category: 'ch1',
      desc: '信号機に寄生したクラゲ。3色の信号で異なる攻撃を行う。\n弱点は頭部の暗い部分のみ。',
      src: 'assets/sprites/enemies/signal_jelly/jelly_red.png', unlockCondition: 2 },
    { id: 'ac_hermit_crab', name: '室外機ヤドカリ', category: 'ch1',
      desc: '室外機を殻にしたヤドカリ。空調設備の残骸に棲みついた。\nしゃがんで射撃すると当たる。',
      src: 'assets/sprites/enemies/ac_hermit_crab/hermit_hover.png', unlockCondition: 1 },
    { id: 'vending_machine', name: '自動迎撃システム搭載自動販売機', category: 'ch1',
      desc: '缶を発射してくる壊れた自販機。人間の消費文明の残滓。\n正面から近づくと危険。',
      src: 'assets/sprites/enemies/vending_machine/vending_idle.png', unlockCondition: 1 },

    // === Chapter 1 Bosses ===
    { id: 'leviathan', name: 'リヴァイアサン', category: 'ch1boss',
      desc: 'ステージ3のボス。深淵の番人。\n巨大な海獣の姿をした生物兵器。', 
      src: 'assets/sprites/enemies/boss/leviathan_idle_1.png', unlockCondition: 3 },

    // === Chapter 2 Enemies ===
    { id: 'submarine_crab', name: '潜水カニ', category: 'ch2',
      desc: '深淵の地を這う甲殻類。暗闇の中で光る目を持つ。',
      src: 'assets/sprites/enemies/submarine_crab/crab_1.png', unlockCondition: 4 },
    { id: 'moray_eel', name: 'ウツボ配管工', category: 'ch2',
      desc: '配管に潜むウツボ。獲物が通ると飛び出して噛みつく。',
      src: 'assets/sprites/enemies/moray_eel/eel_1.png', unlockCondition: 4 },
    { id: 'carrier_seal', name: '運搬アザラシ', category: 'ch2',
      desc: '物資を運ぶアザラシ。体当たりで邪魔をしてくる。',
      src: 'assets/sprites/enemies/carrier_seal/seal_1.png', unlockCondition: 5 },
    { id: 'depth_angler', name: '深海アンコウ', category: 'ch2',
      desc: '光で獲物を誘う深淵の捕食者。その光に魅入られるな. ',
      src: 'assets/sprites/enemies/boss/angler_idle.png', unlockCondition: 5 },

    // === Chapter 2 Bosses ===
    { id: 'null', name: 'ヌル「虚無」', category: 'ch2boss',
      desc: 'ステージ6のボス。存在そのものが虚無。\n全てを消し去ろうとする概念的存在。',
      src: 'assets/sprites/enemies/boss/null_1.png', unlockCondition: 6 },

    // === Chapter 3 Enemies ===
    { id: 'cloud_puffer', name: 'クラウドパファー', category: 'ch3',
      desc: '雲の上に棲むフグ型の浮遊生物。空気弾を吐く。',
      type: 'procedural', drawFunc: 'drawCloudPuffer', unlockCondition: 7 },
    { id: 'aero_glider', name: 'エアログライダー', category: 'ch3',
      desc: '滑空する翼竜型の敵。素早い動きで翻弄してくる。',
      type: 'procedural', drawFunc: 'drawAeroGlider', unlockCondition: 7 },
    { id: 'static_spark', name: 'スタティックスパーク', category: 'ch3',
      desc: '空中に浮遊する帯電体。雷を放って攻撃してくる。',
      type: 'procedural', drawFunc: 'drawStaticSpark', unlockCondition: 7 },
    { id: 'neon_jelly', name: 'ネオンジェリー', category: 'ch3',
      desc: '発光するクラゲ型の深海生物。電撃を放つ。',
      type: 'procedural', drawFunc: 'drawNeonJelly', unlockCondition: 8 },
    { id: 'rusty_seeker', name: 'ラスティシーカー', category: 'ch3',
      desc: '錆びついた追尾装置。プレイヤーをしつこく追いかける。',
      type: 'procedural', drawFunc: 'drawRustySeeker', unlockCondition: 8 },
    { id: 'bubble_sniper', name: 'バブルスナイパー', category: 'ch3',
      desc: '泡を精密に発射する狙撃手。遠距離からの攻撃に注意。',
      type: 'procedural', drawFunc: 'drawBubbleSniper', unlockCondition: 8 },
    { id: 'magma_crawler', name: 'マグマクローラー', category: 'ch3',
      desc: '溶岩の中から現れる虫型の生物。高温の体で触れるだけで致命的。',
      type: 'procedural', drawFunc: 'drawMagmaCrawler', unlockCondition: 9 },
    { id: 'heat_flicker', name: 'ヒートフリッカー', category: 'ch3',
      desc: '熱気の中から現れる幻影。変則的な動きで近づく。',
      type: 'procedural', drawFunc: 'drawHeatFlicker', unlockCondition: 9 },
    { id: 'core_shard', name: 'コアシャード', category: 'ch3',
      desc: 'コアの欠片から生まれた結晶体。多方向へレーザーを放つ。',
      type: 'procedural', drawFunc: 'drawCoreShard', unlockCondition: 9 },

    // === Chapter 3 Bosses ===
    { id: 'storm_eagle', name: 'ストームイーグル', category: 'ch3boss',
      desc: 'ステージ7のボス。天空を統べる巨鳥。強風を巻き起こす。',
      type: 'procedural', drawFunc: 'drawStormEagle', unlockCondition: 7 },
    { id: 'kraken_x', name: 'クラーケンX', category: 'ch3boss',
      desc: 'ステージ8のボス。海底都市の支配者。触手と墨で攻撃する。',
      type: 'procedural', drawFunc: 'drawKrakenX', unlockCondition: 8 },
    { id: 'vulcan', name: 'バルカン', category: 'ch3boss',
      desc: '最終試練の番人。コアの熱を自在に操る巨神。',
      type: 'procedural', drawFunc: 'drawVulcan', unlockCondition: 9 },
  ],

  getUnlockedEntries() {
    const cleared = JSON.parse(localStorage.getItem('orcaRunCleared') || '[]');
    return this.entries.filter(e => {
      if (e.unlockCondition === 'always') return true;
      return cleared.includes(Number(e.unlockCondition));
    });
  },

  open() {
    this.isOpen = true;
    if (typeof Game !== 'undefined') {
      Game.state = 'BESTIARY';
      const titleScreen = document.getElementById('title-screen');
      if (titleScreen) titleScreen.classList.add('hidden');
      
      if (typeof AudioManager !== 'undefined') {
        if (AudioManager.bgmPlaying !== 'title') {
          AudioManager.stopAll();
          AudioManager.startTitleBGM();
        }
      }
    }
  },

  close() {
    this.isOpen = false;
    if (typeof Game !== 'undefined') {
      Game.resetToTitle();
    }
  },

  draw(ctx) {
    const W = Game.width, H = Game.height;
    
    // Background
    ctx.fillStyle = 'rgba(0, 5, 15, 0.95)';
    ctx.fillRect(0, 0, W, H);
    
    // Scanline effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for(let i=0; i<H; i+=4) ctx.fillRect(0, i, W, 1);

    // List Panel (Left)
    const listX = 20, listY = 60, listW = 280, listH = H - 80;
    ctx.strokeStyle = '#44ccff';
    ctx.lineWidth = 2;
    ctx.strokeRect(listX, listY, listW, listH);
    ctx.fillStyle = 'rgba(68, 204, 255, 0.05)';
    ctx.fillRect(listX, listY, listW, listH);

    // Detail Panel (Right)
    const detailX = 320, detailY = 60, detailW = W - 340, detailH = H - 80;
    ctx.strokeRect(detailX, detailY, detailW, detailH);
    ctx.fillStyle = 'rgba(68, 204, 255, 0.05)';
    ctx.fillRect(detailX, detailY, detailW, detailH);

    // Draw List
    const unlocked = this.getUnlockedEntries();
    let y = listY + 10;
    let currentCategory = '';
    
    unlocked.forEach(entry => {
      const catLabels = {
        'player': '─── プレイヤー ───',
        'ch1': '─── 第1章 雑魚敵 ───',
        'ch1boss': '─── 第1章 ボス ───',
        'ch2': '─── 第2章 雑魚敵 ───',
        'ch2boss': '─── 第2章 ボス ───',
        'ch3': '─── 第3章 雑魚敵 ───',
        'ch3boss': '─── 第3章 ボス ───',
      };
      if (entry.category !== currentCategory) {
        currentCategory = entry.category;
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#555588';
        ctx.textAlign = 'left';
        ctx.fillText(catLabels[entry.category] || '', listX + 10, y + 16);
        y += 24;
      }

      const isSelected = this.selectedId === entry.id;
      if (isSelected) {
        ctx.fillStyle = 'rgba(68, 204, 255, 0.3)';
        ctx.fillRect(listX + 5, y, listW - 10, 30);
      }
      
      ctx.font = '14px "DotGothic16", sans-serif';
      ctx.fillStyle = isSelected ? '#ffffff' : '#44ccff';
      ctx.fillText(entry.name, listX + 15, y + 20);
      
      entry.clickArea = { x: listX + 5, y: y, w: listW - 10, h: 30 };
      y += 35;
    });

    // Draw Details
    const selectedEntry = this.entries.find(e => e.id === this.selectedId);
    if (selectedEntry) {
      // Check if selected entry is actually unlocked
      const isUnlocked = unlocked.some(u => u.id === selectedEntry.id);
      
      ctx.font = '24px "DotGothic16", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(isUnlocked ? selectedEntry.name : '???', detailX + 20, detailY + 40);
      
      // Category badge
      const catNames = { 'player': 'プレイヤー', 'ch1': '第1章', 'ch1boss': '第1章ボス', 'ch2': '第2章', 'ch2boss': '第2章ボス', 'ch3': '第3章', 'ch3boss': '第3章ボス' };
      ctx.font = '10px "DotGothic16", sans-serif';
      ctx.fillStyle = '#44ccff';
      ctx.fillText(catNames[selectedEntry.category] || '', detailX + 20, detailY + 55);

      if (isUnlocked) {
        // Character Image
        if (selectedEntry.src) {
          const img = AssetLoader.img(selectedEntry.src);
          if (img) {
            const maxImgW = detailW - 40;
            const maxImgH = 120;
            const imgScale = Math.min(maxImgW / img.width, maxImgH / img.height, 2.0);
            const dw = img.width * imgScale;
            const dh = img.height * imgScale;
            ctx.drawImage(img, detailX + 20, detailY + 70, dw, dh);
          }
        } else if (selectedEntry.type === 'procedural' && selectedEntry.drawFunc) {
          ctx.save();
          ctx.translate(detailX + 120, detailY + 130);
          const frame = Math.floor(Date.now() / 16); 
          if (typeof Renderer !== 'undefined' && Renderer[selectedEntry.drawFunc]) {
            Renderer[selectedEntry.drawFunc](ctx, 0, 0, 2.0, frame, false);
          }
          ctx.restore();
        }

        // Description
        ctx.font = '16px "DotGothic16", sans-serif';
        ctx.fillStyle = '#E0E8F0';
        const lines = selectedEntry.desc.split('\n');
        lines.forEach((line, i) => {
          ctx.fillText(line, detailX + 20, detailY + 220 + (i * 24));
        });
      } else {
        ctx.fillStyle = '#555588';
        ctx.font = '16px "DotGothic16", sans-serif';
        ctx.fillText('NO DATA AVAILABLE', detailX + 20, detailY + 220);
      }
      
      // Stats/Details box
      ctx.save();
      ctx.strokeStyle = 'rgba(68, 204, 255, 0.3)';
      ctx.strokeRect(detailX + 20, detailY + 280, detailW - 40, 100);
      ctx.font = '12px "DotGothic16", sans-serif';
      ctx.fillStyle = '#88ccff';
      ctx.fillText('ENTRY ID: ' + selectedEntry.id.toUpperCase(), detailX + 30, detailY + 300);
      ctx.fillText('STATUS: ' + (isUnlocked ? 'DATA_SYNCED' : 'ENCRYPTED'), detailX + 30, detailY + 320);
      ctx.restore();
    }

    // Large Back Button (戻る) - Top Left
    const btnW = 100, btnH = 32;
    const btnX = 20, btnY = 15;
    ctx.save();
    ctx.fillStyle = 'rgba(68, 204, 255, 0.2)';
    ctx.strokeStyle = '#44ccff';
    ctx.lineWidth = 2;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.font = '16px "DotGothic16", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('戻る', btnX + btnW / 2, btnY + 22);
    ctx.restore();
  },

  handleClick(mx, my) {
    const W = Game.width, H = Game.height;
    
    // Check "Back" button - Top Left
    const btnW = 100, btnH = 32;
    const btnX = 20, btnY = 15;
    if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
      if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
      this.close();
      return true;
    }

    // Check list entries
    const unlocked = this.getUnlockedEntries();
    for (const entry of unlocked) {
      if (entry.clickArea && mx >= entry.clickArea.x && mx <= entry.clickArea.x + entry.clickArea.w &&
          my >= entry.clickArea.y && my <= entry.clickArea.y + entry.clickArea.h) {
        this.selectedId = entry.id;
        if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
        return true;
      }
    }
    return false;
  },

  handleWheel(deltaY) {
    if (!this.isOpen) return;
    const unlocked = this.getUnlockedEntries();
    if (unlocked.length === 0) return;

    let idx = unlocked.findIndex(e => e.id === this.selectedId);
    if (idx === -1) idx = 0;

    if (deltaY > 0) {
      idx = Math.min(idx + 1, unlocked.length - 1);
    } else if (deltaY < 0) {
      idx = Math.max(idx - 1, 0);
    }

    this.selectedId = unlocked[idx].id;
    if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
  }
};
