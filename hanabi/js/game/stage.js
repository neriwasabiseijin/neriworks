"use strict";
// 火の玉の配置と、クリアできる目標数の計算

// 配置は「群れ」を groups 個つくる。群れの中の玉は、親の玉が開いたときの輪が必ず届く距離に置くので、
// どの群れも根もとの玉で開けば全部つながる。
// 群れどうしはふつうの輪では届かないほど離し、その間にススキ玉・型物・しだれの「橋」をかける。
// 橋は一方通行（向いている側にだけ長くのびる）。打ち上げは1発だけなので、橋のもとの群れのどこから入るかがすべて。
// 1発で満開にできる入り口（答え）がかならずあるように作る（答えは findAnswer で求め、しくじったときのお手本に使う）。
// 景が進むと、橋は「同じ色の連鎖で育ってから開いたときだけ届く」
// ようにする（色の関所）。橋のすぐそばから入ると育たずに開いて届かないので、どこから入って育てるかを読む遊びになる。
// 群れを向いているが絶対に届かない罠ススキと、夜空を向いた映えのススキも混ぜる。
// 二段玉が出る景（アナウンスで知らせる）では、かならず1つ以上置く
// 盤面づくりは重いので、1回作るごとにひと息つける（yield）。先読みでは、毎フレーム少しずつ進める（state.js）
function makeOrbs(p, queue) {
  const it = orbsGen(p, queue);
  for (;;) { const r = it.next(); if (r.done) return r.value; }
}

function* orbsGen(p, queue) {
  const q0 = queue ? queue[0] : 0;
  let best = null;
  let last = null;
  const ufo = p.ufo && rng() < p.ufo; // UFO が出る景かどうかは、景ごとに1回だけ決める
  // 作り直しきれなかったときの選び方：1発で満開にできることをいちばんに
  const score = g => (g.full1 ? 100 : 0) + g.orbs.length + g.bridges * 10 + g.gated * 10 + Math.min(4, g.traps) - Math.max(0, g.full1 - 2) * 3 +
    (p.double && !g.orbs.some(o => o.type === "double") ? -100 : 0);
  // 1発で満開にできない盤面は出さない：見つかるまで作り直す（60回目からは、わなの数などの好みはゆるめる）
  for (let tries = 0; tries < 400; tries++) {
    if (tries) yield;
    const g = growGroups(p);
    Object.assign(g, yield* addBridges(g.orbs, p, q0));
    const hasDouble = !p.double || g.orbs.some(o => o.type === "double");
    if (!perfectable(g.orbs, g.roots, p)) { if (!best) last = g; continue; }
    if (ufo) withUfo(g.orbs, p, g.roots, q0); // UFO も入れた盤面で、入り口を調べる
    const ok = g.orbs.length === p.count && hasDouble && g.bridges >= p.bridges && g.gated >= p.gates;
    Object.assign(g, yield* entryStats(g.orbs, p, q0));
    // 1発で満開にできる入り口は少なく（すぐ見つかりすぎない）、たくさん開くのに届かない入り口（わな）はいくつか
    if ((ok && g.full1 >= 1 && g.full1 <= p.full1Max && g.traps >= p.traps) || (tries >= 60 && g.full1 >= 1 && g.orbs.length === p.count && hasDouble)) {
      yield* dressUp(g.orbs, p, q0); // 罠ススキと映えのススキは、できあがった盤面に最後に足す
      return g.orbs;
    }
    if (!best || score(g) > score(best)) best = g;
  }
  best = best || last; // どの試行も条件を満たさなかったときの保険（ふつうは起きない）
  yield* dressUp(best.orbs, p, q0);
  return best.orbs;
}

const newOrb = (x, y, type, color, p) => ({ bx: x, by: y, mx: x, x, y, type, color, ph: rnd(0, 6.28), amp: p.drift * rnd(0.4, 1),
  hits: 0, hitBy: null, fuse: 0, from: null });

function growGroups(p) {
  const orbs = [], roots = [];
  const inBounds = (x, y) => x >= 26 && x <= W - 26 && y >= SKY_TOP && y <= SKY_BOTTOM;
  // 玉どうしは重ならないように。ほかの群れの玉とは、輪が届かない距離をあける
  // （撃つ玉の色が合って輪がもう一段育っても届かない距離。群れをまたぐのは橋の役目）
  const reachOut = (type, mult) => p.ring * ORB_TYPES[type].ring * Math.min(MAX_MULT, mult * SAME_COLOR_GROW);
  const free = (x, y, gi, type, mult) => !orbs.some(o => {
    const d = Math.hypot(o.bx - x, o.by - y);
    if (d < 32) return true;
    if (o.g === gi) return false;
    return d < Math.max(reachOut(type, mult) + ORB_TYPES[o.type].r, reachOut(o.type, o.mult) + ORB_TYPES[type].r) + p.drift * 2;
  });
  // 根もとの位置：群れどうしは離す
  for (let gi = 0; gi < p.groups; gi++) {
    for (let k = 0; k < 80; k++) {
      const x = rnd(50, W - 50), y = rnd(SKY_TOP + 20, SKY_BOTTOM - 20);
      if (roots.some(r => Math.hypot(r.bx - x, r.by - y) < 150) || !free(x, y, gi, "normal", 1)) continue;
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
    const mult = color === parent.color ? Math.min(MAX_MULT, parent.mult * SAME_COLOR_GROW) : 1;
    // 親の輪が届き、子の輪も親に届く距離（揺れても、色が合わず輪が育たなくても）。
    // 連鎖の順番しだいで同じ色でも輪が育たずに届くことがあるので、育たない場合で測る。
    // どちらから入ってもつながるので、どこから撃ち込むかで開く順番を選べる
    const d = Math.min(p.ring * ORB_TYPES[parent.type].ring + ORB_TYPES[type].r,
      p.ring * ORB_TYPES[type].ring + ORB_TYPES[parent.type].r) - p.drift;
    const a = rnd(0, Math.PI * 2), dd = d * rnd(0.78, 0.97);
    const x = parent.bx + Math.cos(a) * dd, y = parent.by + Math.sin(a) * dd;
    if (!inBounds(x, y) || !free(x, y, gi, type, mult)) continue;
    if (type === "double") {
      // 二段玉：二段玉どうしは離し、同じ群れの2つ以上の玉の輪が届く所にだけ置く
      if (orbs.some(o => o.type === "double" && Math.hypot(o.bx - x, o.by - y) < 130)) type = "normal";
      else {
        const hitters = group.filter(o => Math.hypot(o.bx - x, o.by - y) <= p.ring * ORB_TYPES[o.type].ring + ORB_TYPES.double.r - p.drift);
        if (hitters.length < 2) type = "normal";
      }
    }
    if (type === "double") doubles++;
    const o = newOrb(x, y, type, color, p);
    o.g = gi;
    o.parent = parent;
    o.mult = mult;
    orbs.push(o);
  }
  // 星玉（点が高い）は1ステージに必ず1つ以上。どこから入るかで、最後に開けられるかが決まる
  if (!orbs.some(o => o.type === "star")) {
    const c = orbs.filter(o => o.type === "normal" && o.parent);
    if (c.length) c[rndInt(0, c.length - 1)].type = "star";
  }
  return { orbs, roots };
}

// 1発ぶんの連鎖を、本番と同じ時間の流れで調べ、どの玉がどの倍率で開くかを返す。
// 同じ色で育つかどうかは「どの輪がいちばん先にふれたか」で決まるので、輪の広がる速さと、
// 拍にそろえた導火線（rhythm.js）を1コマ（1/60秒）単位でなぞる。拍の格子は 0.15 秒＝9コマ。
// 同じコマで2つの輪がふれたら、あとから開いた輪が先（本番の updateBursts は新しい輪から調べる）
// jit：本番のコマのずれ（拍ちょうどから0〜1コマ遅れて開く）をためすときの番号。満開の入り口が、それでもくずれないかを見る
function chainInfo(orbs, x, y, color, p, jit) {
  const N = orbs.length, FPS = 60, SLOT = Math.round(BEAT_STEP * FPS);
  const lit = orbs.map(() => false), mult = orbs.map(() => 0), hits = orbs.map(() => 0);
  const fuseF = orbs.map(() => Infinity), from = orbs.map(() => null);
  const taken = new Set([0]); // 打ち上げた玉が開いた拍
  const bursts = [], pend = []; // pend：{f, b, i} 輪 b が玉 i にふれるコマ
  const addBurst = (bx, by, R, shape, rot, f0, grow, col, m, depth, first) => {
    const b = { col, mult: m, depth, k: bursts.length };
    bursts.push(b);
    const life = burstLife(shape, grow);
    for (let i = 0; i < N; i++) {
      if (lit[i]) continue;
      const o = orbs[i], r = ORB_TYPES[o.type].r;
      if (!(shape && shape.drop) && !shapeHit(bx, by, R, shape, rot, o.bx, o.by, r)) continue; // しだれは下で時間ごとに調べる
      // 届く最小の広がり e（0〜1）を二分探索し、そのときの経過時間をコマに直す
      // 丸い輪で届くなら式で出す（形のある輪だけ探す）
      let tau;
      if (shape && shape.drop) {
        // しだれ：垂れていく長さが時間で決まるので、届く時刻を直接さがす
        const hitAt = t => { const q = reachAt(R, shape, grow, t); return shapeHit(bx, by, q.r, shape, rot, o.bx, o.by, r, q.dv); };
        if (!hitAt(life)) continue;
        let lo = 0, hi = life;
        for (let it = 0; it < 16; it++) { const mid = (lo + hi) / 2; if (hitAt(mid)) hi = mid; else lo = mid; }
        tau = hi;
      } else {
        let lo = 0, hi = Math.min(1, Math.max(0, (Math.hypot(o.bx - bx, o.by - by) - r) / R));
        if (shape) {
          // ススキ・型物：火の粉の広がり（物理）に合わせて届く
          if (shape.tri) hi = 1;
          for (let it = 0; it < 12; it++) { const mid = (lo + hi) / 2; if (shapeHit(bx, by, R * mid, shape, rot, o.bx, o.by, r)) hi = mid; else lo = mid; }
          tau = shapeSpreadTime(grow, hi);
        } else tau = grow * (1 - Math.cbrt(1 - hi));
      }
      const n = Math.max(1, Math.ceil(tau * FPS - 1e-6));
      if (n / FPS > life + 1e-9) continue;
      pend.push({ f: f0 + n - (first ? 1 : 0), b, i });
    }
  };
  addBurst(x, y, p.ring, undefined, 0, jit === undefined ? 0 : jit % 2, RING_GROW, color, 1, 0, true);
  let f = 0;
  for (let guard = 0; guard < 400; guard++) {
    let next = Infinity;
    for (const e of pend) if (e.f < next) next = e.f;
    for (let i = 0; i < N; i++) if (!lit[i] && fuseF[i] < next) next = fuseF[i];
    if (next === Infinity) break;
    f = next;
    // このコマでふれる輪：新しい輪から、玉は並び順に
    const now = pend.filter(e => e.f === f).sort((u, v) => v.b.k - u.b.k || u.i - v.i);
    for (let j = pend.length - 1; j >= 0; j--) if (pend[j].f === f) pend.splice(j, 1);
    for (const { b, i } of now) {
      if (lit[i] || fuseF[i] < Infinity) continue;
      if (++hits[i] < ORB_TYPES[orbs[i].type].hits) continue;
      from[i] = b;
      const d = b.depth + 1, rule = d === 1 ? [2, 0.38] : d === 2 ? [2, 0.2] : [1, 0.08];
      let k = Math.ceil((f / FPS + rule[1]) / BEAT_STEP - 1e-6);
      while (k % rule[0] || taken.has(k)) k++;
      taken.add(k);
      fuseF[i] = k * SLOT + (jit !== undefined && (i * 7 + jit) % 3 === 0 ? 1 : 0);
    }
    // このコマで導火線が燃えつきる玉が開く（本番は並びの後ろから）
    for (let i = N - 1; i >= 0; i--) {
      if (lit[i] || fuseF[i] > f) continue;
      const o = orbs[i], t = ORB_TYPES[o.type], b = from[i];
      lit[i] = true;
      mult[i] = o.color === b.col ? Math.min(MAX_MULT, b.mult * SAME_COLOR_GROW) : 1;
      const depth = b.depth + 1;
      const grow = CHAIN_GROW * Math.max(0.5, Math.pow(0.9, depth - 1));
      addBurst(o.bx, o.by, p.ring * t.ring * mult[i], SHAPES[o.type], o.rot, f, grow, o.color, mult[i], depth, false);
    }
  }
  return { lit, mult, depth: from.map(b => b ? b.depth + 1 : 0), n: lit.filter(Boolean).length };
}

// 1発目の色で各玉に撃ち込んだとき：1発で満開になる入り口の数と、
// 色の関所を育ちきらないまま開いてしまう入り口（わな：橋が開くのに届かないのが見える）の数。
// 満開の入り口は、狙いが少しずれても、玉が揺れていても満開になるものだけを数える（答えなのに開かない、をなくす）
function* entryStats(orbs, p, q0) {
  let full1 = 0, traps = 0;
  for (const e of orbs) {
    if (e.orbit || !reachable(e.bx, e.by)) continue; // 動く UFO と、届かない所は入り口にしない
    yield;
    const r = chainInfo(orbs, e.bx, e.by, q0, p);
    if (r.n === orbs.length) { if (steadyFull(orbs, e, p, q0)) full1++; }
    else if (orbs.some((o, i) => o.gate && r.lit[i] && r.mult[i] < o.gate - 0.01)) traps++;
  }
  return { full1, traps };
}

// 答え：狙いが少しずれても満開になる入り口。なければいちばんたくさん開く入り口
function findAnswer(orbs, p, q0) {
  let best = null;
  for (const e of orbs) {
    if (e.orbit || !reachable(e.bx, e.by)) continue; // 動く UFO と、届かない所は入り口にしない
    const n = chainInfo(orbs, e.bx, e.by, q0, p).n;
    if (n === orbs.length && steadyFull(orbs, e, p, q0)) return { x: e.bx, y: e.by, n };
    if (!best || n > best.n) best = { x: e.bx, y: e.by, n };
  }
  return best;
}

// 打ち上げた玉のてっぺんを (x, y) に持っていけるか（傾きと強さの範囲内か）
function reachable(x, y) {
  const h = LAUNCH.y - y, dx = x - LAUNCH.x;
  if (h <= 0) return false;
  const a = Math.atan(dx / (2 * h)), v = Math.sqrt(2 * GRAVITY * h) / Math.cos(a);
  return Math.abs(a) <= MAX_ANGLE && v >= V_MIN && v <= V_MAX;
}

// 狙いを上下左右に5ずらし、玉を揺れの幅のどこかに置いても満開になるか
const AIM_SLACK = [[5, 0], [-5, 0], [0, 5], [0, -5], [3, 3], [-3, -3]];
function steadyFull(orbs, e, p, q0) {
  return AIM_SLACK.every(([dx, dy], v) => {
    // UFO は周回のどこにいても
    const moved = orbs.map((o, i) => o.orbit ? { ...o, bx: o.bx + Math.cos(v * 1.05) * o.orbit.r, by: o.by + Math.sin(v * 1.05) * o.orbit.r * 0.6 }
      : { ...o, bx: o.bx + Math.sin(i * 1.7 + v * 2.3) * o.amp, by: o.by + Math.cos(i * 2.9 + v * 1.1) * o.amp * 0.6 });
    return chainInfo(moved, e.bx + dx, e.by + dy, q0, p, v).n === orbs.length;
  });
}

// 橋：ある群れのふつうの玉をススキ玉・型物・しだれにして、別の群れの玉に届かせる。
// 形の大きさは丸い輪と同じく、同じ色が続いて育つとのびる。
// 色の関所（p.gates 本）：いちばん育ったときだけ届き、一段育ちが足りないと届かない橋。
//   1発目の色でいろいろな入り口から撃ってみて、その玉がいちばん育つ入り口でだけ届く向き・相手を選ぶ。
// 残りの橋は、育たなくても届く（読みやすい橋）。群れ0→1→2…と一筆書きにつながるようにする。
// 見映えの決まり：型物の☆はいつも上向きで1つまで、ススキは下へ向けない（観客に降りかかるように見える）
// 罠ススキ（届かない向きのススキ）は、盤面ができてから withDecoys で足す
const KATA_UP = -Math.PI / 2;
const susukiOk = rot => Math.sin(rot) <= 0.25;
function* addBridges(orbs, p, q0) {
  const gs = [...new Set(orbs.map(o => o.g))];
  const used = new Set();
  // 揺れても届くか／届かないか（相手の玉を揺れの分だけ小さく・大きく見て調べる）
  const reaches = (a, kind, rot, b, mult, slack) => shapeHit(a.bx, a.by, p.ring * mult, SHAPES[kind], rot, b.bx, b.by, ORB_TYPES[b.type].r + slack);
  const rotFor = (kind, a, b) => kind === "kata" ? KATA_UP : kind === "shidare" ? 0 : Math.atan2(b.by - a.by, b.bx - a.bx);
  const kindsFor = () => {
    const ks = ["susuki"];
    if (p.kata && rng() < p.kata && !orbs.some(o => o.type === "kata")) ks.unshift("kata");
    if (p.shidare && rng() < p.shidare) ks.unshift("shidare");
    return ks;
  };
  const shapeOk = (kind, rot) => kind !== "susuki" || susukiOk(rot);
  // 群れ ga から群れ gb への橋。gate なら色の関所にする
  const bridge = function* (ga, gb, gate, need) {
    const from = orbs.filter(o => o.g === ga && o.type === "normal" && o.parent && !used.has(o));
    const to = orbs.filter(o => o.g === gb);
    // 入り口ごとの開く倍率（関所のときだけ使う）。橋がもうかかっているときは、それを渡ってきた連鎖で数える
    const infos = gate ? [] : null;
    if (gate) for (const e of orbs) { infos.push(chainInfo(orbs, e.bx, e.by, q0, p)); yield; }
    const cands = from.slice().sort(() => rng() - 0.5);
    const kinds = kindsFor();
    for (const a of cands) {
      yield;
      let top = 1, low = 0;
      if (gate) {
        const i = orbs.indexOf(a);
        // いちばん育つ倍率は、上流の群れ（need）をすべて開いてきた連鎖で数える
        const ms = infos.filter(r => r.lit[i] && orbs.every((o, j) => !need.includes(o.g) || r.lit[j])).map(r => r.mult[i]);
        if (!ms.length) continue;
        top = Math.max(...ms);
        if (top < 1.29) continue;            // 同じ色が続いて育つ道がない
        if (!infos.some(r => r.lit[i] && r.mult[i] < top - 0.01)) continue; // 育たずに開く入り口（わな）がない
        low = top / SAME_COLOR_GROW;
      }
      for (const kind of kinds) {
        const near = to.slice().sort((u, v) => Math.hypot(u.bx - a.bx, u.by - a.by) - Math.hypot(v.bx - a.bx, v.by - a.by));
        for (const b of near) {
          const rot = rotFor(kind, a, b);
          if (!shapeOk(kind, rot)) continue;
          if (!reaches(a, kind, rot, b, top, -p.drift * 2)) continue;
          // 関所：一段育ちが足りないと、ほかの群れのどの玉にも届かない
          if (gate && orbs.some(q => q.g !== ga && reaches(a, kind, rot, q, low, p.drift * 2))) continue;
          a.type = kind; a.rot = rot;
          if (gate) a.gate = top; // 関所：この倍率まで育って開けば届く
          b.bridged = true; // 橋の行き先は UFO にしない（動くと届かなくなる）
          used.add(a);
          return true;
        }
      }
    }
    return false;
  };
  // 群れの並べ方を全部試し、いちばん多く橋（そのうち関所）がかかった並びにする
  const orders = gs.length === 3 ? [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]] : [[0, 1], [1, 0]];
  for (let i = orders.length - 1; i > 0; i--) { const j = rndInt(0, i); [orders[i], orders[j]] = [orders[j], orders[i]]; }
  const save = () => orbs.map(o => ({ type: o.type, rot: o.rot, bridged: o.bridged, gate: o.gate }));
  const load = st => orbs.forEach((o, i) => Object.assign(o, st[i]));
  const start = save();
  let best = null;
  for (const ord of orders) {
    yield;
    load(start); used.clear();
    let made = 0, gated = 0;
    for (let i = 0; i + 1 < ord.length && made < p.bridges; i++) {
      const gate = gated < p.gates, need = ord.slice(0, i + 1).map(k => gs[k]);
      if (yield* bridge(gs[ord[i]], gs[ord[i + 1]], gate, need)) { made++; if (gate) gated++; }
      else if (gate && (yield* bridge(gs[ord[i]], gs[ord[i + 1]], false, need))) made++;
      else break;
    }
    if (!best || made * 10 + gated > best.made * 10 + best.gated) best = { made, gated, st: save(), used: [...used] };
    if (made >= p.bridges && gated >= p.gates) break;
  }
  load(best.st); used.clear(); best.used.forEach(o => used.add(o));
  const made = best.made, gated = best.gated;
  return { bridges: made, gated };
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

// UFO：めったに出ないレアもの（p.ufo の確率で、出る景が決まる）。ほかの玉の親になっていない枝先の玉を1つだけ、小さな円を周回する UFO にする（つながりを壊さない）。
// 導火線の末尾（連鎖のいちばん深いところ）近くの枝先を選ぶので、段数×倍率で点を稼がせてくれる。
// 周回の中心を親の玉の側へ半径ぶん寄せるので、どこを回っていても親の輪は届く
function withUfo(orbs, p, roots, q0) {
  const parents = new Set(orbs.map(o => o.parent).filter(Boolean));
  const tips = orbs.filter(o => o.parent && !parents.has(o) && !o.bridged && (o.type === "normal" || o.type === "big"));
  if (!tips.length) return orbs;
  // 根もとから撃って、いちばんたくさん開く連鎖での段数をはかる
  let run = null;
  for (const r of roots) { const c = chainInfo(orbs, r.bx, r.by, q0, p); if (!run || c.n > run.n) run = c; }
  const depthOf = o => run.depth[orbs.indexOf(o)];
  tips.sort((u, v) => depthOf(v) - depthOf(u));
  const o = tips[0], q = o.parent;
  const d = Math.hypot(o.bx - q.bx, o.by - q.by), r = Math.min(20, d * 0.4);
  o.type = "ufo";
  o.bx -= (o.bx - q.bx) / d * r; o.by -= (o.by - q.by) / d * r;
  o.orbit = { r, w: rnd(1.6, 2.2) * (rng() < 0.5 ? -1 : 1) };
  o.amp = 0;
  return orbs;
}

// 映え：枝先の玉をいくつか、どこへも届かない向き（夜空のあいている方）にのびるススキにする。
function* withFlair(orbs, p, keep) {
  const parents = new Set(orbs.map(o => o.parent).filter(Boolean));
  const tips = orbs.filter(o => o.parent && !parents.has(o) && !o.bridged && o.type === "normal").sort(() => rng() - 0.5);
  const far = p.ring * MAX_MULT + p.drift * 2;
  let made = 0;
  for (const a of tips) {
    if (made >= p.flair) break;
    for (let k = 0; k < 8; k++) {
      const rot = rnd(-Math.PI, Math.PI);
      if (!susukiOk(rot)) continue;
      const L = p.ring * SHAPES.susuki.len, tx = a.bx + Math.cos(rot) * L, ty = a.by + Math.sin(rot) * L;
      if (tx < -20 || tx > W + 20 || ty < 30) continue; // 画面の外へのびすぎない
      if (orbs.some(q => q !== a && shapeHit(a.bx, a.by, far, SHAPES.susuki, rot, q.bx, q.by, ORB_TYPES[q.type].r + p.drift * 2))) continue;
      a.type = "susuki"; a.rot = rot;
      yield;
      if (keep()) made++; else a.type = "normal";
      break;
    }
  }
}

// できあがった盤面に、罠ススキと映えのススキを足す。枝先の玉を使うが、二段玉を割る役などで要ることもあるので、
// 1本ずつ足しては、答えの入り口からいまも満開にできるかを確かめる（できなくなったら元にもどす）
function* dressUp(orbs, p, q0) {
  const e = orbs.find(o => !o.orbit && reachable(o.bx, o.by) && chainInfo(orbs, o.bx, o.by, q0, p).n === orbs.length && steadyFull(orbs, o, p, q0));
  if (!e) return;
  const keep = () => chainInfo(orbs, e.bx, e.by, q0, p).n === orbs.length && steadyFull(orbs, e, p, q0);
  yield* withDecoys(orbs, p, q0, keep);
  yield* withFlair(orbs, p, keep);
}

// 罠ススキ（p.decoys 本）：別の群れの玉のほうを向いているが、どこから入ってどれだけ育って開いても
// 絶対に届かない・かすりもしないススキ。
// どれだけ育つかは、撃つ玉の色で各玉から入ったときの、その玉の倍率のいちばん大きい値で調べる（打ち上げは1発で、色は決まっている）。
// 同じ群れの玉にはふれてもよい（どのみち開く玉なので、つながりは変わらない）
function* withDecoys(orbs, p, q0, keep) {
  if (!p.decoys) return;
  const top = orbs.map(() => 1);
  for (const e of orbs) {
    if (e.orbit) continue;
    yield;
    const r = chainInfo(orbs, e.bx, e.by, q0, p);
    r.mult.forEach((m, i) => { if (m > top[i]) top[i] = m; });
  }
  const parents = new Set(orbs.map(o => o.parent).filter(Boolean));
  const tips = orbs.filter(o => o.parent && !parents.has(o) && !o.bridged && o.type === "normal").sort(() => rng() - 0.5);
  const GRAZE = 10; // かすりもしない余白
  let made = 0;
  for (const a of tips) {
    if (made >= p.decoys) break;
    const i = orbs.indexOf(a);
    const R = p.ring * top[i] + p.drift * 2; // どこから入っても、この大きさより育たない
    const L = R * SHAPES.susuki.len;
    // 向ける相手：届く長さの少し先にいる、ほかの群れの玉
    const cands = orbs.filter(b => b.g !== a.g && b !== a).filter(b => {
      const d = Math.hypot(b.bx - a.bx, b.by - a.by);
      return d > L + ORB_TYPES[b.type].r + GRAZE && d < L * 2 && susukiOk(Math.atan2(b.by - a.by, b.bx - a.bx));
    });
    cands.sort(() => rng() - 0.5);
    for (const b of cands) {
      const rot = Math.atan2(b.by - a.by, b.bx - a.bx);
      if (orbs.some(q => q.g !== a.g && shapeHit(a.bx, a.by, R, SHAPES.susuki, rot, q.bx, q.by, ORB_TYPES[q.type].r + GRAZE))) continue;
      a.type = "susuki"; a.rot = rot; a.decoy = true;
      yield;
      if (keep()) { made++; break; }
      a.type = "normal"; a.decoy = false;
      break; // この玉はススキにすると答えが崩れる
    }
  }
}

// UFO の位置（だ円を描いて周回する）
function ufoPos(o) {
  const a = G.t * o.orbit.w + o.ph;
  return [o.bx + Math.cos(a) * o.orbit.r, o.by + Math.sin(a) * o.orbit.r * 0.6];
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
      if (lit[i] || !shapeHit(b.x, b.y, R, b.shape, b.rot, o.bx, o.by, t.r)) continue;
      if (++hits[i] < t.hits) continue;
      lit[i] = true; n++;
      const mult = o.color === b.color ? Math.min(MAX_MULT, b.mult * SAME_COLOR_GROW) : 1;
      queue.push({ x: o.bx, y: o.by, color: o.color, mult, ring: t.ring, shape: SHAPES[o.type], rot: o.rot });
    }
  }
  return n;
}

// 1発を欲ばりに撃ったときに開く数を調べ、目標がそれを超えないようにする
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
  const margin = orbs.some(o => o.orbit) ? 0.85 : 0.9; // UFO があると読みどおりにいかないので、少し甘く
  return Math.max(3, Math.min(want, Math.floor(got * margin)));
}
