"use strict";
// Evolution cut-in: mesh-warped illustration with wobbling head and hands.

function cutDuration(t) { return t >= 8 ? 2.4 : t >= 6 ? 1.8 : 1.4; }
function startCutin(t) { cutin = { tier: t, time: 0, dur: cutDuration(t) }; sfx.cutin(t); music.duck(true); setTimeout(() => !cutin && state === "play" && music.duck(false), cutDuration(t) * 1000 + 50); }
function defaultRig() {
  return { neck: 0.5, hands: [{ x: 0.1, y: 0.62, px: 0.25, py: 0.58, r: 0.12 }, { x: 0.9, y: 0.62, px: 0.75, py: 0.58, r: 0.12 }] };
}
function rigOf(t) { return (ASSETS["m" + t] && RIGS["m" + t]) || defaultRig(); }

// Warp one still image with a mesh: head tilts around the neck, hands swing around shoulders, body breathes.
const MESH = 14;
function warpPoint(u, v, rig, k) {
  let x = u, y = v;
  const br = 1 + 0.025 * Math.sin(k.time * 7);
  y = 1 - (1 - y) * br; x = 0.5 + (x - 0.5) / Math.sqrt(br);
  if (v < rig.neck) {
    const w = Math.min(1, (rig.neck - v) / (rig.neck * 0.55));
    const s = w * w * (3 - 2 * w);
    const a = k.head * s;
    const px = 0.5, py = rig.neck;
    const dx = x - px, dy = y - py;
    x = px + dx * Math.cos(a) - dy * Math.sin(a);
    y = py + dx * Math.sin(a) + dy * Math.cos(a) - k.bob * s;
  }
  rig.hands.forEach((h, i) => {
    const d2 = ((u - h.x) ** 2 + (v - h.y) ** 2) / (h.r * h.r);
    const w = Math.exp(-d2 * 1.4);
    if (w < 0.01) return;
    const a = (i === 0 ? -1 : 1) * k.hand[i] * w;
    const dx = x - h.px, dy = y - h.py;
    x = h.px + dx * Math.cos(a) - dy * Math.sin(a);
    y = h.py + dx * Math.sin(a) + dy * Math.cos(a);
  });
  return [x, y];
}
function drawTexTri(im, iw, ih, p0, p1, p2, t0, t1, t2) {
  // Affine map from texture triangle to screen triangle, clipped to a slightly enlarged triangle to hide seams.
  const cx = (p0[0] + p1[0] + p2[0]) / 3, cy = (p0[1] + p1[1] + p2[1]) / 3;
  const grow = (p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * 0.7, p[1] + dy / l * 0.7]; };
  const q0 = grow(p0), q1 = grow(p1), q2 = grow(p2);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.lineTo(q2[0], q2[1]); ctx.closePath(); ctx.clip();
  const u0 = t0[0] * iw, v0 = t0[1] * ih, u1 = t1[0] * iw, v1 = t1[1] * ih, u2 = t2[0] * iw, v2 = t2[1] * ih;
  const den = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
  if (Math.abs(den) < 1e-6) { ctx.restore(); return; }
  const a = ((p1[0] - p0[0]) * (v2 - v0) - (p2[0] - p0[0]) * (v1 - v0)) / den;
  const b = ((p1[1] - p0[1]) * (v2 - v0) - (p2[1] - p0[1]) * (v1 - v0)) / den;
  const c = ((p2[0] - p0[0]) * (u1 - u0) - (p1[0] - p0[0]) * (u2 - u0)) / den;
  const d = ((p2[1] - p0[1]) * (u1 - u0) - (p1[1] - p0[1]) * (u2 - u0)) / den;
  ctx.transform(a, b, c, d, p0[0] - a * u0 - c * v0, p0[1] - b * u0 - d * v0);
  ctx.drawImage(im, 0, 0);
  ctx.restore();
}
function drawWarped(im, cx, cy, size, rig, k) {
  const iw = im.width, ih = im.height;
  const pts = [];
  for (let j = 0; j <= MESH; j++) for (let i = 0; i <= MESH; i++) {
    const u = i / MESH, v = j / MESH;
    const [x, y] = warpPoint(u, v, rig, k);
    pts.push([[cx + (x - 0.5) * size, cy + (y - 0.5) * size], [u, v]]);
  }
  const at = (i, j) => pts[j * (MESH + 1) + i];
  for (let j = 0; j < MESH; j++) for (let i = 0; i < MESH; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    drawTexTri(im, iw, ih, a[0], b[0], c[0], a[1], b[1], c[1]);
    drawTexTri(im, iw, ih, b[0], d[0], c[0], b[1], d[1], c[1]);
  }
}
function easeOutBack(x) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function drawCutin() {
  const c = cutin, t = c.tier;
  const inP = Math.min(1, c.time / 0.25), outP = Math.max(0, (c.time - (c.dur - 0.25)) / 0.25);
  ctx.save();
  ctx.fillStyle = `rgba(8,4,20,${0.6 * (1 - outP)})`;
  ctx.fillRect(0, 0, W, H);
  const slide = (1 - inP) * -W * 1.4 + outP * W * 1.4;
  ctx.translate(slide, 0);
  const bandY = 300, bandH = 230, mx = W / 2 + 24, my = bandY - 10;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-40, bandY - bandH / 2 + 40); ctx.lineTo(W + 40, bandY - bandH / 2 - 40);
  ctx.lineTo(W + 40, bandY + bandH / 2 - 40); ctx.lineTo(-40, bandY + bandH / 2 + 40); ctx.closePath();
  ctx.fillStyle = "#1a1130"; ctx.fill();
  ctx.clip();
  const glow = ctx.createRadialGradient(mx, my, 10, mx, my, 190);
  glow.addColorStop(0, COLORS[t]); glow.addColorStop(1, "rgba(26,17,48,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, bandY - 220, W, 440);
  ctx.strokeStyle = COLORS[t]; ctx.globalAlpha = 0.7; ctx.lineWidth = 3;
  for (let i = 0; i < 18; i++) {
    const yy = bandY - bandH / 2 - 40 + ((i * 37) % (bandH + 80));
    const xx = ((i * 97 + c.time * 900) % (W + 200)) - 100;
    ctx.beginPath(); ctx.moveTo(W - xx, yy - (W - xx) * 0.22 + 40); ctx.lineTo(W - xx - 70, yy - (W - xx - 70) * 0.22 + 40); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = COLORS[t];
  ctx.beginPath(); ctx.moveTo(-40, bandY - bandH / 2 + 40); ctx.lineTo(W + 40, bandY - bandH / 2 - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-40, bandY + bandH / 2 + 40); ctx.lineTo(W + 40, bandY + bandH / 2 - 40); ctx.stroke();
  const appear = Math.min(1, c.time / 0.45);
  const size = Math.min(360, (t >= 8 ? 200 : 180) / (2 * bodyOf(t).r)) * (0.4 + 0.6 * easeOutBack(appear));
  const tm = c.time;
  const k = {
    time: tm,
    head: Math.sin(tm * 6.5) * 0.11 + Math.sin(tm * 2.1) * 0.04,
    bob: Math.max(0, Math.sin(tm * 6.5 + 1)) * 0.02,
    hand: [0.35 + Math.sin(tm * 9) * 0.35, 0.35 + Math.sin(tm * 9 + 1.6) * 0.35],
  };
  drawWarped(monImg[t], mx, my, size, rigOf(t), k);
  ctx.textAlign = "center"; ctx.lineJoin = "round";
  ctx.globalAlpha = Math.min(1, Math.max(0, (c.time - 0.15) / 0.3));
  ctx.font = `28px ${POP}`;
  ctx.lineWidth = 8; ctx.strokeStyle = "#120a22"; ctx.fillStyle = "#fff";
  const head = t >= 8 ? "さいしゅう進化！" : "しんか！";
  ctx.save(); ctx.translate(t >= 8 ? 140 : 96, bandY - 110); ctx.rotate(-0.22);
  ctx.strokeText(head, 0, 0); ctx.fillText(head, 0, 0);
  ctx.restore();
  ctx.font = `24px ${POP}`;
  ctx.save(); ctx.translate(W / 2 - 20, bandY + 140); ctx.rotate(-0.22);
  ctx.strokeText(NAMES[t], 0, 0); ctx.fillStyle = COLORS[t]; ctx.fillText(NAMES[t], 0, 0);
  ctx.restore();
  ctx.restore();
  if (t >= 8) {
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2 + tm * 1.5, rr = 150 + Math.sin(tm * 5 + i) * 12;
      star(mx + Math.cos(a) * rr, my + Math.sin(a) * rr * 0.8, 6 + 3 * Math.sin(tm * 8 + i), "#fff6a0", 1 - outP);
    }
  }
}
function star(x, y, r, color, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.35 : r; const a = i * Math.PI / 4; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
