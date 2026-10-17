"use strict";
// 弾・衛星・かけらの見た目（コードで描いて小さな画像に焼いておく）
//  ふつう弾：金平糖のような花形 / 重い弾：ごつごつの小石 / きらめき弾：星くず / とげ弾：赤いとげとげ

const pelletCache = new Map();
function bakePellet(kind, color, danger) {
  const S = 6, size = 16 * S, c = document.createElement("canvas"); c.width = c.height = size;
  const x = c.getContext("2d"); x.translate(size / 2, size / 2); x.scale(S, S);
  const glow = x.createRadialGradient(0, 0, 1, 0, 0, 8);
  glow.addColorStop(0, kind === "thorn" ? "rgba(255,107,138,.55)" : "rgba(255,255,255,.45)"); glow.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = glow; x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.fill();
  x.fillStyle = color; x.lineJoin = "round";
  if (danger) { x.strokeStyle = "rgba(255,255,255,.8)"; x.lineWidth = 1; }
  x.beginPath();
  if (kind === "thorn") {
    x.fillStyle = THORN_COLOR;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = i % 2 ? 2.6 : 6.5; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.fill(); x.strokeStyle = "#5a1030"; x.lineWidth = .8; x.stroke();
    x.fillStyle = "#fff"; x.beginPath(); x.arc(-1, -1, 1, 0, TAU); x.fill();
    return c;
  }
  if (kind === "heavy") {
    x.fillStyle = "#b9b2d6";
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = 6 + (i % 2) * 1.2; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.fill(); if (danger) x.stroke();
    x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.ellipse(-2, -2.4, 2.2, 1.2, -.5, 0, TAU); x.fill();
  } else if (kind === "spark") {
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? 2 : 6; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.fill(); if (danger) x.stroke();
  } else {
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; x.moveTo(Math.cos(a) * 2.2 + 2.4, Math.sin(a) * 2.2); x.arc(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 2.4, 0, TAU); }
    x.fill();
    if (danger) { x.beginPath(); x.arc(0, 0, 5, 0, TAU); x.stroke(); }
    x.fillStyle = "rgba(255,255,255,.7)"; x.beginPath(); x.arc(-1.2, -1.4, 1.1, 0, TAU); x.fill();
  }
  return c;
}
function drawPellet(x, y, kind, color, scale = 1, danger = false, rot = 0) {
  const key = kind + color + danger;
  let im = pelletCache.get(key);
  if (!im) { im = bakePellet(kind, color, danger); pelletCache.set(key, im); }
  const s = 16 * scale;
  if (rot) { g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(im, -s / 2, -s / 2, s, s); g.restore(); }
  else g.drawImage(im, x - s / 2, y - s / 2, s, s);
}
// かけら：ミント色のひし形。ゆっくり回りながら光る（敵の弾とひと目で区別できるように）
function drawGem(d) {
  g.save(); g.translate(d.x, d.y); g.rotate(d.rot); g.globalAlpha = Math.min(1, d.life / 2);
  g.fillStyle = "rgba(143,240,210,.25)"; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill();
  g.fillStyle = "#8ff0d2"; g.beginPath(); g.moveTo(0, -5); g.lineTo(3.5, 0); g.lineTo(0, 5); g.lineTo(-3.5, 0); g.closePath(); g.fill();
  g.fillStyle = "#ffffff"; g.fillRect(-1, -1, 2, 2);
  g.restore();
}
