// === LEVEL.JS - JSON-based Level System ===
const LevelManager = {
  stages: [],
  currentStage: 0,
  stageDistance: 0,
  camX: 0,
  camY: 0,
  scrollSpeed: 2.5,
  platforms: [],
  objects: [], // Interactive objects & Zones (Springs, Water)
  subtitles: [],
  currentSubtitle: null,
  subtitleTimer: 0,
  stageIntroTimer: 0,
  stageStarted: false,
  freeScroll: false,
  trackVertical: false,
  trackStrength: 0.1,
  scale: 1.0,

  init() {
    this.stages = AssetLoader.data.stages;
  },

  startStage(idx) {
    this.currentStage = idx;
    const stage = this.stages[idx];
    this.spawnX = stage.spawnX !== undefined ? stage.spawnX : 200;
    this.spawnY = stage.spawnY !== undefined ? stage.spawnY : 300;
    this.camX = this.spawnX - 200;
    this.camY = 0;
    this.stageDistance = this.camX;
    
    // Set player initial position if Game.player exists
    if (typeof Game !== 'undefined' && Game.player) {
      Game.player.x = 200;
      Game.player.y = this.spawnY;
      Game.player.lastGroundY = this.spawnY;
    }
    
    // Vertical tracking adjustment
    if (stage.trackVertical && typeof Physics !== 'undefined') {
      const groundY = Physics.GROUND_Y || 800;
      this.camY = this.spawnY - groundY + 100;
    }

    this.scrollSpeed = stage.scrollSpeed || 2.5;
    this.freeScroll = stage.freeScroll || false;
    this.trackVertical = stage.trackVertical || false;
    this.trackStrength = stage.trackStrength || 0.1;
    this.scale = stage.scale || 1.0;
    this.stickyPlatforms = stage.stickyPlatforms !== undefined ? stage.stickyPlatforms : true;
    this.platforms = stage.platforms || [];
    this.objects = stage.objects || [];
    this.subtitles = stage.subtitles || [];
    this.stageIntroTimer = 180; // 3 second intro
    this.stageStarted = false;
    this.subtitleIndex = 0;
    this.waveIndex = 0;
    this.currentSubtitle = null;
    this.subtitleTimer = 0;
    this._midBossSpawned = false;
    this._bossSpawned = false;

    // Skip waves and bosses already past the spawn point
    const threshold = this.stageDistance;
    if (stage.waves) {
      while (this.waveIndex < stage.waves.length && stage.waves[this.waveIndex].dist < threshold) {
        this.waveIndex++;
      }
    }
    if (stage.midBoss && stage.midBoss.dist < threshold) this._midBossSpawned = true;
    if (stage.boss && stage.boss.dist < threshold) this._bossSpawned = true;
    // Show stage intro (with optional chapter title)
    const introEl = document.getElementById('stage-intro');
    const chapterEl = document.getElementById('chapter-title');
    const stageNumEl = document.getElementById('stage-number');
    const stageNameEl = document.getElementById('stage-name');
    
    if (stage.chapterTitle) {
      // Show chapter title first, then stage info
      if (chapterEl) chapterEl.textContent = stage.chapterTitle;
      if (chapterEl) chapterEl.classList.remove('hidden');
      stageNumEl.textContent = '';
      stageNameEl.textContent = '';
      this.stageIntroTimer = 360; // 6 seconds total (3s chapter + 3s stage)
      this._chapterPhase = true;
      this._chapterSwitchAt = 180; // Switch at 3 seconds
    } else {
      if (chapterEl) chapterEl.classList.add('hidden');
      stageNumEl.textContent = stage.number;
      stageNameEl.textContent = stage.name;
      this.stageIntroTimer = 180; // 3 second intro
      this._chapterPhase = false;
    }
    introEl.classList.remove('hidden');
  },

  update(player) {
    if (this.stageIntroTimer > 0) {
      this.stageIntroTimer--;
      // Chapter title -> Stage title transition
      if (this._chapterPhase && this.stageIntroTimer <= this._chapterSwitchAt) {
        this._chapterPhase = false;
        const chapterEl = document.getElementById('chapter-title');
        if (chapterEl) chapterEl.classList.add('hidden');
        const stage = this.getCurrentStage();
        document.getElementById('stage-number').textContent = stage.number;
        document.getElementById('stage-name').textContent = stage.name;
      }
      if (this.stageIntroTimer <= 0) {
        document.getElementById('stage-intro').classList.add('hidden');
        this.stageStarted = true;
      }
      return { scrolling: false, phase: this.getCurrentStage().bgPhase };
    }

    const stage = this.getCurrentStage();
    this.stageDistance += this.scrollSpeed; // Logical progress for waves
    
    if (this.freeScroll && player) {
      // Mario-style camera: track player's X (with offset)
      const targetCamX = player.x - (typeof Game !== 'undefined' ? Game.width/3 : 600);
      // Only move right, never left
      if (targetCamX > this.camX) {
        this.camX = targetCamX;
      }
    } else {
      this.camX += this.scrollSpeed;
      // Sticky Platforms: While on ground, shift player screen-X to maintain world-X
      if (player && player.onGround) {
        // Individual platform setting overrides global stage setting
        let isSticky = this.stickyPlatforms;
        if (player.currentPlatform && player.currentPlatform.sticky !== undefined) {
          isSticky = player.currentPlatform.sticky;
        }
        if (isSticky) {
          player.x -= this.scrollSpeed;
        }
      }
    }

    if (this.trackVertical && player) {
      // Track based on the player's last recorded ground Y position
      const referenceY = player.lastGroundY !== undefined ? player.lastGroundY : player.y;
      const groundY = (typeof Physics !== 'undefined' ? Physics.GROUND_Y : 800);
      const playerOffset = referenceY - groundY + 100;
      // Dead zone: ignore small height changes (within 150px of ground)
      const deadZone = 150;
      let targetCamY = 0;
      if (playerOffset < -deadZone) {
        targetCamY = playerOffset + deadZone; // Only track the amount beyond dead zone
      } else if (playerOffset > deadZone) {
        targetCamY = playerOffset - deadZone;
      }
      this.camY += (targetCamY - this.camY) * this.trackStrength;
    } else {
      this.camY += (0 - this.camY) * 0.1; // Return to 0 gracefully if disabled
    }

    // Subtitle triggers
    if (this.subtitleIndex < stage.subtitles.length) {
      const sub = stage.subtitles[this.subtitleIndex];
      if (this.stageDistance >= sub.dist) {
        this.currentSubtitle = sub.text;
        this.subtitleTimer = 240; // 4 seconds
        this.subtitleIndex++;
      }
    }
    if (this.subtitleTimer > 0) {
      this.subtitleTimer--;
      if (this.subtitleTimer <= 0) this.currentSubtitle = null;
    }

    // Wave spawns
    while (this.waveIndex < stage.waves.length) {
      const wave = stage.waves[this.waveIndex];
      if (this.stageDistance + Game.width >= wave.dist) {
        wave.enemies.forEach((type, i) => {
          setTimeout(() => {
            const spawnX = wave.dist - this.stageDistance;
            const spawnY = wave.y;
            
            let finalType = type;
            // Stage 4 Specific Balance: 2/3 basic (1-3), 1/3 new (4-6)
            if (this.currentStage === 4) { // Stage 5 is index 4 (Stage 4 is index 3)
              const r = Math.random();
              const basicPool = ['tire_shark', 'vending_machine', 'ac_hermit_crab'];
              const newPool = ['submarine_crab', 'moray_eel', 'carrier_seal'];
              if (r < 0.66) {
                finalType = basicPool[Math.floor(Math.random() * basicPool.length)];
              } else {
                finalType = newPool[Math.floor(Math.random() * newPool.length)];
              }
            }
            
            EnemyManager.spawn(finalType, spawnX, spawnY);
          }, i * 200);
        });
        this.waveIndex++;
      } else {
        break; // Next wave is still ahead
      }
    }

    // Mid-boss trigger
    if (stage.midBoss && this.stageDistance + Game.width >= stage.midBoss.dist && !this._midBossSpawned) {
      this._midBossSpawned = true;
      return { scrolling: true, phase: stage.bgPhase, triggerMidBoss: stage.midBoss.type };
    }

    // Final boss trigger
    if (stage.boss && this.stageDistance + Game.width >= stage.boss.dist && !this._bossSpawned) {
      this._bossSpawned = true;
      return { scrolling: true, phase: stage.bgPhase, triggerBoss: true };
    }

    return { scrolling: true, phase: stage.bgPhase };
  },

  getCurrentStage() { return this.stages[this.currentStage]; },
  getVisiblePlatforms() { return this.platforms; },
  isStageComplete() {
    const stage = this.getCurrentStage();
    return this.stageDistance >= stage.length;
  },
  hasNextStage() { return this.currentStage < this.stages.length - 1; },
  nextStage() { this.startStage(this.currentStage + 1); this._midBossSpawned=false; this._bossSpawned=false; },
  reset() { this._midBossSpawned=false; this._bossSpawned=false; this.scale=1.0; },
};
