// === ENDING.JS - Full ending sequence with credits ===
const Ending = {
  phase: 'walk',       // walk -> text -> credits -> final -> fadeOutCredits -> msg1 -> msg2 -> reset
  orcaX: -60,
  orcaY: 0,
  walkFrame: 0,
  timer: 0,
  score: 0,
  time: 0,
  bgOffset: 0,
  textAlpha: 0,
  creditsY: 0,
  finalAlpha: 0,
  fadeOutAlpha: 0,
  msgAlpha: 0,
  buildings: [],

  // Credits data
  credits: [
    { role: 'Programming', names: ['Raziarta', 'Toriko San'] },
    { role: 'Character Pixel Art', names: ['Toriko San'] },
    { role: 'Graphics', names: ['Raziarta', 'Toriko San'] },
    { role: 'Sound Design', names: ['Raziarta'] },
    { role: 'Scenario', names: ['Raziarta'] },
    { role: 'Concept', names: ['Raziarta'] },
  ],
  originatedBy: 'originated by raziarta',

  // Text messages shown during walk
  endingTexts: [
    '全てが終わった。',
    'ここは静かだ。',
    'だが、旅はまだ続く。',
    '次の町を目指して。',
  ],
  currentTextIndex: 0,

  start(score, frames) {
    this.score = score;
    this.time = Math.floor(frames / 60);
    this.phase = 'walk';
    this.orcaX = -60;
    this.orcaY = 0;
    this.walkFrame = 0;
    this.timer = 0;
    this.bgOffset = 0;
    this.textAlpha = 0;
    this.creditsY = 0;
    this.finalAlpha = 0;
    this.fadeOutAlpha = 0;
    this.msgAlpha = 0;
    this.currentTextIndex = 0;
    this.buildings = [];
    for (let i = 0; i < 20; i++) {
      this.buildings.push({
        x: i * 80 + Math.random() * 40 - 200,
        w: 30 + Math.random() * 50,
        h: 40 + Math.random() * 120
      });
    }
    if (typeof AudioManager !== 'undefined') {
      AudioManager.stopAll();
      AudioManager.startEndingBGM();
    }
  },

  update() {
    this.timer++;
    this.walkFrame++;

    for (let i = 0; i < this.buildings.length; i++) {
      this.buildings[i].x -= 0.5;
      if (this.buildings[i].x + this.buildings[i].w < -200) {
        let maxX = -200;
        for (const b of this.buildings) { if (b.x > maxX) maxX = b.x; }
        this.buildings[i].x = maxX + 40 + Math.random() * 60;
        this.buildings[i].w = 30 + Math.random() * 50;
        this.buildings[i].h = 40 + Math.random() * 120;
      }
    }

    switch (this.phase) {
      case 'walk':
        const targetX = Game.width / 2;
        if (this.orcaX < targetX) {
          this.orcaX += 2;
          this.bgOffset += 1;
        } else {
          this.orcaX = targetX;
        }
        if (this.orcaX >= targetX && this.timer > 180) {
          this.phase = 'text';
          this.timer = 0;
        }
        this.bgOffset += 0.3;
        break;

      case 'text':
        const textDuration = 180;
        const totalTexts = this.endingTexts.length;
        const currentIdx = Math.floor(this.timer / textDuration);
        if (currentIdx < totalTexts) {
          this.currentTextIndex = currentIdx;
          const within = this.timer % textDuration;
          if (within < 30) this.textAlpha = within / 30;
          else if (within > textDuration - 30) this.textAlpha = (textDuration - within) / 30;
          else this.textAlpha = 1;
        } else {
          this.phase = 'credits';
          this.timer = 0;
          this.creditsY = Game.height + 20;
          this.textAlpha = 0;
        }
        this.bgOffset += 0.5;
        break;

      case 'credits':
        const lineHeight = 30;
        const totalHeight = this._calculateCreditsHeight(lineHeight);
        const originatedY = this.creditsY + totalHeight - lineHeight * 2;
        if (originatedY > Game.height / 2) {
          this.creditsY -= 0.8;
          this.bgOffset += 0.3;
        } else {
          this.timer++;
          if (this.timer > 60) {
            this.phase = 'final';
            this.timer = 0;
          }
        }
        break;

      case 'final':
        // Show Score and Wait for input
        this.finalAlpha = Math.min(1, this.timer / 60);
        // Input check is handled in handleClick/handleKey
        break;

      case 'fadeOutCredits':
        this.fadeOutAlpha = Math.min(1, this.timer / 60);
        if (this.timer > 90) {
          this.phase = 'msg1';
          this.timer = 0;
          this.msgAlpha = 0;
        }
        break;

      case 'msg1':
        if (this.timer < 60) this.msgAlpha = this.timer / 60;
        else if (this.timer > 180) this.msgAlpha = 1 - (this.timer - 180) / 60;
        else this.msgAlpha = 1;
        
        if (this.timer > 240) {
          this.phase = 'msg2';
          this.timer = 0;
          this.msgAlpha = 0;
        }
        break;

      case 'msg2':
        if (this.timer < 60) this.msgAlpha = this.timer / 60;
        else if (this.timer > 180) this.msgAlpha = 1 - (this.timer - 180) / 60;
        else this.msgAlpha = 1;
        
        if (this.timer > 270) {
          if (typeof AudioManager !== 'undefined') AudioManager.stopAll();
          Game.resetToTitle();
        }
        break;
    }
  },

  handleInput() {
    if (this.phase === 'final' && this.timer > 60) {
      this.phase = 'fadeOutCredits';
      this.timer = 0;
      if (typeof AudioManager !== 'undefined') AudioManager.playSE('select');
      return true;
    }
    return false;
  },

  _calculateCreditsHeight(lineHeight) {
    let h = 0;
    for (const c of this.credits) {
      h += lineHeight * 1.5;
      h += c.names.length * lineHeight;
      h += lineHeight;
    }
    h += lineHeight * 10;
    return h;
  },

  draw(ctx) {
    const W = Game.width, H = Game.height;
    
    // Background
    this._drawScrollBg(ctx, W, H);

    // Ground
    const groundY = H * 0.78;
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();

    // Orca
    this.orcaY = groundY;
    Renderer.drawOrca(ctx, this.orcaX, this.orcaY, 2, 1, this.walkFrame, false, false, false);

    // Text Phase
    if (this.phase === 'text' && this.currentTextIndex < this.endingTexts.length) {
      ctx.save();
      ctx.globalAlpha = this.textAlpha;
      ctx.font = '20px "DotGothic16", sans-serif';
      ctx.fillStyle = '#c0d0f0'; ctx.textAlign = 'center';
      ctx.fillText(this.endingTexts[this.currentTextIndex], W / 2, H * 0.35);
      ctx.restore();
    }

    // Credits / Final Score Phase
    if (this.phase === 'credits' || this.phase === 'final' || this.phase === 'fadeOutCredits') {
      ctx.save();
      if (this.phase === 'fadeOutCredits') ctx.globalAlpha = 1 - this.fadeOutAlpha;
      this._drawCredits(ctx, W, H);
      
      if (this.phase === 'final' || this.phase === 'fadeOutCredits') {
        const alpha = this.phase === 'final' ? this.finalAlpha : (1 - this.fadeOutAlpha);
        ctx.globalAlpha = alpha;
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffaa88'; ctx.textAlign = 'center';
        ctx.fillText(`SCORE: ${this.score}`, W / 2, H * 0.65);
        ctx.fillText(`TIME: ${Math.floor(this.time / 60)}:${String(this.time % 60).padStart(2, '0')}`, W / 2, H * 0.70);
        
        if (this.phase === 'final' && this.timer % 60 < 30) {
           ctx.font = '12px "DotGothic16", sans-serif';
           ctx.fillStyle = '#ffffff';
           ctx.fillText('PRESS ANY KEY TO CONTINUE', W/2, H * 0.85);
        }
      }
      ctx.restore();
    }

    // Special Messages Phase
    if (this.phase === 'msg1' || this.phase === 'msg2') {
      ctx.save();
      ctx.globalAlpha = this.msgAlpha;
      ctx.font = '24px "DotGothic16", sans-serif';
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
      const text = this.phase === 'msg1' ? 'この世界はもう誰のものでもない' : 'だからこそ　どこへだって行ける';
      ctx.fillText(text, W / 2, H / 2);
      ctx.restore();
    }
  },

  _drawScrollBg(ctx, W, H) {
    ctx.save();
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.8);
    skyGrad.addColorStop(0, '#1a0a2a'); skyGrad.addColorStop(0.4, '#4a1a4a');
    skyGrad.addColorStop(0.7, '#ff6a00'); skyGrad.addColorStop(1, '#ffcc88');
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H * 0.8);

    ctx.fillStyle = 'rgba(255, 150, 100, 0.2)';
    for(let i=0; i<5; i++) {
      const cx = (W + (i * 300) - this.bgOffset * 0.2) % (W + 200) - 100;
      ctx.fillRect(cx, H * 0.3 + i*20, 200, 10);
    }

    ctx.fillStyle = '#050510';
    for (const b of this.buildings) {
      const bx = b.x; const by = H * 0.78 - b.h;
      ctx.fillRect(bx, by, b.w, b.h);
      ctx.fillStyle = '#443322';
      if (b.w > 40) {
        for(let wx=10; wx<b.w-10; wx+=15) {
          for(let wy=10; wy<b.h-20; wy+=25) {
            if ((Math.floor(this.timer/30) + wx + wy) % 7 < 2) ctx.fillStyle = '#ffaa44';
            else ctx.fillStyle = '#221100';
            ctx.fillRect(bx + wx, by + wy, 6, 8);
          }
        }
      }
      ctx.fillStyle = '#050510';
    }
    ctx.restore();
  },

  _drawCredits(ctx, W, H) {
    ctx.save(); ctx.textAlign = 'center';
    let y = this.creditsY;
    for (const credit of this.credits) {
      ctx.font = '12px "Press Start 2P", monospace'; ctx.fillStyle = '#e8d0a0';
      ctx.fillText(credit.role, W / 2, y); y += 35;
      ctx.font = '16px "DotGothic16", sans-serif'; ctx.fillStyle = '#c0d0f0';
      for (const name of credit.names) { ctx.fillText(name, W / 2, y); y += 30; }
      y += 30;
    }
    y += 30 * 10;
    ctx.font = '14px "Press Start 2P", monospace'; ctx.fillStyle = '#e8d0a0';
    ctx.fillText(this.originatedBy, W / 2, y);
    ctx.restore();
  },
};
