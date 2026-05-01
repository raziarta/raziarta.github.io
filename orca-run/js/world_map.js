// === WORLD_MAP.JS - Stage Selection ===
const WorldMap = {
  active: false,
  currentNodeId: 'tutorial',
  nodes: {},
  links: [],
  playerX: 0,
  playerY: 0,
  targetX: 0,
  targetY: 0,
  moving: false,
  bgImg: null,

  init() {
    const data = AssetLoader.data.worldMap;
    if (!data) return;

    this.nodes = {};
    data.nodes.forEach(n => {
      this.nodes[n.id] = n;
    });
    this.currentNodeId = data.startNode || data.nodes[0].id;
    this.playerX = this.nodes[this.currentNodeId].x;
    this.playerY = this.nodes[this.currentNodeId].y;
    this.targetX = this.playerX;
    this.targetY = this.playerY;

    // Optional: load a big background image if available
    this.bgImg = AssetLoader.images['assets/backgrounds/stage1/sky.png']; // Placeholder
  },

  update(keys) {
    if (!this.active) return;

    // Move player towards target
    if (this.moving) {
      const dx = this.targetX - this.playerX;
      const dy = this.targetY - this.playerY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 5) {
        this.playerX = this.targetX;
        this.playerY = this.targetY;
        this.moving = false;
      } else {
        this.playerX += (dx / dist) * 10;
        this.playerY += (dy / dist) * 10;
      }
      return; // Can't select while moving
    }

    const currentNode = this.nodes[this.currentNodeId];

    // Simple navigation: find next/prev node in links
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
      this.moveToNext(currentNode, 1);
      keys['ArrowRight'] = false; keys['d'] = false; keys['D'] = false;
    }
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
      this.moveToNext(currentNode, -1);
      keys['ArrowLeft'] = false; keys['a'] = false; keys['A'] = false;
    }

    // Enter stage
    if (keys['Enter'] || keys[' '] || keys['Spacebar'] || keys['Space']) {
      this.active = false;
      Game.startLevel(currentNode.stageIndex);
      keys['Enter'] = false; keys[' '] = false; keys['Spacebar'] = false; keys['Space'] = false;
    }
  },

  moveToNext(currentNode, direction) {
    // For simplicity, just pick the first linked node that is to the right/left
    let bestNode = null;
    let bestDist = Infinity;

    currentNode.links.forEach(linkId => {
      const target = this.nodes[linkId];
      if (!target) return;

      const dx = target.x - currentNode.x;
      if ((direction > 0 && dx > 0) || (direction < 0 && dx < 0)) {
        if (Math.abs(dx) < bestDist) {
          bestDist = Math.abs(dx);
          bestNode = target;
        }
      }
    });

    if (bestNode) {
      this.currentNodeId = bestNode.id;
      this.targetX = bestNode.x;
      this.targetY = bestNode.y;
      this.moving = true;
      if(typeof AudioManager!=='undefined') AudioManager.playSE('jump');
    }
  },

  draw(ctx, totalFrames) {
    // Draw background
    if (this.bgImg) {
      ctx.drawImage(this.bgImg, 0, 0, Game.width, Game.height);
    } else {
      ctx.fillStyle = '#223344';
      ctx.fillRect(0, 0, Game.width, Game.height);
    }

    // Draw Links (Dotted lines)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    Object.values(this.nodes).forEach(n => {
      n.links.forEach(linkId => {
        const target = this.nodes[linkId];
        if (target) {
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(target.x, target.y);
        }
      });
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Nodes
    Object.values(this.nodes).forEach(n => {
      const isCurrent = (n.id === this.currentNodeId);
      
      // Node circle
      ctx.fillStyle = isCurrent ? '#44ccff' : (n.cleared ? '#44ff66' : '#888888');
      ctx.beginPath();
      ctx.arc(n.x, n.y, isCurrent ? 20 + Math.sin(totalFrames*0.1)*5 : 15, 0, Math.PI*2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      // Node Name
      ctx.fillStyle = '#fff';
      ctx.font = '16px "DotGothic16"';
      ctx.textAlign = 'center';
      ctx.fillText(n.name, n.x, n.y - 30);
    });

    // Draw Player
    if (AssetLoader.images['assets/sprites/player/orca_stand.png']) {
      const img = AssetLoader.images['assets/sprites/player/orca_stand.png'];
      ctx.drawImage(img, this.playerX - 20, this.playerY - 20 - Math.abs(Math.sin(totalFrames*0.1)*10), 40, 40);
    } else {
      ctx.fillStyle = '#000';
      ctx.fillRect(this.playerX - 10, this.playerY - 10, 20, 20);
    }

    // Draw UI Prompts
    ctx.fillStyle = '#fff';
    ctx.font = '24px "DotGothic16"';
    ctx.textAlign = 'center';
    ctx.fillText("WORLD MAP", Game.width / 2, 50);
    
    if (!this.moving) {
      ctx.font = '16px "DotGothic16"';
      ctx.fillText("PRESS SPACE TO START", Game.width / 2, Game.height - 50);
    }
    ctx.textAlign = 'left';
  }
};
