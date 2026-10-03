(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var c = canvas.getContext('2d');
  var $ = function (id) { return document.getElementById(id); };
  var scoreEl = $('scoreEl'), bestEl = $('bestEl'), modalEl = $('modalEl'), pauseEl = $('pauseEl');
  var bigScoreEl = $('bigScoreEl'), bigBestEl = $('bigBestEl'), titleEl = $('titleEl'), helpEl = $('helpEl');
  var scoreBlock = $('scoreBlock'), startBtn = $('startgameBtn'), pauseBtn = $('pauseBtn'), muteBtn = $('muteBtn');

  // ---------- storage (prefixed keys; the original game saved nothing) ----------
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { /* ignore */ } }
  var best = parseInt(load('shooting-ball:best'), 10) || 0;
  var muted = load('shooting-ball:muted') === '1';
  bestEl.textContent = best;

  // ---------- size / scale ----------
  // The original was tuned for a ~1280x720 window at 60 fps: S scales sizes and speeds
  // so the game feels the same on a phone and on a big monitor.
  var W = 0, H = 0, dpr = 1, S = 1, cx = 0, cy = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    S = Math.max(0.6, Math.min(1.5, Math.min(W, H) / 720));
    cx = W / 2; cy = H / 2;
    if (player) { player.x = cx; player.y = cy; player.radius = 10 * S; }
    // keep everything heading for the (new) center
    enemies.concat(specials).forEach(function (e) {
      var a = Math.atan2(cy - e.y, cx - e.x);
      e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed;
    });
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
  }

  // ---------- audio (after the first gesture only) ----------
  var actx = null;
  function sound(freq, to, dur, type, vol) {
    if (muted) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(vol || 0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* no audio */ }
  }
  function setMuted(m) {
    muted = m;
    muteBtn.classList.toggle('muted', m);
    muteBtn.setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound');
    save('shooting-ball:muted', m ? '1' : '0');
  }
  setMuted(muted);

  // ---------- entities ----------
  var player = null, projectiles = [], enemies = [], specials = [], particles = [], waves = [];
  var score = 0, state = 'menu';   // menu | play | paused | dying | over
  var enemyTimer = 0, specialTimer = 0, dyingTimer = 0;

  function circle(x, y, r, color, alpha) {
    if (r <= 0) return;
    if (alpha !== undefined) c.globalAlpha = Math.max(0, alpha);
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
    c.globalAlpha = 1;
  }

  function burst(x, y, n, color, power) {
    for (var i = 0; i < n; i++) {
      particles.push({
        x: x, y: y, r: Math.random() * 2 * S + 0.3,
        vx: (Math.random() - 0.5) * Math.random() * 6 * (power || 1) * 60 * S,
        vy: (Math.random() - 0.5) * Math.random() * 6 * (power || 1) * 60 * S,
        color: color, alpha: 1
      });
    }
  }

  function spawnFromEdge(list, color) {
    var radius = (Math.random() * (30 - 4) + 4) * S;
    var x, y;
    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? -radius : W + radius;
      y = Math.random() * H;
    } else {
      x = Math.random() * W;
      y = Math.random() < 0.5 ? -radius : H + radius;
    }
    var speed = 60 * S;                       // 1 px per frame at 60 fps in the original
    var a = Math.atan2(cy - y, cx - x);
    list.push({ x: x, y: y, radius: radius, target: radius, color: color, speed: speed, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
  }

  function addScore(n) {
    score += n;
    scoreEl.textContent = score;
  }

  // a yellow ball touched the player: red shockwave clears the screen
  function shockwave() {
    enemies.forEach(function (e) {
      burst(e.x, e.y, Math.round(e.radius * 2), e.color);
      addScore(10);
    });
    enemies = [];
    waves.push({ t: 0 });
    sound(180, 40, 0.6, 'sawtooth', 0.07);
  }

  // hit test for one list of targets; returns nothing, mutates lists
  function hitTargets(list) {
    for (var i = list.length - 1; i >= 0; i--) {
      var e = list[i];
      for (var j = projectiles.length - 1; j >= 0; j--) {
        var p = projectiles[j];
        if (Math.hypot(p.x - e.x, p.y - e.y) - e.radius - p.radius < 1) {
          burst(p.x, p.y, Math.round(e.radius * 2 / S), e.color);
          projectiles.splice(j, 1);
          if (e.target - 10 * S > 5 * S) {
            e.target -= 10 * S;              // big ball shrinks
            addScore(10);
            sound(520, 300, 0.08, 'triangle', 0.05);
          } else {
            list.splice(i, 1);               // destroyed
            addScore(25);
            sound(300, 60, 0.18, 'square', 0.05);
          }
          break;
        }
      }
    }
  }

  // ---------- game flow ----------
  function init() {
    player = { x: cx, y: cy, radius: 10 * S };
    projectiles = []; enemies = []; specials = []; particles = []; waves = [];
    score = 0;
    enemyTimer = 0; specialTimer = 0;
    scoreEl.textContent = '0';
  }

  function start() {
    init();
    state = 'play';
    modalEl.hidden = true;
    pauseEl.hidden = true;
    pauseBtn.hidden = false;
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
  }

  function gameOver() {
    state = 'dying';
    dyingTimer = 0.9;
    burst(player.x, player.y, 60, '#ffffff', 1.4);
    sound(400, 50, 0.7, 'sawtooth', 0.08);
    pauseBtn.hidden = true;
  }

  function showGameOver() {
    state = 'over';
    var isBest = score > best;
    if (isBest) { best = score; save('shooting-ball:best', best); bestEl.textContent = best; }
    titleEl.textContent = 'Game Over';
    bigScoreEl.textContent = score;
    bigBestEl.textContent = isBest && score > 0 ? 'New best score!' : 'Best: ' + best;
    scoreBlock.hidden = false;
    helpEl.hidden = true;
    startBtn.textContent = 'Play again';
    modalEl.hidden = false;
    startBtn.focus({ preventScroll: true });
  }

  function pause() {
    if (state !== 'play') return;
    state = 'paused';
    pauseEl.hidden = false;
  }
  function resume() {
    if (state !== 'paused') return;
    state = 'play';
    pauseEl.hidden = true;
    last = performance.now();
  }

  // ---------- input ----------
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (state !== 'play') return;
    var rect = canvas.getBoundingClientRect();
    var px = e.clientX - rect.left, py = e.clientY - rect.top;
    var a = Math.atan2(py - cy, px - cx);
    var sp = 300 * Math.max(S, 0.8);          // 5 px per frame in the original
    projectiles.push({ x: cx, y: cy, radius: 5 * Math.max(S, 0.8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
    sound(880, 440, 0.06, 'square', 0.025);
  });
  startBtn.addEventListener('click', start);
  $('resumeBtn').addEventListener('click', resume);
  pauseBtn.addEventListener('click', pause);
  muteBtn.addEventListener('click', function () { setMuted(!muted); });
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'p' || k === 'P' || k === 'Escape') { if (state === 'play') pause(); else if (state === 'paused') resume(); }
    else if (k === 'm' || k === 'M') setMuted(!muted);
    else if ((k === 'Enter' || k === ' ') && (state === 'menu' || state === 'over') && document.activeElement !== startBtn) { e.preventDefault(); start(); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---------- loop ----------
  var last = performance.now();
  function update(dt) {
    var f = dt * 60;   // frames elapsed at 60 fps

    if (state === 'play') {
      enemyTimer += dt;
      specialTimer += dt;
      while (enemyTimer >= 1) { enemyTimer -= 1; spawnFromEdge(enemies, 'red'); }
      if (specialTimer >= 30) { specialTimer -= 30; spawnFromEdge(specials, 'rgba(255,255,0,0.6)'); }
    }

    // movement
    var i, e;
    for (i = projectiles.length - 1; i >= 0; i--) {
      var p = projectiles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x + p.radius < 0 || p.x - p.radius > W || p.y + p.radius < 0 || p.y - p.radius > H) projectiles.splice(i, 1);
    }
    var movers = enemies.concat(specials);
    for (i = 0; i < movers.length; i++) {
      e = movers[i];
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.radius !== e.target) {             // smooth shrink (replaces gsap)
        e.radius += (e.target - e.radius) * Math.min(1, dt * 12);
        if (Math.abs(e.radius - e.target) < 0.2) e.radius = e.target;
      }
    }
    var fr = Math.pow(0.99, f);
    for (i = particles.length - 1; i >= 0; i--) {
      var q = particles[i];
      q.vx *= fr; q.vy *= fr;
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.alpha -= 0.01 * f;
      if (q.alpha <= 0) particles.splice(i, 1);
    }
    for (i = waves.length - 1; i >= 0; i--) { waves[i].t += dt; if (waves[i].t > 0.5) waves.splice(i, 1); }

    if (state !== 'play') return;

    hitTargets(enemies);
    hitTargets(specials);

    for (i = specials.length - 1; i >= 0; i--) {
      e = specials[i];
      if (Math.hypot(player.x - e.x, player.y - e.y) - e.radius - player.radius < 1) {
        specials.splice(i, 1);
        shockwave();
      }
    }
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (Math.hypot(player.x - e.x, player.y - e.y) - e.radius - player.radius < 1) { gameOver(); break; }
    }
  }

  function render(dt) {
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // motion trails: same 10% fade per frame as the original, frame-rate independent
    c.fillStyle = 'rgba(0,0,0,' + (1 - Math.pow(0.9, dt * 60)).toFixed(3) + ')';
    c.fillRect(0, 0, W, H);
    if (state !== 'dying' && state !== 'over' && player) circle(player.x, player.y, player.radius, 'white');
    particles.forEach(function (q) { circle(q.x, q.y, q.r, q.color, q.alpha); });
    projectiles.forEach(function (p) { circle(p.x, p.y, p.radius, 'white'); });
    enemies.forEach(function (e) { circle(e.x, e.y, e.radius, e.color); });
    specials.forEach(function (e) { circle(e.x, e.y, e.radius, e.color); });
    waves.forEach(function (w) {
      var t = w.t / 0.5;
      c.save();
      c.strokeStyle = 'red';
      c.lineWidth = 5 * S;
      c.globalAlpha = 1 - t;
      c.beginPath();
      c.arc(cx, cy, Math.max(W, H) / 2 * t, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    });
  }

  function loop(now) {
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (state !== 'paused') {
      update(dt);
      if (state === 'dying') { dyingTimer -= dt; if (dyingTimer <= 0) showGameOver(); }
      render(dt);
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  resize();
  init();
  requestAnimationFrame(loop);

  // hook for automated tests
  window.__sb = { state: function () { return { state: state, score: score, enemies: enemies.map(function (e) { return [e.x, e.y, e.radius]; }), specials: specials.length, yel: specials.length ? [specials[0].x, specials[0].y] : null, waves: waves.length, cx: cx, cy: cy }; } };
})();
