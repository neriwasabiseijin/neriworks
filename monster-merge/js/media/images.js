"use strict";
// Image loading, code-drawn fallbacks and per-monster sprite caches (normal / blink / panic faces).

const monImg = [];
const img = {}; // stone, stone_cracked, bomb, rainbow, up_*
const pieceCache = []; // pieceCache[tier][face]
const faceImg = [];  // optional face variants: blink, panic

function canvas512(draw, size = 512) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  draw(c.getContext("2d"), size); return c;
}
function drawPlaceholder(t) {
  return canvas512((g) => {
    const col = COLORS[t], ol = "#1a1030";
    g.lineWidth = 14; g.strokeStyle = ol; g.lineJoin = "round";
    const cx = 256, cy = 280, r = 170;
    const blob = (x, y, rx, ry, fill, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); g.stroke(); };
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 60, cy - 130); g.lineTo(cx + s * 110, cy - 230); g.lineTo(cx + s * 140, cy - 110); g.closePath(); g.fillStyle = col; g.fill(); g.stroke(); }
    const grad = g.createRadialGradient(cx - 60, cy - 70, 20, cx, cy, r);
    grad.addColorStop(0, "#fff"); grad.addColorStop(0.25, col); grad.addColorStop(1, "#1a1030");
    blob(cx, cy, r, r, grad);
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(cx + s * 30, cy - 40); g.lineTo(cx + s * 95, cy - 20); g.lineTo(cx + s * 40, cy + 5); g.closePath(); g.fillStyle = "#fff"; g.fill(); g.stroke();
      g.beginPath(); g.arc(cx + s * 55, cy - 12, 10, 0, Math.PI * 2); g.fillStyle = ol; g.fill();
    }
    g.font = "900 70px sans-serif"; g.textAlign = "center"; g.fillStyle = "#fff"; g.fillText(String(t), cx, cy + 100);
    for (const s of [-1, 1]) blob(cx + s * 205, cy + 40, 36, 30, col, s * 0.4);
  });
}
function drawStonePlaceholder(cracked) {
  return canvas512((g) => {
    g.lineWidth = 14; g.strokeStyle = "#0c0818"; g.lineJoin = "round";
    g.beginPath();
    const pts = 11;
    for (let i = 0; i < pts; i++) { const a = i / pts * Math.PI * 2, rr = 200 + Math.sin(i * 2.7) * 22; g.lineTo(256 + Math.cos(a) * rr, 256 + Math.sin(a) * rr); }
    g.closePath();
    const grad = g.createRadialGradient(200, 190, 20, 256, 256, 230);
    grad.addColorStop(0, "#7a7090"); grad.addColorStop(1, "#2a2438");
    g.fillStyle = grad; g.fill(); g.stroke();
    g.strokeStyle = "#c58bff"; g.lineWidth = 10; g.shadowColor = "#b26bff"; g.shadowBlur = 24;
    g.beginPath(); g.moveTo(200, 200); g.lineTo(256, 160); g.lineTo(312, 200); g.moveTo(256, 160); g.lineTo(256, 330); g.moveTo(206, 300); g.lineTo(306, 300); g.stroke();
    if (cracked) {
      g.shadowBlur = 0; g.strokeStyle = "#0c0818"; g.lineWidth = 12;
      g.beginPath(); g.moveTo(90, 180); g.lineTo(180, 250); g.lineTo(150, 330); g.lineTo(240, 420);
      g.moveTo(420, 140); g.lineTo(340, 240); g.lineTo(400, 320); g.stroke();
    }
  });
}
function drawBomb() {
  return canvas512((g) => {
    g.lineWidth = 16; g.strokeStyle = "#0c0818";
    const grad = g.createRadialGradient(200, 230, 20, 256, 290, 190);
    grad.addColorStop(0, "#6a6a80"); grad.addColorStop(1, "#141420");
    g.beginPath(); g.arc(256, 290, 180, 0, Math.PI * 2); g.fillStyle = grad; g.fill(); g.stroke();
    g.fillStyle = "#3a3a4a"; g.fillRect(216, 90, 80, 50); g.strokeRect(216, 90, 80, 50);
    g.strokeStyle = "#c08a50"; g.lineWidth = 12; g.beginPath(); g.moveTo(256, 90); g.quadraticCurveTo(290, 30, 340, 40); g.stroke();
    g.fillStyle = "#ffd23f"; g.shadowColor = "#ff7a00"; g.shadowBlur = 30; g.beginPath(); g.arc(345, 40, 26, 0, Math.PI * 2); g.fill();
  });
}
function drawRainbow() {
  return canvas512((g) => {
    const grad = g.createLinearGradient(80, 80, 432, 432);
    ["#ff5a7a", "#ffb03a", "#ffe14d", "#5adf8a", "#4ab8ff", "#a86bff"].forEach((c, i) => grad.addColorStop(i / 5, c));
    g.lineWidth = 16; g.strokeStyle = "#1a1030";
    g.beginPath(); g.arc(256, 270, 190, 0, Math.PI * 2); g.fillStyle = grad; g.fill(); g.stroke();
    g.beginPath(); g.ellipse(190, 190, 60, 36, -0.6, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,.7)"; g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(256 + s * 60, 270, 22, 34, 0, 0, Math.PI * 2); g.fillStyle = "#1a1030"; g.fill(); g.beginPath(); g.arc(256 + s * 60 + 7, 256, 8, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); }
  });
}
function drawUpIcon(key) {
  const u = UPGRADES[key];
  return canvas512((g) => {
    g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2);
    const grad = g.createRadialGradient(100, 90, 10, 128, 128, 120);
    grad.addColorStop(0, "#fff"); grad.addColorStop(0.3, u.color); grad.addColorStop(1, "#1a1030");
    g.fillStyle = grad; g.fill(); g.lineWidth = 10; g.strokeStyle = "#0c0818"; g.stroke();
    g.font = "900 120px 'Hiragino Maru Gothic ProN','Meiryo',sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 14; g.strokeText(u.glyph, 128, 136); g.fillStyle = "#fff"; g.fillText(u.glyph, 128, 136);
  }, 256);
}
function loadImage(src) {
  return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}
// Loads every image in parallel; onProgress(done, total) after each one. Missing or failed images fall back to code drawings.
async function loadAssets(onProgress) {
  const keys = Object.keys(ASSETS).filter((k) => ASSETS[k]);
  let done = 0;
  const got = {};
  await Promise.all(keys.map(async (k) => {
    got[k] = await loadImage(ASSETS[k]);
    if (onProgress) onProgress(++done, keys.length);
  }));
  for (let t = 1; t <= 8; t++) {
    monImg[t] = got["m" + t] || drawPlaceholder(t);
    faceImg[t] = {};
    for (const f of ["blink", "panic"]) if (got[`m${t}_${f}`]) faceImg[t][f] = got[`m${t}_${f}`];
  }
  img.stone = got.stone || drawStonePlaceholder(false);
  img.stone_cracked = got.stone_cracked || drawStonePlaceholder(true);
  img.bomb = got.bomb || drawBomb();
  img.rainbow = got.rainbow || drawRainbow();
  for (const k of Object.keys(UPGRADES)) img["up_" + k] = got["up_" + k] || drawUpIcon(k);
}
function assetCount() { return Object.keys(ASSETS).filter((k) => ASSETS[k]).length; }
// Body circle of each monster image in 0..1 coords, so the physics circle lines up with the drawn body.
function bodyOf(t) { const r = RIGS["m" + t]; return r && ASSETS["m" + t] ? r.body : { cx: 0.5, cy: 280 / 512, r: 170 / 512 }; }
function imgSizeFor(t, radius) { return radius / bodyOf(t).r; }
function buildPieceCache() {
  if (!monImg[1]) return;
  for (let t = 1; t <= 8; t++) {
    const size = Math.ceil(imgSizeFor(t, RADII[t]) * 1.15 * scale * dpr);
    pieceCache[t] = {};
    for (const [face, src] of [["normal", monImg[t]], ["blink", faceImg[t].blink], ["panic", faceImg[t].panic]]) {
      if (!src) continue;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.drawImage(src, 0, 0, size, size);
      pieceCache[t][face] = c;
    }
  }
}
