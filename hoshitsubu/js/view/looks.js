"use strict";
// 取ったカードで変わる見た目（プレイ中・リザルト・シェア画像で共通に使う小物）

function lookHeart(c, x, y, s, col) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x, y + s * .9);
  c.bezierCurveTo(x - s * 1.4, y - s * .1, x - s * .6, y - s * 1.1, x, y - s * .35);
  c.bezierCurveTo(x + s * .6, y - s * 1.1, x + s * 1.4, y - s * .1, x, y + s * .9); c.fill();
  c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(x - s * .4, y - s * .35, s * .22, 0, TAU); c.fill();
}
function lookDia(c, x, y, s, col) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * .7, y); c.lineTo(x, y + s); c.lineTo(x - s * .7, y); c.closePath(); c.fill();
  c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.moveTo(x, y - s * .7); c.lineTo(x + s * .25, y - s * .1); c.lineTo(x, y); c.closePath(); c.fill();
}
function lookSpark(c, x, y, s, col, rot) {
  c.save(); c.translate(x, y); c.rotate(rot || 0); c.fillStyle = col; c.beginPath();
  for (let j = 0; j < 8; j++) { const b = j / 8 * TAU, q = j % 2 ? s * .25 : s; c.lineTo(Math.cos(b) * q, Math.sin(b) * q); }
  c.closePath(); c.fill(); c.restore();
}

// 星の治癒（ハート）と星の恵み（ダイヤ）：星のまわりを斜めのフープが回る。数はLvで増える。
// うしろ半分（part "back"）は星の奥、前半分（"front"）は手前に描く
const hoopN = k => Math.min(8, lv(k) + 1);
function lookHoop(c, cx, cy, R, tilt, n, item, phase, part) {
  const ry = R * .3, ct = Math.cos(tilt), st = Math.sin(tilt);
  if (part === "back") {
    c.save(); c.translate(cx, cy); c.rotate(tilt);
    const rg = c.createLinearGradient(-R, 0, R, 0); ["#ffb3d9", "#ffe7a3", "#a8f0ff", "#d7b8ff"].forEach((col, i) => rg.addColorStop(i / 3, col));
    c.strokeStyle = rg; c.globalAlpha = .55; c.lineWidth = Math.max(1, R * .03); c.beginPath(); c.ellipse(0, 0, R, ry, 0, 0, TAU); c.stroke(); c.restore();
  }
  for (let i = 0; i < n; i++) {
    const a = phase + i / n * TAU, front = Math.sin(a) > 0; if ((part === "front") !== front) continue;
    const ex = Math.cos(a) * R, ey = Math.sin(a) * ry;
    c.globalAlpha = front ? 1 : .6; item(cx + ex * ct - ey * st, cy + ex * st + ey * ct, front ? 1 : .8); c.globalAlpha = 1;
  }
}
// r = 描く星の半径、t = 経過時間（null なら止めた絵）
function lookHoops(c, x, y, r, t, part) {
  if (!G) return;
  const R = r * 1.9 + r * .3, s = r * .36;
  if (lv("heal")) lookHoop(c, x, y, R, -.35, hoopN("heal"), (hx, hy, k) => lookHeart(c, hx, hy, s * k, "#ff9ecf"), t == null ? .5 : t * 1.5, part);
  if (lv("bless")) lookHoop(c, x, y, R * .95, .4, hoopN("bless"), (hx, hy, k) => lookDia(c, hx, hy, s * 1.05 * k, "#8ff0d2"), t == null ? 1.2 : -t * 1.2, part);
}

// 身軽：星のうしろに輪が次々に生まれて流れていき、星から離れるほど小さくなる（最後は点）
const LOOP_K = [1, .72, .46, 0];   // 0 は小さな点
// Lv1〜2 は小だけ、Lv3〜4 は中・小、Lv5 から大・中・小（どれも最後に点）
const loopSizes = () => LOOP_K.slice(lv("light") >= 5 ? 0 : lv("light") >= 3 ? 1 : 2);
function lookLoop(c, x, y, w, ang, a) {
  if (!w) { c.fillStyle = `rgba(150,200,255,${.9 * a})`; c.beginPath(); c.arc(x, y, Math.max(1.5, c.lineWidth), 0, TAU); c.fill(); return; }
  c.save(); c.translate(x, y); c.rotate(ang); c.lineCap = "round";
  c.shadowColor = "rgba(120,180,255,.9)"; c.shadowBlur = w * .25;
  c.strokeStyle = `rgba(110,170,255,${.85 * a})`; c.lineWidth = Math.max(1.5, w * .14);
  c.beginPath(); c.ellipse(0, 0, w, w * .24, 0, Math.PI * .62, Math.PI * 2.42); c.stroke();
  c.shadowBlur = 0; c.strokeStyle = `rgba(235,245,255,${.8 * a})`; c.lineWidth = Math.max(.8, w * .05);
  c.beginPath(); c.ellipse(0, 0, w, w * .24, 0, Math.PI * .7, Math.PI * 2.3); c.stroke();
  c.restore();
}
// 止めた絵（リザルト・シェア）：止まっているときと同じく、星の下に 大・中・小 の輪と点（下の文字にかからない長さ）
function lookOrbsStill(c, x, y, r) {
  if (!G || !lv("light")) return;
  const ks = loopSizes(), D = [1.05, 1.43, 1.78, 2.06];
  ks.forEach((q, i) => { const d = D[i]; c.lineWidth = r * .07; lookLoop(c, x, y + r * d, r * .95 * q, 0, 1 - i * .15); });
}
// プレイ中：星のうしろ（動きと反対向き。止まっていれば下）に輪を出し、そのまま流す
function updateOrbs(dt) {
  const p = G.p;
  if (!lv("light")) { p.loops = null; return; }
  const tr = p.trail;
  if (!p.loops) { p.loops = []; p.od = { x: 0, y: 1 }; p.loopT = 0; p.loopI = 0; }
  let tx = 0, ty = 1, mv = 0;
  if (tr.length >= 2) { const vx = p.x - tr[0].x, vy = p.y - tr[0].y, L = Math.hypot(vx, vy); mv = L; if (L > 3) { tx = -vx / L; ty = -vy / L; } }
  // 動く速さで輪の時計を変える：止まっている・ゆっくりの時はのんびり、速いほどせわしなく出て流れる
  const sp = clamp(mv / .22 / 260, .55, 1.4); p.loopSp = (p.loopSp || sp) + (sp - (p.loopSp || sp)) * Math.min(1, dt * 6);
  const et = dt * p.loopSp;
  const f = Math.min(1, dt * 10); p.od.x += (tx - p.od.x) * f; p.od.y += (ty - p.od.y) * f;
  const L = Math.hypot(p.od.x, p.od.y) || 1, ox = p.od.x / L, oy = p.od.y / L;
  // 輪は星にくっついたまま、うしろへ流れる。向きは星の向きを少し遅れて追う（古い輪ほどゆっくり）→ 急に曲がってもばらけず、しなるように付いてくる
  for (const o of p.loops) {
    o.life -= et; o.d += 60 * et; o.wx += o.dx * 60 * et; o.wy += o.dy * 60 * et;
    const ff = Math.min(1, dt * (14 - 8 * (1 - o.life / o.max)));
    o.dx += (ox - o.dx) * ff; o.dy += (oy - o.dy) * ff; const l = Math.hypot(o.dx, o.dy) || 1; o.dx /= l; o.dy /= l;
  }
  keep(p.loops, o => o.life > 0);
  p.loopT -= et;
  if (p.loopT <= 0) {
    p.loopT += .085;
    const q = loopSizes()[0];   // 生まれるときはいちばん大きい輪（Lvで上限が変わる）。離れるほど縮む
    p.loops.push({ d: 0, dx: ox, dy: oy, q, life: .42, max: .42, wx: p.x + ox * starR() * .9, wy: p.y + oy * starR() * .9 });
  }
}
const LOOP_STAY = .35;
function drawOrbs() {
  const p = G.p; if (!p.loops) return;
  const r = starR();
  for (const o of p.loops) {
    const k = 1 - o.life / o.max, a = Math.min(1, (o.max - o.life) * 14) * Math.min(1, (1 - k) * 2.5), d = r * .9 + o.d;
    const w = k > .85 ? 0 : r * 1.05 * o.q * (1 - k * .75);   // 離れるほど小さく、最後は点
    // 星にくっついた位置と、生まれた場所に残る位置を混ぜる（少しだけその場に残る）
    const x = (p.x + o.dx * d) * (1 - LOOP_STAY) + o.wx * LOOP_STAY, y = (p.y + o.dy * d) * (1 - LOOP_STAY) + o.wy * LOOP_STAY;
    g.lineWidth = r * .08; lookLoop(g, x, y, w, Math.atan2(o.dy, o.dx) + Math.PI / 2, a);
  }
}

// 流星（放った衛星）：一番星で明るく大きく、加速で太く力強い尾、分裂で双子の粒がくっつく
function drawShot(s) {
  const t = s.trail, sp = lv("speed"), st = lv("star");
  if (t && t.length >= 4) {
    if (sp) {
      const n = t.length / 2, w = s.r * (1.5 + .2 * Math.min(sp, 6));
      for (let pass = 0; pass < 2; pass++) for (let i = 1; i < n; i++) {
        const k = i / (n - 1);
        c2(t[i * 2 - 2], t[i * 2 - 1], t[i * 2], t[i * 2 + 1], pass ? w * .42 * k : w * k, pass ? `rgba(255,255,255,${.85 * k})` : s.color, pass ? 1 : .55 * k);
      }
      g.globalAlpha = 1;
    } else { g.strokeStyle = s.color; g.globalAlpha = .45; g.lineWidth = s.r * 1.2; g.beginPath(); g.moveTo(t[0], t[1]); for (let i = 2; i < t.length; i += 2) g.lineTo(t[i], t[i + 1]); g.stroke(); g.globalAlpha = 1; }
  }
  if (st) {
    const R = s.r * (3 + .3 * Math.min(st, 6)), gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
    gr.addColorStop(0, "rgba(255,250,230,.85)"); gr.addColorStop(1, "rgba(255,231,163,0)"); g.fillStyle = gr; g.beginPath(); g.arc(s.x, s.y, R, 0, TAU); g.fill();
  }
  drawPellet(s.x, s.y, s.kind, s.color, s.r / 4 * (st ? 1.2 + .04 * Math.min(st, 6) : 1));
  if (s.split > 0) for (let i = 0; i < 2; i++) {
    const a = s.age * 9 + i * Math.PI, d = s.r * 2.1;
    g.fillStyle = s.color; g.beginPath(); g.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, s.r * .6, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, s.r * .25, 0, TAU); g.fill();
  }
}
function c2(x0, y0, x1, y1, w, col, a) { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = Math.max(.5, w); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }

// 追尾：ねらわれた敵に「星のしるし」。流星はこのしるしの引力に引き寄せられる
function drawMarks() {
  if (!lv("homing")) return;
  const seen = new Set();
  for (const s of G.shots) if (s.tg && !s.tg.dead) seen.add(s.tg);
  const pulse = .75 + .25 * Math.sin(tNow * 8);
  for (const e of seen) {
    const R = (e === G.boss ? BOSS_R : e.r) + 8;
    g.globalAlpha = pulse; g.strokeStyle = "rgba(255,231,163,.9)"; g.lineWidth = 1.5; g.beginPath(); g.arc(e.x, e.y, R, 0, TAU); g.stroke();
    for (let i = 0; i < 4; i++) { const a = tNow * 1.5 + i * Math.PI / 2 + .78; lookSpark(g, e.x + Math.cos(a) * R, e.y + Math.sin(a) * R, 4.5, "#ffe7a3", tNow * 2); }
    g.globalAlpha = 1;
  }
}

// 超新星：放った瞬間のパンッという破裂（衝撃波の輪とは別）
function drawSpike(f) {
  const k = 1 - f.life / f.max, R = f.r * (.55 + .55 * (1 - (1 - k) ** 2)), a = 1 - k, N = 14;
  g.save(); g.globalAlpha = 1; g.globalCompositeOperation = "lighter"; g.translate(f.x, f.y); g.rotate(k * .4);
  for (let pass = 0; pass < 2; pass++) {
    g.beginPath(); for (let i = 0; i < N * 2; i++) { const b = i / (N * 2) * TAU, q = (i % 2 ? .42 : (i % 4 ? .85 : 1)) * R * (pass ? .6 : 1); g.lineTo(Math.cos(b) * q, Math.sin(b) * q); }
    g.closePath(); g.fillStyle = pass ? `rgba(255,255,255,${.55 * a})` : `rgba(60,200,255,${.75 * a})`; g.fill();
  }
  g.restore();
}

// リザルト・シェア：押している間だけ見える衛星も、いくつか星のまわりに描く（衛星の器のLvで増える）
function lookSatsStill(c, x, y, k, t) {
  if (!G) return;
  const n = Math.min(20, 6 + lv("cap") * 2), per = [8, 12], base = starR() + 12;
  let i = 0;
  for (let ring = 0; i < n && ring < per.length; ring++) {
    const m = Math.min(per[ring], n - i), R = (base + ring * 11) * k, sp = t == null ? .4 : t * (1.9 / (1 + ring * .45)) * (ring % 2 ? -1 : 1);
    for (let j = 0; j < m; j++, i++) {
      const a = sp + j / m * TAU + ring * .3, col = SAT_COLORS[i % SAT_COLORS.length], key = "normal" + col + false;
      let im = pelletCache.get(key); if (!im) { im = bakePellet("normal", col, false); pelletCache.set(key, im); }
      const s = 16 * k, px = x + Math.cos(a) * R, py = y + Math.sin(a) * R;
      c.save(); c.translate(px, py); c.rotate(a * 2); c.drawImage(im, -s / 2, -s / 2, s, s); c.restore();
    }
  }
}

// リザルト・シェア：星から横へ飛び出す流星を3本（上の文字にかからないように）。取った強化どおりの尾（加速）・光（一番星）・双子の粒（分裂）・曲がり（追尾）で描く
function lookShotsStill(c, x, y, k, r) {
  if (!G) return;
  const sp = lv("speed"), st = lv("star"), hm = lv("homing"), sr = 4 * k;
  [[-2.8, "#ffe58a"], [-.36, "#ff9ecf"], [.3, "#9cc8ff"]].forEach(([a, col], n) => {
    const D = Math.min(r * 3.3, c.canvas.width / 2 - 12 * k), L = r * (1.2 + .12 * Math.min(sp, 6)), bend = hm ? r * .45 * (n - 1 || 1) : 0;
    const hx = x + Math.cos(a) * D, hy = y + Math.sin(a) * D, nx = -Math.sin(a), ny = Math.cos(a), pts = [];
    for (let i = 0; i <= 10; i++) { const q = i / 10, d = D - L * (1 - q), b = Math.sin((1 - q) * Math.PI / 2) * bend; pts.push([x + Math.cos(a) * d + nx * b, y + Math.sin(a) * d + ny * b]); }
    c.lineCap = "round";
    const w = sp ? sr * (1.5 + .2 * Math.min(sp, 6)) : sr * 1.2;
    for (let pass = 0; pass < (sp ? 2 : 1); pass++) for (let i = 1; i < pts.length; i++) {
      const q = i / (pts.length - 1);
      c.globalAlpha = pass ? .85 * q : (sp ? .55 : .45) * q; c.strokeStyle = pass ? "#fff" : col; c.lineWidth = Math.max(.5, sp ? (pass ? w * .42 : w) * q : w);
      c.beginPath(); c.moveTo(...pts[i - 1]); c.lineTo(...pts[i]); c.stroke();
    }
    c.globalAlpha = 1;
    if (st) { const R = sr * (3 + .3 * Math.min(st, 6)), gr = c.createRadialGradient(hx, hy, 0, hx, hy, R); gr.addColorStop(0, "rgba(255,250,230,.85)"); gr.addColorStop(1, "rgba(255,231,163,0)"); c.fillStyle = gr; c.beginPath(); c.arc(hx, hy, R, 0, TAU); c.fill(); }
    const key = "normal" + col + false; let im = pelletCache.get(key); if (!im) { im = bakePellet("normal", col, false); pelletCache.set(key, im); }
    const ps = 16 * k * (st ? 1.2 + .04 * Math.min(st, 6) : 1); c.drawImage(im, hx - ps / 2, hy - ps / 2, ps, ps);
    if (lv("split")) for (let i = 0; i < 2; i++) {
      const b = a + Math.PI / 2 + i * Math.PI + .5, d = sr * 2.1, tx = hx + Math.cos(b) * d, ty = hy + Math.sin(b) * d;
      c.fillStyle = col; c.beginPath(); c.arc(tx, ty, sr * .6, 0, TAU); c.fill();
      c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.arc(tx, ty, sr * .25, 0, TAU); c.fill();
    }
  });
}

// 文字の知らせ（波の見出しなど）：キュピーンと同じく、くしゃっと丸めた紙が開くように 12コマ/秒 で出て、最後は丸まって消える
const PAPER_IN = [[.16, 1, -30], [.45, .75, -21], [1.1, .35, -12], [.94, .2, -6], [1, .14, -2], [1.02, .08, 0], [1, 0, 0]];
const PAPER_OUT = [[.62, .3, 1], [.28, .6, 2]];
function paperFrame(age, left) {
  const fi = clamp(Math.floor(age * 12) || 0, 0, PAPER_IN.length - 1), fo = Math.max(0, Math.floor(left * 12) || 0);
  if (fo < PAPER_OUT.length) return PAPER_OUT[PAPER_OUT.length - 1 - fo];
  return PAPER_IN[fi];
}
const prand = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function drawPaperText(t) {
  const [open, cr, rot] = paperFrame(t.age || 0, t.life), size = t.size;
  g.save(); g.translate(t.x, t.y); g.rotate(rot * Math.PI / 180); g.scale(open, open);
  g.font = `${HEAD_W} ${size}px ${HEAD_FONT}`; g.textAlign = "left"; g.lineWidth = 4; g.strokeStyle = "rgba(14,11,34,.8)"; g.lineJoin = "round";
  const chars = [...t.text], ws = chars.map(ch => g.measureText(ch).width), total = ws.reduce((a, b) => a + b, 0);
  let x = -total / 2, f = Math.floor((t.age || 0) * 12);
  chars.forEach((ch, i) => {
    const r1 = prand(i * 3.1 + f), r2 = prand(i * 5.7 + f * 1.3), r3 = prand(i * 9.2 + f * .7);   // コマごとにしわの形が変わる
    g.save(); g.translate(x + ws[i] / 2 + (r1 - .5) * size * .8 * cr, (r2 - .5) * size * 1.1 * cr);
    g.rotate((r3 - .5) * 2.2 * cr); g.scale(1 - cr * .45 * r2, 1 - cr * .6 * r1);
    g.strokeText(ch, -ws[i] / 2, 0); g.fillStyle = t.color; g.fillText(ch, -ws[i] / 2, 0); g.restore();
    x += ws[i];
  });
  g.restore();
}

// 氷の衣が割れる：ひびが走ってから、ガラスのような破片がパリーンと飛び散る
function iceShatter(x, y, r) {
  G.fx.push({ x, y, vx: 0, vy: 0, kind: "crack", r, life: .16, max: .16, seed: Math.random() * 99 });
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + rand(-.15, .15), s = rand(110, 230), d = r + rand(2, 8), sz = rand(4, 8.5);
    const pts = [0, 1, 2, 3].map(j => { const b = j / 4 * TAU + rand(-.5, .5), q = sz * (j % 2 ? rand(.35, .6) : rand(.8, 1.2)); return [Math.cos(b) * q, Math.sin(b) * q]; });
    G.fx.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: Math.cos(a) * s, vy: Math.sin(a) * s, kind: "ice", pts, rot: rand(0, TAU), life: rand(.45, .7), max: .7 });
  }
}
function drawIceFx(f) {
  if (f.kind === "crack") { // ひび：輪から外へギザギザの白い線
    const a = f.life / f.max; g.save(); g.globalAlpha = a; g.strokeStyle = "#ffffff"; g.lineWidth = 1.6; g.lineJoin = "round";
    g.beginPath(); g.arc(f.x, f.y, f.r + 5, 0, TAU); g.stroke();
    for (let i = 0; i < 7; i++) {
      let b = i / 7 * TAU + prand(f.seed + i) * .6, d = f.r + 5; g.beginPath(); g.moveTo(f.x + Math.cos(b) * d, f.y + Math.sin(b) * d);
      for (let j = 0; j < 3; j++) { d += 5 + prand(f.seed + i * 3 + j) * 6; b += (prand(f.seed * 2 + i + j) - .5) * .5; g.lineTo(f.x + Math.cos(b) * d, f.y + Math.sin(b) * d); }
      g.stroke();
    }
    g.restore(); return;
  }
  const a = Math.min(1, f.life / f.max * 1.8);
  g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.globalAlpha = a;
  g.beginPath(); f.pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath();
  g.fillStyle = "rgba(190,230,255,.55)"; g.fill(); g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = 1.2; g.stroke();
  g.strokeStyle = "rgba(255,255,255,.8)"; g.beginPath(); g.moveTo(f.pts[0][0] * .5, f.pts[0][1] * .5); g.lineTo(f.pts[1][0] * .5, f.pts[1][1] * .5); g.stroke();   // 光るふち
  g.restore();
}

// ---- 帽子：はじめてLv4に届いたカードの帽子。上から落ちてきてポン！と乗り、動きに合わせてばねで跳ねる ----
// 落ちてくるコマ（12fps）：[上へのずれ（半径を1）, 横の伸び, 縦の伸び]。4コマ目で着地してつぶれる
const HAT_IN = [[-2.8, .82, 1.22], [-1.9, .85, 1.2], [-1, .9, 1.12], [0, 1.3, .66], [-.24, .9, 1.12], [-.08, 1.06, .94], [0, .98, 1.03], [0, 1, 1]];
const HAT_LAND = 3;
// 帽子の下端の位置（中心から、半径を1）
const hatAt = key => { const h = hatAtlas.def && hatAtlas.def.hats[key]; return h ? h.y : 0; };
// 帽子を1つ描く。(x, y) は星の中心、r は星の半径。o.dx/dy：ずれ（px）、o.rot：傾き、o.sx/sy：伸び
function drawHat(c, key, x, y, r, o = {}) {
  const h = hatAtlas.def && hatAtlas.def.hats[key]; if (!h) return;
  const L = h.back ? hatLayers(key, h) : null;
  if (o.layer === "back" && !L) return;   // 奥のつばがない帽子は、手前だけ
  const [rx, ry, rw, rh] = h.rect, w = h.w * 2 * r, hh = rh * w / rw, dx = (h.x || 0) * r;
  c.save(); c.translate(x + dx + (o.dx || 0), y + h.y * r + (o.dy || 0)); c.rotate(o.rot || 0); c.scale(o.sx || 1, o.sy || 1);
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  if (L && o.layer) c.drawImage(L[o.layer], -w / 2, -hh, w, hh);
  else c.drawImage(hatAtlas.img, rx, ry, rw, rh, -w / 2, -hh, w, hh);
  c.restore();
}
// つばの広い帽子は、絵を「奥のつば」と「手前（山・リボン・手前のつば）」に分けて、星をはさんで描く（奥 → 星 → 手前）
// h.back：奥のつばの形（hats.webp の中の白い形。透明度がそのまま形）
const hatLayerCache = {};
function hatLayers(key, h) {
  if (hatLayerCache[key]) return hatLayerCache[key];
  const [rx, ry, rw, rh] = h.rect, [bx, by, bw, bh] = h.back;
  const layer = op => {
    const c = document.createElement("canvas"); c.width = rw; c.height = rh; const x = c.getContext("2d");
    x.drawImage(hatAtlas.img, rx, ry, rw, rh, 0, 0, rw, rh);
    x.globalCompositeOperation = op; x.drawImage(hatAtlas.img, bx, by, bw, bh, 0, 0, rw, rh);
    return c;
  };
  return (hatLayerCache[key] = { back: layer("destination-in"), front: layer("destination-out") });
}
// プレイ中：帽子はふだん頭にのったまま。放ったとき・被弾したときだけポンと跳ねて、落ちてきて少しつぶれる
function hatKick(v, spin = 0) {
  if (!G || !G.hat || G.hatT * 12 < HAT_IN.length - 1) return;
  const j = G.p.hatJ || (G.p.hatJ = { y: 0, v: 0, rot: 0, rv: 0, sq: 0 });
  j.v = Math.min(j.v, -v); j.rv += spin;
}
function updateHat(dt) {
  const f = G.hatFly;
  if (f) { f.t += dt; f.vy += 1200 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.rv * dt; if (f.t > 1) G.hatFly = null; }
  if (!G.hat) return;
  const was = G.hatT; G.hatT += dt;
  if (G.hatT < 0) return;
  if (was < 0 && G.hatOld) { // 前の帽子はくるくる飛んでいく
    const sd = Math.random() < .5 ? -1 : 1;
    G.hatFly = { k: G.hatOld, x: G.p.x, y: G.p.y, r: starR(), vx: sd * 110, vy: -330, rot: 0, rv: sd * 9, t: 0 }; G.hatOld = null;
  }
  if (was < HAT_LAND / 12 && G.hatT >= HAT_LAND / 12) hatLanded();
  const j = G.p.hatJ; if (!j) return;
  const d = Math.min(dt, 1 / 30);
  if (j.y < 0 || j.v < 0) {
    j.v += 1900 * d; j.y += j.v * d;
    if (j.y >= 0) { j.y = 0; j.sq = Math.min(1, j.v / 300); j.v = j.v > 120 ? -j.v * .28 : 0; }
  }
  j.rv += (-170 * j.rot - 11 * j.rv) * d; j.rot += j.rv * d;   // 傾きはばねで戻す
  j.sq = Math.max(0, j.sq - d * 7);
}
function hatLanded() {
  const p = G.p, r = starR();
  sfx.pon(); addFx(p.x, p.y - r, "#ffe7a3", 8);
  G.fx.push({ x: p.x, y: p.y - r * .6, kind: "ring", r0: r * .6, r1: r * 2.2, life: .3, max: .3, color: "#ffe7a3" });
}
// プレイ中の星に帽子を描く（飛んでいく前の帽子も）
// layer："back" は星より先（奥のつば）、"front" は星のあと（手前と、飛んでいく帽子）
function drawHatPlay(x, y, r, layer) {
  const fl = G.hatFly;
  if (fl && layer === "front") drawHat(g, fl.k, fl.x, fl.y, fl.r, { rot: fl.rot, alpha: Math.max(0, 1 - fl.t) });
  if (G.hatT < 0) { if (G.hatOld) drawHat(g, G.hatOld, x, y, r, { layer }); return; }   // かえる前は前の帽子のまま
  if (!G.hat) return;
  const f = HAT_IN[Math.min(HAT_IN.length - 1, Math.floor(G.hatT * 12))], j = G.p.hatJ;
  const dy = j ? j.y : 0, rot = j ? clamp(j.rot, -.6, .6) : 0, q = j ? j.sq * .22 : 0;
  // 落ちてくる途中（頭にのる前）は、はさまずに全部を手前に描く
  const on = G.hatT * 12 >= HAT_LAND;
  if (!on && layer === "back") return;
  drawHat(g, G.hat, x, y, r, { dy: dy + f[0] * r, rot, sx: f[1] * (1 + q), sy: f[2] * (1 - q), layer: on ? layer : undefined });
}

// ---- 名乗り：名前が変わったら、カード選びのあと 星が画面の中央へ → 帽子をかえる → 見出し → 古い名前を新しい名前がふっとばす → 次の波 ----
//  あたらしい名前がついた！   ← 見出し（星の上）
//           ☆                ← 星（帽子）
//        ふわふわ             ← 二つ名（あれば。紙が開くように先に出る）
//       シリリバン            ← 名前。古い名前が先に出ていて、左から飛んできた新しい名前に右へふっとばされる
//    パワーの型 目覚め         ← 型が目覚めたら、名前の下に知らせ（名前が変わらないときも名乗りを流し、名前はそのままで知らせだけ）
//  まとめて放つほど威力アップ
const REN_MOVE = .6, REN_HAT = .65, REN_HEAD = .7, REN_TITLE = .95, REN_OLD = 1.6, REN_FLY = .18, REN_NAME = 2.55, REN_END = 4.7;   // 二つ名→古い名前→ふっとばしの間をたっぷりとる
const renCenter = () => G.viewer ? { x: G.p.x, y: G.p.y } : { x: W / 2, y: H * .42 };
function startRename() {
  const chg = G.renamed, awake = G.awakeMsgs.slice(0, 2);
  G.renamed = false; G.awakeMsgs = []; if (!G.viewer) G.waveState = "rename";   // ビューワーでは星を動かさず、帽子と名前だけ見せる
  const note = !awake.length ? 0 : chg ? REN_NAME + .75 : REN_OLD + .4;   // 型の知らせが出る時間
  G.ren = { t: 0, x0: G.p.x, y0: G.p.y, name: starName(), old: G.oldName || "ななしの星", title: starTitle(), hat: G.hatT < -1, chg, awake, note, end: note ? Math.max(REN_END, note + 2.1) : REN_END };
  if (chg) G.oldName = null;
}
function updateRename(dt) {
  const r = G.ren, was = r.t; r.t += dt;
  const c = renCenter(), k = clamp(r.t / REN_MOVE, 0, 1), e = 1 - (1 - k) ** 3;
  if (!G.viewer) { G.p.x = r.x0 + (c.x - r.x0) * e; G.p.y = r.y0 + (c.y - r.y0) * e; }   // 指を動かしても、この間は中央へ
  if (r.hat && was < REN_HAT && r.t >= REN_HAT) G.hatT = -1e-3;
  if (was < REN_HEAD && r.t >= REN_HEAD) sfx.tap();
  if (r.note && was < r.note && r.t >= r.note) sfx.chord(true);
  if (r.chg && was < REN_NAME && r.t >= REN_NAME) { // ドーン：古い名前がふっとぶ
    sfx.knock(); shake(6);
    G.fx.push({ x: c.x, y: c.y + 84, kind: "ring", r0: 10, r1: starR() * 5, life: .45, max: .45, color: "#ff9ecf" });
    addFx(c.x + 40, c.y + 84, "#ff9ecf", 16); addFx(c.x + 40, c.y + 84, "#ffe7a3", 8);
  }
  if (r.t >= r.end) { G.ren = null; if (!G.viewer) goHome(); }
}
// 名前を1つ描く（ロゴの字・ピンク、幅に収める）
function renText(text, x, y, s, rot, a, col) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.font = `400 34px ${LOGO_FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  const w = g.measureText(text).width, fit = Math.min(1, (W - 40) / w); g.scale(fit, fit);
  g.shadowColor = col === "#ff9ecf" ? "rgba(255,158,207,.7)" : "rgba(0,0,0,0)"; g.shadowBlur = 14;
  g.lineWidth = 5; g.lineJoin = "round"; g.strokeStyle = "rgba(14,11,34,.75)"; g.strokeText(text, 0, 0);
  g.fillStyle = col; g.fillText(text, 0, 0);
  g.restore();
}
function drawRename() {
  const r = G.ren; if (!r || r.t < REN_HEAD) return;
  const c = renCenter(), ny = c.y + 84, out = clamp((r.end - .1 - r.t) / .35, 0, 1), head = r.chg ? "あたらしい名前がついた！" : "型が目覚めた！";
  // 見出し：紙が開くように
  { const k = clamp((r.t - REN_HEAD) / .25, 0, 1), s = k < 1 ? .6 + .5 * Math.sin(k * Math.PI * .75) : 1;
    g.save(); g.globalAlpha = Math.min(1, k * 2) * out; g.translate(c.x, c.y - 72); g.scale(s, s);
    g.font = `${HEAD_W} 17px ${HEAD_FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 4; g.lineJoin = "round"; g.strokeStyle = "rgba(14,11,34,.8)"; g.strokeText(head, 0, 0);
    g.fillStyle = "#ffe7a3"; g.fillText(head, 0, 0); g.restore(); }
  // 二つ名：名前より先に、紙が開くように出る（系統の色）
  if (r.title.text && r.t >= REN_TITLE)
    drawPaperText({ x: c.x, y: c.y + 50, text: r.title.text, color: r.title.cat ? CATS[r.title.cat].color : "#ffe7a3", size: 18, age: r.t - REN_TITLE, life: Math.max(0, r.end - .1 - r.t) });
  // 名前が変わらないとき：いまの名前をそのまま出す
  if (!r.chg) { if (r.t >= REN_OLD) renText(r.name, c.x, ny, 1, 0, Math.min(1, (r.t - REN_OLD) / .2) * out, "#ff9ecf"); }
  // 型の知らせ：名前の下に、系統の色で「〇〇の型 目覚め」と効き目
  if (r.note && r.t >= r.note) r.awake.forEach((m, i) => {
    const age = r.t - r.note - i * .35, life = Math.max(0, r.end - .1 - r.t); if (age < 0) return;
    drawPaperText({ x: c.x, y: ny + 42 + i * 50, text: CATS[m.c].name + "の型 " + (m.n > 1 ? "2段目" : "目覚め"), color: CATS[m.c].color, size: 16, age, life });
    if (age >= .15) drawPaperText({ x: c.x, y: ny + 63 + i * 50, text: AWAKE_MSG[m.c][m.n - 1], color: "#f4f0ff", size: 13, age: age - .15, life });
  });
  if (!r.chg) return;
  // 古い名前：先に出ていて、ぶつかったら右上へくるくる飛んでいく
  if (r.t >= REN_OLD) {
    const a0 = Math.min(1, (r.t - REN_OLD) / .2);
    if (r.t < REN_NAME) renText(r.old, c.x, ny, .9, 0, a0, "#b9aee0");
    else { const k = (r.t - REN_NAME) / .7; renText(r.old, c.x + 320 * k, ny - 160 * k + 260 * k * k, .9 * (1 - k * .3), k * 4, 1 - k, "#b9aee0"); }
  }
  // 新しい名前：左から飛んできてぶつかり、そのまま行きすぎてポンと落ち着く（リザルトと同じ出方）
  if (r.t >= REN_NAME - REN_FLY) {
    if (r.t < REN_NAME) { const k = (r.t - (REN_NAME - REN_FLY)) / REN_FLY; renText(r.name, c.x - (1 - k) * W, ny, .8, -.15 * (1 - k), 1, "#ff9ecf"); }
    else {
      const k = clamp((r.t - REN_NAME) / .6, 0, 1), back = 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
      renText(r.name, c.x, ny, .8 + .2 * back + (k < .15 ? .25 * (1 - k / .15) : 0), 0, out, "#ff9ecf");
    }
  }
}

// ダブルタップで名乗りを最後のコマ（新しい名前が落ち着いた所）まで飛ばす
function skipRename() {
  const r = G.ren; if (!r || r.t >= r.end - .5) return;
  if (G.hatT < 1 && G.hat) { G.hatT = 1; G.hatOld = null; G.hatFly = null; }
  if (!G.viewer) { const c = renCenter(); G.p.x = c.x; G.p.y = c.y; }
  r.t = r.end - .5;
}
onDoubleTap(cv, () => { if (G && G.ren) skipRename(); });
