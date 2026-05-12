/**
 * OPENING.JS - Sonic Polish Version
 * Adds dynamic whoosh SE when flying through the city and wasteland.
 */
const Opening = {
  active: false,
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  
  phase: 'idle', 
  timer: 0,
  diveStartTime: 0,
  lastWhooshTime: 0,
  skipHintVisible: false,
  enterCount: 0,
  lastEnterDown: false,
  
  renderWidth: 384,
  renderHeight: 216,
  offscreenCanvas: null,
  
  textures: {},
  diamondSprite: null,
  curve: null,
  
  seed: 12345,
  rng() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  },

  abyssX: 2500,
  abyssZ: 500,
  
  init() {
    if (this.renderer) return; 
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, this.renderWidth / this.renderHeight, 0.1, 15000);
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.renderWidth;
    this.offscreenCanvas.height = this.renderHeight;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.offscreenCanvas, antialias: false, alpha: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.renderWidth, this.renderHeight);
    this._loadAssets();
  },
  
  _loadAssets() {
    const loader = new THREE.TextureLoader();
    const pixelate = (tex) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    };
    // Fallback to existing textures to avoid 404
    this.textures.grass = loader.load('assets/opening/tex_leaf.png', pixelate); 
    this.textures.stone = loader.load('assets/opening/tex_rock.png', pixelate); 
    this.textures.logo = loader.load('assets/sprites/player/orca_stand.png', pixelate);
    this.textures.eye = loader.load('assets/opening/eye.png', pixelate);
    this.textures.building = loader.load('assets/opening/tex_building.png', pixelate);
    this.textures.tree = loader.load('assets/opening/tex_leaf.png', pixelate);
    this.textures.water = loader.load('assets/opening/tex_water.png', pixelate);
    this.textures.rock = loader.load('assets/opening/tex_rock.png', pixelate);
  },
  
  async start() {
    this.init(); 
    this.seed = 12345; 
    this._buildEnvironment(); 

    if (typeof AudioManager !== 'undefined') {
      try {
        await AudioManager.init();
        await Tone.context.resume();
        AudioManager.stopAll();
        AudioManager.startWindLoop(); // Ensure wind starts
      } catch(e) {}
    }

    this.active = true;
    this.phase = 'cinematic';
    this.timer = 0;
    this.diveStartTime = 0;
    this.lastWhooshTime = 0;
    this.skipHintVisible = false;
    this.enterCount = 0;
    this.lastEnterDown = false;
    
    if (this.scene) {
      this.scene.background = new THREE.Color(0x87ceeb);
      if (this.scene.fog) {
        this.scene.fog.color.set(0x87ceeb);
        this.scene.fog.near = 1500;
        this.scene.fog.far = 8000;
      }
    }
    this.camera.up.set(0, 1, 0);
    this.camera.rotation.set(0, 0, 0);

    const pts = [
      new THREE.Vector3(-1800, 600, 1500), 
      new THREE.Vector3(-800, 350, 800),   
      new THREE.Vector3(-200, 180, 400),   
      new THREE.Vector3(800, 250, 400),    
      new THREE.Vector3(1500, 400, 500),   
      new THREE.Vector3(2200, 600, 500),   
      new THREE.Vector3(this.abyssX, 850, this.abyssZ - 50), 
      new THREE.Vector3(this.abyssX, 0, this.abyssZ),       
      new THREE.Vector3(this.abyssX, -1500, this.abyssZ),   
      new THREE.Vector3(this.abyssX, -5000, this.abyssZ)    
    ];
    this.curve = new THREE.CatmullRomCurve3(pts);
    this.curve.curveType = 'centripetal';
  },
  
  _buildEnvironment() {
    if (!this.scene) return;
    this.scene.clear();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 1500, 8000);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(2000, 4000, -2000);
    this.scene.add(sunLight);

    const sunPos = new THREE.Vector3(3000, 4500, -3500);
    const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    sunCore.scale.set(1200, 1200, 1); sunCore.position.copy(sunPos); this.scene.add(sunCore);
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffaa, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
    sunGlow.scale.set(3000, 3000, 1); sunGlow.position.copy(sunPos); this.scene.add(sunGlow);

    for (let i = 0; i < 50; i++) {
      const cloud = new THREE.Mesh(new THREE.BoxGeometry(500+this.rng()*500, 80, 400+this.rng()*400), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
      cloud.position.set(-5000 + this.rng() * 10000, 2000 + this.rng() * 1500, -5000 + this.rng() * 10000);
      this.scene.add(cloud);
    }

    const isSafe = (x, z, r) => {
      const dToHole = Math.sqrt((x - this.abyssX)**2 + (z - this.abyssZ)**2);
      if (dToHole < 550) return false; 
      for (let t = 0; t <= 1; t += 0.05) {
        const p = this.curve ? this.curve.getPoint(t) : {x:0,y:0,z:0};
        if (p.y < 0) continue;
        const dist = Math.sqrt((x-p.x)**2 + (z-p.z)**2);
        if (dist < r) return false;
      }
      return true;
    };

    const groundTex = this.textures.stone.clone();
    if (groundTex) { groundTex.repeat.set(80, 80); groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; }
    const terrainGeo = new THREE.PlaneGeometry(8000, 8000, 80, 80);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i); const vy = posAttr.getY(i);
      let h = (vx < 500 && Math.abs(vx - vy) < 250) ? -40 : Math.max(0, Math.sin(vx*0.005)*Math.cos(vy*0.005)*160) + this.rng()*25;
      const dToHole = Math.sqrt((vx - this.abyssX)**2 + (vy - this.abyssZ)**2);
      if (dToHole < 700) { h = Math.min(h, (dToHole - 700) * 0.15); }
      posAttr.setZ(i, h);
    }
    terrainGeo.computeVertexNormals();
    const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({ map: groundTex, side: THREE.DoubleSide }));
    terrain.rotation.x = -Math.PI / 2;
    this.scene.add(terrain);

    const river = new THREE.Mesh(new THREE.PlaneGeometry(4000, 600), new THREE.MeshLambertMaterial({ map: this.textures.water, color: 0x44aaff, transparent: true, opacity: 0.7 }));
    river.rotation.x = -Math.PI / 2; river.rotation.z = Math.PI / 4; 
    river.position.set(-1500, -10, -1500);
    this.scene.add(river);

    const ivyMat = new THREE.MeshLambertMaterial({ map: this.textures.tree, color: 0x88bb88, transparent: true, alphaTest: 0.1 });
    for (let i = 0; i < 70; i++) {
      const bx = -2500 + this.rng()*2000;
      const bz = 0 + this.rng()*2500;
      if (!isSafe(bx, bz, 160)) continue;
      const h = 200 + this.rng() * 500;
      const b = new THREE.Mesh(new THREE.BoxGeometry(90, h, 90), new THREE.MeshLambertMaterial({ map: this.textures.building, color: 0x99aacc }));
      b.position.set(bx, h/2, bz);
      this.scene.add(b);
      const ivy = new THREE.Mesh(new THREE.PlaneGeometry(80, h*0.75), ivyMat);
      ivy.position.set(b.position.x + 46, h*0.37, b.position.z);
      ivy.rotation.y = Math.PI / 2;
      this.scene.add(ivy);
    }

    const rockMat = new THREE.MeshPhongMaterial({ map: this.textures.rock, color: 0xaaaaaa, flatShading: true });
    for (let i = 0; i < 300; i++) {
      const rx = (this.rng()-0.5)*7000;
      const rz = (this.rng()-0.5)*7000;
      if (!isSafe(rx, rz, 120)) continue;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(60 + this.rng()*100, 0), rockMat);
      rock.position.set(rx, 0, rz);
      rock.rotation.set(this.rng(), this.rng(), this.rng());
      this.scene.add(rock);
    }

    const hole = new THREE.Mesh(new THREE.CircleGeometry(350, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    hole.rotation.x = -Math.PI / 2; hole.position.set(this.abyssX, 8, this.abyssZ);
    this.scene.add(hole);
    
    const stoneTex = this.textures.stone;
    if (stoneTex) { stoneTex.repeat.set(5,60); stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; }
    const cliff = new THREE.Mesh(new THREE.CylinderGeometry(350, 350, 12000, 32, 1, true), new THREE.MeshLambertMaterial({ map: stoneTex, side: THREE.BackSide }));
    cliff.position.set(this.abyssX, -6000, this.abyssZ);
    this.scene.add(cliff);

    this.diamondSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.textures.eye, color: 0xaa44ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
    this.diamondSprite.scale.set(700, 700, 1); this.diamondSprite.position.set(this.abyssX, -5500, this.abyssZ); 
    this.scene.add(this.diamondSprite);
  },
  
  update() {
    if (!this.active && this.phase !== 'logo' && this.phase !== 'transition') return;
    if (!this.curve) return; 

    const delta = this.clock.getDelta();
    this.timer += delta;
    
    if (this.phase === 'cinematic') {
      const totalDuration = 26.0; 
      const t = Math.min(1, this.timer / totalDuration);
      const pos = this.curve.getPoint(t);
      this.camera.position.copy(pos);
      
      // Continuous wind modulation handles the atmosphere smoothly.

      if (pos.y > 0) {
        this.camera.lookAt(this.curve.getPoint(Math.min(1, t + 0.015)));
      } else {
        if (this.diveStartTime === 0) {
          this.diveStartTime = this.timer;
          if (typeof AudioManager !== 'undefined') AudioManager.playRumble();
        }
        
        const diveTime = this.timer - this.diveStartTime;
        const pitch = Math.min(Math.PI / 2, diveTime * 1.5); 
        this.camera.rotation.set(-pitch, 0, 0, 'YXZ'); 
        
        const fade = Math.min(1, diveTime / 1.5);
        this.scene.background.lerp(new THREE.Color(0x000000), fade);
        if (this.scene.fog) this.scene.fog.color.lerp(new THREE.Color(0x000000), fade);

        if (diveTime > 4.0 && diveTime <= 5.0) {
          this.diamondSprite.material.opacity = 1.0;
        } else {
          this.diamondSprite.material.opacity = 0;
        }
        
        if (diveTime >= 7.0) {
          this.phase = 'logo'; this.timer = 0; this.active = false;
          if (typeof AudioManager !== 'undefined') { AudioManager.stopWindLoop(); AudioManager.playWindGust(); }
        }
      }
    }
    
    if (this.phase === 'logo' && this.timer >= 3.0) { this.phase = 'transition'; this.timer = 0; }
    if (this.phase === 'transition' && this.timer >= 1.0) { this.finish(); }
    
    // Skip Logic
    if (typeof Game !== 'undefined') {
      // Show hint on any key or mouse press
      const anyKey = Object.values(Game.keys).some(v => v);
      if (anyKey || Game.mouseL || Game.mouseR) {
        this.skipHintVisible = true;
      }

      // Detect Enter key press (exactly twice)
      const enterDown = Game.keys['Enter'];
      if (enterDown && !this.lastEnterDown) {
        this.enterCount++;
        if (this.enterCount >= 2) {
          this.finish();
          if (typeof AudioManager !== 'undefined') {
            AudioManager.stopWindLoop();
            AudioManager.playSE('select');
          }
          return;
        }
      }
      this.lastEnterDown = enterDown;
    }

    // Dynamic wind modulation
    if (typeof AudioManager !== 'undefined' && AudioManager.windFilter) {
      const heightMod = Math.max(0, this.camera.position.y / 600);
      const tiltMod = Math.abs(this.camera.rotation.z) * 1000;
      const freq = 400 + heightMod * 600 + tiltMod;
      AudioManager.windFilter.frequency.setTargetAtTime(freq, Tone.now(), 0.1);
    }
  },
  
  draw() {
    const mainCtx = Game.ctx;
    mainCtx.imageSmoothingEnabled = false;
    if (this.active) {
      if (this.renderer && this.scene) this.renderer.render(this.scene, this.camera);
      mainCtx.clearRect(0, 0, Game.width, Game.height);
      if (this.active) mainCtx.drawImage(this.offscreenCanvas, 0, 0, Game.width, Game.height);
      
      // Draw Skip Hint
      if (this.skipHintVisible) {
        mainCtx.save();
        mainCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        mainCtx.font = '24px "DotGothic16"';
        mainCtx.textAlign = 'right';
        mainCtx.fillText('Enterキー2回でスキップ', Game.width - 30, Game.height - 30);
        mainCtx.restore();
      }
    } else if (this.phase === 'logo' || this.phase === 'transition') {
      mainCtx.fillStyle = '#000';
      mainCtx.fillRect(0, 0, Game.width, Game.height);
      if (this.phase === 'logo') { this._drawLogo(mainCtx); }
    }
  },
  
  _drawLogo(ctx) {
    if (!this.textures.logo || !this.textures.logo.image) return;
    const logoImg = this.textures.logo.image;
    const baseW = 400; const baseH = (logoImg.height / logoImg.width) * baseW;
    ctx.save();
    ctx.translate(Game.width / 2, Game.height / 2);
    let alpha = 1.0;
    if (this.timer < 0.5) alpha = this.timer / 0.5;
    if (this.timer > 2.5) alpha = 1.0 - (this.timer - 2.5) / 0.5;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.imageSmoothingEnabled = false; 
    ctx.drawImage(logoImg, -baseW / 2, -baseH / 2, baseW, baseH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 64px "DotGothic16"'; ctx.textAlign = 'center';
    ctx.fillText('ORCA RUN', 0, baseH / 2 + 60);
    ctx.restore();
  },
  
  finish() {
    this.active = false; this.phase = 'idle';
    if (typeof Game !== 'undefined') {
      Game.state = 'TITLE';
      document.getElementById('title-screen').classList.remove('hidden');
    }
  }
};
