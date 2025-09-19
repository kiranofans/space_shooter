// src/game.js
import '/game_style.css';
// file is in root folder
let currentGame = null;

// Set initial canvas dimensions
this.canvas.width = 800;
this.canvas.height = 600;

class Game {

  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Set explicit canvas dimensions
    this.canvas.width = 800;
    this.canvas.height = 600;

    // Load game sprites (place images in /public/assets or correct relative path)
    this.sprites = {
      player: new Image(),
      enemy: new Image()
    };
    this.sprites.player.src = '/assets/spaceship.svg';
    this.sprites.enemy.src = '/assets/enemy.svg';

    this.player = {
      x: this.canvas.width / 2 - 20,
      y: this.canvas.height - 50,
      width: 40,
      height: 40,
      speed: 5,
      moving: { left: false, right: false }
    };

    this.projectiles = [];
    this.enemies = [];
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;

    this.enemySpawnInterval = 2000;
    this.lastSpawnTime = 0;

    // bind handlers once and keep them so we can remove later
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.loop = this.gameLoop.bind(this);

    this.bindEvents();
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);

    console.log('Game initialized');
  }

  bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  unbindEvents() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  stop() {
    // stop the animation frame and remove events
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.unbindEvents();
    this.gameOver = true;
  }

  handleKeyDown(e) {
    // use e.code for space (more reliable)
    if (e.code === 'ArrowLeft') this.player.moving.left = true;
    else if (e.code === 'ArrowRight') this.player.moving.right = true;
    else if (e.code === 'Space') {
      if (!this.gameOver) this.shoot();
    }
  }

  handleKeyUp(e) {
    if (e.code === 'ArrowLeft') this.player.moving.left = false;
    else if (e.code === 'ArrowRight') this.player.moving.right = false;
  }

  shoot() {
    this.projectiles.push({
      x: this.player.x + this.player.width / 2 - 2,
      y: this.player.y,
      width: 4,
      height: 10,
      speed: 7
    });
  }

  spawnEnemy() {
    const currentTime = Date.now();
    if (currentTime - this.lastSpawnTime > this.enemySpawnInterval) {
      this.enemies.push({
        x: Math.random() * (this.canvas.width - 30),
        y: 0,
        width: 30,
        height: 30,
        speed: 2
      });
      this.lastSpawnTime = currentTime;
    }
  }

  checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y;
  }

  updateProjectiles() {
    this.projectiles = this.projectiles.filter(proj => proj.y + proj.height > 0);
    this.projectiles.forEach(proj => proj.y -= proj.speed);
  }

  updateEnemies() {
    let enemiesDestroyed = [];
    let projectilesToRemove = new Set();

    this.enemies = this.enemies.filter((enemy, enemyIndex) => {
      enemy.y += enemy.speed;

      // Check collision with player
      if (this.checkCollision(this.player, enemy)) {
        this.lives--;
        document.getElementById('lives').textContent = this.lives;
        if (this.lives <= 0) {
          this.gameOver = true;
          const go = document.getElementById('game-over');
          if (go) go.classList.remove('hidden'); // use our 'hidden' class
          document.getElementById('final-score').textContent = this.score;
        }
        return false;
      }

      // Check collision with projectiles
      this.projectiles.forEach((proj, projIndex) => {
        if (this.checkCollision(proj, enemy)) {
          projectilesToRemove.add(projIndex);
          enemiesDestroyed.push(enemyIndex);
        }
      });

      return enemy.y < this.canvas.height;
    });

    // Remove destroyed enemies
    this.enemies = this.enemies.filter((_, index) => !enemiesDestroyed.includes(index));

    // Remove used projectiles
    this.projectiles = this.projectiles.filter((_, index) => !projectilesToRemove.has(index));

    // Update score
    if (enemiesDestroyed.length > 0) {
      this.score += enemiesDestroyed.length * 10;
      document.getElementById('score').textContent = this.score;
    }
  }

  update(deltaTime) {
    if (this.gameOver) return;

    const moveDistance = this.player.speed * (deltaTime / 16.667);

    if (this.player.moving.left) {
      this.player.x = Math.max(0, this.player.x - moveDistance);
    }
    if (this.player.moving.right) {
      this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + moveDistance);
    }

    this.updateProjectiles();
    this.spawnEnemy();
    this.updateEnemies();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw player (guard drawImage if not loaded yet)
    if (this.sprites.player.complete && this.sprites.player.naturalWidth !== 0) {
      this.ctx.drawImage(this.sprites.player, this.player.x, this.player.y, this.player.width, this.player.height);
    } else {
      // fallback rectangle if sprite not ready
      this.ctx.fillStyle = '#0f0';
      this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    }

    // Draw projectiles
    this.ctx.fillStyle = '#fff';
    this.projectiles.forEach(proj => {
      this.ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
    });

    // Draw enemies
    this.enemies.forEach(enemy => {
      if (this.sprites.enemy.complete && this.sprites.enemy.naturalWidth !== 0) {
        this.ctx.drawImage(this.sprites.enemy, enemy.x, enemy.y, enemy.width, enemy.height);
      } else {
        this.ctx.fillStyle = '#f00';
        this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    });
  }

  gameLoop(timestamp) {
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    this.update(deltaTime);
    this.draw();

    this.rafId = requestAnimationFrame(this.loop);
  }
}


// restart helper (cleans up old instance)
function restartGame() {
  const gameOverEl = document.getElementById('game-over');
  if (currentGame) currentGame.stop();
  document.getElementById('score').textContent = '0';
  document.getElementById('lives').textContent = '3';
  if (gameOverEl) gameOverEl.classList.add('hidden');
  currentGame = new Game();
}

// export / expose to global so inline onclick still works (optional)
window.restartGame = restartGame;

// attach restart button listener (recommended)
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('restart-btn');
  if (btn) btn.addEventListener('click', restartGame);
});

// start the game
window.addEventListener('load', () => {
  console.log('Page loaded, starting game');
  currentGame = new Game();
});
