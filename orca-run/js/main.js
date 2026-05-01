// === MAIN.JS - Game Loop, State Machine, Full Integration ===
const ParticleSystem = {
  particles:[],
  burst(x,y,color,count){for(let i=0;i<count;i++)this.particles.push({x,y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6-2,size:2+Math.random()*4,color,alpha:1,decay:0.02+Math.random()*0.03});},
  update(){this.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.1;p.alpha-=p.decay;});this.particles=this.particles.filter(p=>p.alpha>0);},
  draw(ctx){this.particles.forEach(p=>Renderer.drawParticle(ctx,p));},
  clear(){this.particles=[];},
};

const Game = {
  state:'LOADING', keys:{}, mouseL:false, mouseR:false,
  player:null, boss:null, score:0, totalFrames:0, paused:false, hitStopFrames:0,
  fadeAlpha:0, fadeState:'none', fadeTimer:0, storyText:'',
  abyssParticles: [],
  debugMultiplier: 1,
  debugPanelVisible: false,

  async init(){
    this.canvas=document.getElementById('gameCanvas');
    this.ctx=this.canvas.getContext('2d');
    this.resize();
    this.ctx.imageSmoothingEnabled=false;

    // Pause screen interactions
    const returnMapBtn = document.getElementById('btn-return-map');
    if (returnMapBtn) {
      returnMapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.paused) {
          if (this.isEditorTest) {
            this.resetToTitle(); // Handles returning to editor
          } else {
            this.togglePause(); // Unpause
            this.state = 'WORLD_MAP';
            WorldMap.active = true;
            WorldMap.moving = false;
            if(typeof AudioManager !== 'undefined') AudioManager.stopAll();
          }
        }
      });
    }

    // Start rendering the loading screen (canvas just black, DOM overlay handles UI)
    this.loop();

    // Load assets
    try {
      await AssetLoader.loadAll((loaded, total) => {
        const pct = Math.floor((loaded / total) * 100);
        document.getElementById('loading-bar').style.width = pct + '%';
        document.getElementById('loading-text').textContent = `${loaded} / ${total} Assets`;
      });
      // Loading complete
      document.getElementById('loading-screen').classList.add('hidden');
      document.getElementById('title-screen').classList.remove('hidden');
      this.state = 'TITLE';

      // Input bindings
      window.addEventListener('keydown',e=>{
        this.keys[e.key]=true;
        if(['Space',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
        // PAUSE TOGGLE
        if(e.key === 'Escape' || e.key.toLowerCase() === 'p') {
          if (this.state === 'PLAYING' || this.state === 'MIDBOSS' || this.state === 'BOSS') {
            this.togglePause();
          }
        }
        // DEBUG SPEED TOGGLE
        if(e.key === '9') {
          this.debugMultiplier = this.debugMultiplier === 1 ? 3 : 1;
          console.log("Debug Multiplier:", this.debugMultiplier);
        }
        // DEBUG STAGE SKIP
        if(e.key === '8') {
          if(LevelManager.hasNextStage()) {
            console.log("Skipping stage...");
            LevelManager.nextStage();
            this.state = 'STAGE_INTRO';
            this.boss = null;
            EnemyManager.clear();
            ProjectileManager.clear();
            if(this.paused) this.togglePause();
            // Weapon evolution and BGM check for debug skip
            if (LevelManager.currentStage >= 4) {
              this.player.evolved = true;
            }
            if (LevelManager.currentStage >= 3 && LevelManager.currentStage < 7) {
              AudioManager.startAbyssBGM();
            } else if (LevelManager.currentStage < 3) {
              AudioManager.startRoadBGM();
            }
          } else {
            console.log("Final stage reached, cannot skip.");
          }
        }
        // DEBUG PANEL TOGGLE (￥ or \)
        if(e.key === '\\' || e.key === '￥' || e.key === '¥' || e.code === 'IntlYen' || e.code === 'IntlRo') {
          this.toggleDebugPanel();
        }
      });
      window.addEventListener('keyup',e=>{this.keys[e.key]=false;});
      window.addEventListener('mousedown',e=>{if(e.button===0)this.mouseL=true;if(e.button===2)this.mouseR=true;});
      window.addEventListener('mouseup',e=>{if(e.button===0)this.mouseL=false;if(e.button===2)this.mouseR=false;});
      window.addEventListener('contextmenu',e=>e.preventDefault());
      window.addEventListener('resize',()=>this.resize());
      
      // Separate Yen/Caret key listener for maximum compatibility
      window.addEventListener('keydown', e => {
        if (e.key === '￥' || e.key === '¥' || e.key === '^' || e.code === 'IntlYen' || e.code === 'IntlRo' || e.code === 'Equal' || e.key === '\\') {
          this.toggleDebugPanel();
        }
      }, true); // Use capture phase
      
      // Overlay clicks
      document.getElementById('title-screen').addEventListener('click',(e)=>{
        if(e.target.id==='btn-editor' || e.target.closest('#btn-editor')) return;
        if(this.state==='TITLE')this.startGame();
      });
      document.getElementById('btn-editor').addEventListener('click',(e)=>{
        e.stopPropagation();
        document.getElementById('title-screen').classList.add('hidden');
        StageEditor.init();
        StageEditor.open();
      });
      document.getElementById('gameover-screen').addEventListener('click',()=>{if(this.state==='GAMEOVER')this.resetToTitle();});
      
      const pauseScreen = document.getElementById('pause-screen');
      pauseScreen.addEventListener('click', (e) => {
        if(e.target === pauseScreen || e.target.tagName === 'P') {
          if(this.paused) this.togglePause();
        }
      });
      window.addEventListener('click',(e)=>{
        if(this.state==='ENDING'&&Ending.isClickable())this.resetToTitle();
        // Add a hidden way to toggle fullscreen on title by clicking near top right
        if(this.state==='TITLE' && e.clientX > window.innerWidth - 100 && e.clientY < 100) {
           if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); }
           else { document.exitFullscreen(); }
        }
      });
      
      // Touch
      window.addEventListener('touchstart',e=>{this.mouseL=true;}, {passive: false});
      window.addEventListener('touchend',()=>{this.mouseL=false;});
      
      // Add a global fullscreen function
      window.toggleGameFullscreen = () => {
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(()=>{}); }
        else { document.exitFullscreen(); }
      };

      // Init systems that rely on loaded data
      LevelManager.init();
      this.player=new Player();
      
      this.initDebugPanel();

    } catch (e) {
      console.error("Failed to load assets:", e);
      document.getElementById('loading-text').textContent = "ERROR LOADING ASSETS";
    }
  },

  async startGame(){
    document.getElementById('title-screen').classList.add('hidden');
    this.state = 'WORLD_MAP';
    WorldMap.init();
    WorldMap.active = true;
    if(typeof AudioManager !== 'undefined') {
      try { await AudioManager.init(); } catch(e){}
    }
  },

  async startLevel(index) {
    this.state='STAGE_INTRO';this.score=0;this.totalFrames=0;this.boss=null;
    this.player.reset();
    // Evolve weapons from Stage 4 (index 4) onwards
    this.player.evolved = (index >= 4);
    EnemyManager.clear();ProjectileManager.clear();
    ItemManager.clear();Inventory.clear();ParticleSystem.clear();HUD.damagePopups=[];
    LevelManager.reset();LevelManager.startStage(index);
    const s = LevelManager.getCurrentStage();
    try {
      await AudioManager.init();
      if (LevelManager.currentStage === 0) {
        AudioManager.startTutorialBGM();
      } else if (LevelManager.currentStage === 7) {
        AudioManager.startSkyBGM();
      } else if (LevelManager.currentStage === 8) {
        AudioManager.startOceanBGM();
      } else if (LevelManager.currentStage === 9) {
        AudioManager.startCoreBGM();
      } else if (LevelManager.currentStage >= 3) {
        AudioManager.startAbyssBGM();
      } else {
        // This covers Stage 1 and 2
        AudioManager.startRoadBGM();
      }
    } catch(e) { console.warn('Audio:', e); }
  },

  resetToTitle(){
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('stage-intro').classList.add('hidden');
    const ending = document.getElementById('ending-screen');
    if(ending) ending.classList.add('hidden');
    
    if (this.isEditorTest) {
      this.isEditorTest = false;
      if(this.paused) this.togglePause();
      Ending.active=false;this.state='TITLE';this.boss=null;AudioManager.stopAll();
      StageEditor.open();
      return;
    }

    document.getElementById('title-screen').classList.remove('hidden');
    if(this.paused) this.togglePause();
    Ending.active=false;this.state='TITLE';this.boss=null;AudioManager.stopAll();
  },

  toggleDebugPanel() {
    this.debugPanelVisible = !this.debugPanelVisible;
    const panel = document.getElementById('debug-panel');
    if(this.debugPanelVisible) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  },

  initDebugPanel() {
    const bindSlider = (id, obj, prop, valId) => {
      const el = document.getElementById(id);
      const valEl = document.getElementById(valId);
      if(!el || !obj) return;
      el.value = obj[prop];
      valEl.textContent = Number(obj[prop]).toFixed(1);
      el.addEventListener('input', (e) => {
        obj[prop] = parseFloat(e.target.value);
        valEl.textContent = Number(obj[prop]).toFixed(1);
      });
    };

    bindSlider('debug-grav-asc', Physics, 'GRAVITY_ASCENT', 'val-grav-asc');
    bindSlider('debug-grav-desc', Physics, 'GRAVITY_DESCENT', 'val-grav-desc');
    bindSlider('debug-jump-pow', this.player, 'jumpForce', 'val-jump-pow');
    bindSlider('debug-djump-pow', this.player, 'doubleJumpForce', 'val-djump-pow');
    bindSlider('debug-hold-boost', this.player, 'holdBoost', 'val-hold-boost');
    bindSlider('debug-hold-time', this.player, 'maxHoldFrames', 'val-hold-time');
    bindSlider('debug-speed', this.player, 'speed', 'val-speed');
    bindSlider('debug-crouch-grav', Physics, 'CROUCH_GRAVITY_MULT', 'val-crouch-grav');
    bindSlider('debug-crouch-speed', this.player, 'crouchSpeedMult', 'val-crouch-speed');

    // Checkboxes
    document.getElementById('debug-invincible').addEventListener('change', (e) => {
      this.player.debugInvincible = e.target.checked;
    });
    document.getElementById('debug-oneshot').addEventListener('change', (e) => {
      this.player.debugOneShot = e.target.checked;
    });
  },

  togglePause() {
    this.paused = !this.paused;
    const btnMap = document.getElementById('btn-return-map');
    if (this.paused) {
      document.getElementById('pause-screen').classList.remove('hidden');
      if (btnMap) {
        btnMap.textContent = this.isEditorTest ? 'RETURN TO EDITOR (エディターに戻る)' : 'RETURN TO MAP (マップに戻る)';
      }
    } else {
      document.getElementById('pause-screen').classList.add('hidden');
      // Reset keys to prevent getting stuck
      this.keys = {};
    }
    if (typeof AudioManager !== 'undefined') {
      AudioManager.setPauseFilter(this.paused);
    }
  },

  resize(){
    // Fixed logical resolution: 1280 x 720
    this.width = 1280;
    this.height = 720;
    
    // Scale HUD overlays to match canvas CSS scaling
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 950);
    const container = document.getElementById('game-container');
    if (container) {
      // We can apply CSS transforms to DOM overlays if needed, 
      // but canvas handles its own scaling via object-fit.
    }

    if(this.canvas){
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      if(this.ctx) this.ctx.imageSmoothingEnabled=false;
    }
    // Update physics constants
    if(typeof Physics!=='undefined'){
      Physics.GROUND_Y = this.height - 120; // Adjusted for 720 height
    }
  },

  update(){
    if(this.state==='LOADING')return;
    if(this.state==='TITLE')return;
    if(this.state==='ENDING'){Ending.update();return;}
    if(this.state==='GAMEOVER')return;

    if(this.state==='WORLD_MAP') {
      WorldMap.update(this.keys);
      this.totalFrames++;
      return;
    }

    if(this.paused) return;

    if(this.hitStopFrames > 0) {
      this.hitStopFrames--;
      ParticleSystem.update(); // Keep particles moving during hit stop
      return;
    }

    // Stage intro
    if(this.state==='STAGE_INTRO'){
      const res=LevelManager.update(this.player);
      if(LevelManager.stageStarted){this.state='PLAYING';}
      return;
    }

    if (this.fadeState === 'none') {
      this.totalFrames++;
      const platforms=LevelManager.getVisiblePlatforms();
      const camX=LevelManager.camX;

      // Player update
      this.player.update(this.keys,this.mouseL,this.mouseR,platforms,camX,this.width,this.height);
      // Reset right click after use
      if(this.mouseR)this.mouseR=false;

      if(!this.player.alive){this.gameOver();return;}

      if(this.state==='PLAYING'){
        const res=LevelManager.update(this.player);
        this.score=Math.floor(LevelManager.stageDistance/10)+(LevelManager.currentStage*1500);

        // Mid-boss trigger
        if(res.triggerMidBoss){
          EnemyManager.spawnMidBoss(res.triggerMidBoss);
          this.state='MIDBOSS';
        }
        // Boss trigger
        if(res.triggerBoss){
          this.startBoss();
        }
        // Stage complete (after mid-boss and boss cleared, and scrolled to end)
        if (LevelManager.isStageComplete() && !EnemyManager.midBoss && !this.boss && this.fadeState === 'none') {
          if (this.isEditorTest) {
            this.resetToTitle();
            return;
          }
          if (LevelManager.currentStage === 0) {
            // Tutorial complete -> Return to world map
            this.state = 'WORLD_MAP';
            WorldMap.active = true;
            WorldMap.moving = false;
            if(typeof AudioManager !== 'undefined') AudioManager.stopAll();
            return;
          } else if (LevelManager.currentStage === 6 || LevelManager.currentStage === 9) {
            // Stage 6 or Stage 9 cleared -> Ending!
            this.victory();
          } else if (LevelManager.hasNextStage()) {
            // Normal inter-stage transition (with fade)
            this._startFadeTransition();
          } else {
            // Final stage fallback
            this.victory();
          }
        }
        
        // Normal enemy update
        EnemyManager.update(LevelManager.scrollSpeed,this.player,HUD.damagePopups);
      }

      if(this.state==='MIDBOSS'){
        EnemyManager.update(LevelManager.scrollSpeed*0.3,this.player,HUD.damagePopups);
        if(!EnemyManager.midBoss){
          this.state='PLAYING';
        }
      }

      if(this.state==='BOSS'){
        if(this.boss&&this.boss.alive){
          this.boss.update(this.player);
        } else if(this.boss&&!this.boss.alive){
          this.boss = null;
          this.state = 'PLAYING';
        }
      }
    }

    // Fade transition logic
    if (this.fadeState === 'out') {
      this.fadeTimer++;
      this.fadeAlpha = Math.min(1, this.fadeTimer / 48); // 0.8s at 60fps
      if (this.fadeTimer >= 48) {
        this.fadeState = 'story';
        this.fadeTimer = 0;
        // Advance stage now
        LevelManager.nextStage();
        EnemyManager.clear(); ProjectileManager.clear();
      }
    } else if (this.fadeState === 'story') {
      this.fadeTimer++;
      if (this.fadeTimer >= 240) { // 4.0s
        this.fadeState = 'in';
        this.fadeTimer = 0;
        this.state = 'STAGE_INTRO';
      }
    } else if (this.fadeState === 'in') {
      this.fadeTimer++;
      this.fadeAlpha = 1 - Math.min(1, this.fadeTimer / 72); // 1.2s
      if (this.fadeTimer >= 72) {
        this.fadeState = 'none';
        this.fadeAlpha = 0;
        // Update BGM if chapter changed
        if (LevelManager.currentStage === 7) {
          AudioManager.startSkyBGM();
        } else if (LevelManager.currentStage === 8) {
          AudioManager.startOceanBGM();
        } else if (LevelManager.currentStage === 9) {
          AudioManager.startCoreBGM();
        } else if (LevelManager.currentStage >= 3) {
          AudioManager.startAbyssBGM();
        } else {
          AudioManager.startRoadBGM();
        }
      }
    }

    if (this.fadeState === 'none') {
      ProjectileManager.update();
      // Enemy bullets vs player
      ProjectileManager.enemyBullets.forEach(b=>{
        if(b.alive&&!this.player.invincible&&Physics.aabb(b,this.player)){
          this.player.takeDamage(b.damage*8,b.x);b.alive=false;
        }
      });

      ItemManager.update(this.player);Inventory.update(this.player);
    }
    ParticleSystem.update();
  },

  startBoss(){
    this.state='BOSS';EnemyManager.enabled=false;EnemyManager.enemies=[];
    // Chapter 2 final boss = NullBoss, Chapter 1 (Stage 1-3) = Leviathan
    if (LevelManager.currentStage > 3) {
      this.boss = new NullBoss();
    } else {
      this.boss = new Boss();
    }
    AudioManager.playSE('bossIntro');
    setTimeout(() => {
      if (LevelManager.currentStage >= 5) { // Stage 6 Boss
        AudioManager.startLastBossBGM();
      } else {
        AudioManager.startBossBGM();
      }
    }, 1500);
  },

  _startFadeTransition() {
    this.fadeState = 'out';
    this.fadeTimer = 0;
    // Story text between chapters
    const stageIdx = LevelManager.currentStage;
    const storyTexts = [
      '武器が進化した。青い光が、暗闘を切り裂く。',
      '深淵が近づいている。その先に何があるのか。',
      'クレーターの底へ。引き返すことはできない。',
      '闇の中に、かすかな光が見える。',
      '最後の扉が開く。全てを終わらせるために。',
      '',
      '地上を抜けた。空気が薄い。雲の上の世界。',
      '海に沈んだ都市。ここにかつて人がいた。',
      '地殻を突き破る。溶岩が脈打つ世界の中心へ。',
    ];
    this.storyText = storyTexts[stageIdx] || '';
  },

  victory(){this.state='ENDING';Ending.start(this.score,this.totalFrames);},
  gameOver(){
    this.state='GAMEOVER';
    document.getElementById('final-score').textContent=`SCORE: ${this.score}`;
    document.getElementById('gameover-screen').classList.remove('hidden');
    AudioManager.stopAll();
  },

  draw(){
    const ctx=this.ctx;
    ctx.fillStyle='#06060c';ctx.fillRect(0,0,this.width,this.height);

    if(this.state==='LOADING'){return;}

    // Even on title screen, draw background moving
    if(this.state==='TITLE'){
      this.totalFrames++;
      Backgrounds.draw(ctx, this.totalFrames * 0.8, 0);
      return;
    }
    if(this.state==='ENDING'){Ending.draw(ctx,this.width,this.height);return;}
    
    if(this.state==='WORLD_MAP') {
      WorldMap.draw(ctx, this.totalFrames);
      return;
    }

    // Game world backgrounds
    const stage = LevelManager.getCurrentStage();
    let scrollSpd = LevelManager.scrollSpeed;
    if(this.state==='MIDBOSS') scrollSpd *= 0.3;
    if(this.state==='BOSS') scrollSpd *= 0.5;
    if(this.state==='STAGE_INTRO') scrollSpd = 0;
    
    // Pass stage data directly for parallax
    Backgrounds.draw(ctx, LevelManager.camX, stage);

    const currentPhase = stage?.bgPhase || 0;

    ctx.save();
    // Apply Vertical Tracking Camera and Stage Scaling
    // We scale around the center of the screen
    ctx.translate(this.width/2, this.height/2);
    ctx.scale(LevelManager.scale, LevelManager.scale);
    ctx.translate(-this.width/2, -this.height/2);
    ctx.translate(0, -LevelManager.camY);

    // Main Ground (Only if no pitfalls OR within first groundLength world-x)
    const hasPitfalls = stage?.hasPitfalls;
    const groundLen = stage?.groundLength !== undefined ? stage.groundLength : 600;
    const groundEndX = groundLen - LevelManager.camX;
    if (!hasPitfalls || groundEndX > -this.width) {
      // Draw from negative width to ensure coverage when scaled/zoomed
      const startX = -this.width;
      const drawW = hasPitfalls ? (groundEndX - startX) : (this.width * 3);
      ctx.save();
      ctx.translate(startX, 0);
      Renderer.drawGround(ctx, drawW, this.height, Physics.GROUND_Y, LevelManager.camX + startX, currentPhase);
      ctx.restore();
    }

    // Platforms
    const camX=LevelManager.camX;
    const platforms = LevelManager.getVisiblePlatforms();
    if (platforms && Array.isArray(platforms)) {
      platforms.forEach(p=>Renderer.drawPlatform(ctx,p,camX));
    }

    // Objects & Zones
    if (LevelManager.objects) {
      LevelManager.objects.forEach(obj => {
        const ox = obj.x - camX;
        if (ox + obj.w > 0 && ox < this.width) {
           if (obj.type === 'spring') {
             if (Renderer.drawSpring) Renderer.drawSpring(ctx, ox, obj.y, obj.w, obj.h, this.totalFrames, obj.variant || 'stage7');
           } else if (obj.type === 'magma') {
             if (Renderer.drawMagma) Renderer.drawMagma(ctx, ox, obj.y, obj.w, obj.h, this.totalFrames);
           }
        }
      });
    }

    ItemManager.draw(ctx);EnemyManager.draw(ctx);
    if(this.boss&&this.boss.alive)this.boss.draw(ctx);
    ProjectileManager.draw(ctx);
    this.player.draw(ctx);
    ParticleSystem.draw(ctx);

    ctx.restore(); // Restore camera transform

    // HUD
    const midBoss=EnemyManager.midBoss;
    HUD.draw(ctx,this.player,this.boss,midBoss,this.score,
      LevelManager.currentSubtitle,LevelManager.subtitleTimer);

    // Boss warning
    if(this.state==='PLAYING'){
      const stage=LevelManager.getCurrentStage();
      // Boss/Midboss trigger at: dist - Game.width
      let bDist = 99999;
      if (stage.boss && !LevelManager._bossSpawned) bDist = stage.boss.dist;
      else if (stage.midBoss && !LevelManager._midBossSpawned) bDist = stage.midBoss.dist;
      
      const triggerDist = bDist - this.width;
      if(LevelManager.stageDistance > triggerDist - 400 && LevelManager.stageDistance < triggerDist){
        const flash=Math.sin(this.totalFrames*0.15)*0.12;
        if(flash>0){ctx.fillStyle=`rgba(255,40,15,${flash})`;ctx.fillRect(0,0,this.width,this.height);}
        if(this.totalFrames%60<40){ctx.fillStyle='#ff3322';ctx.font='13px "Press Start 2P"';ctx.textAlign='center';ctx.fillText('⚠ WARNING ⚠',this.width/2,this.height/2-55);ctx.textAlign='left';}
      }
    }

    if(this.state==='STAGE_INTRO'){
      ctx.fillStyle='rgba(4,4,12,0.7)';ctx.fillRect(0,0,this.width,this.height);
    }

    // Abyss particles for deep stages (Chapter 2)
    if (currentPhase >= 3) {
      // Ensure abyss particles exist
      while (this.abyssParticles.length < 25) {
        this.abyssParticles.push({
          x: Math.random() * this.width, y: Math.random() * this.height,
          vx: (Math.random()-0.5)*0.3, vy: -0.2 - Math.random()*0.5,
          size: 2 + Math.random()*4, alpha: Math.random()*0.6,
          phase: Math.random() * Math.PI * 2
        });
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#88bbff';
      this.abyssParticles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.phase += 0.02;
        p.alpha = 0.2 + Math.sin(p.phase) * 0.3;
        if (p.y < -10) { p.y = this.height + 10; p.x = Math.random() * this.width; }
        if (p.x < -10) p.x = this.width + 10;
        if (p.x > this.width + 10) p.x = -10;
        ctx.globalAlpha = Math.max(0, p.alpha);
        // Use fillRect instead of arc for performance
        ctx.fillRect(p.x, p.y, p.size * 1.5, p.size * 1.5);
      });
      ctx.restore();
    }

    // Stage 6 faint white glow
    if (currentPhase === 5) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const glowAlpha = 0.05 + Math.sin(this.totalFrames * 0.02) * 0.03;
      ctx.fillStyle = `rgba(220, 230, 255, ${glowAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
      
      const grad = ctx.createRadialGradient(this.width/2, -100, 100, this.width/2, -100, this.height * 1.5);
      grad.addColorStop(0, 'rgba(255,255,255,0.15)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    // Fade transition overlay
    if (this.fadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
      // Story text during story phase
      if (this.fadeState === 'story' && this.storyText) {
        const textAlpha = this.fadeTimer < 40 ? this.fadeTimer / 40 :
                          this.fadeTimer > 200 ? (240 - this.fadeTimer) / 40 : 1;
        ctx.globalAlpha = textAlpha;
        ctx.fillStyle = '#c8d0e0';
        ctx.font = '15px "DotGothic16"';
        ctx.textAlign = 'center';
        ctx.fillText(this.storyText, this.width / 2, this.height / 2);
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }
  },

  loop(){
    if (!this.paused) {
      for (let i = 0; i < this.debugMultiplier; i++) {
        this.update();
      }
    }
    this.draw();
    requestAnimationFrame(()=>this.loop());
  },
};

window.addEventListener('DOMContentLoaded',()=>{Game.init();});
