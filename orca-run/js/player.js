// === PLAYER.JS - Orca with Crouch, Dual Weapons, Reload ===
class Player {
  constructor() {
    this.x = 200; this.y = 300;
    this.vx = 0; this.vy = 0;
    this.hw = 14 * 1.6; this.hh = 18 * 1.6;
    this.standHH = 18 * 1.6; this.crouchHH = 8 * 1.6;
    this.speed = 6.0;
    // Jump State
    this.jumpCount = 0;
    this.maxJumps = 2;
    this.jumpForce = -5.7;
    this.doubleJumpForce = -9.5;
    this.holdBoost = 0.65;
    this.crouchSpeedMult = 0.6;
    this.maxHoldFrames = 11; // Default hold duration
    this.holdTimer = 0;
    this.debugInvincible = false;
    this.debugOneShot = false;
    
    this.hp = 100; this.maxHp = 100;
    this.alive = true;
    this.onGround = false;
    this.facing = 1;
    this.frame = 0;
    this.crouching = false;
    // Normal shot (left click)
    this.shotCooldown = 0; this.shotCooldownMax = 12;
    // Bomb (right click)
    this.bombCooldown = 0; this.bombCooldownMax = 120; // 2 seconds
    // Damage
    this.invincible = false; this.invTimer = 0; this.invDuration = 90;
    this.knockback = false; this.kbTimer = 0;
    this.damaged = false; this.dmgFlash = 0;
    // Attack buff
    this.atkMultiplier = 1;
    this.jumpTimer = 0;
    this.isBoosting = false;
    this.lastWDown = false;
    this.evolved = false; // Weapon evolution flag (set after Stage 1 clear)
  }

  update(keys, mouseL, mouseR, platforms, camX, screenW, screenH) {
    this.frame++;
    if (this.invincible) { this.invTimer--; if (this.invTimer<=0) { this.invincible=false; this.damaged=false; } }
    if (this.knockback) { this.kbTimer--; if (this.kbTimer<=0) this.knockback=false; }
    if (this.shotCooldown > 0) this.shotCooldown--;
    if (this.bombCooldown > 0) this.bombCooldown--;

    // Crouch (Hold S or Down)
    const wantCrouch = keys['s'] || keys['S'] || keys['ArrowDown'];
    const oldHH = this.hh;
    if (wantCrouch && !this.knockback) {
      this.crouching = true;
      this.hh = this.crouchHH;
      if (this.onGround) this.vx *= 0.95;
    } else {
      this.crouching = false;
      this.hh = this.standHH;
    }
    // Adjust Y so feet stay at the same world position during transition
    this.y += (oldHH - this.hh);

    // Check Objects & Zones
    let zoneMods = { gravityMult: 1.0, speedMult: 1.0 };
    if (typeof LevelManager !== 'undefined') {
      zoneMods = Physics.processObjects(this, LevelManager.objects, camX, LevelManager.camY);
    }

    // Movement
    if (!this.knockback) {
      this.vx = 0;
      let curSpeed = this.speed * zoneMods.speedMult;
      if (this.crouching) curSpeed *= this.crouchSpeedMult;
      
      if (keys['ArrowLeft']||keys['a']) { 
        this.vx = -curSpeed; 
        if (this.onGround) this.facing = -1; 
      }
      if (keys['ArrowRight']||keys['d']) { 
        this.vx = curSpeed; 
        if (this.onGround) this.facing = 1; 
      }
    }

    // Input processing
    const isWDown = keys['w'] || keys['W'] || keys['Shift'] || keys[' '] || keys['Spacebar'] || keys['Space'];
    const jumpJustPressed = isWDown && !this.lastWDown;
    this.lastWDown = isWDown;

    if (jumpJustPressed && !this.crouching) {
      if (this.onGround) {
        // --- 1st Jump: Variable Height (Mario-style) ---
        this.vy = this.jumpForce;
        this.onGround = false;
        this.jumpCount = 1;
        this.jumpTimer = this.maxHoldFrames;
        this.isBoosting = true;
        if(typeof AudioManager!=='undefined') AudioManager.playSE('jump');
      } else if (this.jumpCount < this.maxJumps) {
        // --- 2nd Jump: Fixed Height (Double Jump Spec) ---
        this.vy = this.doubleJumpForce;
        this.jumpCount++;
        this.isBoosting = false; // Cancel any boost from 1st jump
        if(typeof AudioManager!=='undefined') AudioManager.playSE('jump');
      }
    }
    
    // Hold W to boost (Only for the 1st jump)
    if (isWDown && this.isBoosting && this.jumpTimer > 0) {
      this.vy -= this.holdBoost;
      this.jumpTimer--;
    } else {
      this.isBoosting = false;
      this.jumpTimer = 0;
    }

    // Shoot normal (left click or Z) - disabled during crouch
    if (!this.crouching && (mouseL || keys['z'] || keys['Z']) && this.shotCooldown <= 0) {
      this.shootNormal();
      this.shotCooldown = this.shotCooldownMax;
    }

    // Shoot bomb (right click or X) - disabled during crouch
    if (!this.crouching && (mouseR || keys['x'] || keys['X']) && this.bombCooldown <= 0) {
      this.shootBomb();
      this.bombCooldown = this.bombCooldownMax;
      mouseR = false;
    }

    // Physics
    Physics.applyGravity(this, zoneMods.gravityMult);
    this.x += this.vx;
    Physics.sideCollisionCheck(this, platforms, camX);
    this.y += this.vy;
    const wasOnGround = this.onGround;
    
    const currentStage = typeof LevelManager !== 'undefined' ? LevelManager.getCurrentStage() : null;
    const hasPitfalls = currentStage && currentStage.hasPitfalls;
    const stageDist = typeof LevelManager !== 'undefined' ? LevelManager.stageDistance : 0;
    
    this.onGround = false;
    const worldX = this.x + camX;
    const isDeepDiveZone = currentStage && (
      (currentStage.number === "STAGE 3" && worldX > 11800) ||
      (currentStage.number === "STAGE 7" && worldX > 14000)
    );
    
    if (!hasPitfalls) {
      this.onGround = Physics.groundCheck(this);
      if (this.onGround) this.currentPlatform = null; // Standing on main ground
    }
    
    const camY = typeof LevelManager !== 'undefined' ? LevelManager.camY : 0;
    if (!this.onGround) {
      this.currentPlatform = Physics.platformCheck(this, platforms, camX);
      this.onGround = !!this.currentPlatform;
    }
    
    if (this.onGround) {
      this.lastGroundY = this.y;
      this.jumpCount = 0;
      if (!wasOnGround) {
        if(typeof AudioManager!=='undefined') AudioManager.playSE('land');
      }
    } else if (zoneMods && zoneMods.cameraTrack) {
      this.lastGroundY = this.y;
    } else if (isDeepDiveZone && this.vy > 5) {
      // While falling in transition, track the player's downward movement
      // but with a small dead-zone/threshold to prevent jitter
      if (Math.abs(this.y - this.lastGroundY) > 20) {
        this.lastGroundY = this.y;
      }
    }
    
    Physics.clampToScreen(this, screenW, camY);
    if (Physics.pitCheck(this, screenH, camY)) { 
      // Only die from pitfall if NOT in a deep dive transition zone AND NOT in a safe zone
      if (!isDeepDiveZone && !(zoneMods && zoneMods.isSafeZone)) { this.hp=0; this.alive=false; }
    }
    if (this.hp<=0) this.alive=false;
    if (this.dmgFlash>0) this.dmgFlash--;

    // Item keys
    for(let i=0;i<3;i++){
      if(keys[String(i+1)]){
        if(typeof Inventory!=='undefined') Inventory.use(i, this);
        keys[String(i+1)]=false;
      }
    }
  }

  shootNormal() {
    const baseDmg = this.debugOneShot ? 999999 : 10;
    const mul = this.evolved ? this.atkMultiplier * 2 : this.atkMultiplier;
    const finalMul = this.debugOneShot ? 1 : mul; // Don't double 999999
    ProjectileManager.addPlayerBullet(this.x + this.facing * 40, this.y - 27, this.facing, 'normal', finalMul * (baseDmg/10), this.evolved);
    if(typeof AudioManager!=='undefined') AudioManager.playSE('shoot');
  }

  shootBomb() {
    const baseDmg = this.debugOneShot ? 999999 : 50;
    const mul = this.evolved ? this.atkMultiplier * 2 : this.atkMultiplier;
    const finalMul = this.debugOneShot ? 1 : mul;
    ProjectileManager.addPlayerBullet(this.x + this.facing * 40, this.y - 30, this.facing, 'bomb', finalMul * (baseDmg/50), this.evolved);
    if(typeof AudioManager!=='undefined') AudioManager.playSE('bombShoot');
  }

  takeDamage(amount, fromX) {
    if (this.invincible||!this.alive||this.debugInvincible) return;
    this.hp -= amount;
    this.invincible = true; this.invTimer = this.invDuration;
    this.damaged = true; this.dmgFlash = 10;
    const dir = fromX < this.x ? 1 : -1;
    this.vx = dir*4; this.vy = -5;
    this.knockback = true; this.kbTimer = 15;
    if(typeof AudioManager!=='undefined') AudioManager.playSE('damage');
    if(typeof HUD!=='undefined' && HUD.damagePopups) {
      HUD.damagePopups.push({x: this.x - 20, y: this.y - 30, dmg: amount, timer: 40, maxTimer: 40, color: '#ff3333'});
    }
    if(this.hp<=0) this.alive=false;
  }

  draw(ctx) {
    if(this.invincible && this.frame%6<3) return;
    Renderer.drawOrca(ctx, this.x, this.y, 1.6, this.facing, this.frame, this.crouching, this.dmgFlash>0, this.evolved);
  }

  reset() {
    this.x=200;this.y=300;this.vx=0;this.vy=0;
    this.hp=this.maxHp;this.alive=true;this.onGround=false;
    this.invincible=false;this.knockback=false;this.crouching=false;
    this.shotCooldown=0;this.bombCooldown=0;this.frame=0;this.facing=1;
    this.canDoubleJump=true;this.atkMultiplier=1;this.hh=this.standHH;
    this.isBoosting=false;this.jumpTimer=0;this.lastWDown=false;
    this.evolved=false;
    this.lastGroundY = this.y;
  }
}
