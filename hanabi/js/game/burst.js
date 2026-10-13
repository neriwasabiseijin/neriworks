"use strict";
// 光の輪と連鎖。輪に触れた火の玉は少し遅れて自分も開く。

let burstId = 0;

function burst(x, y, color, mult, ring, depth, demo, quiet) {
  const R = (demo ? 60 : G.p.ring) * ring * mult;
  const grow = depth === 0 ? RING_GROW : CHAIN_GROW * Math.max(0.5, Math.pow(0.9, depth - 1));
  G.bursts.push({ x, y, R, t: 0, grow, color, mult, depth, demo, id: ++burstId });
  sparks(x, y, COLORS[color].rgb, R, depth, grow);
  lightUp(x, y, COLORS[color].rgb, R);
  if (!demo) {
    sfx.boom(depth);
    G.flash = Math.min(0.45, G.flash + 0.08 + depth * 0.02);
    if (depth >= 3) G.shake = Math.min(8, G.shake + 0.6 + depth * 0.25);
  } else if (!quiet) sfx.boom(0, 0.35);
}

const easeOut = t => 1 - Math.pow(1 - t, 3);

function updateBursts(dt) {
  for (let i = G.bursts.length - 1; i >= 0; i--) {
    const b = G.bursts[i];
    b.t += dt;
    if (!b.demo && b.t <= b.grow + RING_HOLD) {
      const r = b.R * easeOut(Math.min(1, b.t / b.grow));
      for (const o of G.orbs) {
        if (o.fuse > 0 || o.hitBy === b.id || Math.hypot(o.x - b.x, o.y - b.y) > r + ORB_TYPES[o.type].r) continue;
        o.hitBy = b.id;
        if (++o.hits < ORB_TYPES[o.type].hits) { crack(o); continue; }
        o.fuse = o.fuseMax = fuseOnBeat(b.depth + 1);
        o.fuseAt = beatAt(o.fuse);
        o.from = b;
        sfx.fuse(b.depth + 1);
      }
    }
    if (b.t > b.grow + RING_HOLD + 0.6) G.bursts.splice(i, 1);
  }
  // 導火線が燃えつきた火の玉が開く
  for (let i = G.orbs.length - 1; i >= 0; i--) {
    const o = G.orbs[i];
    if (o.fuse <= 0) continue;
    o.fuse = beatLeft(o.fuseAt);
    if (o.fuse > 0) continue;
    G.orbs.splice(i, 1);
    const p = o.from, type = ORB_TYPES[o.type];
    const depth = p.depth + 1;
    const same = o.color === p.color;
    const mult = same ? Math.min(MAX_MULT, p.mult * SAME_COLOR_GROW) : 1;
    // 最初に開いた玉で、この1発に初手ボーナスがつくかが決まる
    if (G.chainNow === 0) {
      G.startBonus = same ? START_BONUS : 1;
      if (same) addText(`同色スタート！ 点×${START_BONUS}`, o.x, o.y - 62, 15, 1.6, COLORS[o.color].rgb);
    }
    const pts = Math.round(100 * depth * type.score * (G.startBonus || 1) / 10) * 10;
    G.score += pts;
    G.popped++;
    G.chainNow++;
    G.chainX += o.x; G.chainY += o.y;
    G.maxChain = Math.max(G.maxChain, G.chainNow);
    // 倍率の高い玉は、点の文字も大きく（後ろで開くほど大きな数字が出る）
    addText(`+${pts}`, o.x, o.y - 14, type.score > 1 ? 13 + Math.min(9, depth) : 13, type.score > 1 ? 1.1 : 0.8, type.score > 1 ? [255, 236, 170] : COLORS[o.color].rgb);
    burst(o.x, o.y, o.color, mult, type.ring, depth, false);
  }
}

// 二段玉の1回目：外の殻が割れる
function crack(o) {
  sparks(o.x, o.y, [230, 230, 255], 22, 0, 0.3, 18);
  addText("あと1回", o.x, o.y - 16, 11, 0.8, [230, 230, 255]);
  sfx.crack();
}
