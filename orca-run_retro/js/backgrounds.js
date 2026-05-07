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

    // === Dynamic Environmental Effects ===
    // Stage 2: Giant shadow passing overhead
    if (phase === 1 && typeof Game !== 'undefined' && false) { // [DISABLED]
      const shadowCycle = 1800;
      const t = Game.totalFrames % shadowCycle;
      // Trigger wind SE at exact start
      if (t === 201 && typeof AudioManager !== 'undefined') AudioManager.playWindGust();
      if (t > 200 && t < 500) {
        const prog = (t - 200) / 300;
        const shadowX = -800 + prog * (Game.width + 1600);
        
        ctx.save();
        ctx.globalAlpha = Math.sin(prog * Math.PI) * 0.45; // Max 45% opacity
        const shadowImg = typeof AssetLoader !== 'undefined' ? AssetLoader.img('assets/backgrounds/stage2/giant_entity_silhouette.png') : null;
        if (shadowImg && shadowImg.complete && shadowImg.width > 0) {
          // Draw the actual silhouette covering the top area and casting a huge shadow
          ctx.drawImage(shadowImg, shadowX, Game.height * 0.1, shadowImg.width * 2, shadowImg.height * 2);
        } else {
          // Fallback
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.ellipse(shadowX, Game.height * 0.6, 350, 60, 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Stage 1: Occasional building collapse in distant background
    if (phase === 0 && typeof Game !== 'undefined' && false) { // [DISABLED]
      const collapseCycle = 2400;
      const ct = Game.totalFrames % collapseCycle;
      // Trigger rumble SE at exact start
      if (ct === 1801 && typeof AudioManager !== 'undefined') AudioManager.playRumble();
      
      const bImg = typeof AssetLoader !== 'undefined' ? AssetLoader.img('assets/backgrounds/stage1/collapsing_building.png') : null;
      if (bImg && bImg.complete && bImg.width > 0) {
        // We draw the building at a fixed world coordinate relative to camera, but to keep it simple,
        // let's just place it far in the background and parallax it slowly.
        const bx = (Game.width * 0.8) - (camX * 0.1) % Game.width; 
        const by = Game.height * 0.1;
        const scale = 0.8;
        const w = bImg.width * scale;
        const h = bImg.height * scale;
        
        ctx.save();
        ctx.globalAlpha = 0.5; // Distant background
        
        if (ct <= 1800) {
          // Intact building
          ctx.drawImage(bImg, bx, by, w, h);
        } else if (ct > 1800 && ct < 2200) {
          // Collapsing animation
          const prog = (ct - 1800) / 400;
          
          // Split building into 4 horizontal slices
          const slices = 4;
          const sliceH = h / slices;
          const sourceSliceH = bImg.height / slices;
          
          for (let i = 0; i < slices; i++) {
            // Lower slices fall later
            const delay = i * 0.1;
            let p = Math.max(0, (prog - delay) / (1 - delay));
            
            // Apply gravity-like acceleration
            p = p * p; 
            
            const dropY = by + (i * sliceH) + (p * Game.height);
            const dropX = bx + (p * 50 * (i%2===0?1:-1)); // Sway side to side slightly
            const rotation = p * 0.5 * (i%2===0?1:-1);
            
            ctx.save();
            ctx.translate(dropX + w/2, dropY + sliceH/2);
            ctx.rotate(rotation);
            // Draw slice
            ctx.drawImage(
              bImg, 
              0, i * sourceSliceH, bImg.width, sourceSliceH, 
              -w/2, -sliceH/2, w, sliceH
            );
            ctx.restore();
            
            // Draw dust particles at the break point
            if (p > 0 && p < 0.8) {
              ctx.fillStyle = `rgba(150, 140, 130, ${0.5 * (1 - p)})`;
              for(let d = 0; d < 3; d++) {
                const px = dropX + Math.random() * w;
                const py = dropY - 20 + Math.random() * 40;
                ctx.fillRect(px, py, Math.random()*8+4, Math.random()*8+4);
              }
            }
          }
        } else {
          // Building is gone (collapsed)
          // Draw residual dust settling
          const prog = (ct - 2200) / 200;
          ctx.fillStyle = `rgba(150, 140, 130, ${0.3 * (1 - prog)})`;
          ctx.fillRect(bx, Game.height * 0.7, w, Game.height * 0.3);
        }
        ctx.restore();
      } else {
        // Old fallback logic just in case image is missing
        if (ct > 1800 && ct < 2200) {
          const prog = (ct - 1800) / 400;
          ctx.save();
          ctx.globalAlpha = 0.3;
          const bx = Game.width * 0.8;
          const by = Game.height * 0.3;
          const tilt = prog * 0.3;
          ctx.translate(bx, by + 200);
          ctx.rotate(tilt);
          ctx.fillStyle = '#1a1a2a';
          ctx.fillRect(-20, -200, 40, 200);
          ctx.fillRect(-25, -200, 50, 10);
          ctx.restore();
        }
      }
    }

  }
};
