class Level {
  constructor(engine) {
    this.engine = engine;
    this.player = new Player(engine, 100, engine.canvas.height - 150);
    this.enemies = [];
    this.gates = {
      sprite: engine.assets["towngates.png"],
      x: engine.canvas.width - 200,
      y: engine.canvas.height - 250,
      width: 160,
      height: 200
    };
    this.win = false;
    this.spawnEnemies();
  }

  /** Resize support (keep gates at edge) */
  onResize(width, height) {
    this.gates.x = width - 200;
    this.gates.y = height - 250;
  }

  spawnEnemies() {
    // Spawn goblins at intervals
    for (let i = 0; i < 5; i++) {
      const x = 600 + i * 250;
      const y = this.engine.canvas.height - 150;
      const enemy = new Enemy(this.engine, x, y, "goblin_run1.png");
      this.engine.addEntity(enemy);
    }

    // Bandit Leader at end
    const bandit = new Enemy(this.engine, this.engine.canvas.width - 400, this.engine.canvas.height - 150, "bandit_leader_idle.png");
    bandit.hp = 5;
    this.engine.addEntity(bandit);
  }

  update() {
    // Win condition: Player reaches gates with all enemies cleared
    if (this.enemiesRemaining() === 0 && this.player.x + this.player.width > this.gates.x) {
      this.win = true;
      this.advanceLevel();
    }
  }

  render(ctx) {
    // Draw ground
    ctx.fillStyle = "#228B22";
    ctx.fillRect(0, this.engine.canvas.height - 50, this.engine.canvas.width, 50);

    // Draw gates
    if (this.gates.sprite) {
      ctx.drawImage(this.gates.sprite, this.gates.x, this.gates.y, this.gates.width, this.gates.height);
    }
  }

  enemiesRemaining() {
    return this.engine.entities.filter(e => e.alive).length;
  }

  advanceLevel() {
    this.engine.stop();
    console.log("Level 1 Complete!");
    this.loadNext();
  }

  loadNext() {
    // Clear entities and projectiles
    this.engine.entities = [];
    this.engine.projectiles = [];

    // Load Level 2
    this.engine.loadLevel("level2.js").then(() => {
      this.engine.start();
    });
  }
}

window.Level = Level;
