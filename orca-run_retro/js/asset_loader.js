// === ASSET_LOADER.JS - Image & Data Loading System ===
const AssetLoader = {
  images: {},
  data: { stages: [], enemies: {}, audio: {} },
  totalAssets: 0,
  loadedAssets: 0,
  ready: false,

  async loadAll(progressCallback) {
    // 1. Load Manifest
    const manifest = await fetch('data/manifest.json').then(r => r.json());
    
    // 2. Determine assets
    const imgPaths = manifest.images || [];
    const stagePaths = manifest.stages || [];
    const enemyMap = manifest.enemies || {};
    const enemyPaths = Object.values(enemyMap);
    const audioMap = manifest.audio || {};
    const audioPaths = Object.values(audioMap);
    
    this.totalAssets = imgPaths.length + stagePaths.length + enemyPaths.length + audioPaths.length;
    this.loadedAssets = 0;

    // 3. Load Images
    await Promise.all(imgPaths.map(p => this._loadImage(p, progressCallback)));

    // 4. Load JSON data
    const allJsonPaths = [...stagePaths, ...enemyPaths, ...audioPaths];
    if (manifest.worldMap) allJsonPaths.push(manifest.worldMap);
    await Promise.all(allJsonPaths.map(p => this._loadJSON(p, progressCallback)));

    // 5. Organize stage data in order
    this.data.stages = []; // Clear existing
    stagePaths.forEach(p => {
      this.data.stages.push(this.data._json[p]);
    });

    // 6. Organize enemy data
    this.data.enemies = {}; // Clear existing
    for (const [key, path] of Object.entries(enemyMap)) {
      this.data.enemies[key] = this.data._json[path];
    }

    // 7. Organize audio data
    this.data.audio = {
      bgm: this.data._json[audioMap.bgm],
      se: this.data._json[audioMap.se]
    };
    
    // 8. Load World Map
    if(manifest.worldMap) {
      this.data.worldMap = this.data._json[manifest.worldMap];
    }

    this.ready = true;
  },

  _loadImage(path, cb) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images[path] = img;
        this.loadedAssets++;
        if (cb) cb(this.loadedAssets, this.totalAssets);
        resolve();
      };
      img.onerror = () => {
        console.warn('Failed to load image:', path);
        this.loadedAssets++;
        if (cb) cb(this.loadedAssets, this.totalAssets);
        resolve();
      };
      img.src = path;
    });
  },

  _loadJSON(path, cb) {
    if (!this.data._json) this.data._json = {};
    return fetch(path)
      .then(r => r.json())
      .then(d => {
        this.data._json[path] = d;
        this.loadedAssets++;
        if (cb) cb(this.loadedAssets, this.totalAssets);
      })
      .catch(e => {
        console.warn('Failed to load JSON:', path, e);
        this.loadedAssets++;
        if (cb) cb(this.loadedAssets, this.totalAssets);
      });
  },

  // Convenience getters
  img(path) { 
    if (this.images[path]) return this.images[path]; 
    // Lazy load if not found
    const img = new Image();
    img.src = path;
    this.images[path] = img; // store it immediately so we don't spam requests
    return img;
  },
  getStage(idx) { return this.data.stages[idx]; },
  getEnemy(type) { return this.data.enemies[type]; },
};
