
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let towers = [];
let enemies = [];
let bullets = [];

function drawBase() {
  ctx.fillStyle = '#cc0000';
  ctx.fillRect(720, 200, 50, 80);
  ctx.fillStyle = '#fff';
  ctx.fillText("鹿耳門", 725, 240);
}

function createEnemy() {
  enemies.push({ x: 0, y: 250, hp: 3 });
}

function updateEnemies() {
  enemies.forEach(e => e.x += 1);
}

function drawEnemies() {
  enemies.forEach(e => {
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBase();
  updateEnemies();
  drawEnemies();
  requestAnimationFrame(gameLoop);
}

setInterval(createEnemy, 2000);
gameLoop();
