class QuinnQuestEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.assets = {};
    this.sounds = {};
    this.entities = [];
    this.projectiles = [];
    this.currentLevel = null;
    this.isRunning = false;
    this.input = { left: false, right: false, up: false, attack: false };
    this.player = null;

    this.gravity = 0.6;

    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());
    this.bindInputs();
  }

  /** ===================
   *  RESIZE HANDLER
   *  =================== */
  handleResize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.currentLevel && this.currentLevel.onResize) {
      this.currentLevel.onResize(this.canvas.width, this.canvas.height);
    }
  }

  /** ===================
   *  INPUT HANDLING
   *  =================== */
  bindInputs() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.input.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.input.right = true;
      if (e.code === "ArrowUp" || e.code === "Space") this.input.up = true;
      if (e.code === "KeyJ") this.input.attack = true;
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.input.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.input.right = false;
      if (e.code === "ArrowUp" || e.code === "Space") this.input.up = false;
      if (e.code === "KeyJ") this.input.attack = false;
    });
  }

  /** ===================
   *  ASSET LOADING
   *  =================== */
  loadImage(path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = `assets/images/${path}`;
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.error(`Failed to load asset: ${path}`);
        reject(new Error(`Failed to load asset: ${path}`));
      };
    });
  }

  async preloadImages(imageList) {
    const promises = imageList.map(imgName => this.loadImage(imgName).then(img => {
      this.assets[imgName] = img;
    }));
    return Promise.all(promises);
  }

  loadSound(path) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(`assets/sounds/${path}`);
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = () => {
        console.error(`Failed to load sound: ${path}`);
        reject(new Error(`Failed to load sound: ${path}`));
      };
    });
  }

  async preloadSounds(soundList) {
    const promises = soundList.map(soundName => this.loadSound(soundName).then(sound => {
      this.sounds[soundName] = sound;
    }));
    return Promise.all(promises);
  }

  /** ===================
   *  LEVEL LOADING
   *  =================== */
  async loadLevel(levelName) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `levels/${levelName}`;
      script.onload = () => {
        if (typeof window.Level !== "undefined") {
          this.currentLevel = new window.Level(this);
          this.player = this.currentLevel.player;
          resolve(this.currentLevel);
        } else {
          reject(new Error(`Level ${levelName} did not define window.Level`));
        }
      };
      script.onerror = () => reject(new Error(`Failed to load level: ${levelName}`));
      document.body.appendChild(script);
    });
  }

  /** ===================
   *  GAME LOOP
   *  =================== */
  start() {
    if (!this.currentLevel) {
      console.error("No level loaded!");
      return;
    }
    this.isRunning = true;
    const loop = () => {
      if (!this.isRunning) return;
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.isRunning = false;
  }

  update() {
    // Player + entities
    if (this.currentLevel && this.currentLevel.update) {
      this.currentLevel.update();
    }
    if (this.player) this.player.update();

    for (let entity of this.entities) {
      if (entity.update) entity.update();
    }
    for (let projectile of this.projectiles) {
      projectile.update();
    }

    // Collision detection
    this.checkCollisions();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.currentLevel && this.currentLevel.render) {
      this.currentLevel.render(this.ctx);
    }
    if (this.player) this.player.render(this.ctx);

    for (let entity of this.entities) {
      entity.render(this.ctx);
    }
    for (let projectile of this.projectiles) {
      projectile.render(this.ctx);
    }
  }

  /** ===================
   *  COLLISIONS
   *  =================== */
  checkCollisions() {
    for (let projectile of this.projectiles) {
      for (let entity of this.entities) {
        if (this.intersect(projectile, entity)) {
          if (entity.takeDamage) entity.takeDamage(1);
          projectile.active = false;
        }
      }
    }

    this.projectiles = this.projectiles.filter(p => p.active);
    this.entities = this.entities.filter(e => e.alive !== false);
  }

  intersect(a, b) {
    return !(
      a.x + a.width < b.x ||
      a.x > b.x + b.width ||
      a.y + a.height < b.y ||
      a.y > b.y + b.height
    );
  }

  /** ===================
   *  ENTITY MANAGEMENT
   *  =================== */
  addEntity(entity) {
    this.entities.push(entity);
  }

  addProjectile(projectile) {
    this.projectiles.push(projectile);
  }
}

/** ===================
 *  ENTITY CLASSES
 *  =================== */
class Entity {
  constructor(engine, x, y, width, height, spriteName) {
    this.engine = engine;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = width;
    this.height = height;
    this.spriteName = spriteName;
    this.sprite = engine.assets[spriteName];
    this.alive = true;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  render(ctx) {
    if (this.sprite) {
      ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
    } else {
      ctx.fillStyle = "red";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}

class Player extends Entity {
  constructor(engine, x, y) {
    super(engine, x, y, 64, 64, "quinn_idle.png");
    this.jumpStrength = -12;
    this.onGround = false;
    this.hp = 3;
  }

  update() {
    const input = this.engine.input;

    if (input.left) this.vx = -5;
    else if (input.right) this.vx = 5;
    else this.vx = 0;

    if (input.up && this.onGround) {
      this.vy = this.jumpStrength;
      this.onGround = false;
    }

    // Gravity
    this.vy += this.engine.gravity;

    // Apply movement
    this.x += this.vx;
    this.y += this.vy;

    // Ground collision
    if (this.y + this.height >= this.engine.canvas.height - 50) {
      this.y = this.engine.canvas.height - this.height - 50;
      this.vy = 0;
      this.onGround = true;
    }

    if (input.attack) {
      this.attack();
    }
  }

  attack() {
    const projectile = new Projectile(
      this.engine,
      this.x + this.width,
      this.y + this.height / 2,
      12,
      12,
      "fireball.png",
      8
    );
    this.engine.addProjectile(projectile);
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      console.log("Player dead!");
    }
  }
}

class Enemy extends Entity {
  constructor(engine, x, y, spriteName = "goblin_run1.png") {
    super(engine, x, y, 64, 64, spriteName);
    this.hp = 2;
    this.vx = -2;
  }

  update() {
    super.update();
    if (this.x < -this.width) this.alive = false;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
    }
  }
}

class Projectile extends Entity {
  constructor(engine, x, y, width, height, spriteName, speed) {
    super(engine, x, y, width, height, spriteName);
    this.vx = speed;
    this.active = true;
  }

  update() {
    this.x += this.vx;
    if (this.x > this.engine.canvas.width) {
      this.active = false;
    }
  }
}

// Expose globally
window.QuinnQuestEngine = QuinnQuestEngine;
window.Entity = Entity;
window.Player = Player;
window.Enemy = Enemy;
window.Projectile = Projectile;
