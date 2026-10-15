"use strict";
// 光の輪と連鎖。輪に触れた火の玉は少し遅れて自分も開く。

let burstId = 0;

// shape / rot：ススキ玉・型物・しだれの形と向き（SHAPES）
function burst(x, y, color, mult, ring, depth, demo, quiet, ufo, shape, rot = 0) {
  const R = (demo ? 60 : G.p.ring) * ring * mult;
  const grow = depth === 0 ? RING_GROW : CHAIN_GROW * Math.max(0.5, Math.pow(0.9, depth - 1));
  G.bursts.push({ x, y, R, shape, rot, t: 0, grow, color, mult, depth, demo, id: ++burstId, bonus: G.burstBonus || 1 });
  // UFO は花火の光を出さない（光の輪はつながりを見せるために残す）。爆発はあとで blowWreck
  if (!ufo) {
    if (!(shape && shape.tri)) sparks(x, y, COLORS[color].rgb, R, depth, grow); // ススキは丸く開かず、穂だけ
    if (shape) shapeSparks(x, y, COLORS[color].rgb, shape, rot, R, grow);
    lightUp(x, y, COLORS[color].rgb, R);
  }
  if (!demo) {
    if (!ufo) sfx.boom(depth);
    G.flash = Math.min(0.18, G.flash + 0.035 + depth * 0.006); // ちかちかしないよう、ひかえめに
    if (depth >= 3) G.shake = Math.min(8, G.shake + 0.6 + depth * 0.25);
  } else if (!quiet) sfx.boom(0, 0.35);
}

const easeOut = t => 1 - Math.pow(1 - t, 3);

function updateBursts(dt) {
  for (let i = G.bursts.length - 1; i >= 0; i--) {
    const b = G.bursts[i];
    b.t += dt;
    if (!b.demo && b.t <= burstLife(b.shape, b.grow)) {
      const q = reachAt(b.R, b.shape, b.grow, b.t); // しだれは、火の粉が垂れていくのに合わせて届く
      for (const o of G.orbs) {
        if (o.fuse > 0 || o.hitBy === b.id || !shapeHit(b.x, b.y, q.r, b.shape, b.rot, o.x, o.y, ORB_TYPES[o.type].r, q.dv)) continue;
        o.hitBy = b.id;
        if (++o.hits < ORB_TYPES[o.type].hits) { crack(o); continue; }
        o.from = b;
        o.fuse = o.fuseMax = fuseOnBeat(b.depth + 1);
        // UFO は当たるとその場で震え、連鎖を数える瞬間にボカーン
        o.fuseAt = beatAt(o.fuse);
        sfx.fuse(b.depth + 1);
      }
    }
    if (b.t > burstLife(b.shape, b.grow) + 0.6) G.bursts.splice(i, 1);
  }
  // 導火線が燃えつきた火の玉が開く
  for (let i = G.orbs.length - 1; i >= 0; i--) {
    const o = G.orbs[i];
    if (o.fuse <= 0) continue;
    // 連鎖の最後の一発（いちばんあとに開く、行きどまりの玉）が16分の裏で待っていたら、次の8分の拍まで待たせる。
    // しめの音が拍の裏に来ないように。途中の「パパパン」は16分のまま
    if (!onEighth(o.fuseAt) && isLeaf(o) && !G.orbs.some(q => q !== o && q.fuse > 0 && q.fuseAt >= o.fuseAt)) {
      const left = toBeat(Math.max(0, beatLeft(o.fuseAt)), 2, true);
      o.fuseAt = beatAt(left); o.fuseMax += left - o.fuse;
    }
    o.fuse = beatLeft(o.fuseAt);
    if (o.fuse > 0) continue;
    G.orbs.splice(i, 1);
    const p = o.from, type = ORB_TYPES[o.type];
    const depth = p.depth + 1;
    const same = o.color === p.color;
    const mult = same ? Math.min(MAX_MULT, p.mult * SAME_COLOR_GROW) : 1;
    // 初手ボーナス：打ち上げた玉の輪で最初に開いた玉の色で、その1発から広がる連鎖の倍率が決まる
    let bonus = p.bonus || 1;
    if (p.depth === 0 && !p.started) {
      p.started = true;
      p.bonus = bonus = same ? START_BONUS : 1;
      if (same) addText(`同色スタート！ 点×${START_BONUS}`, o.x, o.y - 62, 15, 1.6, COLORS[o.color].rgb);
    } else if (p.depth === 0) bonus = p.bonus;
    const pts = Math.round(100 * depth * type.score * bonus / 10) * 10;
    G.score += pts;
    G.popped++;
    if (!G.reached && G.popped >= G.target) G.reached = true; // HUD を「満開まで あと N」に切りかえる
    G.chainNow++;
    G.chainX += o.x; G.chainY += o.y;
    G.maxChain = Math.max(G.maxChain, G.chainNow);
    // 倍率の高い玉は、点の文字も大きく（後ろで開くほど大きな数字が出る）
    addText(`+${pts}`, o.x, o.y - 14, type.score > 1 ? 13 + Math.min(9, depth) : 13, type.score > 1 ? 1.1 : 0.8, type.score > 1 ? [255, 236, 170] : COLORS[o.color].rgb);
    // UFO は開いても消えず、その場で震えつづける（爆発は連鎖の数を伝えるとき）
    if (o.type === "ufo") G.wreck = { x: o.x, y: o.y, color: o.color };
    G.burstBonus = bonus;
    burst(o.x, o.y, o.color, mult, type.ring, depth, false, false, o.type === "ufo", SHAPES[o.type], o.rot);
    G.burstBonus = 1;
  }
}

// 開いても、まだ火のついていない玉に輪が届かない（連鎖の行きどまり）か
function isLeaf(o) {
  const b = o.from, t = ORB_TYPES[o.type];
  const mult = o.color === b.color ? Math.min(MAX_MULT, b.mult * SAME_COLOR_GROW) : 1;
  const R = G.p.ring * t.ring * mult, shape = SHAPES[o.type];
  return !G.orbs.some(q => q !== o && q.fuse <= 0 && shapeHit(o.x, o.y, R, shape, o.rot, q.x, q.y, ORB_TYPES[q.type].r));
}

// 二段玉の1回目：外の殻が割れる
function crack(o) {
  sparks(o.x, o.y, [230, 230, 255], 22, 0, 0.3, 18);
  addText("あと1回", o.x, o.y - 16, 11, 0.8, [230, 230, 255]);
  sfx.crack();
}

// UFO の爆発：ドット絵の火の玉と破片と煙。花火の光（加算）ではなく、ふつうに塗る。
// 花火で使っていないオレンジを基調にする
const BOOM_COLORS = [[255, 214, 150], [255, 160, 50], [240, 112, 24], [176, 64, 18]];
function blowWreck() {
  if (!G.wreck) return;
  explodeUfo(G.wreck.x, G.wreck.y);
  sfx.explode();
  G.wreck = null;
}
function explodeUfo(x, y) {
  G.booms = G.booms || [];
  for (let i = 0; i < 34; i++) {
    const a = rnd(0, Math.PI * 2), v = rnd(30, 150);
    G.booms.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: 0, life: rnd(0.5, 1.1), s: rndInt(1, 3) * 2, kind: "fire" });
  }
  for (let i = 0; i < 8; i++) { // 円盤の破片（銀色、くるくる落ちる）
    const a = rnd(-Math.PI, 0), v = rnd(60, 130);
    G.booms.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rnd(1, 1.6), s: 4, kind: "metal" });
  }
  for (let i = 0; i < 10; i++) { // 煙（あとからもくもく）
    G.booms.push({ x: x + rnd(-12, 12), y: y + rnd(-8, 8), vx: rnd(-14, 14), vy: rnd(-26, -8), t: -rnd(0.05, 0.3), life: rnd(1.2, 1.8), s: rndInt(4, 7) * 2, kind: "smoke" });
  }
  G.booms.push({ x, y, t: 0, life: 0.32, kind: "flash" });
  G.shake = Math.min(10, G.shake + 5);
}

function updateBooms(dt) {
  if (!G.booms) return;
  for (let i = G.booms.length - 1; i >= 0; i--) {
    const p = G.booms[i];
    if ((p.t += dt) > p.life) { G.booms.splice(i, 1); continue; }
    if (p.t < 0 || p.kind === "flash") continue;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === "metal") p.vy += 220 * dt;
    else if (p.kind === "fire") { p.vx *= Math.exp(-3 * dt); p.vy = p.vy * Math.exp(-3 * dt) + 40 * dt; }
    else { p.vx *= Math.exp(-1 * dt); p.vy *= Math.exp(-0.6 * dt); }
  }
}

// 2px のマス目にそろえて描く（観客や町並みと同じドット絵の粒）
function drawBooms(c) {
  if (!G.booms || !G.booms.length) return;
  const q = v => Math.round(v / 2) * 2;
  c.save();
  for (const p of G.booms) {
    if (p.t < 0) continue;
    const k = p.t / p.life;
    if (p.kind === "flash") { // 白い光の玉が、角ばった輪になって広がる
      const r = q(10 + k * 34);
      c.fillStyle = `rgba(255,178,80,${1 - k})`;
      for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; c.fillRect(q(p.x + Math.cos(t) * r) - 2, q(p.y + Math.sin(t) * r) - 2, 4, 4); }
      if (k < 0.4) { const s = q(22 * (1 - k)); c.fillRect(q(p.x) - s / 2, q(p.y) - s / 2, s, s); }
      continue;
    }
    if (p.kind === "smoke") {
      const s = q(p.s * (1 + k * 0.8));
      c.fillStyle = `rgba(${70 + 30 * (1 - k) | 0},${60 + 20 * (1 - k) | 0},${80 | 0},${0.7 * (1 - k)})`;
      c.fillRect(q(p.x) - s / 2, q(p.y) - s / 2, s, s);
      continue;
    }
    if (p.kind === "metal") {
      c.fillStyle = Math.sin(p.t * 20) > 0 ? "#dfe3ef" : "#7c8198";
      c.fillRect(q(p.x) - 2, q(p.y) - 2, 4, 2 + (Math.sin(p.t * 14) > 0 ? 2 : 0));
      continue;
    }
    const col = BOOM_COLORS[Math.min(3, k * 4 | 0)];
    c.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
    c.fillRect(q(p.x) - p.s / 2, q(p.y) - p.s / 2, p.s, p.s);
  }
  c.restore();
}
