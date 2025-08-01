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

  onResize(width, height) {
    this.gates.x = width - 200;
    this.gates.y = height - 250;
  }

  spawnEnemies() {
    // More enemies, faster pace
    for (let i = 0; i < 8; i++) {
      const x = 500 + i * 220;
      const y = this.engine.canvas.height - 150;
      const enemy = new Enemy(this.engine, x, y, "goblin_run2.png");
      enemy.vx = -3; // faster enemies
      this.engine.addEntity(enemy);
    }

    // Bandit leader mini-boss
    const bandit = new Enemy(this.engine, this.engine.canvas.width - 400, this.engine.canvas.height - 150, "bandit_leader_idle.png");
    bandit.hp = 7;
    this.engine.addEntity(bandit);
  }

  update() {
    if (this.enemiesRemaining() === 0 && this.player.x + this.player.width > this.gates.x) {
      this.win = true;
      this.completeGame();
    }
  }

  render(ctx) {
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(0, this.engine.canvas.height - 50, this.engine.canvas.width, 50);

    if (this.gates.sprite) {
      ctx.drawImage(this.gates.sprite, this.gates.x, this.gates.y, this.gates.width, this.gates.height);
    }
  }

  enemiesRemaining() {
    return this.engine.entities.filter(e => e.alive).length;
  }

  completeGame() {
    this.engine.stop();
    alert("Congratulations! You've completed Quinn's Quest!");
    window.location.reload();
  }
}

window.Level = Level;
