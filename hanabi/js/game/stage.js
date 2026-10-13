"use strict";
// 火の玉の配置と、クリアできる目標数の計算

// 配置は「群れ」を groups 個つくる。群れの中の玉は、親の玉が開いたときの輪が必ず届く距離に置くので、
// どの群れも根もとの玉で開けば全部つながる。つまり3発あれば必ず全部開ける（満開にできる）。
// 同じ色が続く枝は輪が育つぶん間をあけて置くので、どこから撃つか・どの色で撃つかを読む楽しさが残る。
function makeOrbs(p) {
  let best = null;
  for (let tries = 0; tries < 24; tries++) {
    const g = growGroups(p);
    if (g.orbs.length === p.count && perfectable(g.orbs, g.roots, p)) return withMovers(g.orbs, p);
    if (!best || g.orbs.length > best.orbs.length) best = g;
  }
  return withMovers(best.orbs, p);
}

const newOrb = (x, y, type, color, p) => ({ bx: x, by: y, mx: x, x, y, type, color, ph: rnd(0, 6.28), amp: p.drift * rnd(0.4, 1),
  move: 0, wait: 0, hits: 0, hitBy: null, fuse: 0, from: null });

function growGroups(p) {
  const orbs = [], roots = [];
  const inBounds = (x, y) => x >= 26 && x <= W - 26 && y >= SKY_TOP && y <= SKY_BOTTOM;
  // 玉どうしは重ならないように。ほかの群れの玉とは、ふつうの輪では届かない距離をあける
  // （同じ色で輪を育てれば、群れをまたいで巻きこめることもある＝うまい人のごほうび）
  const apart = p.ring + 18 + p.drift;
  const free = (x, y, gi = -1) => !orbs.some(o => {
    const d = Math.hypot(o.bx - x, o.by - y);
    return d < 32 || (o.g !== gi && d < apart);
  });
  // 根もとの位置：群れどうしは離す
  for (let gi = 0; gi < p.groups; gi++) {
    for (let k = 0; k < 80; k++) {
      const x = rnd(50, W - 50), y = rnd(SKY_TOP + 20, SKY_BOTTOM - 20);
      if (roots.some(r => Math.hypot(r.bx - x, r.by - y) < 150) || !free(x, y, gi)) continue;
      const o = newOrb(x, y, "normal", rndInt(0, p.colors - 1), p);
      o.g = gi; o.mult = 1; // mult：根もとから同じ色が続いたときの輪の倍率（撃つ玉の色が合わない最悪の場合で計算）
      orbs.push(o); roots.push(o);
      break;
    }
  }
  let doubles = 0, guard = 0;
  while (orbs.length < p.count && guard++ < 3000) {
    const gi = orbs.length % roots.length;
    const group = orbs.filter(o => o.g === gi);
    const parent = rng() < 0.6 ? group[group.length - 1] : group[rndInt(0, group.length - 1)];
    const roll = rng();
    let type = "normal";
    if (roll < p.star) type = "star";
    else if (roll < p.star + p.big) type = "big";
    else if (roll < p.star + p.big + p.double && doubles < p.doubleMax) type = "double";
    const color = rng() < p.sameColor ? parent.color : rndInt(0, p.colors - 1);
    // 親の輪が届く距離（揺れても届くように余裕をとる）。
    // 子の輪（色が合わない最悪の場合）も親に届く距離にして、群れのどの玉から入っても全部つながるようにする
    // ＝どこから撃ち込むかで開く順番を選べる（高い点の玉を最後に回すのが腕前）
    const reach = Math.min(p.ring * ORB_TYPES[parent.type].ring * parent.mult + ORB_TYPES[type].r,
      p.ring * ORB_TYPES[type].ring + ORB_TYPES[parent.type].r) - p.drift;
    const a = rnd(0, Math.PI * 2), d = reach * rnd(0.78, 0.97);
    const x = parent.bx + Math.cos(a) * d, y = parent.by + Math.sin(a) * d;
    if (!inBounds(x, y) || !free(x, y, gi)) continue;
    if (type === "double") {
      // 二段玉：二段玉どうしは離し、同じ群れの2つ以上の玉の輪が届く所にだけ置く
      if (orbs.some(o => o.type === "double" && Math.hypot(o.bx - x, o.by - y) < 130)) type = "normal";
      else {
        const hitters = group.filter(o => Math.hypot(o.bx - x, o.by - y) <= p.ring * ORB_TYPES[o.type].ring * o.mult + ORB_TYPES.double.r - p.drift);
        if (hitters.length < 2) type = "normal";
      }
    }
    if (type === "double") doubles++;
    const o = newOrb(x, y, type, color, p);
    o.g = gi;
    o.parent = parent;
    o.mult = color === parent.color ? Math.min(MAX_MULT, parent.mult * SAME_COLOR_GROW) : 1;
    orbs.push(o);
  }
  // 星玉（点が高い）は1ステージに必ず1つ以上。どこから入るかで、最後に開けられるかが決まる
  if (!orbs.some(o => o.type === "star")) {
    const c = orbs.filter(o => o.type === "normal" && o.parent);
    if (c.length) c[rndInt(0, c.length - 1)].type = "star";
  }
  return { orbs, roots };
}

// 根もとを順に撃ったら（撃つ玉の色はわざと合わせない）全部開くかを確かめる
function perfectable(orbs, roots, p) {
  const lit = orbs.map(() => false), hits = orbs.map(() => 0);
  for (const r of roots) {
    const i = orbs.indexOf(r);
    if (lit[i]) continue;
    simulate(orbs, lit, hits, r.bx, r.by, (r.color + 1) % p.colors, p);
  }
  return lit.every(Boolean);
}

// 流れ玉にするのは、ほかの玉の親になっていない枝先の玉だけ（つながりを壊さない）。
// 流れていても戻ってくるので、タイミングよく撃てば巻きこめる（後半の腕前の要素）
function withMovers(orbs, p) {
  const parents = new Set(orbs.map(o => o.parent).filter(Boolean));
  for (const o of orbs) {
    if (o.type === "normal" && o.parent && !parents.has(o) && rng() < p.mover) o.move = moverSpeed(p) * (rng() < 0.5 ? -1 : 1);
  }
  return orbs;
}

const moverSpeed = p => rnd(22, 42) * p.moverSpeed;

// 流れ玉：画面の外へ抜けたら、少し間をおいて、ちがう速さで戻ってくる（同じ周期でループさせない）。
// 高さは元の位置の近くに保つので、群れのそばを必ず通り、満開を狙える
function updateMover(o, dt) {
  if (o.wait > 0) {
    if ((o.wait -= dt) > 0) return;
    const dir = rng() < 0.5 ? -1 : 1;
    o.move = moverSpeed(G.p) * dir;
    o.mx = dir > 0 ? -40 : W + 40;
    if (o.by0 === undefined) o.by0 = o.by;
    o.by = Math.max(SKY_TOP, Math.min(SKY_BOTTOM, o.by0 + rnd(-16, 16)));
    return;
  }
  o.mx += o.move * dt * (1 + 0.3 * Math.sin(G.t * 0.7 + o.ph)); // 速さも少しゆらぐ
  if (o.mx < -40 || o.mx > W + 40) o.wait = rnd(0.5, 2.5);
}

// 静止した配置で1発ぶんの連鎖を数える（輪の広がり方は本番と同じ規則）
// hits は二段玉の当たった回数で、発をまたいで持ち越す
function simulate(orbs, lit, hits, x, y, color, p) {
  const queue = [{ x, y, color, mult: 1, ring: 1 }];
  let n = 0;
  while (queue.length) {
    const b = queue.shift();
    const R = p.ring * b.ring * b.mult;
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i], t = ORB_TYPES[o.type];
      if (lit[i] || Math.hypot(o.bx - b.x, o.by - b.y) > R + t.r) continue;
      if (++hits[i] < t.hits) continue;
      lit[i] = true; n++;
      const mult = o.color === b.color ? Math.min(MAX_MULT, b.mult * SAME_COLOR_GROW) : 1;
      queue.push({ x: o.bx, y: o.by, color: o.color, mult, ring: t.ring });
    }
  }
  return n;
}

// 3発を欲ばりに撃ったときに開く数を調べ、目標がそれを超えないようにする
function pickTarget(orbs, p, colors) {
  const lit = orbs.map(() => false), hits = orbs.map(() => 0);
  let got = 0;
  for (const color of colors) {
    let best = -1, bestLit = null, bestHits = null;
    const cands = orbs.filter((_, i) => !lit[i]).map(o => [o.bx, o.by]);
    for (let i = 0; i < 40; i++) cands.push([rnd(30, W - 30), rnd(SKY_TOP, SKY_BOTTOM)]);
    for (const [x, y] of cands) {
      const l = lit.slice(), h = hits.slice();
      const n = simulate(orbs, l, h, x, y, color, p);
      if (n > best) { best = n; bestLit = l; bestHits = h; }
    }
    got += best;
    bestLit.forEach((v, i) => lit[i] = v);
    bestHits.forEach((v, i) => hits[i] = v);
  }
  const want = Math.round(orbs.length * p.ratio);
  const margin = p.mover > 0 ? 0.8 : 0.9; // 流れ玉があると読みどおりにいかないので、少し甘く
  return Math.max(3, Math.min(want, Math.floor(got * margin)));
}
