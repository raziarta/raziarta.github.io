// === ENEMIES.JS - JSON-Driven Enemies ===
class Enemy {
  constructor(x, type, scale = 1.0, y = undefined) {
    const data = AssetLoader.getEnemy(type) || { hw:20, hh:20, hp:10, damage:5, speed:2 };
    this.type = type;
    this.x = x;
    this.hw = (data.hw || 20) * scale;
    this.hh = (data.hh || 20) * scale;
    this.hp = data.hp || 10;
    this.damage = data.damage || 5;
    this.speed = data.speed || 0;
    this.dropRate = data.dropRate || 0.1;
    this.alive = true;
    this.frame = 0;
    this.y = y !== undefined ? y : (Physics.GROUND_Y - this.hh - 25);
    this.hitStop = 0;
    this.scrollWith = true;
  }
}

// Data-only generic enemy for rapid prototyping
class GenericEnemy extends Enemy {
  constructor(x, type) { super(x, type, 1.5); }
  update(ss) {
    this.frame++;
    this.x -= (ss + this.speed);
    if (this.x < -100) this.alive = false;
  }
  draw(ctx) {
    // Fallback draw if no specific renderer exists
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(this.x - this.hw, this.y - this.hh, this.hw * 2, this.hh * 2);
  }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class TireShark extends Enemy {
  constructor(x) { super(x, 'tire_shark', 1.8); }
  update() { this.frame++; this.x += this.speed; if (this.x < -50) this.alive = false; }
  draw(ctx) { Renderer.drawTireShark(ctx, this.x, this.y, 1.8, this.frame); }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class VendingMachine extends Enemy {
  constructor(x) {
    super(x, 'vending_machine', 1.5);
    const data = AssetLoader.getEnemy('vending_machine');
    this.shootInterval = data.shootInterval;
    this.shootTimer = 0;
    this.shooting = false;
    this.scrollWith = true;
  }
  update(ss, px, py) {
    this.frame++; this.x -= ss; if (this.x < -50) this.alive = false;
    this.shootTimer++; this.shooting = false;
    if (this.shootTimer >= this.shootInterval && this.x > 0 && this.x < Game.width) {
      this.shooting = true;
      const dx = px - this.x, dy = py - this.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
      ProjectileManager.addEnemyBullet(this.x, this.y + 5, (dx / dist) * 6.5, (dy / dist) * 6.5, 'can');
      this.shootTimer = 0;
      if (typeof AudioManager !== 'undefined') AudioManager.playSE('canShoot');
    }
  }
  draw(ctx) { Renderer.drawVendingMachine(ctx, this.x, this.y, 1.5, this.frame, this.shooting); }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class ACHermitCrab extends Enemy {
  constructor(x) {
    super(x, 'ac_hermit_crab', 1.5);
    this.baseY = 25;
    this.y = this.baseY;
    this.scrollWith = true;
    this.state = 'hover';
    this.hoverTimer = 60;
    this.diving = false;
    this.targetX = 0;
    this.targetY = 0;
  }
  update(ss, px, py) {
    this.frame++; this.x -= ss * 0.5; if (this.x < -50) this.alive = false;
    if (this.state === 'hover') {
      this.y = this.baseY + Math.sin(this.frame * 0.05) * 15; this.hoverTimer--;
      if (this.hoverTimer <= 0) { this.state = 'dive'; this.targetX = px; this.targetY = py; this.diving = true; }
    } else if (this.state === 'dive') {
      const dx = this.targetX - this.x, dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      this.x += dx / dist * 5; this.y += dy / dist * 5;
      if (dist < 20 || this.y >= Physics.GROUND_Y - this.hh) { this.state = 'recover'; this.diving = false; this.hoverTimer = 40; }
    } else if (this.state === 'recover') {
      this.hoverTimer--; this.vy = -2; this.y += this.vy;
      if (this.hoverTimer <= 0) { this.state = 'hover'; this.hoverTimer = 80; }
    }
  }
  draw(ctx) { Renderer.drawACHermitCrab(ctx, this.x, this.y, 1.5, this.frame, this.diving); }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class CartShark extends Enemy {
  constructor() {
    super(Game.width, 'cart_shark', 2.2);
    const data = AssetLoader.getEnemy('cart_shark');
    this.maxHp = data.maxHp;
    this.state = 'enter';
    this.stateTimer = 120;
    this.attackCooldown = 0;
    this.hitStop = 0;
  }
  update(player) {
    this.frame++; this.stateTimer--;
    switch (this.state) {
      case 'enter': this.x -= 2; if (this.x <= 700) { this.state = 'idle'; this.stateTimer = 60; } break;
      case 'idle': if (this.stateTimer <= 0) { this.state = Math.random() > 0.5 ? 'charge' : 'scatter'; this.stateTimer = this.state === 'charge' ? 90 : 60; } break;
      case 'charge': if (this.stateTimer > 60) { /*windup*/ } else { this.x -= 8; if (this.x < 100) { this.state = 'return'; this.stateTimer = 60; } } break;
      case 'scatter': if (this.frame % 15 === 0) { for (let i = 0; i < 3; i++) { ProjectileManager.addEnemyBullet(this.x - 20, this.y - 20 + i * 15, -4 - Math.random() * 2, (Math.random() - 0.5) * 3, 'debris'); } }
        if (this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 80; } break;
      case 'return': this.x += 3; if (this.x >= 700) { this.state = 'idle'; this.stateTimer = 60; } break;
    }
    // Collision
    ProjectileManager.playerBullets.forEach(b => {
      if (b.alive && Physics.aabb(b, this)) {
        if (b.type === 'bomb') {
          if (!b.exploded) b.explode();
          this.hitStop = 8;
        } else {
          b.alive = false; this.takeDamage(b.damage);
          this.hitStop = 8;
        }
      }
    });
    if (!player.invincible && Physics.aabb(this, player)) player.takeDamage(this.damage, this.x);
  }
  takeDamage(d) { this.hp -= d; if (typeof ParticleSystem !== 'undefined') ParticleSystem.burst(this.x, this.y - 20, '#ffaa44', 5); if (this.hp <= 0) this.alive = false; }
  draw(ctx) { Renderer.drawCartShark(ctx, this.x, this.y, 2.2, this.frame); }
}

class SignalJelly extends Enemy {
  constructor() {
    super(Game.width, 'signal_jelly', 2.5);
    this.hw = 14; this.hh = 14; // Head-only hitbox (precision target)
    this.hp = 16; this.maxHp = 16;
    this.baseY = 155 + Game.height * 0.15;
    this.y = this.baseY;
    this.state = 'enter'; this.stateTimer = 120;
    this.signalColor = 0; this.signalTimer = 0; this.hitStop = 0;
  }
  update(player) {
    this.frame++; this.stateTimer--;
    this.y = this.baseY + Math.sin(this.frame * 0.02) * 120;
    switch (this.state) {
      case 'enter': this.x -= 2; if (this.x <= 650) { this.state = 'signal'; this.stateTimer = 120; this.signalColor = 0; this.signalTimer = 0; } break;
      case 'signal': this.signalTimer++;
        if (this.signalTimer >= 90) { this.signalColor = (this.signalColor + 1) % 3; this.signalTimer = 0; }
        const isHard = typeof LevelManager !== 'undefined' && LevelManager.currentStage >= 3;
        if (this.signalColor === 0 && this.frame % 25 === 0) {
          if (isHard) {
            const dx = player.x - this.x, dy = player.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy) || 1;
            const vx = (dx/dist)*5, vy = (dy/dist)*5;
            for (let i = -1; i <= 1; i++) {
              const spread = i * 0.4;
              const cos = Math.cos(spread), sin = Math.sin(spread);
              ProjectileManager.addEnemyBullet(this.x - 30, this.y, vx*cos - vy*sin, vx*sin + vy*cos, 'energy');
            }
          } else {
            ProjectileManager.addEnemyBullet(this.x - 30, this.y, -5, 0, 'energy');
            ProjectileManager.addEnemyBullet(this.x - 30, this.y + 20, -5, 1, 'energy');
          }
        }
        if (this.signalColor === 1 && this.frame % 40 === 0) {
          const numBullets = isHard ? 18 : 6;
          for (let a = 0; a < numBullets; a++) { 
            const ang = a * Math.PI * 2 / numBullets; 
            ProjectileManager.addEnemyBullet(this.x, this.y, Math.cos(ang) * 3, Math.sin(ang) * 3, 'energy'); 
          }
        }
        if (this.signalColor === 2 && this.frame % 15 === 0) {
          if (isHard) {
            for (let i = 0; i < 3; i++) {
              const targetVx = (player.x - this.x) * 0.015;
              ProjectileManager.addEnemyBullet(this.x - 40 + Math.random() * 80, -10, targetVx + (Math.random()-0.5)*2, 4 + Math.random()*3, 'debris');
            }
          } else {
            ProjectileManager.addEnemyBullet(this.x - 20 + Math.random() * 40, -10, 0, 4, 'debris');
          }
        }
        if (this.stateTimer <= 0) { this.state = 'signal'; this.stateTimer = 300; } break;
    }
    ProjectileManager.playerBullets.forEach(b => {
      if (b.alive && Physics.aabb(b, this)) {
        if (b.type === 'bomb') { if (!b.exploded) b.explode(); this.hitStop = 8; }
        else { b.alive = false; this.takeDamage(b.damage); this.hitStop = 8; }
      }
    });
    if (!player.invincible && Physics.aabb(this, player)) player.takeDamage(this.damage, this.x);
  }
  takeDamage(d) { this.hp -= d; if (typeof ParticleSystem !== 'undefined') ParticleSystem.burst(this.x, this.y, '#aaccff', 5); if (this.hp <= 0) this.alive = false; }
  draw(ctx) { Renderer.drawSignalJelly(ctx, this.x, this.y, 2.5, this.frame, this.maxHp, this.hp); }
}

// === CHAPTER 2 ENEMIES ===
class SubmarineCrab extends Enemy {
  constructor(x) {
    super(x, 'submarine_crab', 1.0);
    this.y = Physics.GROUND_Y - this.hh - 5;
    this.shootTimer = 0; this.shootInterval = 180;
    this.scrollWith = true; this.type = 'submarineCrab';
  }
  update(ss, px, py) {
    this.frame++; this.x -= ss; if (this.x < -50) this.alive = false;
    this.shootTimer++;
    if (this.shootTimer >= this.shootInterval && this.x > 0 && this.x < Game.width) {
      const dx = px - this.x, dy = py - this.y, dist = Math.sqrt(dx*dx+dy*dy)||1;
      ProjectileManager.addEnemyBullet(this.x, this.y, (dx/dist)*3, (dy/dist)*3, 'energy');
      this.shootTimer = 0;
    }
  }
  draw(ctx) {
    Renderer.drawSubmarineCrab(ctx, this.x, this.y, 1.5, this.frame);
  }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class MorayEel extends Enemy {
  constructor(x) {
    super(x, 'moray_eel', 1.0);
    this.baseY = 350 + Math.random() * 80;
    this.y = this.baseY; this.type = 'morayEel';
  }
  update() {
    this.frame++; this.x -= 5;
    this.y = this.baseY + Math.sin(this.frame * 0.08) * 60;
    if (this.x < -60) this.alive = false;
  }
  draw(ctx) {
    Renderer.drawMorayEel(ctx, this.x, this.y, 1.0, this.frame);
  }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

class CarrierSeal extends Enemy {
  constructor(x) {
    super(x, 'carrier_seal', 1.0);
    this.baseY = Physics.GROUND_Y + 40;
    this.y = this.baseY;
    this.state = 'hidden'; this.stateTimer = 60 + Math.random() * 60;
    this.type = 'carrierSeal'; this.scrollWith = true;
  }
  update(ss) {
    this.frame++; this.x -= ss * 0.3; if (this.x < -50) this.alive = false;
    this.stateTimer--;
    if (this.state === 'hidden') {
      this.y = this.baseY;
      if (this.stateTimer <= 0) { this.state = 'emerge'; this.vy = -12; }
    } else if (this.state === 'emerge') {
      this.vy += 0.4; this.y += this.vy;
      if (this.y >= this.baseY - 40 - this.hh) { this.y = this.baseY - 40 - this.hh; this.state = 'surface'; this.stateTimer = 90; }
    } else if (this.state === 'surface') {
      if (this.stateTimer <= 0) { this.state = 'dive'; this.vy = 3; }
    } else if (this.state === 'dive') {
      this.y += this.vy;
      if (this.y > this.baseY + 20) { this.state = 'hidden'; this.stateTimer = 120; }
    }
  }
  draw(ctx) {
    if (this.state === 'hidden') return;
    Renderer.drawCarrierSeal(ctx, this.x, this.y, 1.5, this.frame, this.state);
  }
  takeDamage(d) { this.hp -= d; if (this.hp <= 0) this.alive = false; }
}

// === CHAPTER 2 MID-BOSS: Abyss Angler ===
class AbyssAngler extends Enemy {
  constructor() {
    super(Game.width, 'tire_shark', 3.0);
    this.hp = 40; this.maxHp = 40;
    this.hw = 50; this.hh = 40;
    this.y = 200; this.state = 'enter'; this.stateTimer = 120;
    this.hitStop = 0; this.flashTimer = 0; this.type = 'abyssAngler';
  }
  update(player) {
    this.frame++; this.stateTimer--;
    if (this.flashTimer > 0) this.flashTimer--;
    switch (this.state) {
      case 'enter': this.x -= 2; if (this.x <= 650) { this.state = 'idle'; this.stateTimer = 80; } break;
      case 'idle':
        this.y = 200 + Math.sin(this.frame * 0.03) * 30;
        if (this.stateTimer <= 0) {
          const r = Math.random();
          if (r < 0.33) { this.state = 'flash'; this.stateTimer = 90; this.flashTimer = 30; }
          else if (r < 0.66) { this.state = 'vacuum'; this.stateTimer = 120; }
          else { this.state = 'charge'; this.stateTimer = 60; }
        } break;
      case 'flash':
        if (this.stateTimer < 60 && this.frame % 10 === 0) {
          const dx = player.x - this.x, dy = player.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          const vx = (dx/dist)*7, vy = (dy/dist)*7;
          for (let i = -1; i <= 1; i++) {
            const spread = i * 0.3;
            const cos = Math.cos(spread), sin = Math.sin(spread);
            ProjectileManager.addEnemyBullet(this.x - 30, this.y, vx*cos - vy*sin, vx*sin + vy*cos, 'energy');
          }
        }
        if (this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 60; } break;
      case 'vacuum':
        if (this.frame % 20 === 0) {
          const dx = player.x - this.x, dy = player.y - this.y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          const vx = (dx/dist)*6, vy = (dy/dist)*6;
          for (let i = 0; i < 12; i++) {
            const spread = (Math.random() - 0.5) * 1.5;
            const cos = Math.cos(spread), sin = Math.sin(spread);
            ProjectileManager.addEnemyBullet(this.x-40, this.y-20+(Math.random()*60-30), vx*cos - vy*sin, vx*sin + vy*cos, 'debris');
          }
        }
        if (this.stateTimer <= 0) { this.state = 'idle'; this.stateTimer = 80; } break;
      case 'charge':
        this.x -= 6;
        if (this.x < 100) { this.state = 'return'; this.stateTimer = 80; } break;
      case 'return': this.x += 3; if (this.x >= 650) { this.state = 'idle'; this.stateTimer = 60; } break;
    }
    ProjectileManager.playerBullets.forEach(b => {
      if (b.alive && Physics.aabb(b, this)) {
        if (b.type === 'bomb') { if (!b.exploded) b.explode(); this.hitStop = 8; }
        else { b.alive = false; this.takeDamage(b.damage); this.hitStop = 8; }
      }
    });
    if (!player.invincible && Physics.aabb(this, player)) player.takeDamage(this.damage, this.x);
  }
  takeDamage(d) { this.hp -= d; if (typeof ParticleSystem !== 'undefined') ParticleSystem.burst(this.x, this.y, '#44aaff', 6); if (this.hp <= 0) this.alive = false; }
  draw(ctx) {
    Renderer.drawAbyssAngler(ctx, this.x, this.y, 1.0, this.frame, this.flashTimer > 0);
  }
}

const EnemyRegistry = {
  types: {},
  register(id, cls) { this.types[id] = cls; },
  create(id, x, y) {
    const Cls = this.types[id] || GenericEnemy;
    const enemy = new Cls(x);
    if (y !== undefined) {
      enemy.y = y;
      if (enemy.baseY !== undefined) enemy.baseY = y;
    }
    return enemy;
  }
};

// Register existing enemies
EnemyRegistry.register('tire_shark', TireShark);
EnemyRegistry.register('vending_machine', VendingMachine);
EnemyRegistry.register('ac_hermit_crab', ACHermitCrab);
EnemyRegistry.register('submarine_crab', SubmarineCrab);
EnemyRegistry.register('moray_eel', MorayEel);
EnemyRegistry.register('carrier_seal', CarrierSeal);
EnemyRegistry.register('cart_shark', CartShark);
EnemyRegistry.register('signal_jelly', SignalJelly);
EnemyRegistry.register('abyss_angler', AbyssAngler);

const EnemyManager = {
  enemies: [], midBoss: null, enabled: true,
  init() { this.enemies = []; this.midBoss = null; this.enabled = true; },
  spawn(type, x, y) {
    // Convert camelCase from legacy level data if needed
    const id = type.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    this.enemies.push(EnemyRegistry.create(id, x !== undefined ? x : Game.width + 20, y));
  },
  spawnMidBoss(type) {
    const id = type.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    // Spawn midboss at a relative height to the current camera view
    const spawnY = (typeof LevelManager !== 'undefined') ? LevelManager.camY + 200 : 200;
    this.midBoss = EnemyRegistry.create(id, Game.width + 100, spawnY);
    this.enabled = false;
  },
  update(ss, player, damagePopups) {
    this.enemies.forEach(e => {
      if (e.hitStop > 0) {
        e.hitStop--;
      } else {
        if (e.scrollWith) e.update(ss, player.x, player.y); else e.update();
      }
      if (e.alive && !player.invincible && Physics.aabb(e, player)) player.takeDamage(e.damage, e.x);
    });
    ProjectileManager.playerBullets.forEach(b => {
      this.enemies.forEach(e => {
        if (b.alive && e.alive && Physics.aabb(b, e)) {
          if (b.type === 'bomb') {
            if (!b.exploded) b.explode();
            e.hitStop = 8;
          } else {
            e.takeDamage(b.damage); b.alive = false;
            e.hitStop = 3;
          }
          if (damagePopups) damagePopups.push({ x: e.x, y: e.y, dmg: b.damage, timer: 40, maxTimer: 40 });
          if (!e.alive) {
            ItemManager.tryDrop(e.x, e.y, e.type); // using enemy type for drop logic
            if (typeof AudioManager !== 'undefined') AudioManager.playSE('enemyDie');
            if (typeof ParticleSystem !== 'undefined') ParticleSystem.burst(e.x, e.y, '#ff8844', 8);
          } else {
            if (typeof ParticleSystem !== 'undefined') ParticleSystem.burst(e.x, e.y, '#fff', 4);
          }
        }
      });
    });
    ProjectileManager.checkBombAoE(this.enemies);
    this.enemies = this.enemies.filter(e => e.alive);
    if (this.midBoss) {
      if (this.midBoss.alive) {
        if (this.midBoss.hitStop > 0) {
          this.midBoss.hitStop--;
        } else {
          this.midBoss.update(player);
        }
        ProjectileManager.playerBullets.forEach(b => {
          if (b.type === 'bomb' && b.exploded && b.explosionTimer === 1) {
            const dx = this.midBoss.x - b.x, dy = this.midBoss.y - b.y;
            if (Math.sqrt(dx * dx + dy * dy) < b.explosionRadius) {
              this.midBoss.takeDamage(b.damage);
              this.midBoss.hitStop = 8;
              if (damagePopups) damagePopups.push({ x: this.midBoss.x, y: this.midBoss.y, dmg: b.damage, timer: 40, maxTimer: 40 });
            }
          }
        });
      } else {
        this.midBoss = null; this.enabled = true;
        ItemManager.items.push(new DroppedItem(700, Physics.GROUND_Y - 30, 'healM'));
      }
    }
  },
  draw(ctx) { this.enemies.forEach(e => e.draw(ctx)); if (this.midBoss && this.midBoss.alive) this.midBoss.draw(ctx); },
  clear() { this.enemies = []; this.midBoss = null; this.enabled = true; },
};
