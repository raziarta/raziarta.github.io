// === PHYSICS.JS - Physics with Platform Support ===
const Physics = {
  // Configurable parameters for debugger
  GRAVITY_ASCENT: 0.3,
  GRAVITY_DESCENT: 0.6,
  CROUCH_GRAVITY_MULT: 1.5,
  TERMINAL_VEL: 14,
  GROUND_Y: 460,
  LEFT_WALL: 30,

  aabb(a, b) {
    return a.x-a.hw < b.x+b.hw && a.x+a.hw > b.x-b.hw &&
           a.y-a.hh < b.y+b.hh && a.y+a.hh > b.y-b.hh;
  },

  applyGravity(e, gravityMult = 1.0) {
    // Mario-style: different gravity when going up vs going down
    if (e.vy < 0) {
      e.vy += this.GRAVITY_ASCENT * gravityMult;
    } else {
      let grav = this.GRAVITY_DESCENT * gravityMult;
      if (e.crouching) grav *= this.CROUCH_GRAVITY_MULT;
      e.vy += grav;
    }
    
    if (e.vy > this.TERMINAL_VEL) e.vy = this.TERMINAL_VEL;
  },

  // Process interactive objects (Springs, Water zones)
  processObjects(e, objects, camX, camY = 0) {
    let modifiers = { gravityMult: 1.0, speedMult: 1.0, isSafeZone: false, cameraTrack: false };
    if (!objects || objects.length === 0) return modifiers;

    for (const obj of objects) {
      const ox = obj.x - camX;
      // obj.y is world Y, e.y is world Y. No need to subtract camY.
      const oy = obj.y;
      
      if (obj.type === 'water') {
        // AABB zone check
        if (e.x + e.hw > ox && e.x - e.hw < ox + obj.w &&
            e.y + e.hh > oy && e.y - e.hh < oy + obj.h) {
          modifiers.gravityMult *= (obj.gravityMult || 0.4);
          modifiers.speedMult *= (obj.speedMult || 0.6);
        }
      } else if (obj.type === 'magma') {
        if (e.x + e.hw > ox && e.x - e.hw < ox + obj.w &&
            e.y + e.hh > oy && e.y - e.hh < oy + obj.h) {
          if (e.hp !== undefined && e.alive) {
            e.magmaTimer = (e.magmaTimer || 0) + 1;
            if (e.magmaTimer >= 4) {
              e.magmaTimer = 0;
              e.hp -= 1;
              e.dmgFlash = 4;
              if (typeof AudioManager !== 'undefined' && e.hp > 0 && e.hp % 10 === 0) AudioManager.playSE('damage');
            }
          }
        }
      } else if (obj.type === 'damage') {
        if (e.x + e.hw > ox && e.x - e.hw < ox + obj.w &&
            e.y + e.hh > oy && e.y - e.hh < oy + obj.h) {
          if (e.hp !== undefined && e.alive) {
            e.damageZoneTimer = (e.damageZoneTimer || 0) + 1;
            const intervalFrames = (obj.damageInterval !== undefined ? obj.damageInterval : 1) * 60;
            const dmgAmount = obj.damageAmount !== undefined ? obj.damageAmount : 1;
            
            if (e.damageZoneTimer >= intervalFrames) {
              e.damageZoneTimer = 0;
              e.hp -= dmgAmount;
              e.dmgFlash = 4;
              if (typeof AudioManager !== 'undefined') AudioManager.playSE('damage');
            }
          }
        }
      } else if (obj.type === 'death') {
        if (e.x + e.hw > ox && e.x - e.hw < ox + obj.w &&
            e.y + e.hh > oy && e.y - e.hh < oy + obj.h) {
          if (e.hp !== undefined && e.alive) {
            e.hp = 0; e.alive = false;
          }
        }
      } else if (obj.type === 'safe') {
        if (e.x + e.hw > ox && e.x - e.hw < ox + obj.w &&
            e.y + e.hh > oy && e.y - e.hh < oy + obj.h) {
          modifiers.isSafeZone = true;
        }
      } else if (obj.type === 'camera') {
        if (e.x + e.hw > ox && e.x - e.hw < ox + obj.w &&
            e.y + e.hh > oy && e.y - e.hh < oy + obj.h) {
          modifiers.cameraTrack = true;
        }
      } else if (obj.type === 'spring') {
        // Spring: bounce whenever player touches it
        const onTopX = e.x + e.hw > ox && e.x - e.hw < ox + obj.w;
        const feet = e.y + e.hh;
        const head = e.y - e.hh;
        const springTop = oy;
        const springBottom = oy + obj.h;
        if (onTopX && feet >= springTop && head <= springBottom) {
          e.vy = obj.bounceForce || -17;
          e.jumpCount = 0;
          e.onGround = false;
          e.isBoosting = false;
          if(typeof AudioManager !== 'undefined') AudioManager.playSE('jump');
        }
      }
    }
    return modifiers;
  },

  groundCheck(e) {
    if (e.y + e.hh >= this.GROUND_Y) {
      e.y = this.GROUND_Y - e.hh;
      e.vy = 0;
      return true;
    }
    return false;
  },

  // Check platforms (array of {x,y,w,h} in world coords)
  platformCheck(e, platforms, camX) {
    if (!platforms) return null;
    const worldX = e.x + camX; // e.x is screen X, so convert to world X
    const footY = e.y + e.hh;  // e.y is already world Y!
    const prevFootY = footY - e.vy;

    for (const p of platforms) {
      if (e.vy >= 0 &&
          worldX + e.hw > p.x + 4 && worldX - e.hw < p.x + p.w - 4 && // slight inset for landing
          footY >= p.y && prevFootY <= p.y + 16) { // 16px safe margin
        e.y = p.y - e.hh; // set world Y directly
        e.vy = 0;
        return p; // Return the platform object
      }
    }
    return null;
  },

  sideCollisionCheck(e, platforms, camX) {
    if (!platforms) return;
    const worldX = e.x + camX;
    for (const p of platforms) {
      // Check vertical overlap with platform body
      if (e.y + e.hh > p.y + 8 && e.y - e.hh < p.y + p.h - 4) {
        if (worldX + e.hw > p.x && worldX - e.hw < p.x + p.w) {
          const prevWorldX = (e.x - e.vx) + camX;
          const wasToLeft = prevWorldX + e.hw <= p.x;
          const wasToRight = prevWorldX - e.hw >= p.x + p.w;
          if (wasToLeft) {
            e.x = p.x - camX - e.hw;
            e.vx = 0;
          } else if (wasToRight) {
            e.x = p.x + p.w - camX + e.hw;
            e.vx = 0;
          }
        }
      }
    }
  },

  clampToScreen(e, screenW, camY = 0) {
    if (e.x - e.hw < this.LEFT_WALL) e.x = this.LEFT_WALL + e.hw;
    if (e.x + e.hw > screenW - 10) e.x = screenW - 10 - e.hw;
    if (e.y - e.hh < camY - 200) { e.y = camY - 200 + e.hh; e.vy = 0; } // Higher ceiling limit
  },

  pitCheck(e, screenH, camY = 0) { return e.y > camY + (screenH || 540) + 80; },
};
