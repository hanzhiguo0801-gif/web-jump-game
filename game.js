const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const overlay = document.getElementById("overlay");
const finalScoreEl = document.getElementById("finalScore");
const restartButton = document.getElementById("restartButton");
const powerBar = document.getElementById("powerBar");

const W = canvas.width;
const H = canvas.height;
const groundY = 420;
const playerSize = 42;
const maxCharge = 1300;
const jumpDuration = 680;
const bestKey = "jumpGameBestScore";

let score = 0;
let bestScore = Number(localStorage.getItem(bestKey) || 0);
let platforms = [];
let player = {};
let charging = false;
let chargeStart = 0;
let chargePower = 0;
let jumping = false;
let jumpStart = 0;
let jumpFrom = null;
let jumpTo = null;
let gameOver = false;
let lastTime = 0;
let cameraX = 0;
let nextPlatformIndex = 1;

bestScoreEl.textContent = bestScore;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function makePlatform(x, width = rand(82, 132)) {
  return {
    x,
    y: groundY,
    w: width,
    h: 38,
    hue: rand(158, 205),
  };
}

function resetGame() {
  score = 0;
  cameraX = 0;
  nextPlatformIndex = 1;
  gameOver = false;
  charging = false;
  chargePower = 0;
  jumping = false;
  platforms = [makePlatform(210, 120), makePlatform(430, 110)];
  player = {
    x: platforms[0].x + platforms[0].w / 2,
    y: groundY - playerSize,
    rotation: 0,
    squish: 1,
  };
  scoreEl.textContent = score;
  powerBar.style.width = "0%";
  overlay.classList.add("hidden");
}

function startCharge() {
  if (gameOver || jumping || charging) return;
  charging = true;
  chargeStart = performance.now();
}

function releaseCharge() {
  if (!charging || gameOver || jumping) return;
  charging = false;
  const power = Math.min((performance.now() - chargeStart) / maxCharge, 1);
  chargePower = 0;
  powerBar.style.width = "0%";

  const distance = 88 + power * 330;
  jumpFrom = { x: player.x, y: player.y };
  jumpTo = { x: player.x + distance, y: groundY - playerSize };
  jumpStart = performance.now();
  jumping = true;
}

function finishJump() {
  jumping = false;
  player.x = jumpTo.x;
  player.y = jumpTo.y;
  player.rotation = 0;

  const target = platforms[nextPlatformIndex];
  const footX = player.x;
  const landed = target && footX >= target.x && footX <= target.x + target.w;

  if (!landed) {
    endGame();
    return;
  }

  score += 1;
  scoreEl.textContent = score;
  nextPlatformIndex += 1;
  addNextPlatform();
}

function addNextPlatform() {
  const last = platforms[platforms.length - 1];
  const gap = rand(165, 320);
  platforms.push(makePlatform(last.x + gap));
}

function endGame() {
  gameOver = true;
  bestScore = Math.max(bestScore, score);
  localStorage.setItem(bestKey, String(bestScore));
  bestScoreEl.textContent = bestScore;
  finalScoreEl.textContent = `${score} 分`;
  overlay.classList.remove("hidden");
}

function update(now) {
  if (charging) {
    chargePower = Math.min((now - chargeStart) / maxCharge, 1);
    powerBar.style.width = `${Math.round(chargePower * 100)}%`;
    player.squish = 1 - chargePower * 0.22;
  } else {
    player.squish += (1 - player.squish) * 0.18;
  }

  if (jumping) {
    const t = Math.min((now - jumpStart) / jumpDuration, 1);
    const ease = 1 - Math.pow(1 - t, 2);
    const arc = Math.sin(t * Math.PI) * 155;
    player.x = jumpFrom.x + (jumpTo.x - jumpFrom.x) * ease;
    player.y = jumpFrom.y - arc;
    player.rotation = t * Math.PI * 2;

    if (t >= 1) finishJump();
  }

  const desiredCamera = Math.max(0, player.x - W * 0.34);
  cameraX += (desiredCamera - cameraX) * 0.08;
  lastTime = now;
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCloud(x, y, s) {
  ctx.save();
  ctx.translate(x - cameraX * 0.18, y);
  ctx.fillStyle = "rgba(255,255,255,0.66)";
  ctx.beginPath();
  ctx.arc(0, 18, 22 * s, Math.PI, 0);
  ctx.arc(27 * s, 13, 28 * s, Math.PI, 0);
  ctx.arc(61 * s, 20, 20 * s, Math.PI, 0);
  ctx.lineTo(82 * s, 36 * s);
  ctx.lineTo(-22 * s, 36 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlatform(p) {
  const x = p.x - cameraX;
  ctx.save();
  ctx.shadowColor = "rgba(52, 112, 130, 0.22)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 12;
  roundedRect(x, p.y, p.w, p.h, 18);
  ctx.fillStyle = `hsl(${p.hue}, 66%, 64%)`;
  ctx.fill();
  ctx.shadowColor = "transparent";
  roundedRect(x + 8, p.y + 7, p.w - 16, 9, 8);
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x - cameraX, player.y + playerSize);
  ctx.rotate(player.rotation);
  ctx.scale(1, player.squish);
  ctx.translate(-playerSize / 2, -playerSize);

  ctx.shadowColor = "rgba(83, 84, 118, 0.24)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;
  roundedRect(0, 0, playerSize, playerSize, 12);
  ctx.fillStyle = "#ffcf5d";
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.fillStyle = "#314a67";
  ctx.beginPath();
  ctx.arc(14, 17, 3.4, 0, Math.PI * 2);
  ctx.arc(28, 17, 3.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#314a67";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(21, 24, 7, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#b9ecff");
  sky.addColorStop(1, "#fff3ce");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  drawCloud(120, 80, 1.05);
  drawCloud(520, 60, 0.82);
  drawCloud(860, 116, 1.18);

  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.beginPath();
  ctx.ellipse(W / 2, H + 30, W * 0.78, 126, 0, 0, Math.PI * 2);
  ctx.fill();

  platforms.forEach(drawPlatform);
  drawPlayer();

  if (!jumping && !gameOver) {
    const target = platforms[nextPlatformIndex];
    if (target) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 125, 81, 0.32)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.moveTo(player.x - cameraX, groundY - 4);
      ctx.lineTo(target.x + target.w / 2 - cameraX, groundY - 4);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function loop(now) {
  update(now);
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  startCharge();
});

window.addEventListener("pointerup", releaseCharge);

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat) return;
  event.preventDefault();
  startCharge();
});

window.addEventListener("keyup", (event) => {
  if (event.code !== "Space") return;
  event.preventDefault();
  releaseCharge();
});

restartButton.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame((now) => {
  lastTime = now;
  requestAnimationFrame(loop);
});
