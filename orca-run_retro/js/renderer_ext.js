// === RENDERER_EXT.JS - Stage 7-9 Enemy/Object Renderers ===

if (typeof Renderer !== 'undefined') {
  Object.assign(Renderer, {
    // --- STAGE 7 ---
    drawCloudPuffer(ctx, x, y, scale, frame) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI*2);
      ctx.arc(-12, 5, 12, 0, Math.PI*2);
      ctx.arc(12, 5, 12, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#444'; ctx.fillRect(-4, -20, 8, -10); // Propeller shaft
      ctx.fillStyle = '#888'; 
      const propWidth = Math.cos(frame * 0.5) * 20;
      ctx.fillRect(-propWidth, -32, propWidth*2, 4); // Propeller
      ctx.fillStyle = '#000'; ctx.fillRect(-8, -2, 4, 4); ctx.fillRect(4, -2, 4, 4); // Eyes
      ctx.restore();
    },
    
    drawAeroGlider(ctx, x, y, scale, frame, state) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      if (state === 'dive') {
         ctx.rotate(Math.atan2(12, -12)); // Pointing down-left
      }
      ctx.fillStyle = '#aaa';
      ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-20, -15); ctx.lineTo(-10, 0); ctx.lineTo(-20, 15); ctx.fill();
      ctx.fillStyle = '#44ccff';
      ctx.fillRect(-10, -12, 6, 24); // Glowing stripes
      ctx.restore();
    },
    
    drawStaticSpark(ctx, x, y, scale, frame) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      const r = 15 + Math.sin(frame*0.5)*3;
      ctx.fillStyle = '#ffff00';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, r*0.5, 0, Math.PI*2); ctx.fill();
      // Sparks
      ctx.strokeStyle = '#ffffaa'; ctx.lineWidth = 2;
      for(let i=0; i<4; i++) {
        const a = frame*0.1 + (i * Math.PI/2);
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); ctx.lineTo(Math.cos(a)*r*1.5, Math.sin(a)*r*1.5); ctx.stroke();
      }
      ctx.restore();
    },
    
    drawStormEagle(ctx, x, y, scale, frame, flash) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = flash ? '#fff' : '#667788';
      // Body
      ctx.beginPath(); ctx.ellipse(0, 0, 40, 20, 0, 0, Math.PI*2); ctx.fill();
      // Head
      ctx.beginPath(); ctx.arc(-45, -10, 15, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#eecc22';
      ctx.beginPath(); ctx.moveTo(-60, -10); ctx.lineTo(-75, -5); ctx.lineTo(-55, 0); ctx.fill(); // Beak
      ctx.fillStyle = '#f00'; ctx.fillRect(-50, -15, 4, 4); // Eye
      // Wings
      const flap = Math.sin(frame*0.2) * 30;
      ctx.fillStyle = flash ? '#fff' : '#445566';
      ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(10, -60 + flap); ctx.lineTo(40, 0); ctx.fill();
      // Lightning effect on wings
      ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(5, -40 + flap); ctx.lineTo(20, -10); ctx.stroke();
      ctx.restore();
    },

    // --- STAGE 8 ---
    drawNeonJelly(ctx, x, y, scale, frame, pulseTimer) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = 'rgba(255, 100, 200, 0.7)';
      ctx.beginPath(); ctx.arc(0, -10, 20, Math.PI, 0); ctx.fill();
      ctx.fillRect(-20, -10, 40, 10);
      // Tentacles
      ctx.strokeStyle = 'rgba(255, 100, 200, 0.8)'; ctx.lineWidth = 3;
      for(let i=0; i<4; i++) {
        const tx = -15 + i*10;
        ctx.beginPath(); ctx.moveTo(tx, 0);
        ctx.quadraticCurveTo(tx + Math.sin(frame*0.1 + i)*10, 20, tx, 40);
        ctx.stroke();
      }
      // Electric Field warning
      if (pulseTimer > 120) {
        ctx.strokeStyle = `rgba(255, 255, 0, ${(pulseTimer-120)/60})`;
        ctx.beginPath(); ctx.arc(0, 0, 120 * ((pulseTimer-120)/60), 0, Math.PI*2); ctx.stroke();
      }
      ctx.restore();
    },
    
    drawRustySeeker(ctx, x, y, scale, frame) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = '#8B4513'; // Rust
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#A0522D';
      ctx.beginPath(); ctx.arc(-5, -5, 14, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#f00'; // Eye
      ctx.fillRect(-12, -4, 8, 8);
      ctx.restore();
    },

    drawBubbleSniper(ctx, x, y, scale, frame) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = '#55aaaa';
      // Body
      ctx.fillRect(-15, -15, 30, 30);
      // Cannon
      ctx.fillStyle = '#448888';
      ctx.fillRect(-35, -5, 20, 10);
      // Eye
      ctx.fillStyle = '#0f0'; ctx.fillRect(-10, -10, 4, 4);
      ctx.restore();
    },

    drawKrakenX(ctx, x, y, scale, frame, flash) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = flash ? '#fff' : '#223344';
      // Main Body
      ctx.beginPath(); ctx.ellipse(0, 0, 50, 80, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = flash ? '#fff' : '#112233';
      ctx.beginPath(); ctx.ellipse(0, -20, 40, 60, 0, 0, Math.PI*2); ctx.fill();
      // Giant Eye
      ctx.fillStyle = '#ff0000';
      ctx.beginPath(); ctx.arc(-20, -10, 15, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(-22, -15, 4, 10);
      // Tentacles
      ctx.strokeStyle = flash ? '#fff' : '#223344'; ctx.lineWidth = 15;
      ctx.lineCap = 'round';
      for(let i=0; i<3; i++) {
         ctx.beginPath(); ctx.moveTo(-30 + i*30, 60);
         ctx.quadraticCurveTo(-50 + i*50 + Math.sin(frame*0.05 + i)*30, 120, -40 + i*40, 160);
         ctx.stroke();
      }
      ctx.restore();
    },

    // --- STAGE 9 ---
    drawMagmaCrawler(ctx, x, y, scale, frame) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      // Body (Obsidian)
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(0, 0, 25, 15, 0, 0, Math.PI*2); ctx.fill();
      // Lava cracks
      ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-5, -5); ctx.lineTo(10, 0); ctx.lineTo(20, -5); ctx.stroke();
      // Legs
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
      const walk = Math.sin(frame * 0.2) * 5;
      ctx.beginPath(); ctx.moveTo(-10, 15); ctx.lineTo(-15, 25 + walk); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10, 15); ctx.lineTo(15, 25 - walk); ctx.stroke();
      ctx.restore();
    },

    drawHeatFlicker(ctx, x, y, scale, frame, state) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      const isCharging = state === 'charge';
      const c1 = isCharging ? '#ffffff' : '#ffaa00';
      const c2 = isCharging ? '#ffccaa' : '#ff0000';
      ctx.fillStyle = c2;
      ctx.beginPath(); ctx.arc(0, 0, 15 + Math.sin(frame*0.3)*2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = c1;
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
      // Flame tail
      ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(25, 0); ctx.lineTo(-10, 5); ctx.fill();
      ctx.restore();
    },

    drawCoreShard(ctx, x, y, scale, frame) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = '#ee0055';
      ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(15, 0); ctx.lineTo(0, 25); ctx.lineTo(-15, 0); ctx.fill();
      ctx.fillStyle = '#ffaaee';
      ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(8, 0); ctx.lineTo(0, 15); ctx.lineTo(-8, 0); ctx.fill();
      ctx.restore();
    },

    drawVulcan(ctx, x, y, scale, frame, flash) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = flash ? '#fff' : '#332211';
      // Torso
      ctx.fillRect(-30, -50, 60, 80);
      // Head
      ctx.fillRect(-20, -90, 40, 35);
      // Lava core
      ctx.fillStyle = '#ff3300';
      ctx.beginPath(); ctx.arc(0, -10, 15 + Math.sin(frame*0.1)*3, 0, Math.PI*2); ctx.fill();
      // Eyes
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(-15, -75, 10, 5); ctx.fillRect(5, -75, 10, 5);
      // Arms
      ctx.fillStyle = flash ? '#fff' : '#443322';
      ctx.fillRect(-60, -50, 25, 60); ctx.fillRect(35, -50, 25, 60);
      ctx.restore();
    },

    // --- OBJECTS & HAZARDS ---
    drawSpring(ctx, x, y, w, h, frame, type) {
      ctx.save(); ctx.translate(x, y);
      if (type === 'stage7') { // Cloud Spring
        ctx.fillStyle = '#eee';
        ctx.beginPath(); ctx.ellipse(w/2, h/2 - Math.sin(frame*0.1)*2, w/2, h/2, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#888'; ctx.fillRect(w/4, h, w/2, 4); // Metal base
      } else if (type === 'stage8') { // Shell Spring
        ctx.fillStyle = '#ddccbb';
        ctx.beginPath(); ctx.arc(w/2, h, w/2, Math.PI, 0); ctx.fill(); // Bottom shell
        ctx.fillStyle = '#ffddcc';
        ctx.beginPath(); ctx.arc(w/2, h - Math.abs(Math.sin(frame*0.05)*10), w/2, Math.PI, 0); ctx.fill(); // Top shell flapping
      } else { // Stage 9 Steam Vent
        ctx.fillStyle = '#333'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(w, 5); ctx.stroke();
        // Steam particles
        if (frame % 5 === 0 && typeof ParticleSystem !== 'undefined') {
          ParticleSystem.burst(x + w/2, y, '#dddddd', 1);
        }
      }
      ctx.restore();
    },

    drawPixelWarning(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      const s = size / 16;
      ctx.imageSmoothingEnabled = false;
      
      // Triangle (Yellow)
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(8*s, 1*s);
      ctx.lineTo(15*s, 14*s);
      ctx.lineTo(1*s, 14*s);
      ctx.closePath();
      ctx.fill();

      // Border (Black)
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = s;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Exclamation mark
      ctx.fillStyle = '#000000';
      ctx.fillRect(7.5*s, 5*s, 1.5*s, 5*s); // Bar
      ctx.fillRect(7.5*s, 11*s, 1.5*s, 1.5*s); // Dot
      
      ctx.restore();
    },

    drawMagma(ctx, x, y, w, h, frame) {
      ctx.fillStyle = '#ff2200';
      ctx.fillRect(x, y, w, h);
      // Magma surface waves
      ctx.fillStyle = '#ff6600';
      for(let i=0; i<w; i+=20) {
        const wave = Math.sin((frame + i)*0.05)*5;
        ctx.fillRect(x + i, y - wave, 20, h + wave);
      }
      // Floating obsidian rocks
      ctx.fillStyle = '#222';
      for(let i=0; i<w; i+=60) {
        const offset = (frame * 0.5 + i) % w;
        ctx.fillRect(x + offset, y + Math.sin((frame+i)*0.1)*3, 10, 5);
      }
    }
  });
}
