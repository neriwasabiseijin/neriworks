"use strict";
// 夜空・星・町並み。動かない部分は一度だけ別のキャンバスに描いておく。

const skyCv = document.createElement("canvas");
const stars = [];

function buildSky() {
  const s = 2;
  skyCv.width = W * s; skyCv.height = H * s;
  const c = skyCv.getContext("2d");
  c.scale(s, s);
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#060818");
  g.addColorStop(0.55, "#101336");
  g.addColorStop(0.82, "#2a1a4a");
  g.addColorStop(1, "#3a1f45");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  const r = mulberry32(20261013); // 町並みは毎回同じでよい
  for (let i = 0; i < 90; i++) stars.push({ x: r() * W, y: r() * 470, s: r() * 1.3 + 0.3, ph: r() * 6.28 });

  // 遠くの山なみ
  c.fillStyle = "#1a1233";
  c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) c.lineTo(x, 585 - Math.sin(x * 0.013) * 18 - Math.sin(x * 0.041) * 7);
  c.lineTo(W, H); c.fill();

  // 町並み（灯りのついた窓）
  let x = -6;
  while (x < W) {
    const w = 16 + r() * 30, h = 26 + r() * 64, top = H - 108 - h + 40;
    c.fillStyle = "#0b0819";
    c.fillRect(x, top, w, H - top);
    if (r() < 0.25) { c.beginPath(); c.moveTo(x - 3, top); c.lineTo(x + w / 2, top - 12); c.lineTo(x + w + 3, top); c.fill(); }
    for (let wy = top + 6; wy < H - 74; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 7) {
      if (r() < 0.22) { c.fillStyle = `rgba(255,${190 + r() * 40 | 0},120,${0.35 + r() * 0.4})`; c.fillRect(wx, wy, 3, 4); }
    }
    x += w + r() * 4;
  }
  // 川岸（発射台の地面）
  c.fillStyle = "#07050f";
  c.fillRect(0, H - 52, W, 52);
  const rg = c.createLinearGradient(0, H - 52, 0, H);
  rg.addColorStop(0, "rgba(120,90,180,.18)"); rg.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = rg; c.fillRect(0, H - 52, W, 52);
}

function drawSky(c, t, glow) {
  c.drawImage(skyCv, 0, 0, W, H);
  // 演目が進むほど夜がふけて、空が深くなる
  const late = Math.min(0.4, Math.max(0, (G.stage || 1) - 1) * 0.045);
  // 地平線のあたりで切れ目が見えないよう、下へ向かってなだらかに薄める
  if (late > 0 && G.mode !== "title") {
    const g = c.createLinearGradient(0, 470, 0, 650);
    g.addColorStop(0, `rgba(2,2,10,${late})`);
    g.addColorStop(1, "rgba(2,2,10,0)");
    c.fillStyle = g; c.fillRect(0, 0, W, 650);
  }
  for (const s of stars) {
    const a = 0.35 + 0.35 * Math.sin(t * 1.7 + s.ph);
    c.fillStyle = `rgba(220,225,255,${a})`;
    c.fillRect(s.x, s.y, s.s, s.s);
  }
  // 開いた数だけ空が明るくなり、町が照らされる
  if (glow > 0.01) {
    c.save();
    c.globalCompositeOperation = "lighter";
    const g = c.createRadialGradient(W / 2, 330, 20, W / 2, 330, 460);
    g.addColorStop(0, `rgba(255,170,120,${0.22 * glow})`);
    g.addColorStop(1, "rgba(80,40,120,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
}
