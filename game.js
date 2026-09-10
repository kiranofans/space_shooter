import spaceshipVideoUrl from './assets/spaceship.webm';
import enemyImgUrl from './assets/enemy_small.png';
import bgmUrl from './assets/audio/StarfighterAscent_small.mp3';
import playerExplosionImgUrl from './assets/player_explosion.webm';

const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score'), livesEl = document.querySelector('#lives');
const startScreen = document.querySelector('#start-screen'), pauseScreen = document.querySelector('#pause-screen'), gameOverScreen = document.querySelector('#game-over'), finalScoreEl = document.querySelector('#final-score');

// Handle dynamic resizing for true full-screen without distortion
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Live-adjustable volumes, wired up to sliders near the sound toggle further down.
let bgmVolume = 0.35, sfxVolume = 1;

// Music begins after Start Mission because browsers block autoplay with sound.
const bgm = new Audio(bgmUrl);
bgm.loop = true;
bgm.volume = bgmVolume;
const playerSprite = document.createElement('video');
playerSprite.src = spaceshipVideoUrl;
playerSprite.muted = true;
playerSprite.loop = true;
playerSprite.playsInline = true;
const enemySprite = new Image(); enemySprite.src = enemyImgUrl;

const PLAYER_EXPLOSION_SRC = playerExplosionImgUrl;
const ENEMY_EXPLOSION_SRC = '/assets/enemy_explosion.png';
const PLAYER_HIT_SRC = '/assets/spaceship_hit.png';
const ENEMY_HIT_SRC = '/assets/enemy_small_hit.png';
const HIT_FLASH_DURATION = 0.15;

function loadSprite(src) { if (/\.webm$/i.test(src)) { const v = document.createElement('video'); v.src = src; v.muted = true; v.playsInline = true; v.preload = 'auto'; v.addEventListener('error', () => console.warn(`[sprite] failed to load video: ${src}`)); return v; } const img = new Image(); img.addEventListener('error', () => console.warn(`[sprite] failed to load image: ${src}`)); img.addEventListener('load', () => console.log(`[sprite] loaded OK: ${src} (${img.naturalWidth}x${img.naturalHeight})`)); img.src = src; return img; }
function spriteReady(sprite) { return sprite.tagName === 'VIDEO' ? sprite.readyState >= 2 : (sprite.complete && sprite.naturalWidth > 0); }
const playerHitSprite = loadSprite(PLAYER_HIT_SRC);
const enemyHitSprite = loadSprite(ENEMY_HIT_SRC);
const playerExplosionImg = loadSprite(PLAYER_EXPLOSION_SRC);
const enemyExplosionImg = loadSprite(ENEMY_EXPLOSION_SRC);

// By default, sound is OFF. You must click the speaker icon in-game to enable it.
let game, soundOn = false;

class Sound {
  constructor() { this.context = null; }
  unlock() { if (!this.context) this.context = new AudioContext(); if (this.context.state === 'suspended') this.context.resume(); }
  tone(freq, duration, type = 'sine', volume = .04) { if (!soundOn || !this.context || sfxVolume <= 0) return; const osc = this.context.createOscillator(), gain = this.context.createGain(); osc.type = type; osc.frequency.value = freq; gain.gain.setValueAtTime(volume * sfxVolume, this.context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration); osc.connect(gain).connect(this.context.destination); osc.start(); osc.stop(this.context.currentTime + duration); }
  shoot() { this.tone(700, .06, 'square', .025); } hit() { this.tone(115, .18, 'sawtooth', .055); }
}
const sound = new Sound();

class Game {
  constructor() {
    this.player = { x: canvas.width / 2 - 28, y: canvas.height - 100, w: 56, h: 56, speed: 380, tilt: 0, engine: 0, hitUntil: 0 };
    this.keys = { left: false, right: false, up: false, down: false, fire: false };
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.explosions = [];
    this.stars = Array.from({ length: 85 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.5 + .3, speed: 18 + Math.random() * 45 }));
    this.score = 0;
    this.lives = 3;
    this.running = true;
    this.paused = false;
    this.lastSpawn = 0;
    this.lastShot = 0;
    this.elapsed = 0;
    this.lastTime = performance.now();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }
  spawnEnemy() { const x = 24 + Math.random() * (canvas.width - 72); this.enemies.push({ x, y: -55, w: 48, h: 48, speed: 70 + Math.random() * 70 + this.score * .4, phase: Math.random() * Math.PI * 2, drift: 25 + Math.random() * 45, spin: Math.random() > .5 ? 1 : -1, nextShot: this.elapsed + 1.3 + Math.random() * 1.5, health: 1, hitUntil: 0 }); }
  shoot() { this.bullets.push({ x: this.player.x + this.player.w / 2 - 4, y: this.player.y - 6, w: 8, h: 24, speed: 620, glow: 0 }); sound.shoot(); }
  spawnExplosion(entity, img) { const cx = entity.x + entity.w / 2, cy = entity.y + entity.h / 2; const particles = Array.from({ length: 16 }, () => ({ angle: Math.random() * Math.PI * 2, speed: 70 + Math.random() * 160, radius: 2 + Math.random() * 3 })); this.explosions.push({ x: cx, y: cy, w: entity.w, h: entity.h, start: this.elapsed, duration: 0.5, particles, img: img || null }); }
  intersects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  damage() {
    this.lives--;
    // ADD THIS: Triggers a heavy physical rumble on mobile devices
    if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
    sound.hit();
    if (this.lives <= 0) {
      this.running = false;
      this.spawnExplosion(this.player, playerExplosionImg);
      finalScoreEl.textContent = this.score;
      gameOverScreen.classList.remove('hidden');

    } else {
      this.player.hitUntil = this.elapsed + HIT_FLASH_DURATION;

      // OPTIONAL: A tiny 30ms tap for normal hits (delete if you only want it on death)
      // Only vibrate if the user is actively touching the screen (bypasses browser blocks)
      if (typeof activeTouchId !== 'undefined' && activeTouchId !== null && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  }
  update(dt) {
    this.elapsed += dt;
    this.stars.forEach(s => { s.y += s.speed * dt; if (s.y > canvas.height) { s.y = -3; s.x = Math.random() * canvas.width; } });
    const horizontal = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0), vertical = (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0);
    this.player.x = Math.max(0, Math.min(canvas.width - this.player.w, this.player.x + horizontal * this.player.speed * dt));
    this.player.y = Math.max(0, Math.min(canvas.height - this.player.h, this.player.y + vertical * this.player.speed * dt));
    this.player.tilt += ((horizontal * .22) - this.player.tilt) * Math.min(1, dt * 10);
    this.player.engine += dt * 12;
    if (this.keys.fire && this.elapsed - this.lastShot > .18) { this.shoot(); this.lastShot = this.elapsed; }
    if (this.elapsed - this.lastSpawn > Math.max(.38, 1.05 - this.score / 500)) { this.spawnEnemy(); this.lastSpawn = this.elapsed; }
    this.bullets.forEach(b => { b.y -= b.speed * dt; b.glow += dt * 14; });
    this.bullets = this.bullets.filter(b => b.y > -30);
    this.enemies.forEach(e => { e.y += e.speed * dt; e.phase += e.spin * dt * 3; e.x += Math.sin(e.phase) * e.drift * dt; if (this.elapsed >= e.nextShot) { this.enemyBullets.push({ x: e.x + e.w / 2 - 4, y: e.y + e.h - 4, w: 8, h: 18, speed: 250, glow: 0 }); e.nextShot = this.elapsed + 1.4 + Math.random() * 1.2; } });
    this.enemyBullets.forEach(b => { b.y += b.speed * dt; b.glow += dt * 14; });
    let playerHit = false;
    this.enemyBullets = this.enemyBullets.filter(b => { if (this.intersects(this.player, b)) { if (!playerHit) this.damage(); playerHit = true; return false; } return b.y < canvas.height + 30; });
    const removedBullets = new Set();
    this.enemies = this.enemies.filter(enemy => { if (this.intersects(this.player, enemy)) { this.damage(); this.spawnExplosion(enemy, enemyExplosionImg); return false; } const bulletIndex = this.bullets.findIndex((bullet, i) => !removedBullets.has(i) && this.intersects(bullet, enemy)); if (bulletIndex >= 0) { removedBullets.add(bulletIndex); enemy.health--; sound.hit(); if (enemy.health <= 0) { this.score += 10; this.spawnExplosion(enemy, enemyExplosionImg); return false; } enemy.hitUntil = this.elapsed + HIT_FLASH_DURATION; return true; } return enemy.y <= canvas.height + 20; });
    this.bullets = this.bullets.filter((_, i) => !removedBullets.has(i));
    this.explosions = this.explosions.filter(ex => (this.elapsed - ex.start) < ex.duration);
    scoreEl.textContent = String(this.score).padStart(4, '0'); livesEl.textContent = '♥ '.repeat(Math.max(0, this.lives)).trim() || '—';
  }
  drawSprite(sprite, entity, rotation = 0) {
    if (!spriteReady(sprite)) return; ctx.save();
    ctx.translate(entity.x + entity.w / 2, entity.y + entity.h / 2);
    ctx.rotate(rotation);

    // Get true source dimensions
    const sourceW = sprite.tagName === 'VIDEO' ? sprite.videoWidth : sprite.naturalWidth;
    const sourceH = sprite.tagName === 'VIDEO' ? sprite.videoHeight : sprite.naturalHeight;

    let renderW = entity.w;
    let renderH = entity.h;

    // Preserve original aspect ratio relative to entity height
    if (sourceW && sourceH) {
      const aspectRatio = sourceW / sourceH;
      renderW = entity.h * aspectRatio;
    }

    try {
      ctx.drawImage(sprite, -renderW / 2, -renderH / 2, renderW, renderH);
    } catch (err) { } ctx.restore();
  }
  draw() {
    ctx.fillStyle = '#071329';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.stars.forEach(s => { ctx.globalAlpha = .35 + s.r / 3; ctx.fillStyle = '#b7e7ff'; ctx.fillRect(s.x, s.y, s.r, s.r); });
    ctx.globalAlpha = 1;
    const p = this.player, flame = 15 + Math.sin(p.engine) * 6;
    if (this.lives > 0) { ctx.fillStyle = '#ffb343'; ctx.globalAlpha = .7; ctx.beginPath(); ctx.moveTo(p.x + p.w / 2 - 9, p.y + p.h - 5); ctx.lineTo(p.x + p.w / 2, p.y + p.h + flame); ctx.lineTo(p.x + p.w / 2 + 9, p.y + p.h - 5); ctx.fill(); ctx.globalAlpha = 1; this.drawSprite((p.hitUntil > this.elapsed && spriteReady(playerHitSprite)) ? playerHitSprite : playerSprite, p, p.tilt); }
    this.bullets.forEach(b => { ctx.fillStyle = '#d5faff'; ctx.shadowColor = '#4cdcff'; ctx.shadowBlur = 14 + Math.sin(b.glow) * 5; ctx.fillRect(b.x, b.y, b.w, b.h); });
    this.enemyBullets.forEach(b => { ctx.fillStyle = '#ff6b81'; ctx.shadowColor = '#ff244a'; ctx.shadowBlur = 14 + Math.sin(b.glow) * 5; ctx.fillRect(b.x, b.y, b.w, b.h); });
    ctx.shadowBlur = 0;
    this.enemies.forEach(e => this.drawSprite((e.hitUntil > this.elapsed && spriteReady(enemyHitSprite)) ? enemyHitSprite : enemySprite, e, Math.sin(e.phase) * .16));
    this.explosions.forEach(ex => { const t = this.elapsed - ex.start, life = Math.max(0, 1 - t / ex.duration); ctx.globalAlpha = life; ctx.fillStyle = '#ffcf6b'; ctx.shadowColor = '#ff7a3d'; ctx.shadowBlur = 16; ex.particles.forEach(pt => { const dist = pt.speed * t; ctx.beginPath(); ctx.arc(ex.x + Math.cos(pt.angle) * dist, ex.y + Math.sin(pt.angle) * dist, pt.radius * life, 0, Math.PI * 2); ctx.fill(); }); ctx.shadowBlur = 0; ctx.globalAlpha = 1; if (ex.img && spriteReady(ex.img)) { try { ctx.drawImage(ex.img, ex.x - ex.w / 2, ex.y - ex.h / 2, ex.w, ex.h); } catch (err) { } } });
  }
  frame(now) { const dt = Math.min(.05, (now - this.lastTime) / 1000); this.lastTime = now; if (this.running && !this.paused) this.update(dt); this.draw(); requestAnimationFrame(this.frame); }
}

function setControl(control, active) { if (game) game.keys[control] = active; }
function togglePause() {
  if (!game || !game.running) return;
  game.paused = !game.paused;
  Object.keys(game.keys).forEach(key => {
    game.keys[key] = false;
  });
  pauseScreen.classList.toggle('hidden', !game.paused);
  if (game.paused) bgm.pause();
  else if (soundOn) bgm.play();
}
window.addEventListener('keydown', event => { if (event.code === 'Escape') { togglePause(); return; } if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault(); if (event.code === 'ArrowLeft') setControl('left', true); if (event.code === 'ArrowRight') setControl('right', true); if (event.code === 'ArrowUp') setControl('up', true); if (event.code === 'ArrowDown') setControl('down', true); if (event.code === 'Space') setControl('fire', true); });
window.addEventListener('keyup', event => { if (event.code === 'ArrowLeft') setControl('left', false); if (event.code === 'ArrowRight') setControl('right', false); if (event.code === 'ArrowUp') setControl('up', false); if (event.code === 'ArrowDown') setControl('down', false); if (event.code === 'Space') setControl('fire', false); });
document.querySelectorAll('[data-control]').forEach(button => { const control = button.dataset.control;['pointerdown', 'pointerup', 'pointercancel', 'pointerleave'].forEach(type => button.addEventListener(type, event => { event.preventDefault(); setControl(control, type === 'pointerdown'); })); });
function startGame() { if (game) game.running = false; sound.unlock(); playerSprite.play(); if (soundOn) bgm.play(); game = new Game(); startScreen.classList.add('hidden'); pauseScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); const mc = document.querySelector('#mobile-controls'); if (mc) { mc.classList.remove('hidden'); mc.classList.add('flex'); } }
function returnToMenu() { if (game) game.running = false; game = null; bgm.pause(); bgm.currentTime = 0; playerSprite.pause(); scoreEl.textContent = '0000'; livesEl.textContent = '♥ ♥ ♥'; pauseScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); startScreen.classList.remove('hidden'); const mc = document.querySelector('#mobile-controls'); if (mc) { mc.classList.add('hidden'); mc.classList.remove('flex'); } }

function setupVolumeControls() {
  const toggleBtn = document.querySelector('#sound-toggle');
  if (!toggleBtn) return null;
  // ADD THIS LINE: Force the icon to muted on startup
  toggleBtn.textContent = '🔇';
  toggleBtn.classList.remove('absolute', 'right-0', 'top-2.5', 'max-[520px]:static', 'max-[520px]:mt-2.5');

  const style = document.createElement('style');
  style.textContent = `
    #sound-widget { display: inline-flex; flex-direction: row; align-items: center; gap: 8px; position: absolute; right: 0; top: 10px; z-index: 50; }
    .volume-controls { display: flex; flex-direction: column; align-items: stretch; gap: 6px; font: 12px sans-serif; color: #cfe8ff; background: rgba(12, 36, 72, 0.85); padding: 8px; border-radius: 8px; border: 1px solid #4a9dbd; backdrop-filter: blur(4px); }
    .volume-controls label { display: flex; align-items: center; justify-content: space-between; gap: 8px; white-space: nowrap; }
    .volume-controls input[type=range] { width: 110px; accent-color: #4cdcff; }
    @media (max-width: 520px) {
      #sound-widget { flex-direction: column; align-items: flex-end; right: 10px; top: 10px; gap: 4px; }
    }`;
  document.head.appendChild(style);

  const widget = document.createElement('div');
  widget.id = 'sound-widget';
  toggleBtn.replaceWith(widget);
  widget.appendChild(toggleBtn);

  const wrap = document.createElement('div');
  wrap.className = 'volume-controls';
  wrap.style.display = soundOn ? 'flex' : 'none';
  wrap.innerHTML = `
    <label>BGM <input type="range" id="bgm-volume" min="0" max="100" value="${Math.round(bgmVolume * 100)}"></label>
    <label>Effects <input type="range" id="sfx-volume" min="0" max="100" value="${Math.round(sfxVolume * 100)}"></label>
  `;
  widget.appendChild(wrap);
  wrap.querySelector('#bgm-volume').addEventListener('input', event => {
    bgmVolume = Number(event.target.value) / 100; bgm.volume = bgmVolume;
  });
  wrap.querySelector('#sfx-volume').addEventListener('input', event => {
    sfxVolume = Number(event.target.value) / 100;
  });
  // ---- Auto-Close on Outside Click/Tap ----
  window.addEventListener('pointerdown', (e) => {
    const widget = document.querySelector('#sound-widget');

    // If the user clicked somewhere on the screen that is NOT inside the sound widget,
    // and the volume controls are currently visible, hide them.
    if (widget && !widget.contains(e.target) && volumeControls && volumeControls.style.display === 'flex') {
      volumeControls.style.display = 'none';
    }
  });
  return wrap;
}
const volumeControls = setupVolumeControls();

document.querySelector('#start-btn').addEventListener('click', startGame);
document.querySelector('#restart-btn').addEventListener('click', startGame);
document.querySelector('#resume-btn').addEventListener('click', togglePause);
document.querySelector('#menu-btn').addEventListener('click', returnToMenu);
document.querySelector('#game-over-menu-btn').addEventListener('click', returnToMenu);
document.querySelector('#sound-toggle').addEventListener('click', event => {
  soundOn = !soundOn; soundOn ? bgm.play() : bgm.pause();
  event.currentTarget.textContent = soundOn ? '🔊' : '🔇';
  if (volumeControls) volumeControls.style.display = soundOn ? 'flex' : 'none';
});

// ---- Mobile Touch Controls (Canvas Drag / Virtual Joystick) ----
let activeTouchId = null;
let touchStartX = 0;
let touchStartY = 0;

// Listen on the 'window' instead of 'canvas' so the touch area covers the entire screen
window.addEventListener('touchstart', (e) => {
  if (!game || !game.running || game.paused) return;
  if (activeTouchId !== null) return;

  const touch = e.changedTouches[0];
  activeTouchId = touch.identifier;
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (!game || !game.running || game.paused || activeTouchId === null) return;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    if (touch.identifier === activeTouchId) {
      // 1. Calculate exactly how far the finger moved since the last frame
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      // 2. Instantly move the player by that exact pixel amount (1:1 mapping)
      game.player.x += deltaX;
      game.player.y += deltaY;

      // 3. Prevent the ship from being dragged off the screen
      game.player.x = Math.max(0, Math.min(canvas.width - game.player.w, game.player.x));
      game.player.y = Math.max(0, Math.min(canvas.height - game.player.h, game.player.y));

      // 4. Temporarily trigger the directional keys just so the ship still tilts visually!
      if (deltaX < -1.5) {
        game.keys.left = true; game.keys.right = false;
      } else if (deltaX > 1.5) {
        game.keys.left = false; game.keys.right = true;
      } else {
        game.keys.left = false; game.keys.right = false;
      }

      // 5. Reset the start position to the current finger position for the next frame
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      e.preventDefault();
      break;
    }
  }
}, { passive: false });

const handleTouchEnd = (e) => {
  if (activeTouchId === null) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === activeTouchId) {
      activeTouchId = null;
      if (game) {
        game.keys.left = false;
        game.keys.right = false;
        game.keys.up = false;
        game.keys.down = false;
      }
      break;
    }
  }
};

window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchcancel', handleTouchEnd);