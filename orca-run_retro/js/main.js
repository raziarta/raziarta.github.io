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
  retryFullHeal: true,
  announcementQueue: [],
  abyssParticles: [],
  debugMultiplier: 1,
  debugPanelVisible: false,
  tutorialStep: 0,
  tutorialCompleteDelay: 0,

  async init(){
    this.canvas=document.getElementById('gameCanvas');
    this.ctx=this.canvas.getContext('2d');
    this.resize();
    this.ctx.imageSmoothingEnabled=false;

    if (typeof Opening !== 'undefined') Opening.init();

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
            if(typeof AudioManager !== 'undefined') {
              AudioManager.stopAll();
              if (WorldMap.currentMap === 1) AudioManager.startRoadBGM();
              else AudioManager.startAbyssBGM();
            }
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
      // Loading complete - Wait for first click to start Opening
      this.state = 'LOADING_COMPLETE';
      document.getElementById('loading-bar').style.width = '100%';
      document.getElementById('loading-text').textContent = "COMPLETE";
      document.getElementById('loading-text').classList.add('blink');
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        const prompt = loadingScreen.querySelector('.start-prompt');
        if (prompt) prompt.textContent = "CLICK TO START OPENING";
      }

      const startOpening = () => {
        if (this.state !== 'LOADING_COMPLETE') return;
        this.state = 'OPENING';
        document.getElementById('loading-screen').classList.add('hidden');
        if (typeof Opening !== 'undefined') Opening.start();
        
        window.removeEventListener('mousedown', startOpening);
        window.removeEventListener('keydown', startOpening);
      };
      window.addEventListener('mousedown', startOpening);
      window.addEventListener('keydown', startOpening);
      
      this._updateTitleButtons();
      
      // Fix BGM auto-play: Start on first interaction
      const startBGM = async () => {
        if (typeof AudioManager !== 'undefined') {
          try {
            await AudioManager.init();
            if (this.state === 'TITLE' && AudioManager.bgmPlaying !== 'title') {
              AudioManager.startTitleBGM();
            }
          } catch(e) { console.error("BGM init failed:", e); }
        }
        window.removeEventListener('mousedown', startBGM);
        window.removeEventListener('keydown', startBGM);
        window.removeEventListener('touchstart', startBGM);
      };
      window.addEventListener('mousedown', startBGM);
      window.addEventListener('keydown', startBGM);
      window.addEventListener('touchstart', startBGM);

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
        // DEBUG: UNLOCK ALL (4)
        if(e.key === '4') {
          console.log("DEBUG: Unlocking everything...");
          localStorage.setItem('orcaRunCleared', JSON.stringify([1,2,3,4,5,6,7,8,9]));
          const allRelicIds = Relics.entries.map(r => r.id);
          localStorage.setItem('orcaRunRelics', JSON.stringify(allRelicIds));
          this._updateTitleButtons();
          if (this.state === 'WORLD_MAP') WorldMap.init(); // Refresh map
          alert("All Stages, Bestiary, and Relics UNLOCKED.\nPlease reload or go back to title to see all changes.");
        }
        // DEBUG: RESET ALL (5)
        if(e.key === '5') {
          console.log("DEBUG: Resetting progress...");
          localStorage.setItem('orcaRunCleared', JSON.stringify([]));
          localStorage.setItem('orcaRunRelics', JSON.stringify([]));
          this._updateTitleButtons();
          if (this.state === 'WORLD_MAP') {
            WorldMap.currentMap = 1;
            WorldMap.selectedNode = 1;
            WorldMap.init();
          }
          alert("Progress RESET.\nPlease reload or go back to title.");
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
            if (LevelManager.currentStage >= 4 || LevelManager.currentStage === 3) {
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
        // WorldMap keyboard
        if(this.state==='WORLD_MAP') {
          WorldMap.handleKey(e.key);
        }
        // Bestiary keyboard
        if(this.state==='BESTIARY') {
          Bestiary.handleKey(e.key);
        }
        // Ending keyboard
        if(this.state==='ENDING') {
          if (Ending.handleInput()) return;
        }
      });
      window.addEventListener('keyup',e=>{this.keys[e.key]=false;});
      window.addEventListener('mousedown',e=>{
        if(this.state==='ENDING'){
          if (Ending.handleInput()) return;
        }
        if(e.button===0){this.mouseL=true; this.keys['LeftClick']=true;}
        if(e.button===2){this.mouseR=true; this.keys['RightClick']=true;}
      });
      window.addEventListener('mouseup',e=>{
        if(e.button===0){this.mouseL=false; this.keys['LeftClick']=false;}
        if(e.button===2){this.mouseR=false; this.keys['RightClick']=false;}
      });
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
      // Game Over Screen Buttons
      const btnRetry = document.getElementById('btn-retry');
      if (btnRetry) {
        btnRetry.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.state === 'GAMEOVER') {
            document.getElementById('gameover-screen').classList.add('hidden');
            this.startLevel(LevelManager.currentStage); // Restart current stage
          }
        });
      }
      const btnWorldGo = document.getElementById('btn-world-go');
      if (btnWorldGo) {
        btnWorldGo.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.state === 'GAMEOVER') {
            document.getElementById('gameover-screen').classList.add('hidden');
            this.state = 'WORLD_MAP';
            WorldMap.active = true;
            WorldMap.moving = false;
            if(typeof AudioManager !== 'undefined') {
              AudioManager.stopAll();
              if (WorldMap.currentMap === 1) AudioManager.startRoadBGM();
              else AudioManager.startAbyssBGM();
            }
          }
        });
      }
      
      const pauseScreen = document.getElementById('pause-screen');
      pauseScreen.addEventListener('click', (e) => {
        if(e.target === pauseScreen || e.target.tagName === 'P') {
          if(this.paused) this.togglePause();
        }
      });
      
      // Unified Input Listener
      window.addEventListener('mousedown', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.width / rect.width;
        const scaleY = this.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        // Bestiary click
        if(this.state==='BESTIARY' && typeof Bestiary !== 'undefined') {
          Bestiary.handleClick(mx, my);
        }
        // Relics click
        if(this.state==='RELICS' && typeof Relics !== 'undefined') {
          Relics.handleClick(mx, my);
        }
        // WorldMap click
        if(this.state==='WORLD_MAP' && typeof WorldMap !== 'undefined') {
          WorldMap.handleClick(mx, my);
        }
        
        if(this.state==='ENDING' && typeof Ending !== 'undefined' && Ending.isClickable()) {
          this.resetToTitle();
        }
        
        // Fullscreen toggle shortcut
        if(this.state==='TITLE' && e.clientX > window.innerWidth - 100 && e.clientY < 100) {
           this.toggleGameFullscreen();
        }

        // Handle standard game input
        if(e.button===0){this.mouseL=true; this.keys['LeftClick']=true;}
        if(e.button===2){this.mouseR=true; this.keys['RightClick']=true;}
      });

      window.addEventListener('mouseup',e=>{
        if(e.button===0){this.mouseL=false; this.keys['LeftClick']=false;}
        if(e.button===2){this.mouseR=false; this.keys['RightClick']=false;}
      });

      window.addEventListener('wheel', e => {
        if (this.state === 'WORLD_MAP') {
          WorldMap.handleWheel(e.deltaY);
        } else if (this.state === 'BESTIARY' && typeof Bestiary !== 'undefined' && Bestiary.handleWheel) {
          e.preventDefault();
          Bestiary.handleWheel(e.deltaY);
        } else if (this.state === 'RELICS' && typeof Relics !== 'undefined' && Relics.handleWheel) {
          e.preventDefault();
          Relics.handleWheel(e.deltaY);
        }
      }, { passive: false });
      
      // Add a global fullscreen function
      window.toggleGameFullscreen = () => {
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(()=>{}); }
        else { document.exitFullscreen(); }
      };

      // Init systems that rely on loaded data
      LevelManager.init();
      this.player=new Player();
      
      this.initDebugPanel();
      this._initChapter3Dialog();
      this._updateTitleButtons();

    } catch (e) {
      console.error("Failed to load assets:", e);
      document.getElementById('loading-text').textContent = "ERROR LOADING ASSETS";
    }
  },

  async startGame(){
    if(typeof AudioManager !== 'undefined') AudioManager.playSE('start');
    document.getElementById('title-screen').classList.add('hidden');
    this.state = 'WORLD_MAP';
    this.player.reset(false);
    if(typeof Inventory !== 'undefined') Inventory.clear(false);
    WorldMap.init();
    WorldMap.active = true;
    if(typeof AudioManager !== 'undefined') {
      try { 
        await AudioManager.init(); 
        AudioManager.stopAll();
        if (WorldMap.currentMap === 1) AudioManager.startRoadBGM();
        else AudioManager.startAbyssBGM();
      } catch(e){}
    }
  },

  async startLevel(index) {
    this.state='STAGE_INTRO';this.score=0;this.totalFrames=0;this.boss=null;
    this.tutorialStep=0;this.tutorialCompleteDelay=0;
    
    // Calculate HP ratio before reset
    const ratio = this.player.hp / this.player.maxHp;
    const prevMaxHp = this.player.maxHp;

    // Dynamic HP: Stage 7-9 = 150, others = 100
    if (index >= 7) {
      this.player.maxHp = 150;
    } else {
      this.player.maxHp = 100;
    }

    this.player.reset(true); // Keep stats
    
    // HP recovery logic
    if (this.retryFullHeal) {
      this.player.hp = this.player.maxHp;
    } else {
      // Scale HP based on ratio (e.g. Stage 7 (150) HP 100 -> Stage 6 (100) HP 66)
      this.player.hp = Math.floor(ratio * this.player.maxHp);
      // Safety: if it was > 0, keep at least 1 HP
      if (ratio > 0 && this.player.hp < 1) this.player.hp = 1;
    }
    
    // Always heal to full if maxHp increased (special chapter boost)
    if (this.player.maxHp > prevMaxHp) {
      this.player.hp = this.player.maxHp;
    }

    // Evolve weapons from Stage 4 (index 4) onwards
    this.player.evolved = (index >= 4);
    EnemyManager.clear();ProjectileManager.clear();
    ItemManager.clear();
    if(typeof Inventory !== 'undefined') Inventory.clear(true); // Keep items
    ParticleSystem.clear();HUD.damagePopups=[];
    LevelManager.reset();LevelManager.startStage(index);
    if (typeof Relics !== 'undefined') Relics.spawnChips(index);
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
      } else if (LevelManager.currentStage >= 4) {
        AudioManager.startAbyssBGM();
      } else if (LevelManager.currentStage === 3) {
        AudioManager.startAbyssBGM();
      } else {
        // This covers Stage 1 and 2
        AudioManager.startRoadBGM();
      }
    } catch(e) { console.warn('Audio:', e); }
  },

  resetToTitle() {
    this.player.reset(false);
    if(typeof Inventory !== 'undefined') Inventory.clear(false);
    
    const editorBtn = document.getElementById('btn-editor');
    if (editorBtn) editorBtn.classList.remove('hidden');
    
    const ch3Dialog = document.getElementById('chapter3-dialog');
    if(ch3Dialog) ch3Dialog.classList.add('hidden');
    
    const goScreen = document.getElementById('gameover-screen');
    if(goScreen) goScreen.classList.add('hidden');
    
    const stIntro = document.getElementById('stage-intro');
    if(stIntro) stIntro.classList.add('hidden');
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
    Ending.active=false;this.state='TITLE';this.boss=null;
    
    if(typeof AudioManager !== 'undefined') {
      if (AudioManager.bgmPlaying !== 'title') {
        AudioManager.stopAll();
        AudioManager.startTitleBGM();
      }
    }
    
    // Show/hide special buttons based on progress
    this._updateTitleButtons();
  },

  _updateTitleButtons() {
    const cleared = JSON.parse(localStorage.getItem('orcaRunCleared') || '[]');
    // Show bestiary button wrapper always (after first play)
    const bestiaryBtnWrapper = document.getElementById('btn-bestiary-wrapper');
    if (bestiaryBtnWrapper) bestiaryBtnWrapper.style.display = 'inline-block';
    // Show relics button
    const relicsBtnWrapper = document.getElementById('btn-relics-wrapper');
    if (relicsBtnWrapper) {
      relicsBtnWrapper.style.display = 'inline-block';
      // Draw relic icon (ancient chip/artifact)
      const rc = document.getElementById('relics-icon-canvas');
      if (rc) {
        const rctx = rc.getContext('2d');
        rctx.clearRect(0, 0, 32, 32);
        rctx.imageSmoothingEnabled = false;
        // Draw a stylized ancient data chip
        rctx.fillStyle = '#ccaa55';
        rctx.fillRect(8, 4, 16, 24);
        rctx.fillStyle = '#887733';
        rctx.fillRect(10, 6, 12, 20);
        rctx.fillStyle = '#ccaa55';
        rctx.fillRect(12, 8, 2, 4); rctx.fillRect(16, 8, 2, 4);
        rctx.fillRect(12, 14, 2, 4); rctx.fillRect(16, 14, 2, 4);
        rctx.fillRect(12, 20, 2, 4); rctx.fillRect(16, 20, 2, 4);
        rctx.fillStyle = '#ffdd88';
        rctx.fillRect(13, 10, 6, 2);
      }
    }
    // Show chapter 3 button wrapper only after clearing stage 6
    const ch3BtnWrapper = document.getElementById('btn-chapter3-wrapper');
    if (ch3BtnWrapper) {
      const isVisible = cleared.includes(6);
      ch3BtnWrapper.style.display = isVisible ? 'inline-block' : 'none';
      if (isVisible) {
        const canvas = document.getElementById('ch3-warning-canvas');
        if (canvas && typeof Renderer !== 'undefined' && Renderer.drawPixelWarning) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          Renderer.drawPixelWarning(ctx, 0, 0, 32);
        }
      }
    }
  },

  _initChapter3Dialog() {
    const yesBtn = document.getElementById('btn-ch3-yes');
    const noBtn = document.getElementById('btn-ch3-no');
    if (yesBtn) {
      yesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('chapter3-dialog').classList.add('hidden');
        if (this.ch3DialogYesCallback) {
          this.ch3DialogYesCallback();
        } else {
          // Default behavior (e.g. from Title screen)
          document.getElementById('title-screen').classList.add('hidden');
          this.state = 'WORLD_MAP';
          WorldMap.active = true;
          WorldMap.moving = false;
          WorldMap._switchMap(3, true); // Go directly to Map 3
        }
      });
    }
    if (noBtn) {
      noBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('chapter3-dialog').classList.add('hidden');
        if (this.ch3DialogNoCallback) {
          this.ch3DialogNoCallback();
        }
      });
    }
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
    if(this.state==='LOADING_COMPLETE')return;

    // Check for pending announcements
    if (this.announcementQueue.length > 0 && 
        document.getElementById('announcement-dialog').classList.contains('hidden') &&
        (this.state === 'WORLD_MAP' || this.state === 'STAGE_INTRO' || this.state === 'TITLE')) {
      this.showAnnouncement();
    }

    if(this.state==='TITLE')return;
    if(this.state==='OPENING'){Opening.update();return;}
    if(this.state==='ENDING'){Ending.update();return;}
    if(this.state==='GAMEOVER')return;
    if(this.state==='BESTIARY')return;
    if(this.state==='RELICS')return;

    if(this.state==='WORLD_MAP') {
      WorldMap.update();
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
          LevelManager.currentSubtitle = null;
          LevelManager.subtitleTimer = 0;
        }
        // Boss trigger
        if(res.triggerBoss){
          this.startBoss();
        }

        // Stage 0 Tutorial Logic
        if (LevelManager.currentStage === 0) {
          if (this.keys['Enter']) {
             this._markStageCleared(0);
             this.state = 'WORLD_MAP';
             WorldMap.active = true;
             WorldMap.moving = false;
             this.keys['Enter'] = false;
             if(typeof AudioManager !== 'undefined') {
               AudioManager.stopAll();
               if (WorldMap.currentMap === 1) AudioManager.startRoadBGM();
               else AudioManager.startAbyssBGM();
             }
             return;
          }

          const keys = this.keys;
          if (this.tutorialStep === 0 && (keys['w'] || keys['W'] || keys[' '] || keys['Space'] || this.player.vy < -2)) {
            this.tutorialStep = 1;
          } else if (this.tutorialStep === 1 && (this.mouseL || keys['LeftClick'])) {
            this.tutorialStep = 2;
          } else if (this.tutorialStep === 2 && (this.mouseR || keys['RightClick'])) {
            this.tutorialStep = 3;
          } else if (this.tutorialStep === 3 && (keys['a'] || keys['A'] || keys['d'] || keys['D'] || keys['ArrowLeft'] || keys['ArrowRight'])) {
            this.tutorialStep = 4;
          } else if (this.tutorialStep === 4 && (keys['s'] || keys['S'] || keys['ArrowDown'] || this.player.crouching)) {
            this.tutorialStep = 5;
          }
        }

        // Normal enemy update
        EnemyManager.update(LevelManager.scrollSpeed,this.player,HUD.damagePopups);
        const isStage7ScoreClear = (LevelManager.currentStage === 7 && this.score >= 14000);
        if ((LevelManager.isStageComplete() || isStage7ScoreClear) && !EnemyManager.midBoss && !this.boss && this.fadeState === 'none') {
          if (this.isEditorTest) {
            this.resetToTitle();
            return;
          }
          // Mark current stage as cleared
          this._markStageCleared(LevelManager.currentStage);
          if (LevelManager.currentStage === 0) {
            if (this.tutorialStep < 5 || LevelManager.currentSubtitle != null) {
              // Wait for tutorial interactions and subtitles to finish
            } else if (this.tutorialCompleteDelay < 240) {
              this.tutorialCompleteDelay++;
            } else {
              // Tutorial complete -> Return to world map
              this.state = 'WORLD_MAP';
              WorldMap.active = true;
              WorldMap.moving = false;
              if(typeof AudioManager !== 'undefined') {
                AudioManager.stopAll();
                if (WorldMap.currentMap === 1) AudioManager.startRoadBGM();
                else AudioManager.startAbyssBGM();
              }
              return;
            }
          } else if (LevelManager.currentStage === 6 || LevelManager.currentStage === 9) {
            // Stage 6 or Stage 9 cleared -> Ending!
            this.victory();
          } else if (LevelManager.hasNextStage()) {
            // Normal inter-stage transition -> Return to World Map
             this.state = 'WORLD_MAP';
             WorldMap.active = true;
             WorldMap.moving = false;
             if(typeof AudioManager !== 'undefined') {
               AudioManager.stopAll();
               if (WorldMap.currentMap === 1) AudioManager.startRoadBGM();
               else AudioManager.startAbyssBGM();
             }
           } else {
            // Final stage fallback
            this.victory();
          }
        }
        
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
          // Restore normal BGM after boss defeat
          if (LevelManager.currentStage >= 7) {
            if (LevelManager.currentStage === 7) AudioManager.startSkyBGM();
            else if (LevelManager.currentStage === 8) AudioManager.startOceanBGM();
            else if (LevelManager.currentStage === 9) AudioManager.startCoreBGM();
          } else if (LevelManager.currentStage >= 4) {
            AudioManager.startAbyssBGM();
          } else if (LevelManager.currentStage === 3) {
            AudioManager.startAbyssBGM();
          } else {
            AudioManager.startRoadBGM();
          }
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
      if (typeof Relics !== 'undefined') Relics.updateChips(this.player, LevelManager.camX);
    }
    ParticleSystem.update();
  },

  startBoss(){
    this.state='BOSS';EnemyManager.enabled=false;EnemyManager.enemies=[];
    if (typeof LevelManager !== 'undefined') {
      LevelManager.currentSubtitle = null;
      LevelManager.subtitleTimer = 0;
    }
    // Chapter 2 final boss = NullBoss, Chapter 1 (Stage 1-3) = Leviathan
    if (LevelManager.currentStage > 3) {
      this.boss = new NullBoss();
    } else {
      this.boss = new Boss();
    }
    AudioManager.playSE('bossIntro');
    setTimeout(() => {
      if (LevelManager.currentStage >= 5) { // Stage 6 Boss (Null)
        AudioManager.startLastBossBGM();
      } else if (LevelManager.currentStage === 3) { // Stage 3 Boss (Leviathan)
        AudioManager.startLeviathanBGM();
      } else {
        AudioManager.startBossBGM();
      }
    }, 1500);
  },

  _startFadeTransition() {
    this.fadeState = 'out';
    this.fadeTimer = 0;
    // Evolve weapons when clearing stage 3
    if (LevelManager.currentStage === 3) {
      this.player.evolved = true;
      const cleared = JSON.parse(localStorage.getItem('orcaRunCleared') || '[]');
      if (!cleared.includes(3)) {
        this.player.hp = this.player.maxHp;
        if (typeof HUD !== 'undefined' && HUD.damagePopups) {
          HUD.damagePopups.push({x: this.player.x - 20, y: this.player.y - 50, dmg: 'FULL HEAL', timer: 120, maxTimer: 120, color: '#33ff33'});
        }
      }
    }
    // Save cleared stage
    this._markStageCleared(LevelManager.currentStage);
    // Story text between chapters
    const stageIdx = LevelManager.currentStage;
    const storyTexts = [
      '武器が進化した。青い光が、暗闇を切り裂く。',
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

  _markStageCleared(stageIdx) {
    const cleared = JSON.parse(localStorage.getItem('orcaRunCleared') || '[]');
    const isFirstClear = !cleared.includes(stageIdx);
    if (isFirstClear) {
      cleared.push(stageIdx);
      localStorage.setItem('orcaRunCleared', JSON.stringify(cleared));
      
      // Queuing announcements for first clears
      if (stageIdx === 3) {
        this.announcementQueue.push({ 
          title: "シャチ第二形態　が解放されました", 
          desc: "ペンギン弾 damage 1→2\nペンギン爆弾 damege 2→4" 
        });
        this.announcementQueue.push({ 
          title: "ワールドマップ2:深淵　が解放されました", 
          desc: "" 
        });
      } else if (stageIdx === 6) {
        localStorage.setItem('orcaRunQModeUnlocked', 'true');
        this.player.qModeUnlocked = true;
        this.announcementQueue.push({ 
          title: "Qmode が解放されました", 
          desc: "Qmode:QキーでON/OFF。ONの時は、空中で反対方向へ移動入力すると向きを変えられます" 
        });
      }
    }
    
    // Normal clear = carry over HP
    this.retryFullHeal = false;
    
    // Special: First clear of Stage 3 (Leviathan) or Stage 6 (Null) = Full Heal
    if (isFirstClear && (stageIdx === 3 || stageIdx === 6)) {
      this.retryFullHeal = true;
    }
  },

  victory(){this.state='ENDING';Ending.start(this.score,this.totalFrames);},
  gameOver(){
    this.state='GAMEOVER';
    this.retryFullHeal = true;
    document.getElementById('final-score').textContent=`SCORE: ${this.score}`;
    document.getElementById('gameover-screen').classList.remove('hidden');
    AudioManager.stopAll();
  },
  
  showAnnouncement() {
    if (this.announcementQueue.length === 0) return;
    const data = this.announcementQueue[0];
    document.getElementById('announcement-title').textContent = data.title;
    document.getElementById('announcement-desc').textContent = data.desc;
    document.getElementById('announcement-dialog').classList.remove('hidden');
    if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
  },
  
  closeAnnouncement() {
    document.getElementById('announcement-dialog').classList.add('hidden');
    this.announcementQueue.shift();
    if (this.announcementQueue.length > 0) {
      setTimeout(() => this.showAnnouncement(), 100);
    }
  },

  draw(){
    const ctx=this.ctx;
    ctx.fillStyle='#06060c';ctx.fillRect(0,0,this.width,this.height);

    if(this.state==='LOADING'){return;}
    if(this.state==='LOADING_COMPLETE'){return;}
    if(this.state==='OPENING'){Opening.draw();return;}

    // Even on title screen, draw background moving
    if(this.state==='TITLE'){return;}
    if(this.state==='ENDING'){Ending.draw(ctx);return;}
    
    if(this.state==='WORLD_MAP') {
      WorldMap.draw(ctx);
      return;
    }

    if(this.state==='BESTIARY') {
      Bestiary.draw(ctx);
      return;
    }

    if(this.state==='RELICS') {
      if (typeof Relics !== 'undefined') Relics.draw(ctx);
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
    if (typeof Relics !== 'undefined') Relics.drawChips(ctx, LevelManager.camX);
    this.player.draw(ctx);
    ParticleSystem.draw(ctx);

    ctx.restore(); // Restore camera transform

    // Relic sync message (after camera restore so it's screen-space)
    if (typeof Relics !== 'undefined') Relics.drawSyncMessage(ctx, this.width, this.height);

    // HUD
    const midBoss=EnemyManager.midBoss;
    HUD.draw(ctx,this.player,this.boss,midBoss,this.score,
      LevelManager.currentSubtitle,LevelManager.subtitleTimer);

    if (this.state === 'PLAYING' && LevelManager.currentStage === 0) {
       ctx.save();
       ctx.fillStyle = '#ffcc44';
       ctx.font = '24px "DotGothic16"';
       ctx.textAlign = 'center';
       ctx.shadowColor = 'rgba(0,0,0,0.8)';
       ctx.shadowBlur = 4;
       ctx.shadowOffsetX = 2;
       ctx.shadowOffsetY = 2;

       let tText = '';
       if (this.tutorialStep === 0) tText = 'ジャンプ W or space';
       else if (this.tutorialStep === 1) tText = 'ペンギン弾　左クリック';
       else if (this.tutorialStep === 2) tText = 'ペンギン爆弾　右クリック';
       else if (this.tutorialStep === 3) tText = '移動操作　A and D';
       else if (this.tutorialStep === 4) tText = 'しゃがみ　S';

       if (tText) {
         ctx.fillText(tText, this.width / 2, this.height / 2 - 80);
       }

       if (this.tutorialStep >= 5 && LevelManager.currentSubtitle == null && LevelManager.subtitleIndex >= LevelManager.subtitles.length) {
         ctx.fillStyle = '#44ccff';
         ctx.font = '28px "DotGothic16"';
         ctx.fillText('操作確認と説明は以上ですー　終末世界を楽しんでください', this.width / 2, this.height / 2);
       }

       ctx.fillStyle = '#cccccc';
       ctx.font = '16px "DotGothic16"';
       ctx.textAlign = 'right';
       ctx.fillText('Enterキーでワールドマップ1へ戻る', this.width - 20, 60);

       ctx.restore();
    }

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
