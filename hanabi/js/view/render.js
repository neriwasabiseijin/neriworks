"use strict";
// 1フレームの描画

const FONT_HUD = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Meiryo", sans-serif';
const FONT_BIG = '"Yuji Syuku", "Hiragino Mincho ProN", "Yu Mincho", serif';
const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

function draw() {
  const c = ctx;
  c.save();
  if (G.shake > 0) c.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
  drawSky(c, G.t, G.glow);
  if (G.dim > 0.01) { c.fillStyle = `rgba(2,3,12,${G.dim})`; c.fillRect(-20, -20, W + 40, H + 40); }
  drawLights(c);
  drawRings(c);
  drawOrbs(c);
  drawClouds(c);
  drawShells(c);
  drawSparks(c);
  if (G.mode === "play") { drawAim(c); drawLauncher(c); drawHud(c); }
  if (G.mode === "clear" || G.mode === "trans") drawHud(c);
  if (G.mode === "tutorial") { drawAim(c); drawLauncher(c); drawTutorial(c); }
  drawTexts(c);
  drawBoard(c);
  drawStamps(c);
  drawCurtain(c);
  if (G.mode !== "title" && G.mode !== "tutorial") drawCrowd(c); // 観客は幕の手前に残す（切り替えの間もそこにいる）
  drawCheers(c);
  c.restore();
  if (G.flash > 0) { c.fillStyle = `rgba(255,245,230,${G.flash * 0.35})`; c.fillRect(0, 0, W, H); }
}

function drawOrbs(c) {
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const o of G.orbs) {
    const t = ORB_TYPES[o.type], rgb = COLORS[o.color].rgb;
    // 導火線に火がついた玉は、小さくなりながら光が消えていく（溜め）。消えきった瞬間に開く
    const k = o.fuse > 0 ? 1 - o.fuse / o.fuseMax : 0;
    const fade = o.fuse > 0 ? (1 - k * 0.88) * (0.75 + Math.random() * 0.25) : 1;
    const pulse = (1 + Math.sin(G.t * 3 + o.ph) * 0.08) * (1 - k * 0.35);
    const r = t.r * pulse;
    const ox = o.x, oy = o.y;
    const g = c.createRadialGradient(ox, oy, 0, ox, oy, r * 2.6);
    g.addColorStop(0, rgba([255, 255, 255], 0.95 * fade));
    g.addColorStop(0.22, rgba(rgb, 0.9 * fade));
    g.addColorStop(0.5, rgba(rgb, 0.25 * fade * fade));
    g.addColorStop(1, rgba(rgb, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(ox, oy, r * 2.6, 0, Math.PI * 2); c.fill();
    if (o.type === "star") drawStar(c, ox, oy, r * 1.25, rgba([255, 250, 220], 0.9 * fade));
    if (o.type === "double" && o.hits === 0) { // 殻：1回当てると割れる
      c.strokeStyle = rgba([235, 235, 255], 0.75); c.lineWidth = 2;
      c.setLineDash([5, 4]);
      c.beginPath(); c.arc(o.x, o.y, r * 1.6, G.t, G.t + Math.PI * 2); c.stroke();
      c.setLineDash([]);
    }
    if (o.move) { // 流れ玉：進む向きと逆に尾
      const d = -Math.sign(o.move);
      const g2 = c.createLinearGradient(o.x, 0, o.x + d * 34, 0);
      g2.addColorStop(0, rgba(rgb, 0.5)); g2.addColorStop(1, rgba(rgb, 0));
      c.fillStyle = g2; c.fillRect(Math.min(o.x, o.x + d * 34), o.y - 3, 34, 6);
    }
    if (o.type === "big") { c.strokeStyle = rgba(rgb, 0.6); c.lineWidth = 1.5; c.beginPath(); c.arc(o.x, o.y, r * 1.3, 0, Math.PI * 2); c.stroke(); }
  }
  c.restore();
}

function drawStar(c, x, y, r, color) {
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.fill();
}

// 光の輪：どこまで届くかが見えるように、縁をうっすら描く
function drawRings(c) {
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const b of G.bursts) {
    const k = Math.min(1, b.t / b.grow);
    const r = b.R * easeOut(k);
    const end = b.grow + RING_HOLD;
    const a = b.t < end ? 0.22 : Math.max(0, 0.22 - (b.t - end) * 0.6);
    const rgb = COLORS[b.color].rgb;
    const g = c.createRadialGradient(b.x, b.y, r * 0.2, b.x, b.y, r);
    g.addColorStop(0, rgba(rgb, 0));
    g.addColorStop(0.85, rgba(rgb, a * 0.18));
    g.addColorStop(1, rgba(rgb, a * 0.5));
    c.fillStyle = g;
    c.beginPath(); c.arc(b.x, b.y, r, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

function drawShells(c) {
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const s of G.shells) {
    if (s.wait > 0) continue; // まだ筒の中
    const rgb = COLORS[s.color].rgb;
    s.trail.forEach((p, i) => {
      const a = (i + 1) / s.trail.length;
      c.fillStyle = rgba([255, 200, 140], a * 0.45);
      c.beginPath(); c.arc(p.x + Math.sin(i * 1.7 + G.t * 30) * 0.8, p.y, 0.8 + a * 1.8, 0, Math.PI * 2); c.fill();
    });
    if (s.dark !== undefined) continue; // 消えている間は何も見せない
    // 玉：てっぺんが近づくほど色が強くなる
    const near = Math.min(1, s.age / Math.max(0.1, s.age + s.vy / -GRAVITY));
    c.fillStyle = rgba([255, 230, 200], 0.9);
    c.beginPath(); c.arc(s.x, s.y, 2.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = rgba(rgb, 0.25 + near * 0.5);
    c.beginPath(); c.arc(s.x, s.y, 5 + near * 3, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// 引っ張っている間：てっぺんまでの点線と、開く大きさの輪
function drawAim(c) {
  if (!aim.on || busy() || G.shots <= 0) return;
  const ap = apexOf(aim.angle, aim.power);
  const color = COLORS[G.queue[0]].rgb;
  c.save();
  c.fillStyle = "rgba(255,240,220,.75)";
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const t = ap.t * i / steps;
    const x = LAUNCH.x + ap.vx * t, y = LAUNCH.y + ap.vy * t + 0.5 * GRAVITY * t * t;
    c.beginPath(); c.arc(x, y, 1.6, 0, Math.PI * 2); c.fill();
  }
  c.setLineDash([4, 6]);
  c.strokeStyle = rgba(color, 0.8);
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(ap.x, ap.y, G.p.ring, 0, Math.PI * 2); c.stroke();
  c.restore();
}

function drawLauncher(c) {
  const { x, y } = LAUNCH;
  const pull = aim.on ? aim.power : 0;
  c.save();
  c.translate(x, y);
  c.rotate(aim.on ? aim.angle : 0);
  // 筒（引くほど縮む）
  const h = 34 - pull * 10;
  c.fillStyle = "#2b2140";
  c.fillRect(-9, -h + 18, 18, h);
  c.fillStyle = "#4a3a6a";
  c.fillRect(-11, -h + 16, 22, 5);
  if (G.queue.length) {
    const rgb = COLORS[G.queue[0]].rgb;
    c.globalCompositeOperation = "lighter";
    const g = c.createRadialGradient(0, -h + 14, 0, 0, -h + 14, 18 + pull * 10);
    g.addColorStop(0, rgba(rgb, 0.9)); g.addColorStop(1, rgba(rgb, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -h + 14, 18 + pull * 10, 0, Math.PI * 2); c.fill();
  }
  c.restore();
  // 次に撃つ玉
  c.save();
  c.font = `500 11px ${FONT_HUD}`;
  c.fillStyle = "rgba(230,220,255,.7)";
  c.textAlign = "left";
  c.fillText("つぎ", x + 34, y + 22);
  G.queue.slice(1, 3).forEach((ci, i) => {
    c.fillStyle = rgba(COLORS[ci].rgb, 0.9);
    c.beginPath(); c.arc(x + 70 + i * 18, y + 18, 6, 0, Math.PI * 2); c.fill();
  });
  c.restore();
}

function drawHud(c) {
  c.save();
  c.font = `700 13px ${FONT_HUD}`;
  c.fillStyle = "rgba(230,220,255,.75)";
  c.textAlign = "left";
  c.fillText(programShort(G.stage), 16, 26);
  c.textAlign = "right";
  c.font = `700 22px ${FONT_HUD}`;
  c.fillStyle = "#fff4dc";
  c.fillText(G.score.toLocaleString(), W - 16, 30);
  // 目標：開いた数のゲージ
  const x0 = 16, y0 = 44, w = W - 32;
  c.fillStyle = "rgba(255,255,255,.1)";
  c.fillRect(x0, y0, w, 6);
  const f = Math.min(1, G.popped / G.target);
  const g = c.createLinearGradient(x0, 0, x0 + w, 0);
  g.addColorStop(0, "#ff8a6a"); g.addColorStop(1, "#ffd76a");
  c.fillStyle = g;
  c.fillRect(x0, y0, w * f, 6);
  c.textAlign = "left";
  c.font = `500 12px ${FONT_HUD}`;
  c.fillStyle = "rgba(230,220,255,.8)";
  c.fillText(G.reached ? `目標達成　満開まで あと${G.orbs.length}` : `目標 ${Math.min(G.popped, G.target)} / ${G.target}`, x0, y0 + 22);
  // のこり玉
  c.textAlign = "right";
  c.fillText("のこり", W - 16 - SHOTS * 16, y0 + 22);
  for (let i = 0; i < SHOTS; i++) {
    c.fillStyle = i < G.shots ? "#ffd76a" : "rgba(255,255,255,.15)";
    c.beginPath(); c.arc(W - 16 - (SHOTS - 1 - i) * 16 - 6, y0 + 18, 5, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

function drawTexts(c) {
  c.save();
  c.textAlign = "center";
  for (const t of G.texts) {
    const a = Math.min(1, t.life / t.max * 2);
    const big = t.size >= 20;
    c.font = big ? `400 ${t.size}px ${FONT_BIG}` : `700 ${t.size}px ${FONT_HUD}`;
    c.shadowColor = rgba(t.rgb, 0.8);
    c.shadowBlur = big ? 16 : 6;
    if (!big) { c.lineWidth = 3; c.strokeStyle = `rgba(6,6,20,${a * 0.8})`; c.strokeText(t.s, t.x, t.y); }
    c.fillStyle = rgba(t.rgb, a);
    c.fillText(t.s, t.x, t.y);
  }
  c.restore();
}

// 筆文字のハンコ：大きく叩きつけて、少しふるえて、すっと消える
function drawStamps(c) {
  for (const st of G.stamps) {
    const t = st.t;
    const inT = 0.14;
    const scale = t < inT ? 2.4 - 1.5 * (t / inT) : t < inT + 0.1 ? 0.9 + 0.1 * ((t - inT) / 0.1) : 1;
    const a = t < inT ? t / inT : t > st.life - 0.4 ? Math.max(0, (st.life - t) / 0.4) : 1;
    c.save();
    c.translate(st.x, st.y);
    c.rotate(st.rot);
    c.scale(scale, scale);
    c.globalAlpha = a;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `400 ${st.size}px ${FONT_BIG}`;
    c.lineJoin = "round";
    c.shadowColor = rgba(st.rgb, 0.9);
    c.shadowBlur = 26;
    c.lineWidth = st.size * 0.12;
    c.strokeStyle = "rgba(10,8,24,.85)";
    c.strokeText(st.s, 0, 0);
    c.fillStyle = rgba(st.rgb, 1);
    c.fillText(st.s, 0, 0);
    if (st.sub) {
      c.shadowBlur = 10;
      c.font = `400 ${st.size * 0.36}px ${FONT_BIG}`;
      c.lineWidth = 4;
      const sx = -st.size * 1.25, sy = -st.size * 0.72; // 左上に添える
      c.strokeText(st.sub, sx, sy);
      c.fillStyle = "#fff6e6";
      c.fillText(st.sub, sx, sy);
    }
    c.restore();
  }
}

// 演目の切り替え：前の演目の煙がたちこめて空をおおい、風で流れて晴れていく
const SMOKE = Array.from({ length: 16 }, (_, i) => ({ x: (i * 67) % 460 - 30, y: 60 + (i * 137) % 560, r: 90 + (i * 53) % 70, v: 10 + (i * 7) % 14 }));
function drawCurtain(c) {
  if (!G.trans) return;
  const e = x => x * x * (3 - 2 * x);
  const k = G.trans.out ? e(Math.min(1, G.trans.t / TRANS_OUT)) : 1 - e(Math.min(1, G.trans.t / TRANS_IN));
  if (k <= 0) return;
  c.save();
  c.fillStyle = `rgba(10,8,20,${k})`;
  c.fillRect(-20, -20, W + 40, H + 40);
  // 煙のかたまり：晴れるときは風下へ流れていく
  const drift = G.trans.out ? 0 : (1 - k) * 160;
  for (const s of SMOKE) {
    const x = s.x + drift + Math.sin(G.t * 0.4 + s.y) * 8, y = s.y - (1 - k) * 20;
    const g = c.createRadialGradient(x, y, 0, x, y, s.r);
    g.addColorStop(0, `rgba(70,62,92,${0.55 * k})`);
    g.addColorStop(1, "rgba(70,62,92,0)");
    c.fillStyle = g;
    c.fillRect(x - s.r, y - s.r, s.r * 2, s.r * 2);
  }
  c.restore();
}
