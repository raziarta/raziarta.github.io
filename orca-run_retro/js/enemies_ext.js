// === ENEMIES_EXT.JS - Stage 7-9 Enemies ===

// --- STAGE 7: Cloud Kingdom ---
class CloudPuffer extends Enemy {
  constructor(x) { 
    super(x, 'cloud_puffer', 1.5); 
    this.baseY = this.y - 100 - Math.random() * 200; // Float high
    this.y = this.baseY;
    this.windTimer = 0;
  }
  update(ss) {
    this.frame++;
    this.x -= (ss + this.speed);
    // Bobbing motion
    this.y = this.baseY + Math.sin(this.frame * 0.05) * 30;
    
    // Wind blow attack + projectile
    this.windTimer++;
    if (this.windTimer > 90) {
      this.windTimer = 0;
      // Push player if nearby
      if (typeof Game !== 'undefined' && Game.player) {
        const dx = Game.player.x - this.x;
        const dy = Game.player.y - this.y;
        if (Math.abs(dx) < 500 && Math.abs(dy) < 200) {
           Game.player.vx -= 5;
        }
        // Fire wind projectile toward player
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        ProjectileManager.addEnemyBullet(this.x, this.y, (dx/dist)*4, (dy/dist)*4, 'wind');
      }
      if (typeof ParticleSystem !== 'undefined') {
        for(let i=0; i<4; i++) ParticleSystem.burst(this.x - 30, this.y + (Math.random()-0.5)*30, '#ddddff', 2);
      }
    }
    if (this.x < -100) this.alive = false;
  }
  draw(ctx) { Renderer.drawCloudPuffer(ctx, this.x, this.y, 1.5, this.frame); }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class AeroGlider extends Enemy {
  constructor(x) { 
    super(x, 'aero_glider', 1.2); 
    this.y = -50; // Start off-screen top
    this.state = 'wait';
    this.targetX = Game.player ? Game.player.x : 400;
  }
  update(ss) {
    this.frame++;
    if (this.state === 'wait') {
       this.x -= ss;
       if (this.x < this.targetX + 600) {
         this.state = 'dive';
         const dx = (this.targetX - 200) - this.x;
         const dy = (Physics.GROUND_Y - 50) - this.y;
         const dist = Math.sqrt(dx*dx + dy*dy);
         this.vx = (dx/dist) * 12;
         this.vy = (dy/dist) * 12;
       }
    } else if (this.state === 'dive') {
       this.x += this.vx;
       this.y += this.vy;
       if (this.y > Physics.GROUND_Y) {
         this.vy = -this.vy * 0.5; // Bounce slightly or pull up
         this.state = 'flyaway';
       }
    } else if (this.state === 'flyaway') {
       this.x += this.vx;
       this.y += this.vy;
       this.vy -= 0.5; // Curve upwards
    }
    if (this.x < -100 || this.y < -200) this.alive = false;
  }
  draw(ctx) { Renderer.drawAeroGlider(ctx, this.x, this.y, 1.2, this.frame, this.state); }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class StaticSpark extends Enemy {
  constructor(x) { 
    super(x, 'static_spark', 1.0); 
    this.baseY = this.y - 150;
    this.y = this.baseY;
  }
  update(ss) {
    this.frame++;
    this.x -= (ss + this.speed + 2);
    // Zigzag
    this.y = this.baseY + Math.sin(this.frame * 0.2) * 80;
    
    if (this.frame % 10 === 0 && typeof ParticleSystem !== 'undefined') {
       ParticleSystem.burst(this.x, this.y, '#ffff44', 1);
    }
    // Lightning bolt toward player every 80 frames
    if (this.frame % 80 === 0 && typeof Game !== 'undefined' && Game.player) {
      const dx = Game.player.x - this.x, dy = Game.player.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      ProjectileManager.addEnemyBullet(this.x, this.y, (dx/dist)*7, (dy/dist)*7, 'lightning');
    }
    if (this.x < -100) this.alive = false;
  }
  draw(ctx) { Renderer.drawStaticSpark(ctx, this.x, this.y, 1.0, this.frame); }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class StormEagle {
  constructor(x, y) {
    this.x = x || 800;
    this.y = y || 200;
    this.hw = 80; this.hh = 60;
    this.hp = 100; this.maxHp = 100;
    this.alive = true; this.frame = 0;
    this.state = 'enter'; this.stateTimer = 120;
    this.hitStop = 0;
    this.flashTimer = 0;
    if(typeof AudioManager !== 'undefined') AudioManager.playSE('bossIntro');
  }
  update(player) {
    this.frame++;
    if (this.flashTimer > 0) this.flashTimer--;
    
    switch(this.state) {
      case 'enter':
        this.x += (600 - this.x) * 0.05;
        this.stateTimer--;
        if(this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 60; }
        break;
      case 'idle':
        this.y += Math.sin(this.frame * 0.05) * 2;
        this.stateTimer--;
        if(this.stateTimer <= 0) {
          this.state = Math.random() > 0.5 ? 'gust' : 'feathers';
          this.stateTimer = 100;
        }
        break;
      case 'gust':
        this.y += Math.sin(this.frame * 0.1) * 4; // Faster flap
        if (this.frame % 5 === 0) {
          player.vx -= 2; // Strong wind pushing player left
          if (typeof ParticleSystem !== 'undefined') ParticleSystem.burst(this.x - 100, this.y + (Math.random()-0.5)*100, '#ffffff', 2);
        }
        this.stateTimer--;
        if(this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 60; }
        break;
      case 'feathers':
        if (this.stateTimer % 20 === 0) {
           const dx = player.x - this.x;
           const dy = player.y - this.y;
           const dist = Math.sqrt(dx*dx + dy*dy);
           ProjectileManager.addEnemyBullet(this.x, this.y + 20, (dx/dist)*8, (dy/dist)*8, 'feather');
        }
        this.stateTimer--;
        if(this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 60; }
        break;
    }

    // Collision
    ProjectileManager.playerBullets.forEach(b => {
      if (b.alive && Physics.aabb(b, this)) {
        if (b.type === 'bomb') { if (!b.exploded) b.explode(); this.hitStop = 8; }
        else { b.alive = false; this.takeDamage(b.damage); this.hitStop = 3; }
      }
    });
    if (!player.invincible && Physics.aabb(this, player)) player.takeDamage(10, this.x);
  }
  takeDamage(d) { 
    this.hp -= d; 
    this.flashTimer = 5;
    if (typeof ParticleSystem !== 'undefined') ParticleSystem.burst(this.x, this.y, '#ffffaa', 6); 
    if (this.hp <= 0) this.alive = false; 
  }
  draw(ctx) {
    Renderer.drawStormEagle(ctx, this.x, this.y, 1.5, this.frame, this.flashTimer > 0);
    // HP bar
    ctx.fillStyle = '#000'; ctx.fillRect(this.x - 50, this.y - 80, 100, 8);
    ctx.fillStyle = '#f00'; ctx.fillRect(this.x - 50, this.y - 80, 100 * (this.hp/this.maxHp), 8);
  }
}

// --- STAGE 8: Sunken City ---
class NeonJelly extends Enemy {
  constructor(x) { 
    super(x, 'neon_jelly', 1.0); 
    this.baseY = this.y - 50;
    this.pulseTimer = 0;
  }
  update(ss) {
    this.frame++; this.x -= (ss + this.speed);
    this.y = this.baseY + Math.sin(this.frame * 0.03) * 60;
    
    this.pulseTimer++;
    // Pulse AoE every 100 frames (faster)
    if (this.pulseTimer > 100) {
      this.pulseTimer = 0;
      if (typeof ParticleSystem !== 'undefined') ParticleSystem.burst(this.x, this.y, '#ff44aa', 6);
      // AoE damage check
      if (typeof Game !== 'undefined' && Game.player) {
         const dx = Game.player.x - this.x, dy = Game.player.y - this.y;
         if (dx*dx + dy*dy < 140*140) Game.player.takeDamage(12, this.x);
      }
      // Also fire homing bubble
      if (typeof Game !== 'undefined' && Game.player) {
         const dx = Game.player.x - this.x, dy = Game.player.y - this.y;
         const dist = Math.sqrt(dx*dx + dy*dy) || 1;
         ProjectileManager.addEnemyBullet(this.x, this.y, (dx/dist)*4, (dy/dist)*4, 'shock_pulse');
      }
    }
    if (this.x < -100) this.alive = false;
  }
  draw(ctx) { Renderer.drawNeonJelly(ctx, this.x, this.y, 1.0, this.frame, this.pulseTimer); }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class RustySeeker extends Enemy {
  constructor(x) { super(x, 'rusty_seeker', 1.2); }
  update(ss) {
    this.frame++; this.x -= ss;
    if (typeof Game !== 'undefined' && Game.player) {
      const dx = Game.player.x - this.x, dy = Game.player.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      this.x += (dx/dist)*3.5; this.y += (dy/dist)*3.5;
    }
    if (this.x < -100) this.alive = false;
  }
  draw(ctx) { Renderer.drawRustySeeker(ctx, this.x, this.y, 1.2, this.frame); }
  takeDamage(d) { 
    this.hp -= d; 
    if (this.hp <= 0) {
      this.alive = false;
      if (typeof ParticleSystem !== 'undefined') ParticleSystem.burst(this.x, this.y, '#ff6600', 10);
      // Explosion
      if (typeof Game !== 'undefined' && Game.player) {
         const dx = Game.player.x - this.x, dy = Game.player.y - this.y;
         if (dx*dx + dy*dy < 100*100) Game.player.takeDamage(15, this.x);
      }
    }
  }
}

class BubbleSniper extends Enemy {
  constructor(x) { super(x, 'bubble_sniper', 1.5); this.shootTimer = 0; }
  update(ss) {
    this.frame++; this.x -= ss;
    this.shootTimer++;
    if (this.shootTimer > 100 && this.x < 1920) {
      this.shootTimer = 0;
      if (typeof Game !== 'undefined' && Game.player) {
         const dx = Game.player.x - this.x, dy = Game.player.y - this.y;
         const dist = Math.sqrt(dx*dx + dy*dy) || 1;
         ProjectileManager.addEnemyBullet(this.x, this.y, (dx/dist)*5, (dy/dist)*5, 'heavy_bubble');
      }
    }
    if (this.x < -100) this.alive = false;
  }
  draw(ctx) { Renderer.drawBubbleSniper(ctx, this.x, this.y, 1.5, this.frame); }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class KrakenX {
  constructor(x, y) {
    this.x = x || 900; this.y = y || 450;
    this.hw = 120; this.hh = 120;
    this.hp = 150; this.maxHp = 150;
    this.alive = true; this.frame = 0;
    this.state = 'enter'; this.stateTimer = 100;
    this.flashTimer = 0;
    if(typeof AudioManager !== 'undefined') AudioManager.playSE('bossIntro');
  }
  update(player) {
    this.frame++;
    if (this.flashTimer > 0) this.flashTimer--;
    switch(this.state) {
      case 'enter':
        this.x += (600 - this.x) * 0.05;
        this.stateTimer--; if(this.stateTimer<=0){this.state='idle'; this.stateTimer=60;}
        break;
      case 'idle':
        this.y += Math.sin(this.frame*0.02)*1.5;
        this.stateTimer--;
        if(this.stateTimer<=0){this.state = Math.random()>0.5 ? 'slam' : 'ink'; this.stateTimer=120;}
        break;
      case 'slam':
        if(this.stateTimer === 100) {
           // Warning
           if(typeof ParticleSystem !== 'undefined') ParticleSystem.burst(player.x, Physics.GROUND_Y, '#ff0000', 5);
        } else if (this.stateTimer === 40) {
           // Slam
           if (Math.abs(player.x - this.x) < 300 && player.onGround) player.takeDamage(20, this.x);
        }
        this.stateTimer--; if(this.stateTimer<=0){this.state='idle'; this.stateTimer=60;}
        break;
      case 'ink':
        if(this.stateTimer % 30 === 0) {
           ProjectileManager.addEnemyBullet(this.x, this.y, -6 + Math.random()*2, -2 + Math.random()*4, 'ink_ball');
        }
        this.stateTimer--; if(this.stateTimer<=0){this.state='idle'; this.stateTimer=60;}
        break;
    }
    // Collisions
    ProjectileManager.playerBullets.forEach(b => {
      if (b.alive && Physics.aabb(b, this)) {
        if (b.type === 'bomb') { if (!b.exploded) b.explode(); }
        else { b.alive = false; this.takeDamage(b.damage); }
      }
    });
    if (!player.invincible && Physics.aabb(this, player)) player.takeDamage(10, this.x);
  }
  takeDamage(d) { this.hp -= d; this.flashTimer = 5; if(this.hp <= 0) this.alive = false; }
  draw(ctx) {
    Renderer.drawKrakenX(ctx, this.x, this.y, 1.5, this.frame, this.flashTimer > 0);
    ctx.fillStyle = '#000'; ctx.fillRect(this.x - 60, this.y - 140, 120, 10);
    ctx.fillStyle = '#f00'; ctx.fillRect(this.x - 60, this.y - 140, 120 * (this.hp/this.maxHp), 10);
  }
}

// --- STAGE 9: The Core ---
class MagmaCrawler extends Enemy {
  constructor(x) { super(x, 'magma_crawler', 1.0); this.y = 50; this.dropTimer = 0; }
  update(ss) {
    this.frame++; this.x -= (ss + this.speed);
    this.dropTimer++;
    if (this.dropTimer > 120 && this.x < 1920) {
      this.dropTimer = 0;
      ProjectileManager.addEnemyBullet(this.x, this.y, 0, 5, 'lava_blob');
    }
    if (this.x < -100) this.alive = false;
  }
  draw(ctx) { Renderer.drawMagmaCrawler(ctx, this.x, this.y, 1.0, this.frame); }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class HeatFlicker extends Enemy {
  constructor(x) { 
    super(x, 'heat_flicker', 1.2); 
    this.state = 'circle'; this.angle = 0;
  }
  update(ss) {
    this.frame++;
    if (this.state === 'circle' && typeof Game !== 'undefined' && Game.player) {
       this.x -= ss;
       this.angle += 0.05;
       const targetX = Game.player.x + Math.cos(this.angle)*200;
       const targetY = Game.player.y - 100 + Math.sin(this.angle)*150;
       this.x += (targetX - this.x)*0.05;
       this.y += (targetY - this.y)*0.05;
       if (this.frame > 200) { this.state = 'charge'; this.vx = (Game.player.x - this.x)*0.05; this.vy = (Game.player.y - this.y)*0.05; }
    } else if (this.state === 'charge') {
       this.x += this.vx; this.y += this.vy;
    }
    if (this.x < -100) this.alive = false;
  }
  draw(ctx) { Renderer.drawHeatFlicker(ctx, this.x, this.y, 1.2, this.frame, this.state); }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class CoreShard extends Enemy {
  constructor(x) { super(x, 'core_shard', 1.5); this.baseY = this.y - 100; this.shootTimer = 0; }
  update(ss) {
    this.frame++; this.x -= ss; this.y = this.baseY + Math.sin(this.frame*0.02)*20;
    this.shootTimer++;
    if (this.shootTimer > 150 && this.x < 1920) {
      this.shootTimer = 0;
      ProjectileManager.addEnemyBullet(this.x, this.y, 0, 8, 'shard_laser');
      ProjectileManager.addEnemyBullet(this.x, this.y, 0, -8, 'shard_laser');
      ProjectileManager.addEnemyBullet(this.x, this.y, -8, 0, 'shard_laser');
      ProjectileManager.addEnemyBullet(this.x, this.y, 8, 0, 'shard_laser');
    }
    if (this.x < -100) this.alive = false;
  }
  draw(ctx) { Renderer.drawCoreShard(ctx, this.x, this.y, 1.5, this.frame); }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class Vulcan {
  constructor(x, y) {
    this.x = x || 800; this.y = y || Physics.GROUND_Y - 80;
    this.hw = 80; this.hh = 100;
    this.hp = 220; this.maxHp = 220;
    this.alive = true; this.frame = 0;
    this.state = 'enter'; this.stateTimer = 100;
    this.flashTimer = 0;
    if(typeof AudioManager !== 'undefined') AudioManager.playSE('bossIntro');
  }
  update(player) {
    this.frame++;
    if (this.flashTimer > 0) this.flashTimer--;
    switch(this.state) {
      case 'enter':
        this.x += (600 - this.x) * 0.05;
        this.stateTimer--; if(this.stateTimer<=0){this.state='idle'; this.stateTimer=60;}
        break;
      case 'idle':
        this.stateTimer--;
        if(this.stateTimer<=0){this.state = Math.random()>0.5 ? 'throw' : 'erupt'; this.stateTimer=100;}
        break;
      case 'throw':
        if(this.stateTimer === 60) {
           ProjectileManager.addEnemyBullet(this.x - 50, this.y - 50, -6, -4, 'lava_boulder');
        }
        this.stateTimer--; if(this.stateTimer<=0){this.state='idle'; this.stateTimer=60;}
        break;
      case 'erupt':
        if(this.stateTimer % 20 === 0) {
           ProjectileManager.addEnemyBullet(player.x + (Math.random()-0.5)*100, Physics.GROUND_Y + 50, 0, -10, 'fire_pillar');
        }
        this.stateTimer--; if(this.stateTimer<=0){this.state='idle'; this.stateTimer=60;}
        break;
    }
    // Collisions
    ProjectileManager.playerBullets.forEach(b => {
      if (b.alive && Physics.aabb(b, this)) {
        if (b.type === 'bomb') { if (!b.exploded) b.explode(); }
        else { b.alive = false; this.takeDamage(b.damage); }
      }
    });
    if (!player.invincible && Physics.aabb(this, player)) player.takeDamage(15, this.x);
  }
  takeDamage(d) { this.hp -= d; this.flashTimer = 5; if(this.hp <= 0) this.alive = false; }
  draw(ctx) {
    Renderer.drawVulcan(ctx, this.x, this.y, 1.5, this.frame, this.flashTimer > 0);
    ctx.fillStyle = '#000'; ctx.fillRect(this.x - 60, this.y - 120, 120, 10);
    ctx.fillStyle = '#f00'; ctx.fillRect(this.x - 60, this.y - 120, 120 * (this.hp/this.maxHp), 10);
  }
}

// Register
if (typeof EnemyRegistry !== 'undefined') {
  EnemyRegistry.register('cloud_puffer', CloudPuffer);
  EnemyRegistry.register('aero_glider', AeroGlider);
  EnemyRegistry.register('static_spark', StaticSpark);
  EnemyRegistry.register('storm_eagle', StormEagle);

  EnemyRegistry.register('neon_jelly', NeonJelly);
  EnemyRegistry.register('rusty_seeker', RustySeeker);
  EnemyRegistry.register('bubble_sniper', BubbleSniper);
  EnemyRegistry.register('kraken_x', KrakenX);

  EnemyRegistry.register('magma_crawler', MagmaCrawler);
  EnemyRegistry.register('heat_flicker', HeatFlicker);
  EnemyRegistry.register('core_shard', CoreShard);
  EnemyRegistry.register('vulcan', Vulcan);
}
