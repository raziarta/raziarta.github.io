// === BACKGROUNDS.JS - Parallax Image Layers ===
const Backgrounds = {
  draw(ctx, camX, stageOrPhase) {
    // Accept either stage data object or phase index
    const stageData = typeof stageOrPhase === 'object' ? stageOrPhase : AssetLoader.getStage(stageOrPhase);
    if (!stageData) return;
    const phase = stageData.bgPhase || 0;

    // Draw solid color at the bottom if stage has a floor or we're at the start
    const groundEndX = 600 - camX;
    if (!stageData.hasPitfalls || groundEndX > -Game.width) {
      const startX = -Game.width;
      const drawW = stageData.hasPitfalls ? (groundEndX - startX) : (Game.width * 3);
      ctx.fillStyle = stageData.groundColor;
      ctx.fillRect(startX, Game.height - 50, drawW, 50);
    }

    // Draw parallax layers
    if (stageData.backgrounds) {
      stageData.backgrounds.forEach(layer => {
      const img = AssetLoader.img(layer.src);
      if (!img) return;
      
      const scale = Game.height / img.height;
      const scaledW = img.width * scale;
      let offsetX = (camX * layer.speed) % scaledW;
      const lCamY = (typeof LevelManager !== 'undefined') ? LevelManager.camY : 0;
      let offsetY = (lCamY * (layer.speed * 0.4));
      
      for(let x = -offsetX; x < Game.width; x += scaledW) {
        ctx.drawImage(img, Math.floor(x), -offsetY, scaledW + 1, Game.height);
      }
    });
    }

    // Background Overlays / Tints
    if (phase >= 3 && phase <= 5) {
      // Chapter 2 (Abyss/Cave) darkening
      let darkAlpha = (phase === 4) ? 0.5 : (phase === 5 ? 0.8 : 0);
      if (darkAlpha > 0) {
        ctx.fillStyle = `rgba(0, 0, 5, ${darkAlpha})`;
        ctx.fillRect(0, 0, Game.width, Game.height);
      }
    } else if (phase === 6) {
      // Stage 7: Bright Sky Tint
      ctx.fillStyle = 'rgba(200, 230, 255, 0.2)';
      ctx.fillRect(0, 0, Game.width, Game.height);
    } else if (phase === 7) {
      // Stage 8: Deep Sea Tint
      ctx.fillStyle = 'rgba(0, 30, 80, 0.4)';
      ctx.fillRect(0, 0, Game.width, Game.height);
    } else if (phase === 8) {
      // Stage 9: Heat Haze / Red Glow
      ctx.fillStyle = 'rgba(120, 20, 0, 0.4)';
      ctx.fillRect(0, 0, Game.width, Game.height);
    }

    // Cave / Environmental Walls
    if (phase === 4 || phase === 5) {
      ctx.save();
      let wallColor = '#1a202c';
      if (phase === 5) wallColor = '#111520';
      if (phase === 8) wallColor = '#220800'; // Dark magma rock
      
      ctx.fillStyle = wallColor;
      
      // Top wall
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= Game.width; x += 30) {
        const h = 60 + Math.sin((x + camX * 0.4) * 0.05) * 30 + Math.cos((x + camX * 0.4) * 0.1) * 20;
        ctx.lineTo(x, h);
      }
      ctx.lineTo(Game.width, 0);
      ctx.fill();

      // Bottom wall
      ctx.beginPath();
      ctx.moveTo(0, Game.height);
      for (let x = 0; x <= Game.width; x += 40) {
        const h = Game.height - (50 + Math.sin((x + camX * 0.5) * 0.04) * 40 + Math.sin((x + camX * 0.5) * 0.12) * 15);
        ctx.lineTo(x, h);
      }
      ctx.lineTo(Game.width, Game.height);
      ctx.fill();
      ctx.restore();
    }

  }
};
