"use strict";
// 雲：火の玉の手前にかかって見えにくくする。花火の輪にふれたところから散っていく。

function makeClouds(p, orbs) {
  const clouds = [];
  for (let i = 0; i < p.clouds && orbs.length; i++) {
    const o = orbs[rndInt(0, orbs.length - 1)]; // 火の玉の上にかかるように置く
    const puffs = [];
    const n = rndInt(9, 13), w = rnd(140, 190);
    for (let k = 0; k < n; k++) {
      const f = k / (n - 1) - 0.5;
      const mid = 1 - Math.abs(f) * 2; // まんなかほど大きく、上に盛り上がる
      puffs.push({ dx: f * w + rnd(-10, 10), dy: rnd(-8, 12) - mid * 18, r: rnd(26, 36) * (0.6 + mid * 0.5),
        gone: false, vx: 0, vy: 0, a: 1, tint: null, tk: 0 });
    }
    clouds.push({ x: Math.max(100, Math.min(W - 100, o.bx + rnd(-15, 15))), y: o.by + rnd(-6, 6), vx: rnd(3, 7) * (rng() < 0.5 ? -1 : 1), puffs, cleared: false });
  }
  return clouds;
}

function updateClouds(dt) {
  for (const cl of G.clouds) {
    cl.x += cl.vx * dt;
    for (const pf of cl.puffs) {
      const px = cl.x + pf.dx, py = cl.y + pf.dy;
      if (!pf.gone) {
        for (const b of G.bursts) {
          if (b.demo) continue;
          // 爆風は光の輪より広く届く（1発でしっかり散らせるように）
          const r = b.R * CLOUD_BLAST * easeOut(Math.min(1, b.t / b.grow));
          const d = Math.hypot(px - b.x, py - b.y);
          if (d > r + pf.r * 0.5) continue;
          pf.gone = true;
          pf.tint = COLORS[b.color].rgb; pf.tk = 1; // 花火の色に照らされて散る
          const k = 90 / Math.max(10, d);
          pf.vx = (px - b.x) * k + rnd(-10, 10);
          pf.vy = (py - b.y) * k + rnd(-10, 10);
          break;
        }
      } else if (pf.a > 0) {
        pf.dx += pf.vx * dt; pf.dy += pf.vy * dt;
        pf.vx *= Math.exp(-2 * dt); pf.vy *= Math.exp(-2 * dt);
        pf.r += dt * 14;
        pf.a -= dt * 0.8;
        pf.tk = Math.max(0, pf.tk - dt * 1.5);
      }
    }
    // 8割散ったら、残りも一気に吹き飛んで「晴ッ」
    if (!cl.cleared && cl.puffs.filter(pf => pf.gone).length >= cl.puffs.length * CLOUD_CLEAR) {
      cl.cleared = true;
      for (const pf of cl.puffs) {
        if (pf.gone) { pf.vx *= 1.8; pf.vy *= 1.8; pf.a = Math.min(pf.a, 0.8); continue; }
        pf.gone = true;
        pf.vx = pf.dx * 4 + rnd(-30, 30);
        pf.vy = (pf.dy + 8) * 4 + rnd(-30, 30);
        pf.tint = [220, 235, 255]; pf.tk = 1;
      }
      const sx = Math.max(90, Math.min(W - 90, cl.x)), sy = Math.max(150, cl.y);
      sparks(sx, sy, [225, 240, 255], 70, 0, 0.3, 30, 0.9);
      G.score += 300;
      G.freeze = Math.max(G.freeze, 0.05);
      G.flash = Math.min(0.6, G.flash + 0.25);
      cheerOne(pick(["晴れたー！", "雲が消えた！", "見えた見えた！"]));
      addStamp("晴ッ", sx, sy, 76, [230, 242, 255], "+300");
      sfx.sky();
    }
  }
  G.clouds = G.clouds.filter(cl => cl.puffs.some(pf => pf.a > 0) && cl.x > -200 && cl.x < W + 200);
}

function drawClouds(c) {
  const lit = G.glow;
  for (const cl of G.clouds) {
    // 影の層（玉の光をしっかり隠す）→ 明るい縁の層、の順に重ねる
    for (const pf of cl.puffs) {
      if (pf.a <= 0) continue;
      const x = cl.x + pf.dx, y = cl.y + pf.dy, a = Math.max(0, pf.a);
      const g = c.createRadialGradient(x, y, pf.r * 0.2, x, y, pf.r * 1.15);
      g.addColorStop(0, `rgba(30,30,58,${a})`);
      g.addColorStop(0.75, `rgba(30,30,58,${0.92 * a})`);
      g.addColorStop(1, "rgba(30,30,58,0)");
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, pf.r * 1.15, 0, Math.PI * 2); c.fill();
    }
    for (const pf of cl.puffs) {
      if (pf.a <= 0) continue;
      const x = cl.x + pf.dx, y = cl.y + pf.dy, a = Math.max(0, pf.a);
      // 下から町の灯りと花火で照らされる
      const t = pf.tint && pf.tk > 0 ? pf.tint : [150, 120, 190];
      const k = pf.tk > 0 ? 0.55 * pf.tk : 0.16 + lit * 0.2;
      const g = c.createRadialGradient(x, y + pf.r * 0.55, 0, x, y + pf.r * 0.4, pf.r);
      g.addColorStop(0, `rgba(${t[0]},${t[1]},${t[2]},${k * a})`);
      g.addColorStop(1, `rgba(${t[0]},${t[1]},${t[2]},0)`);
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, pf.r, 0, Math.PI * 2); c.fill();
    }
  }
}
