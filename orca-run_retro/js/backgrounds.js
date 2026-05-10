// === BACKGROUNDS.JS - Parallax Image Layers ===
const Backgrounds = {
  USE_NEW_LORE_BGS: true, // Toggle for new Lore backgrounds (Stages 4-6)

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

    // Draw parallax layers (Skip for new lore BGs so we can draw custom pixel art)
    let skipParallax = false;
    if (this.USE_NEW_LORE_BGS && (phase === 3 || phase === 4 || phase === 5)) {
      skipParallax = true;
    }

    if (!skipParallax && stageData.backgrounds) {
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
    if (!this.USE_NEW_LORE_BGS && phase >= 3 && phase <= 5) {
      // Old Chapter 2 (Abyss/Cave) darkening
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

    // === NEW LORE BACKGROUNDS ===
    if (this.USE_NEW_LORE_BGS) {
      if (phase === 3) {
        // Stage 4: Collapsed Underground City
        ctx.fillStyle = '#0f1218'; ctx.fillRect(0, 0, Game.width, Game.height);
        
        const time = (typeof Game !== 'undefined') ? Game.totalFrames : 0;
        const bX1 = (camX * 0.2) % 400;
        const bX2 = (camX * 0.4) % 600;

        // Far background ruins
        ctx.fillStyle = '#1c222c';
        for(let i = 0; i < 6; i++) {
          const rx = (i * 300 - bX1 + 1200) % 1800 - 300;
          const ry = 100 + Math.sin(i * 99) * 100;
          ctx.fillRect(rx, ry, 150, Game.height);
          // Blocky windows
          ctx.fillStyle = '#11151a';
          for(let wy = ry + 20; wy < Game.height; wy += 40) {
             for(let wx = rx + 20; wx < rx + 130; wx += 30) {
               if (Math.sin(wy*wx) > 0) ctx.fillRect(wx, wy, 15, 20);
             }
          }
          ctx.fillStyle = '#1c222c';
        }

        // Mid background collapsed structures
        ctx.fillStyle = '#262d3a';
        for(let i = 0; i < 8; i++) {
          const rx = (i * 200 - bX2 + 1600) % 1600 - 200;
          const tilt = Math.sin(i * 123) * 0.2;
          ctx.save();
          ctx.translate(rx, 300 + Math.cos(i) * 150);
          ctx.rotate(tilt);
          ctx.fillRect(0, 0, 100, Game.height);
          // Rebar sticking out
          ctx.fillStyle = '#4a2f2f';
          ctx.fillRect(10, -20, 4, 20); ctx.fillRect(40, -40, 4, 40);
          ctx.restore();
        }
        
        // Cave ceiling
        ctx.fillStyle = '#0a0d12';
        ctx.beginPath(); ctx.moveTo(0,0);
        for(let x=0; x<=Game.width; x+=40) { ctx.lineTo(x, 40 + Math.sin((x+camX*0.5)*0.03)*30); }
        ctx.lineTo(Game.width,0); ctx.fill();

      } else if (phase === 4) {
        // Stage 5: Aberration Habitat (Fleshy / Bioluminescent)
        ctx.fillStyle = '#1a0510'; ctx.fillRect(0, 0, Game.width, Game.height);
        const time = (typeof Game !== 'undefined') ? Game.totalFrames : 0;
        const pX1 = (camX * 0.3) % 800;

        // Fleshy pulsating pillars
        for(let i=0; i<5; i++) {
          const x = (i * 350 - pX1 + 1750) % 1750 - 200;
          const pulse = Math.sin(time * 0.05 + i) * 15;
          ctx.fillStyle = '#3a1020';
          ctx.beginPath();
          ctx.moveTo(x - 30 - pulse, 0);
          ctx.quadraticCurveTo(x - 80, Game.height/2, x - 40 - pulse, Game.height);
          ctx.lineTo(x + 40 + pulse, Game.height);
          ctx.quadraticCurveTo(x + 80, Game.height/2, x + 30 + pulse, 0);
          ctx.fill();

          // Bioluminescent spots
          ctx.fillStyle = `rgba(0, 255, 150, ${0.3 + Math.sin(time*0.08+i)*0.2})`;
          for(let sy=50; sy<Game.height; sy+=120) {
            ctx.beginPath(); ctx.arc(x + Math.sin(sy)*20, sy, 8+Math.cos(sy)*4, 0, Math.PI*2); ctx.fill();
          }
        }
        
        // Fleshy ceiling/floor bounds
        ctx.fillStyle = '#220814';
        ctx.beginPath(); ctx.moveTo(0,0);
        for(let x=0; x<=Game.width; x+=30) { ctx.lineTo(x, 60 + Math.sin((x+camX*0.6)*0.04 + time*0.02)*20); }
        ctx.lineTo(Game.width,0); ctx.fill();

      } else if (phase === 5) {
        // Stage 6: Void / Nothingness (Monochrome Grid + Glitch)
        ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, Game.width, Game.height);
        const time = (typeof Game !== 'undefined') ? Game.totalFrames : 0;
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + Math.random()*0.05})`;
        ctx.lineWidth = 1;
        
        // Perspective Grid
        const cx = Game.width / 2;
        const cy = Game.height / 2;
        const scrollX = (camX * 2) % 100;
        
        for(let i=0; i<20; i++) {
          const scale = Math.pow(1.2, i);
          const y = cy + scale * 10;
          if (y > Game.height) break;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(Game.width, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, cy - scale * 10); ctx.lineTo(Game.width, cy - scale * 10); ctx.stroke();
        }
        
        for(let x=-1000; x<2000; x+=100) {
          const adjX = x - scrollX;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(adjX, Game.height); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(adjX, 0); ctx.stroke();
        }

        // Random glitch rectangles (Void anomalies)
        ctx.fillStyle = '#ffffff';
        if (Math.random() < 0.2) {
          ctx.globalAlpha = 0.8;
          ctx.fillRect(Math.random() * Game.width, Math.random() * Game.height, Math.random() * 100, Math.random() * 5);
          ctx.globalAlpha = 1.0;
        }
      }
    }

    // Cave / Environmental Walls (Old Logic fallback)
    if (!this.USE_NEW_LORE_BGS && (phase === 4 || phase === 5)) {
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
