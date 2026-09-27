const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
const scoreEl = document.querySelector("#scoreEl");
const startgameBtn = document.querySelector("#startgameBtn");
const modalEl = document.querySelector("#modalEl");
const bigScoreEl = document.querySelector("#bigScoreEl");

let x;
let y;
function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  x = canvas.width / 2;
  y = canvas.height / 2;
  if (typeof player !== "undefined") { player.x = x; player.y = y; }
}
resize();
addEventListener("resize", resize);

// Piccola animazione del raggio (sostituisce gsap.to)
function shrink(target, to) {
  const from = target.radius, start = performance.now(), dur = 300;
  (function step(now) {
    const t = Math.min(1, (now - start) / dur);
    target.radius = from + (to - from) * (1 - Math.pow(1 - t, 3));
    if (t < 1) requestAnimationFrame(step);
  })(start);
}

class Player {
  constructor(x, y, radius, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
  }
  draw() {
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
  }
}

class Projectile {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
  }
  draw() {
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
  }
  update() {
    this.draw();
    this.x = this.x + this.velocity.x;
    this.y = this.y + this.velocity.y;
  }
}

class Enemy {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
  }
  draw() {
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
  }

  update() {
    this.draw();
    this.x = this.x + this.velocity.x;
    this.y = this.y + this.velocity.y;
  }
}

class Special {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
  }
  draw() {
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
  }

  update() {
    this.draw();
    this.x = this.x + this.velocity.x;
    this.y = this.y + this.velocity.y;
  }
}

const friction = 0.99;
class Particle {
  constructor(x, y, radius, color, velocity) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
    this.alpha = 1;
  }
  draw() {
    c.save();
    c.globalAlpha = this.alpha;
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    c.fillStyle = this.color;
    c.fill();
    c.restore();
  }

  update() {
    this.draw();
    this.velocity.x *= friction;
    this.velocity.y *= friction;
    this.x = this.x + this.velocity.x;
    this.y = this.y + this.velocity.y;
    this.alpha -= 0.01;
  }
}

function new_circle() {
  // Bomba: un anello rosso si espande dal giocatore e distrugge tutti i nemici sullo schermo
  enemies.forEach((enemy) => {
    for (let i = 0; i < enemy.radius * 2; i++) {
      particles.push(new Particle(enemy.x, enemy.y, Math.random() * 2, enemy.color, {
        x: (Math.random() - 0.5) * (Math.random() * 6),
        y: (Math.random() - 0.5) * (Math.random() * 6)
      }));
    }
    score += 10;
  });
  enemies = [];
  scoreEl.textContent = score;
  let startTime = 0;
  const animationTime = 5;
  const fn = function (time) {
    if (!startTime) startTime = time;
    const t = Math.min(animationTime, (time - startTime) / 100);
    const r = ((Math.max(canvas.width, canvas.height) / 2) * t) / animationTime;
    c.save();
    c.strokeStyle = "red";
    c.lineWidth = 5;
    c.globalAlpha = 1 - t / animationTime;
    c.beginPath();
    c.arc(x, y, r, 0, 2 * Math.PI);
    c.stroke();
    c.restore();
    if (t < animationTime) requestAnimationFrame(fn);
  };
  requestAnimationFrame(fn);
}

var player = new Player(x, y, 10, "white");
let projectiles = [];
let enemies = [];
let specials = [];
let particles = [];

function init() {
  player = new Player(x, y, 10, "white");
  projectiles = [];
  enemies = [];
  specials = [];
  particles = [];
  score = 0;
  scoreEl.textContent = score;
  bigScoreEl.textContent = score;
}

let timers = [];
function stopSpawning() {
  timers.forEach(clearInterval);
  timers = [];
}

function spawEnemies() {
  timers.push(setInterval(() => {
    const radius = Math.random() * (30 - 4) + 4;

    let x;
    let y;

    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
      y = Math.random() * canvas.height;
    } else {
      x = Math.random() * canvas.width;
      y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
    }
    const color = "red";
    const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);
    const velocity = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };

    enemies.push(new Enemy(x, y, radius, color, velocity));
  }, 1000));
}

function spawSpecials() {
  timers.push(setInterval(() => {
    const radius = Math.random() * (30 - 4) + 4;

    let x;
    let y;

    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
      y = Math.random() * canvas.height;
    } else {
      x = Math.random() * canvas.width;
      y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
    }
    var color = "rgba(255,255,0, 0.6)";
    const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);
    const velocity = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };

    specials.push(new Special(x, y, radius, color, velocity));
  }, 30000));
}

let animationId;
let score = 0;

function animate() {
  animationId = requestAnimationFrame(animate);

  c.fillStyle = "rgba(0, 0, 0, 0.1)";
  c.fillRect(0, 0, canvas.width, canvas.height);
  player.draw();
  particles.forEach((particle, index) => {
    if (particle.alpha <= 0) {
      particles.splice(index, 1);
    } else {
      particle.update();
    }
  });
  projectiles.forEach((projectile, index) => {
    projectile.update();

    if (
      projectile.x + projectile.radius < 0 ||
      projectile.x - projectile.radius > canvas.width ||
      projectile.y + projectile.radius < 0 ||
      projectile.y - projectile.radius > canvas.height
    ) {
      setTimeout(() => {
        projectiles.splice(index, 1);
      }, 0);
    }
  });

  enemies.forEach((enemy, index) => {
    enemy.update();

    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);

    if (dist - enemy.radius - player.radius < 1) {
      cancelAnimationFrame(animationId);
      stopSpawning();
      modalEl.style.display = "flex";
      bigScoreEl.textContent = score;
    }

    projectiles.forEach((projectile, projectileIndex) => {
      const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

      if (dist - enemy.radius - projectile.radius < 1) {
        for (let i = 0; i < enemy.radius * 2; i++) {
          particles.push(
            new Particle(
              projectile.x,
              projectile.y,
              Math.random() * 2,
              enemy.color,
              {
                x: (Math.random() - 0.5) * (Math.random() * 6),
                y: (Math.random() - 0.5) * (Math.random() * 6)
              }
            )
          );
        }
        if (enemy.radius - 10 > 5) {
          score += 10;
          scoreEl.textContent = score;

          shrink(enemy, enemy.radius - 10);
          setTimeout(() => {
            projectiles.splice(projectileIndex, 1);
          }, 0);
        } else {
          score += 25;
          scoreEl.textContent = score;
          setTimeout(() => {
            enemies.splice(index, 1);
            projectiles.splice(projectileIndex, 1);
          }, 0);
        }
      }
    });
  });
  specials.forEach((special, index) => {
    special.update();

    const dist = Math.hypot(player.x - special.x, player.y - special.y);

    if (dist - special.radius - player.radius < 1) {
      setTimeout(() => {
        specials.splice(index, 1);
      }, 0);
      new_circle();
    }

    projectiles.forEach((projectile, projectileIndex) => {
      const dist = Math.hypot(
        projectile.x - special.x,
        projectile.y - special.y
      );

      if (dist - special.radius - projectile.radius < 1) {
        for (let i = 0; i < special.radius * 2; i++) {
          particles.push(
            new Particle(
              projectile.x,
              projectile.y,
              Math.random() * 2,
              special.color,
              {
                x: (Math.random() - 0.5) * (Math.random() * 6),
                y: (Math.random() - 0.5) * (Math.random() * 6)
              }
            )
          );
        }
        if (special.radius - 10 > 5) {
          score += 10;
          scoreEl.textContent = score;

          shrink(special, special.radius - 10);
          setTimeout(() => {
            projectiles.splice(projectileIndex, 1);
          }, 0);
        } else {
          score += 25;
          scoreEl.textContent = score;
          setTimeout(() => {
            specials.splice(index, 1);
            projectiles.splice(projectileIndex, 1);
          }, 0);
        }
      }
    });
  });
}

addEventListener("pointerdown", (event) => {
  if (modalEl.style.display !== "none") return;
  const angle = Math.atan2(
    event.clientY - canvas.height / 2,
    event.clientX - canvas.width / 2
  );
  const velocity = {
    x: Math.cos(angle) * 5,
    y: Math.sin(angle) * 5
  };
  projectiles.push(
    new Projectile(x, y, 5, "white", velocity)
  );
});

startgameBtn.addEventListener("click", () => {
  stopSpawning();
  init();
  animate();
  spawEnemies();
  spawSpecials();
  modalEl.style.display = "none";
});