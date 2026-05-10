// === WORLD_MAP.JS - Stage Select with Two Map System ===
const WorldMap = {
  active: false,
  moving: false,
  currentMap: 1, // 1 = surface, 2 = abyss
  selectedNode: 0,
  orcaX: 0,
  orcaY: 0,
  orcaTargetX: 0,
  orcaTargetY: 0,
  mapImage1: null,
  mapImage2: null,
  mapImage3: null,
  fadeAlpha: 0,
  fadeState: 'none', // none, out, in
  pendingMapSwitch: 0,
  panOffset: 0,
  wheelTimer: 0,

  // Stage nodes for Map 1 (Surface - stages 0-3)
  map1Nodes: [
    { id: 0, label: 'ステージ0', name: 'この世界の成れ果て', x: 0.50, y: 1.1, stageIndex: 0 },
    { id: 1, label: 'ステージ1', name: '崩落したビル群', x: 0.48, y: 0.88, stageIndex: 1 },
    { id: 2, label: 'ステージ2', name: '植物に覆われた路地裏', x: 0.35, y: 0.55, stageIndex: 2 },
    { id: 3, label: 'ステージ3', name: '巨大クレーター跡地', x: 0.48, y: 0.32, stageIndex: 3 },
  ],

  // Stage nodes for Map 2 (Abyss - stages 4-6)
  map2Nodes: [
    { id: 4, label: 'ステージ4', name: '第一層 - 衰退した遺構', x: 0.45, y: 0.22, stageIndex: 4 },
    { id: 5, label: 'ステージ5', name: '第二層 - 異形の回廊', x: 0.50, y: 0.65, stageIndex: 5 },
    { id: 6, label: 'ステージ6', name: '第三層 - 終焉の淵', x: 0.48, y: 0.95, stageIndex: 6 },
  ],

  // Stage nodes for Map 3 (Core - stages 7-9)
  map3Nodes: [
    { id: 7, label: 'ステージ7', name: '雲海', x: 0.50, y: 0.92, stageIndex: 7 },
    { id: 8, label: 'ステージ8', name: '海底遺跡', x: 0.50, y: 0.50, stageIndex: 8 },
    { id: 9, label: 'ステージ9', name: '星の核', x: 0.50, y: 0.08, stageIndex: 9 },
  ],

  init() {
    // Load map images
    this.mapImage1 = new Image();
    this.mapImage1.src = 'assets/backgrounds/world1/原案1.png';
    this.mapImage2 = new Image();
    this.mapImage2.src = 'assets/backgrounds/world2/原案2.png';
    this.mapImage3 = new Image();
    this.mapImage3.src = 'assets/backgrounds/world3/原案3.png';
    
    this.selectedNode = 1; // Default to stage 1
    this.currentMap = 1;
    this._updateOrcaPosition(true);
  },

  getNodes() {
    if (this.currentMap === 1) return this.map1Nodes;
    if (this.currentMap === 2) return this.map2Nodes;
    return this.map3Nodes;
  },

  getClearedStages() {
    return JSON.parse(localStorage.getItem('orcaRunCleared') || '[]');
  },

  isStageUnlocked(stageIndex) {
    if (stageIndex === 0 || stageIndex === 1) return true; // Tutorial and Stage 1 always unlocked
    const cleared = this.getClearedStages();
    return cleared.includes(stageIndex - 1); // Must clear previous stage
  },

  getNodeCoords(node) {
    const stage = typeof AssetLoader !== 'undefined' ? AssetLoader.getStage(node.stageIndex) : null;
    return {
      x: (stage && stage.mapX !== undefined) ? stage.mapX : node.x,
      y: (stage && stage.mapY !== undefined) ? stage.mapY : node.y
    };
  },

  _updateOrcaPosition(instant) {
    const nodes = this.getNodes();
    const node = nodes.find(n => n.stageIndex === this.selectedNode);
    if (!node) return;
    
    const W = Game.width, H = Game.height;
    const coords = this.getNodeCoords(node);
    this.orcaTargetX = coords.x * W;
    this.orcaTargetY = coords.y * H;
    
    if (instant) {
      this.orcaX = this.orcaTargetX;
      this.orcaY = this.orcaTargetY;
    }
  },

  update() {
    this.animFrame++;
    if (this.wheelTimer > 0) this.wheelTimer--;
    
    // Calculate vertical pan offset based on orca Y
    this.panOffset = 0;
    const img = this.currentMap === 1 ? this.mapImage1 : (this.currentMap === 2 ? this.mapImage2 : this.mapImage3);
    if (img && img.complete) {
      const W = Game.width, H = Game.height;
      const scale = Math.max(W / img.width, H / img.height);
      const ih = img.height * scale;
      if (ih > H) {
        const ny = this.orcaY / H;
        const t = (ny - 0.2) / 0.6; // Map Y 0.2->0.8 to pan 0.0->1.0
        const clampedT = Math.max(0, Math.min(1, t));
        const targetPan = clampedT * (H - ih); // 0 (top) to H-ih (bottom)
        const defaultPan = (H - ih) / 2;
        this.panOffset = targetPan - defaultPan;
      }
    }
    
    // Handle fade transitions
    if (this.fadeState === 'out') {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + 0.03);
      if (this.fadeAlpha >= 1) {
        this.currentMap = this.pendingMapSwitch;
        this._updateOrcaPosition(true);
        this.fadeState = 'in';
      }
      return;
    }
    if (this.fadeState === 'in') {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - 0.03);
      if (this.fadeAlpha <= 0) {
        this.fadeState = 'none';
      }
      return;
    }
    
    // Smooth orca movement
    this.orcaX += (this.orcaTargetX - this.orcaX) * 0.08;
    this.orcaY += (this.orcaTargetY - this.orcaY) * 0.08;
  },

  draw(ctx) {
    const W = Game.width, H = Game.height;
    
    // Background
    ctx.fillStyle = '#06060c';
    ctx.fillRect(0, 0, W, H);
    
    // Draw map image
    const img = this.currentMap === 1 ? this.mapImage1 : (this.currentMap === 2 ? this.mapImage2 : this.mapImage3);
    if (img && img.complete) {
      // Fill canvas with map image, maintaining aspect ratio
      const scale = Math.max(W / img.width, H / img.height);
      const iw = img.width * scale;
      const ih = img.height * scale;
      const bgOffsetY = (H - ih) / 2 + this.panOffset;
      ctx.drawImage(img, (W - iw) / 2, bgOffsetY, iw, ih);
      
      // Darken overlay for readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, W, H);
    }
    
    // Map title
    ctx.save();
    ctx.font = '24px "DotGothic16", sans-serif';
    ctx.fillStyle = '#e8d0a0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const mapTitle = this.currentMap === 1 ? 'この世界の成れ果て' : (this.currentMap === 2 ? '深淵' : '最深部 - 星の核');
    ctx.fillText(mapTitle, W / 2, 20);
    ctx.restore();
    
    // Draw nodes
    const nodes = this.getNodes();
    const cleared = this.getClearedStages();
    
    for (const node of nodes) {
      const coords = this.getNodeCoords(node);
      const nx = coords.x * W;
      const ny = coords.y * H + this.panOffset;
      const isSelected = node.stageIndex === this.selectedNode;
      const isUnlocked = this.isStageUnlocked(node.stageIndex);
      const isCleared = cleared.includes(node.stageIndex);
      
      // Node circle
      ctx.save();
      if (!isUnlocked) {
        ctx.globalAlpha = 0.3;
      }
      
      // Glow for selected
      if (isSelected) {
        ctx.shadowColor = '#44ccff';
        ctx.shadowBlur = 20;
      }
      
      // Circle
      ctx.beginPath();
      ctx.arc(nx, ny, 18, 0, Math.PI * 2);
      if (isCleared) {
        ctx.fillStyle = '#2266aa';
      } else if (isUnlocked) {
        ctx.fillStyle = '#335577';
      } else {
        ctx.fillStyle = '#222233';
      }
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#44ccff' : (isCleared ? '#6699cc' : '#444466');
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Cleared check mark
      if (isCleared) {
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.fillStyle = '#88ff88';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', nx, ny);
      } else if (!isUnlocked) {
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', nx, ny);
      }
      
      // Label
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : '#aabbcc';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, nx, ny + 30);
      
      ctx.restore();
    }
    
    // Draw connections between nodes
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i < nodes.length - 1; i++) {
      ctx.beginPath();
      const c1 = this.getNodeCoords(nodes[i]);
      const c2 = this.getNodeCoords(nodes[i + 1]);
      ctx.moveTo(c1.x * W, c1.y * H + this.panOffset);
      ctx.lineTo(c2.x * W, c2.y * H + this.panOffset);
      ctx.stroke();
    }
    
    // Draw transition dotted line to/from "hole"
    if (this.currentMap === 1) {
      const lastNode = nodes[nodes.length - 1]; // Stage 3
      const c = this.getNodeCoords(lastNode);
      ctx.beginPath();
      ctx.moveTo(c.x * W, c.y * H + this.panOffset);
      ctx.lineTo(c.x * W, (c.y - 0.15) * H + this.panOffset);
      ctx.stroke();
    } else if (this.currentMap === 2) {
      // To map 1
      const firstNode = nodes[0]; // Stage 4
      const c1 = this.getNodeCoords(firstNode);
      ctx.beginPath();
      ctx.moveTo(c1.x * W, c1.y * H + this.panOffset);
      ctx.lineTo(c1.x * W, (c1.y - 0.15) * H + this.panOffset);
      ctx.stroke();
      // To map 3
      const lastNode = nodes[nodes.length - 1]; // Stage 6
      const c2 = this.getNodeCoords(lastNode);
      ctx.beginPath();
      ctx.moveTo(c2.x * W, c2.y * H + this.panOffset);
      ctx.lineTo(c2.x * W, (c2.y + 0.15) * H + this.panOffset);
      ctx.stroke();
    } else if (this.currentMap === 3) {
      // To map 2
      const firstNode = nodes[0]; // Stage 7
      const c = this.getNodeCoords(firstNode);
      ctx.beginPath();
      ctx.moveTo(c.x * W, c.y * H + this.panOffset);
      ctx.lineTo(c.x * W, (c.y + 0.15) * H + this.panOffset);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
    ctx.restore();
    
    // Draw orca character on map
    const orcaAnimFrame = Math.floor(this.animFrame / 12) % 2;
    Renderer.drawOrca(ctx, this.orcaX, this.orcaY + this.panOffset - 30, 1.5, 1, orcaAnimFrame, false, false, false);
    
    // Selected stage info panel at bottom
    const selectedNodeData = nodes.find(n => n.stageIndex === this.selectedNode);
    if (selectedNodeData) {
      // Info panel
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 10, 0.8)';
      ctx.fillRect(0, H - 80, W, 80);
      ctx.strokeStyle = 'rgba(68, 204, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H - 80);
      ctx.lineTo(W, H - 80);
      ctx.stroke();
      
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#44ccff';
      ctx.textAlign = 'center';
      ctx.fillText(selectedNodeData.label, W / 2, H - 58);
      
      ctx.font = '16px "DotGothic16", sans-serif';
      ctx.fillStyle = '#c0d0f0';
      ctx.fillText(selectedNodeData.name, W / 2, H - 35);
      
      if (this.isStageUnlocked(selectedNodeData.stageIndex)) {
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#88ff88';
        const blink = Math.sin(this.animFrame * 0.08) > 0;
        ctx.globalAlpha = blink ? 1 : 0.5;
        ctx.fillText('PRESS ENTER OR CLICK TO START', W / 2, H - 12);
      } else {
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#ff6666';
        ctx.fillText('LOCKED - CLEAR PREVIOUS STAGE', W / 2, H - 12);
      }
      ctx.restore();
    }
    
    // Map switch buttons
    ctx.save();
    
    // Left button (Go back)
    if (this.currentMap === 2) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(10, 60, 150, 35);
      ctx.strokeStyle = '#66aa88'; ctx.lineWidth = 2; ctx.strokeRect(10, 60, 150, 35);
      ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#88ccaa'; ctx.textAlign = 'center';
      ctx.fillText('← 地上へ', 85, 82);
    } else if (this.currentMap === 3) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(10, 60, 150, 35);
      ctx.strokeStyle = '#8866cc'; ctx.lineWidth = 2; ctx.strokeRect(10, 60, 150, 35);
      ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#cc99ff'; ctx.textAlign = 'center';
      ctx.fillText('← 深淵へ', 85, 82);
    }
    
    // Right button (Go deeper)
    if (this.currentMap === 1 && cleared.includes(3)) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(W - 160, 60, 150, 35);
      ctx.strokeStyle = '#8866cc'; ctx.lineWidth = 2; ctx.strokeRect(W - 160, 60, 150, 35);
      ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#cc99ff'; ctx.textAlign = 'center';
      ctx.fillText('深淵へ →', W - 85, 82);
    } else if (this.currentMap === 2 && cleared.includes(6)) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(W - 160, 60, 150, 35);
      ctx.strokeStyle = '#cc4444'; ctx.lineWidth = 2; ctx.strokeRect(W - 160, 60, 150, 35);
      ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#ff6666'; ctx.textAlign = 'center';
      ctx.fillText('最深部へ →', W - 85, 82);
    }
    ctx.restore();
    
    // Fade overlay
    if (this.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Home Button - Top Left
    const btnW = 120, btnH = 32;
    const btnX = 20, btnY = 15;
    ctx.save();
    ctx.fillStyle = 'rgba(68, 204, 255, 0.2)';
    ctx.strokeStyle = '#44ccff';
    ctx.lineWidth = 2;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.font = '14px "DotGothic16", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('ホームへ戻る', btnX + btnW / 2, btnY + 22);
    ctx.restore();
  },

  handleClick(mx, my) {
    if (this.fadeState !== 'none') return;
    const W = Game.width, H = Game.height;
    const cleared = this.getClearedStages();
    
    // Check Home button
    const btnW = 120, btnH = 32;
    const btnX = 20, btnY = 15;
    if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
      if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
      Game.resetToTitle();
      return;
    }

    // Check map switch buttons
    if (mx > W - 160 && mx < W - 10 && my > 60 && my < 95) {
      if (this.currentMap === 1 && cleared.includes(3)) this._switchMap(2);
      else if (this.currentMap === 2 && cleared.includes(6)) this._switchMap(3);
      return;
    }
    if (mx > 10 && mx < 160 && my > 60 && my < 95) {
      if (this.currentMap === 2) this._switchMap(1);
      else if (this.currentMap === 3) this._switchMap(2);
      return;
    }
    
    // Check node clicks
    const nodes = this.getNodes();
    for (const node of nodes) {
      const coords = this.getNodeCoords(node);
      const nx = coords.x * W;
      const ny = coords.y * H + this.panOffset;
      const dx = mx - nx, dy = my - ny;
      if (dx * dx + dy * dy < 25 * 25) {
        if (this.selectedNode === node.stageIndex && this.isStageUnlocked(node.stageIndex)) {
          // Start stage
          this.active = false;
          Game.startLevel(node.stageIndex);
        } else {
          this.selectedNode = node.stageIndex;
          this._updateOrcaPosition(false);
          if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
        }
        return;
      }
    }
    
    // Check bottom panel click (start selected stage)
    if (my > H - 80) {
      if (this.isStageUnlocked(this.selectedNode)) {
        this.active = false;
        Game.startLevel(this.selectedNode);
      }
    }
  },

  handleKey(key) {
    if (this.fadeState !== 'none') return;
    const nodes = this.getNodes();
    const currentIdx = nodes.findIndex(n => n.stageIndex === this.selectedNode);
    const currentPos = this.getNodeCoords(nodes[currentIdx]);
    
    let targetNode = null;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      const potential = nodes.filter(n => this.getNodeCoords(n).y < currentPos.y - 0.01);
      if (potential.length > 0) {
        potential.sort((a, b) => this.getNodeCoords(b).y - this.getNodeCoords(a).y);
        targetNode = potential[0];
      } else if (this.currentMap === 1 && this.getClearedStages().includes(3)) {
        this._switchMap(2);
      } else if (this.currentMap === 2) {
        this._switchMap(1);
      }
    }
    if (key === 'ArrowDown' || key === 's' || key === 'S') {
      const potential = nodes.filter(n => this.getNodeCoords(n).y > currentPos.y + 0.01);
      if (potential.length > 0) {
        potential.sort((a, b) => this.getNodeCoords(a).y - this.getNodeCoords(b).y);
        targetNode = potential[0];
      } else if (this.currentMap === 1 && currentIdx === nodes.length - 1 && this.getClearedStages().includes(3)) {
        this._switchMap(2);
      } else if (this.currentMap === 2 && currentIdx === nodes.length - 1 && this.getClearedStages().includes(6)) {
        this._switchMap(3);
      } else if (this.currentMap === 3 && currentIdx === 0) {
        this._switchMap(2);
      }
    }

    if (targetNode) {
      this.selectedNode = targetNode.stageIndex;
      this._updateOrcaPosition(false);
      if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
    }
    
    if (key === 'Enter' || key === ' ') {
      if (this.isStageUnlocked(this.selectedNode)) {
        this.active = false;
        Game.startLevel(this.selectedNode);
      }
    }
  },

  _switchMap(targetMap, force = false) {
    if (targetMap === 3 && !force) {
      // Show difficulty warning dialog before moving to Map 3
      const dialog = document.getElementById('chapter3-dialog');
      if (dialog && typeof Game !== 'undefined') {
        dialog.classList.remove('hidden');
        Game.ch3DialogYesCallback = () => {
          this._switchMap(3, true);
          Game.ch3DialogYesCallback = null;
          Game.ch3DialogNoCallback = null;
        };
        Game.ch3DialogNoCallback = () => {
          Game.ch3DialogYesCallback = null;
          Game.ch3DialogNoCallback = null;
        };
      }
      return;
    }

    this.fadeState = 'out';
    this.fadeAlpha = 0;
    this.pendingMapSwitch = targetMap;
    // Set selected node to first/last of target map
    if (targetMap === 3) {
      this.selectedNode = 7;
    } else if (targetMap === 2) {
      this.selectedNode = (this.currentMap === 3) ? 6 : 4;
    } else {
      this.selectedNode = 3;
    }
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playSE('dive');
      AudioManager.stopAll();
      if (targetMap === 1) AudioManager.startRoadBGM();
      else if (targetMap === 3) AudioManager.startSkyBGM();
      else AudioManager.startAbyssBGM();
    }
  },

  handleWheel(deltaY) {
    if (this.fadeState !== 'none') return;
    if (this.wheelTimer > 0) return;
    this.wheelTimer = 15;
    const nodes = this.getNodes();
    const currentIdx = nodes.findIndex(n => n.stageIndex === this.selectedNode);
    const currentPos = this.getNodeCoords(nodes[currentIdx]);
    
    let targetNode = null;
    if (deltaY < 0) { // Scroll Up (Seek smaller Y)
      // Find nodes with smaller Y, then pick the one with the largest Y among those (closest upward)
      const potential = nodes.filter(n => {
        const p = this.getNodeCoords(n);
        return p.y < currentPos.y - 0.01;
      });
      if (potential.length > 0) {
        potential.sort((a, b) => this.getNodeCoords(b).y - this.getNodeCoords(a).y);
        targetNode = potential[0];
      } else if (this.currentMap === 1 && this.getClearedStages().includes(3)) {
        this._switchMap(2);
      } else if (this.currentMap === 2) {
        this._switchMap(1);
      }
    } else if (deltaY > 0) { // Scroll Down (Seek larger Y)
      const potential = nodes.filter(n => this.getNodeCoords(n).y > currentPos.y + 0.01);
      if (potential.length > 0) {
        potential.sort((a, b) => this.getNodeCoords(a).y - this.getNodeCoords(b).y);
        targetNode = potential[0];
      } else if (this.currentMap === 1 && currentIdx === nodes.length - 1 && this.getClearedStages().includes(3)) {
        this._switchMap(2);
      } else if (this.currentMap === 2 && currentIdx === nodes.length - 1 && this.getClearedStages().includes(6)) {
        this._switchMap(3);
      } else if (this.currentMap === 3 && currentIdx === 0) {
        this._switchMap(2);
      }
    }

    if (targetNode) {
      this.selectedNode = targetNode.stageIndex;
      this._updateOrcaPosition(false);
      if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
    }
  },
};

