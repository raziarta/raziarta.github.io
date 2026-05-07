// === STAGE EDITOR ===
const StageEditor = {
  active: false,
  canvas: null, ctx: null,
  camX: 0, camY: 0, zoom: 0.5,
  isDragging: false, dragStartX: 0, dragStartY: 0,
  camDragStartX: 0, camDragStartY: 0,
  tool: 'select', // select, platform, zone, enemy, boss, spawn
  selectedObj: null, selectedObjects: [], resizeHandle: null,
  stageData: null,
  mouseWorldX: 0, mouseWorldY: 0,
  drawingRect: null, selectionBox: null,
  
  history: [], historyIndex: -1, dragMoved: false,

  init() {
    this.canvas = document.getElementById('editorCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', e => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', e => this.onWheel(e));
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => this.onKeyDown(e));
    this.newStage();
    this.buildPalette();
    this.loop();
  },

  resize() {
    const wrap = document.getElementById('editor-canvas-wrap');
    if (!wrap) return;
    this.canvas.width = wrap.clientWidth;
    this.canvas.height = wrap.clientHeight;
  },

  newStage() {
    this.stageData = {
      name: '新しいステージ', number: 'STAGE X', length: 12000,
      bgPhase: 0, scrollSpeed: 3.0, hasPitfalls: false,
      mapX: 0.5, mapY: 0.5,
      trackVertical: false, trackStrength: 0.06, scale: 1.0,
      groundColor: '#2a2a3a', groundLineColor: '#3a3a4a',
      backgrounds: [], platforms: [], waves: [], objects: [],
      objects: [], // custom: {type:'water'|'safe'|'death', x,y,w,h}
      midBoss: null, boss: null, subtitles: []
    };
    this.camX = 0; this.camY = 0; this.zoom = 0.5;
    this.selectedObj = null;
    this.selectedObjects = [];
    this.resizeHandle = null;
    
    // Default background fallback
    const tutStage = AssetLoader.getStage(0);
    if (tutStage && tutStage.backgrounds) {
      this.stageData.backgrounds = JSON.parse(JSON.stringify(tutStage.backgrounds));
    }
    
    this.updateProps();
    this.history = []; this.historyIndex = -1;
    this.saveState();
  },

  loadStage(idx) {
    const src = AssetLoader.getStage(idx);
    if (!src) return;
    this.stageData = JSON.parse(JSON.stringify(src));
    if (!this.stageData.objects) this.stageData.objects = [];
    this.camX = 0; this.camY = 0; this.selectedObj = null;
    this.updateProps();
    this.history = []; this.historyIndex = -1;
    this.saveState();
  },

  // --- History (Undo/Redo) ---
  saveState() {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    const stateStr = JSON.stringify(this.stageData);
    if (this.historyIndex >= 0 && this.history[this.historyIndex] === stateStr) return;
    this.history.push(stateStr);
    this.historyIndex++;
  },
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.stageData = JSON.parse(this.history[this.historyIndex]);
      this.selectedObj = null;
      this.updateProps();
    }
  },
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.stageData = JSON.parse(this.history[this.historyIndex]);
      this.selectedObj = null;
      this.updateProps();
    }
  },

  onKeyDown(e) {
    if (!this.active) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); this.undo(); }
      if (e.key === 'y') { e.preventDefault(); this.redo(); }
    }
  },

  // --- Coordinate helpers ---
  screenToWorld(sx, sy) {
    return {
      x: (sx / this.zoom) + this.camX,
      y: (sy / this.zoom) + this.camY
    };
  },
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.camX) * this.zoom,
      y: (wy - this.camY) * this.zoom
    };
  },

  // --- Mouse handlers ---
  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const w = this.screenToWorld(sx, sy);

    if (e.button === 2 || e.button === 1) {
      // Pan
      this.isDragging = true;
      this.dragStartX = sx; this.dragStartY = sy;
      this.camDragStartX = this.camX; this.camDragStartY = this.camY;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.tool === 'select') {
      const handle = this.checkResizeHandles(w.x, w.y);
      if (handle) {
        this.resizeHandle = handle;
        this.isDragging = true;
        this.dragStartX = w.x;
        this.dragStartY = w.y;
        this.dragMoved = false;
        // Store initial bounds for resizing
        this._startRect = {
          x: this.selectedObj.x,
          y: this.selectedObj.y,
          w: this.selectedObj.w,
          h: this.selectedObj.h
        };
        return;
      }

      const hits = this.hitTestAll(w.x, w.y);
      if (hits.length > 0) {
        let hit = hits[0]; // default to first hit
        
        // If we clicked on overlaps and one of them is currently selected, cycle to the next one
        if (this.selectedObj) {
          const currentIndex = hits.indexOf(this.selectedObj);
          if (currentIndex !== -1) {
            // It's in the hit list, select the next one in the hit list
            hit = hits[(currentIndex + 1) % hits.length];
          }
        }
        
        if (e.shiftKey) {
          const idx = this.selectedObjects.indexOf(hit);
          if (idx === -1) this.selectedObjects.push(hit);
          else this.selectedObjects.splice(idx, 1);
        } else {
          // If the hit isn't already the only thing selected, select just it
          if (this.selectedObjects.length !== 1 || this.selectedObjects[0] !== hit) {
            this.selectedObjects = [hit];
          }
        }
        this.selectedObj = this.selectedObjects[this.selectedObjects.length - 1] || null;
        this.updateProps();
        
        this.isDragging = true;
        this.dragStartX = w.x;
        this.dragStartY = w.y;
        this.dragMoved = false;
        
        // Store initial positions for all selected objects
        this.selectedObjects.forEach(obj => {
          // Determine current visual position
          let curX = obj.x;
          let curY = obj.y;
          
          if (obj._type === 'spawn') {
            curX = this.stageData.spawnX !== undefined ? this.stageData.spawnX : 200;
            curY = this.stageData.spawnY !== undefined ? this.stageData.spawnY : 300;
          } else if (obj._type === 'wave') {
            curX = obj.dist;
            curY = obj.y !== undefined ? obj.y : 400;
          } else if (obj._type === 'boss' || obj._type === 'midboss') {
            curX = obj.dist;
            curY = 50; // default visual Y for boss line
          }
          
          obj._startDragX = curX;
          obj._startDragY = curY;
          if (obj.dist !== undefined) obj._startDragDist = obj.dist;
        });
      } else {
        if (!e.shiftKey) this.selectedObjects = [];
        this.selectedObj = null;
        this.updateProps();
        this.selectionBox = { x1: w.x, y1: w.y, x2: w.x, y2: w.y };
      }
    } else if (this.tool === 'platform' || this.tool === 'zone') {
      this.drawingRect = { x: Math.round(w.x), y: Math.round(w.y), w: 0, h: 0 };
    } else if (this.tool === 'spawn') {
      this.stageData.spawnX = Math.round(w.x);
      this.stageData.spawnY = Math.round(w.y);
      this.saveState();
      this.updateProps();
    } else if (this.tool === 'enemy') {
      const sel = document.getElementById('editor-enemy-select');
      const type = sel ? sel.value : 'tireShark';
      if (!this.stageData.waves) this.stageData.waves = [];
      this.stageData.waves.push({
        dist: Math.round(w.x), enemies: [type], y: Math.round(w.y)
      });
      this.saveState();
    } else if (this.tool === 'boss') {
      this.stageData.boss = { dist: Math.round(w.x) };
      this.saveState();
    }
  },

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const w = this.screenToWorld(sx, sy);
    this.mouseWorldX = Math.round(w.x);
    this.mouseWorldY = Math.round(w.y);

    const coordsEl = document.getElementById('editor-coords');
    if (coordsEl) coordsEl.textContent = `X:${this.mouseWorldX}  Y:${this.mouseWorldY}`;

    if (this.isDragging && e.buttons === 2) {
      // Pan camera
      this.camX = this.camDragStartX - (sx - this.dragStartX) / this.zoom;
      this.camY = this.camDragStartY - (sy - this.dragStartY) / this.zoom;
      return;
    }
    if (this.isDragging && this.tool === 'select') {
      const dx = Math.round(w.x - this.dragStartX);
      const dy = Math.round(w.y - this.dragStartY);

      if (this.resizeHandle && this.selectedObj) {
        const o = this.selectedObj;
        const b = this._startRect;
        
        if (this.resizeHandle.includes('r')) {
          o.w = Math.max(10, b.w + (w.x - this.dragStartX));
        }
        if (this.resizeHandle.includes('l')) {
          const newW = Math.max(10, b.w - (w.x - this.dragStartX));
          o.x = b.x + (b.w - newW);
          o.w = newW;
        }
        if (this.resizeHandle.includes('b')) {
          o.h = Math.max(5, b.h + (w.y - this.dragStartY));
        }
        if (this.resizeHandle.includes('t')) {
          const newH = Math.max(5, b.h - (w.y - this.dragStartY));
          o.y = b.y + (b.h - newH);
          o.h = newH;
        }
        
        this.dragMoved = true;
        this.updateProps();
      } else if (this.selectedObjects.length > 0) {
        this.selectedObjects.forEach(obj => {
          const newX = Math.round(obj._startDragX + dx);
          const newY = Math.round(obj._startDragY + dy);
          
          if (obj._type === 'spawn') {
            this.stageData.spawnX = newX;
            this.stageData.spawnY = newY;
          } else if (obj._type === 'wave') {
            obj.dist = newX;
            obj.y = newY;
          } else if (obj._type === 'boss' || obj._type === 'midboss') {
            obj.dist = newX;
          } else {
            if (obj.x !== undefined) obj.x = newX;
            if (obj.y !== undefined) obj.y = newY;
          }
        });
        this.dragMoved = true;
        this.updateProps();
      }
    }
    if (this.selectionBox) {
      this.selectionBox.x2 = w.x;
      this.selectionBox.y2 = w.y;
    }
    if (this.drawingRect) {
      this.drawingRect.w = Math.round(w.x) - this.drawingRect.x;
      this.drawingRect.h = Math.round(w.y) - this.drawingRect.y;
    }
  },

  onMouseUp(e) {
    this.canvas.style.cursor = 'crosshair';
    if (this.drawingRect) {
      let r = this.drawingRect;
      // Normalize negative dimensions
      if (r.w < 0) { r.x += r.w; r.w = -r.w; }
      if (r.h < 0) { r.y += r.h; r.h = -r.h; }
      if (r.w > 10 && r.h > 5) {
        if (this.tool === 'platform') {
          this.stageData.platforms.push({ x: r.x, y: r.y, w: r.w, h: r.h });
        } else if (this.tool === 'zone') {
          const zoneType = document.getElementById('editor-zone-type')?.value;
          if (zoneType) {
            this.stageData.objects.push({ type: zoneType, x: r.x, y: r.y, w: r.w, h: r.h });
          }
        }
        this.saveState();
      }
      this.drawingRect = null;
    }
    if (this.selectionBox) {
      const b = this.selectionBox;
      const xMin = Math.min(b.x1, b.x2), xMax = Math.max(b.x1, b.x2);
      const yMin = Math.min(b.y1, b.y2), yMax = Math.max(b.y1, b.y2);
      
      const newSel = [];
      this.stageData.platforms.forEach(p => {
        if (p.x >= xMin && p.x + p.w <= xMax && p.y >= yMin && p.y + p.h <= yMax) {
          p._type = 'platform';
          newSel.push(p);
        }
      });
      (this.stageData.objects || []).forEach(z => {
        if (z.x >= xMin && z.x + z.w <= xMax && z.y >= yMin && z.y + z.h <= yMax) {
          z._type = 'zone';
          newSel.push(z);
        }
      });
      (this.stageData.waves || []).forEach(w => {
        const wx = w.dist, wy = w.y !== undefined ? w.y : 400;
        if (wx >= xMin && wx <= xMax && wy >= yMin && wy <= yMax) {
          w._type = 'wave';
          newSel.push(w);
        }
      });
      
      this.selectedObjects = newSel;
      
      this.selectedObj = this.selectedObjects[0] || null;
      this.updateProps();
      this.selectionBox = null;
    }
    if (this.isDragging && this.tool === 'select' && this.dragMoved) {
      this.saveState();
      this.dragMoved = false;
    }
    this.isDragging = false;
    this.resizeHandle = null;
  },

  onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const wBefore = this.screenToWorld(sx, sy);
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    this.zoom = Math.max(0.05, Math.min(3, this.zoom * factor));
    const wAfter = this.screenToWorld(sx, sy);
    this.camX += wBefore.x - wAfter.x;
    this.camY += wBefore.y - wAfter.y;
    const zi = document.getElementById('editor-zoom-info');
    if (zi) zi.textContent = `Zoom: ${(this.zoom * 100).toFixed(0)}%`;
  },

  // --- Hit testing ---
  hitTestAll(wx, wy) {
    const hits = [];
    // Check platforms
    for (const p of this.stageData.platforms) {
      if (wx >= p.x && wx <= p.x + p.w && wy >= p.y && wy <= p.y + p.h) {
        p._type = 'platform'; hits.push(p);
      }
    }
    // Check zones/objects
    for (const z of (this.stageData.objects || [])) {
      if (wx >= z.x && wx <= z.x + z.w && wy >= z.y && wy <= z.y + z.h) {
        z._type = 'zone'; hits.push(z);
      }
    }
    // Check waves
    for (const w of (this.stageData.waves || [])) {
      const ex = w.dist, ey = w.y !== undefined ? w.y : 400;
      if (Math.abs(wx - ex) < 20 && Math.abs(wy - ey) < 20) {
        w._type = 'wave'; hits.push(w);
      }
    }
    // Check Boss
    if (this.stageData.boss) {
      if (Math.abs(wx - this.stageData.boss.dist) < 20) {
        this.stageData.boss._type = 'boss';
        hits.push(this.stageData.boss);
      }
    }
    // Check Mid-Boss
    if (this.stageData.midBoss) {
      if (Math.abs(wx - this.stageData.midBoss.dist) < 20) {
        this.stageData.midBoss._type = 'midboss';
        hits.push(this.stageData.midBoss);
      }
    }
    // Check Player Spawn
    const sx = this.stageData.spawnX !== undefined ? this.stageData.spawnX : 200;
    const sy = this.stageData.spawnY !== undefined ? this.stageData.spawnY : 300;
    if (Math.abs(wx - sx) < 20 && Math.abs(wy - sy) < 20) {
      this._spawnProxy = this._spawnProxy || { _type: 'spawn' };
      this._spawnProxy.x = sx;
      this._spawnProxy.y = sy;
      hits.push(this._spawnProxy);
    }
    return hits;
  },

  checkResizeHandles(wx, wy) {
    if (!this.selectedObj || (this.selectedObj._type !== 'platform' && this.selectedObj._type !== 'zone')) return null;
    const o = this.selectedObj;
    const pad = 12 / this.zoom;
    const l = o.x, r = o.x + o.w, t = o.y, b = o.y + o.h;
    const midX = o.x + o.w / 2, midY = o.y + o.h / 2;
    
    // Corners
    if (Math.abs(wx - l) < pad && Math.abs(wy - t) < pad) return 'tl';
    if (Math.abs(wx - r) < pad && Math.abs(wy - t) < pad) return 'tr';
    if (Math.abs(wx - l) < pad && Math.abs(wy - b) < pad) return 'bl';
    if (Math.abs(wx - r) < pad && Math.abs(wy - b) < pad) return 'br';
    
    // Edges
    if (Math.abs(wx - midX) < pad && Math.abs(wy - t) < pad) return 't';
    if (Math.abs(wx - midX) < pad && Math.abs(wy - b) < pad) return 'b';
    if (Math.abs(wx - l) < pad && Math.abs(wy - midY) < pad) return 'l';
    if (Math.abs(wx - r) < pad && Math.abs(wy - midY) < pad) return 'r';
    
    return null;
  },

  // --- Properties Panel ---
  updateProps() {
    const panel = document.getElementById('editor-props-content');
    if (!panel) return;
    const s = this.stageData;
    const o = this.selectedObj;

    let html = `<div class="props-title">Stage Settings</div>`;
    html += this._propRow('Name', 'text', 'stage-name', s.name);
    html += this._propRow('Number', 'text', 'stage-number', s.number);
    html += this._propRow('Length', 'number', 'stage-length', s.length);
    html += this._propRow('Map X', 'number', 'stage-mapx', s.mapX !== undefined ? s.mapX : 0.5, '0.01');
    html += this._propRow('Map Y', 'number', 'stage-mapy', s.mapY !== undefined ? s.mapY : 0.5, '0.01');
    html += this._propRow('Speed', 'number', 'stage-speed', s.scrollSpeed, '0.1');
    html += this._propRow('BgPhase', 'number', 'stage-bgphase', s.bgPhase);
    html += this._propCheck('Pitfalls', 'stage-pitfalls', s.hasPitfalls);
    html += this._propCheck('TrackVert', 'stage-trackv', s.trackVertical);
    html += this._propRow('TrackStr', 'number', 'stage-tracks', s.trackStrength, '0.01');
    html += this._propRow('Scale', 'number', 'stage-scale', s.scale, '0.05');
    html += this._propCheck('Sticky', 'stage-sticky', s.stickyPlatforms !== undefined ? s.stickyPlatforms : true);

    if (o && o._type === 'platform') {
      html += `<div class="props-title" style="margin-top:12px">Platform</div>`;
      html += this._propRow('X', 'number', 'obj-x', o.x);
      html += this._propRow('Y', 'number', 'obj-y', o.y);
      html += this._propRow('W', 'number', 'obj-w', o.w);
      html += this._propRow('H', 'number', 'obj-h', o.h);
      html += this._propCheck('Sticky', 'obj-sticky', o.sticky);
      html += `<button class="tool-btn danger" style="margin-top:8px;width:100%" onclick="StageEditor.deleteSelected()">Delete</button>`;
    } else if (o && o._type === 'zone') {
      html += `<div class="props-title" style="margin-top:12px">Zone (${o.type})</div>`;
      html += this._propRow('X', 'number', 'obj-x', o.x);
      html += this._propRow('Y', 'number', 'obj-y', o.y);
      html += this._propRow('W', 'number', 'obj-w', o.w);
      html += this._propRow('H', 'number', 'obj-h', o.h);
      if (o.type === 'damage') {
        html += this._propRow('Damage', 'number', 'obj-dmg', o.damageAmount || 1);
        html += this._propRow('Interval(s)', 'number', 'obj-int', o.damageInterval || 1, '0.1');
      }
      html += `<button class="tool-btn danger" style="margin-top:8px;width:100%" onclick="StageEditor.deleteSelected()">Delete</button>`;
    }

    html += `<div class="props-title" style="margin-top:12px">Subtitles</div>`;
    (s.subtitles||[]).forEach((sub, i) => {
      html += `<div style="display:flex; gap:4px; margin-bottom:4px">`;
      html += `<input type="number" value="${sub.dist}" style="width:60px" onchange="StageEditor.updateSub(${i}, 'dist', this.value)">`;
      html += `<input type="text" value="${sub.text}" style="flex:1" onchange="StageEditor.updateSub(${i}, 'text', this.value)">`;
      html += `<button onclick="StageEditor.deleteSub(${i})">×</button>`;
      html += `</div>`;
    });
    html += `<button class="tool-btn" style="width:100%;margin-top:4px" onclick="StageEditor.addSub()">+ Add Subtitle</button>`;

    panel.innerHTML = html;

    // Bind input events
    this._bindProp('stage-name', v => { s.name = v; this.saveState(); });
    this._bindProp('stage-number', v => { s.number = v; this.saveState(); });
    this._bindProp('stage-length', v => { s.length = parseInt(v)||12000; this.saveState(); }, 'number');
    this._bindProp('stage-mapx', v => { s.mapX = parseFloat(v)||0.5; this.saveState(); }, 'number');
    this._bindProp('stage-mapy', v => { s.mapY = parseFloat(v)||0.5; this.saveState(); }, 'number');
    this._bindProp('stage-speed', v => { s.scrollSpeed = parseFloat(v)||3; this.saveState(); }, 'number');
    this._bindProp('stage-bgphase', v => { s.bgPhase = parseInt(v)||0; this.saveState(); }, 'number');
    this._bindCheck('stage-pitfalls', v => { s.hasPitfalls = v; this.saveState(); });
    this._bindCheck('stage-trackv', v => { s.trackVertical = v; this.saveState(); });
    this._bindProp('stage-tracks', v => { s.trackStrength = parseFloat(v)||0.06; this.saveState(); }, 'number');
    this._bindProp('stage-scale', v => { s.scale = parseFloat(v)||1; this.saveState(); }, 'number');
    this._bindCheck('stage-sticky', v => { s.stickyPlatforms = v; this.saveState(); });
    if (o) {
      this._bindProp('obj-x', v => { o.x = parseInt(v)||0; this.saveState(); }, 'number');
      this._bindProp('obj-y', v => { o.y = parseInt(v)||0; this.saveState(); }, 'number');
      this._bindProp('obj-w', v => { o.w = parseInt(v)||100; this.saveState(); }, 'number');
      this._bindProp('obj-h', v => { o.h = parseInt(v)||16; this.saveState(); }, 'number');
      this._bindCheck('obj-sticky', v => { o.sticky = v; this.saveState(); });
      if (o._type === 'zone' && o.type === 'damage') {
        this._bindProp('obj-dmg', v => { o.damageAmount = parseFloat(v)||1; this.saveState(); }, 'number');
        this._bindProp('obj-int', v => { o.damageInterval = parseFloat(v)||1; this.saveState(); }, 'number');
      }
    }
  },

  _propRow(label, type, id, val, step) {
    return `<div class="prop-row"><span class="prop-label">${label}</span><input class="prop-input" type="${type}" id="ep-${id}" value="${val}" ${step?'step="'+step+'"':''}></div>`;
  },
  _propCheck(label, id, val) {
    return `<div class="prop-row"><span class="prop-label">${label}</span><input class="prop-checkbox" type="checkbox" id="ep-${id}" ${val?'checked':''}></div>`;
  },
  _bindProp(id, fn) {
    const el = document.getElementById('ep-'+id);
    if (el) el.addEventListener('change', () => fn(el.value));
  },
  _bindCheck(id, fn) {
    const el = document.getElementById('ep-'+id);
    if (el) el.addEventListener('change', () => fn(el.checked));
  },

  deleteSelected() {
    if (!this.selectedObj) return;
    const o = this.selectedObj;
    if (o._type === 'platform') {
      this.stageData.platforms = this.stageData.platforms.filter(p => p !== o);
    } else if (o._type === 'zone') {
      this.stageData.objects = this.stageData.objects.filter(z => z !== o);
    }
    this.selectedObj = null;
    this.updateProps();
    this.saveState();
  },

  addSub() {
    if (!this.stageData.subtitles) this.stageData.subtitles = [];
    this.stageData.subtitles.push({ dist: Math.floor(this.camX + 200), text: '新しい字幕' });
    this.updateProps();
    this.saveState();
  },

  updateSub(idx, prop, val) {
    const sub = this.stageData.subtitles[idx];
    if (prop === 'dist') sub.dist = parseInt(val) || 0;
    else sub.text = val;
    this.saveState();
  },

  deleteSub(idx) {
    this.stageData.subtitles.splice(idx, 1);
    this.updateProps();
    this.saveState();
  },

  // --- Asset Palette ---
  getEnemyIconSrc(type) {
    const e = AssetLoader.getEnemy(type);
    if (!e) return null;
    if (e.sprites) {
      if (e.sprites.frames && e.sprites.frames.length > 0) return e.sprites.frames[0];
      for (const key in e.sprites) {
        if (typeof e.sprites[key] === 'string' && e.sprites[key].endsWith('.png')) return e.sprites[key];
      }
    }
    if (e.sprite) return e.sprite;
    return null;
  },

  buildPalette() {
    const el = document.getElementById('editor-palette-content');
    if (!el) return;
    let html = '';

    // Test Play Button
    html += `<div class="palette-section" style="padding: 12px 8px;">`;
    html += `<button class="tool-btn" style="width:100%; border-color:#44ff66; color:#44ff66; font-size:14px; font-weight:bold" onclick="StageEditor.testPlay()">▶ TEST PLAY</button>`;
    html += `</div>`;

    // Stages to load
    html += `<div class="palette-section"><div class="palette-section-title open" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('hidden')">Load Stage</div><div class="palette-items">`;
    const stages = AssetLoader.data.stages || [];
    stages.forEach((s, i) => {
      html += `<div class="palette-item" onclick="StageEditor.loadStage(${i})" title="${s.name}"><div class="palette-icon" style="font-size:11px">${s.number||('S'+i)}</div></div>`;
    });
    html += `<div class="palette-item" onclick="StageEditor.newStage()" title="New"><div class="palette-icon">＋</div></div>`;
    html += `</div></div>`;

    // Enemies
    html += `<div class="palette-section"><div class="palette-section-title open" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('hidden')">Enemies</div><div class="palette-items">`;
    const enemies = Object.keys(AssetLoader.data.enemies || {});
    enemies.forEach(e => {
      const src = StageEditor.getEnemyIconSrc(e);
      let content = `<div class="palette-icon" style="font-size:9px">${e.replace(/_/g,' ').slice(0,6)}</div>`;
      if (src) content = `<img src="${src}" alt="${e}" style="max-width:32px;max-height:32px;image-rendering:pixelated;">`;
      html += `<div class="palette-item" draggable="true" data-enemy="${e}" title="${e}" ondragstart="StageEditor.onDragStart(event,'enemy','${e}')">${content}</div>`;
    });
    html += `</div></div>`;

    // Zone types
    html += `<div class="palette-section"><div class="palette-section-title open" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('hidden')">Zone Types</div><div class="palette-items" style="flex-direction:column;gap:4px">`;
    html += `<select id="editor-zone-type" class="prop-select" style="width:100%"><option value="water">🌊 Water (低重力)</option><option value="safe">🛡 Safe (落下死無効)</option><option value="death">💀 Death (即死)</option><option value="damage">💥 Damage (継続ダメージ)</option><option value="camera">🎥 Camera (カメラ追従)</option></select>`;
    html += `</div></div>`;

    // Enemy type for placement
    html += `<div class="palette-section"><div class="palette-section-title open">Enemy Select</div><div class="palette-items" style="flex-direction:column">`;
    html += `<select id="editor-enemy-select" class="prop-select" style="width:100%">`;
    enemies.forEach(e => { html += `<option value="${e}">${e}</option>`; });
    html += `</select></div></div>`;

    el.innerHTML = html;
  },

  onDragStart(e, type, data) {
    e.dataTransfer.setData('text/plain', JSON.stringify({type, data}));
  },

  // --- Export ---
  exportJSON() {
    const out = JSON.parse(JSON.stringify(this.stageData));
    // Clean internal fields
    const json = JSON.stringify(out, null, 2);
    document.getElementById('export-textarea').value = json;
    document.getElementById('editor-export-modal').classList.remove('hidden');
  },

  copyExport() {
    const ta = document.getElementById('export-textarea');
    ta.select(); document.execCommand('copy');
    alert('Copied to clipboard!');
  },

  downloadExport() {
    const json = document.getElementById('export-textarea').value;
    const blob = new Blob([json], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = (this.stageData.number||'stage').replace(/\s+/g,'_').toLowerCase() + '.json';
    a.click(); URL.revokeObjectURL(url);
  },

  closeExport() {
    document.getElementById('editor-export-modal').classList.add('hidden');
  },

  testPlay() {
    this.close();
    const testData = JSON.parse(JSON.stringify(this.stageData));
    
    // Inject at a high index
    AssetLoader.data.stages[99] = testData;
    Game.isEditorTest = true;
    Game.startLevel(99);
  },

  // --- Set Tool ---
  setTool(t) {
    this.tool = t;
    document.querySelectorAll('.editor-tool-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('etool-'+t);
    if (btn) btn.classList.add('active');
  },

  // --- Rendering Loop ---
  loop() {
    if (!this.active) { requestAnimationFrame(() => this.loop()); return; }
    this.draw();
    requestAnimationFrame(() => this.loop());
  },

  draw() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const s = this.stageData;

    // Backgrounds (Drawn without editor scaling)
    if (s && s.backgrounds && typeof Backgrounds !== 'undefined') {
      const tempCamY = LevelManager.camY;
      LevelManager.camY = this.camY;
      ctx.save();
      ctx.scale(w / 1280, h / 720); // rough fit for 720p backgrounds
      Backgrounds.draw(ctx, this.camX, s);
      ctx.restore();
      LevelManager.camY = tempCamY;
    }

    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    // Grid
    this.drawGrid(ctx);

    // Stage length indicator
    ctx.fillStyle = 'rgba(68,204,255,0.05)';
    ctx.fillRect(0, -2000, s.length, 6000);
    ctx.strokeStyle = 'rgba(68,204,255,0.3)';
    ctx.setLineDash([8,8]);
    ctx.beginPath(); ctx.moveTo(s.length, -2000); ctx.lineTo(s.length, 4000); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#44ccff'; ctx.font = '14px DotGothic16';
    ctx.fillText('LENGTH: '+s.length, s.length+10, 20);

    // Platforms
    s.platforms.forEach(p => {
      const sel = this.selectedObjects.includes(p);
      ctx.fillStyle = sel ? '#5566aa' : '#3a3a4a';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = sel ? '#44ccff' : '#5a5a6a';
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      
      if (sel && p === this.selectedObj) {
        // Draw 8 resize handles
        ctx.fillStyle = '#fff';
        const hSize = 8 / this.zoom;
        const l = p.x, r = p.x + p.w, t = p.y, b = p.y + p.h;
        const mx = p.x + p.w / 2, my = p.y + p.h / 2;
        [
          [l,t],[mx,t],[r,t],
          [l,my],      [r,my],
          [l,b],[mx,b],[r,b]
        ].forEach(([hx, hy]) => {
          ctx.fillRect(hx - hSize/2, hy - hSize/2, hSize, hSize);
        });
      }
      
      ctx.fillStyle = '#888'; ctx.font = '9px DotGothic16';
      ctx.fillText(`${p.w}x${p.h}`, p.x+2, p.y-3);
    });

    // Zones
    (s.objects||[]).forEach(z => {
      const sel = this.selectedObjects.includes(z);
      const colors = { water:'rgba(30,100,200,0.2)', safe:'rgba(30,200,100,0.2)', death:'rgba(200,30,30,0.2)', damage:'rgba(255,165,0,0.2)', camera:'rgba(150,50,200,0.2)' };
      const borders = { water:'#3388ff', safe:'#33ff88', death:'#ff3333', damage:'#ffa500', camera:'#9632c8' };
      ctx.fillStyle = colors[z.type] || 'rgba(100,100,100,0.2)';
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = sel ? '#fff' : (borders[z.type]||'#888');
      ctx.lineWidth = sel ? 2 : 1;
      ctx.setLineDash([6,4]); ctx.strokeRect(z.x, z.y, z.w, z.h); ctx.setLineDash([]);
      
      if (sel && z === this.selectedObj) {
        ctx.fillStyle = '#fff';
        const hSize = 8 / this.zoom;
        const l = z.x, r = z.x + z.w, t = z.y, b = z.y + z.h;
        const mx = z.x + z.w / 2, my = z.y + z.h / 2;
        [
          [l,t],[mx,t],[r,t],
          [l,my],      [r,my],
          [l,b],[mx,b],[r,b]
        ].forEach(([hx, hy]) => {
          ctx.fillRect(hx - hSize/2, hy - hSize/2, hSize, hSize);
        });
      }
      
      ctx.fillText(z.type.toUpperCase(), z.x+4, z.y+16);
    });

    // Subtitles visualization
    (s.subtitles||[]).forEach((sub, i) => {
      ctx.strokeStyle = 'rgba(255,255,0,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(sub.dist, -1000); ctx.lineTo(sub.dist, 3000); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffff00';
      ctx.font = '12px DotGothic16';
      ctx.fillText(`SUB: ${sub.text.substring(0,10)}...`, sub.dist + 5, 50 + (i % 10) * 20);
    });

    // Enemies (Waves)
    s.waves.forEach((w, i) => {
      const ex = w.dist;
      const ey = w.y !== undefined ? w.y : 400;
      const eType = w.enemies[0];
      const src = this.getEnemyIconSrc(eType);
      const sel = this.selectedObjects.includes(w);

      if (src && AssetLoader.img(src)) {
        const img = AssetLoader.img(src);
        const eData = AssetLoader.getEnemy(eType);
        const ew = ((eData.sprites ? eData.sprites.width : 0) || eData.w || 60) * 0.8;
        const eh = ((eData.sprites ? eData.sprites.height : 0) || eData.h || 60) * 0.8;
        ctx.drawImage(img, ex - ew/2, ey - eh/2, ew, eh);
        if (sel) {
          ctx.strokeStyle = '#44ccff'; ctx.lineWidth = 2;
          ctx.strokeRect(ex - ew/2 - 2, ey - eh/2 - 2, ew + 4, eh + 4);
        }
      } else {
        ctx.fillStyle = sel ? '#fff' : '#ff6644';
        ctx.beginPath(); ctx.arc(ex, ey, 12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '8px DotGothic16'; ctx.textAlign = 'center';
        ctx.fillText(eType?.slice(0,4)||'?', ex, ey+3);
        ctx.textAlign = 'left';
      }
    });

    // Player Spawn
    const spawnX = s.spawnX !== undefined ? s.spawnX : 200;
    const spawnY = s.spawnY !== undefined ? s.spawnY : 300;
    const playerImg = AssetLoader.img('assets/sprites/player/orca_stand.png');
    if (playerImg) {
      ctx.drawImage(playerImg, spawnX - 20, spawnY - 20, 40, 40);
      ctx.strokeStyle = '#44ff66'; ctx.strokeRect(spawnX - 20, spawnY - 20, 40, 40);
      ctx.fillStyle = '#44ff66'; ctx.font = '10px DotGothic16';
      ctx.fillText('SPAWN', spawnX-15, spawnY-25);
    }

    // Boss marker
    if (s.boss) {
      const bx = s.boss.dist;
      ctx.strokeStyle = '#ff2222'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx, -1000); ctx.lineTo(bx, 3000); ctx.stroke();
      ctx.fillStyle = '#ff2222'; ctx.font = '16px "Press Start 2P"';
      ctx.fillText('BOSS', bx+8, 50);
    }
    if (s.midBoss) {
      const mx = s.midBoss.dist;
      ctx.strokeStyle = '#ff8822'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, -1000); ctx.lineTo(mx, 3000); ctx.stroke();
      ctx.fillStyle = '#ff8822'; ctx.font = '12px "Press Start 2P"';
      ctx.fillText('MID-BOSS: '+(s.midBoss.type||''), mx+8, 50);
    }

    // Drawing rect preview
    if (this.drawingRect) {
      const r = this.drawingRect;
      ctx.fillStyle = this.tool === 'zone' ? 'rgba(30,100,200,0.3)' : 'rgba(100,100,200,0.3)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = '#44ccff'; ctx.lineWidth = 1;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }

    // Selection box
    if (this.selectionBox) {
      const b = this.selectionBox;
      ctx.fillStyle = 'rgba(68, 204, 255, 0.1)';
      ctx.fillRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
      ctx.strokeStyle = '#44ccff';
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
      ctx.setLineDash([]);
    }

    ctx.restore();
  },

  drawGrid(ctx) {
    const step = 100;
    const startX = Math.floor(this.camX / step) * step - step;
    const startY = Math.floor(this.camY / step) * step - step;
    const endX = this.camX + this.canvas.width / this.zoom + step;
    const endY = this.camY + this.canvas.height / this.zoom + step;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = startX; x < endX; x += step) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
    for (let y = startY; y < endY; y += step) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
    ctx.stroke();
    // Major grid every 1000
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor(startX/1000)*1000; x < endX; x += 1000) { ctx.moveTo(x,startY); ctx.lineTo(x,endY); }
    ctx.stroke();
    // X labels
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = '10px DotGothic16';
    for (let x = Math.floor(startX/1000)*1000; x < endX; x += 1000) {
      ctx.fillText(x, x+2, startY+12);
    }
  },

  // --- Open/Close ---
  open() {
    this.active = true;
    document.getElementById('editor-screen').classList.remove('hidden');
    if (!this.stageData.subtitles) this.stageData.subtitles = [];
    if (!this.stageData.objects) this.stageData.objects = [];
    this.resize();
    this.updateProps();
  },

  close() {
    this.active = false;
    document.getElementById('editor-screen').classList.add('hidden');
  },

  toggleFullscreen() {
    const el = document.getElementById('editor-screen');
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
};
