"use strict";
// 衛星：引力圏でとらえた弾が星のまわりを公転し、指を離すと流星群になって敵へ飛ぶ

function capture(kind, color, x, y) {
  const w = kind === "heavy" ? 3 : 1;
  if (satWeight() + w > capacity()) return false;
  G.sats.push({ kind, color, x, y });
  sfx.capture();
  G.p.catchT = 0;
  return true;
}
// i 番目の衛星の軌道上の位置。外側の輪ほどゆっくり、輪ごとに向きが逆
function satTarget(i, t) {
  const { ring, k, cap } = slotOf(i);
  const r = starR() + 12 + ring * 11;
  const sp = (1.9 / (1 + ring * .45)) * (ring % 2 ? -1 : 1);
  const a = (k / cap) * TAU + t * sp;
  return { x: G.p.x + Math.cos(a) * r, y: G.p.y + Math.sin(a) * r, a, sp };
}
// 超新星：しばらく押し続けてから放つと、まわりの敵の弾を消し、敵に当てる
function supernova() {
  const R = novaR(lv("nova")), p = G.p, dmg = novaDmg(lv("nova")) * shotDmgMul();
  G.fx.push({ x: p.x, y: p.y, kind: "spike", r: starR() * 3.2, life: .25, max: .25 });
  G.fx.push({ x: p.x, y: p.y, kind: "nova", r0: starR(), r1: R, life: .5, max: .5 });
  G.fx.push({ x: p.x, y: p.y, kind: "ring", r0: starR(), r1: R * .7, life: .3, max: .3, color: "#7fe9ff" });
  for (const b of G.bullets) if (dist2(b, p) < R * R) { b.dead = true; addFx(b.x, b.y, b.color, 1); }
  for (const e of G.enemies) if (!e.dead && dist2(e, p) < (R + e.r) ** 2) damageEnemy(e, dmg, 0);
  if (G.boss && dist2(G.boss, p) < (R + BOSS_R) ** 2) damageBoss(G.boss, dmg, 0);
  shake(5); sfx.nova();
}
function releaseAll() {
  // 超新星：押し続けてたまっていれば、衛星の数に関係なく衝撃波が出る
  if (G.novaC >= 1 && lv("nova")) supernova();
  G.novaC = 0;
  const n = G.sats.length;
  if (!n) return;
  const full = isFull();
  hatKick(full ? 300 : 210, rand(-1, 1) * (full ? 4 : 2.5));
  const id = ++G.batchId;
  G.batches[id] = { kills: 0, crit: full, n };
  if (full) { if (scene === "play") G.rec.crits++; G.fx.push({ x: G.p.x, y: G.p.y, kind: "ring", r0: starR(), r1: starR() * 5, life: .35, max: .35, color: "#ffe7a3" }); }
  const speed = (320 + n * 4) * shotSpeedMul();
  const dm = shotDmgMul() * powerMul(n, G.awake.power);   // パワーの型：まとめて放つほど1つの威力が上がる
  // 狙いは近い敵から順に割り振る
  const targets = G.enemies.filter(e => !e.dead);
  if (G.boss && G.boss.y >= G.boss.ty) targets.push(G.boss);
  targets.sort((a, b) => dist2(a, G.p) - dist2(b, G.p));
  let ti = 0;
  G.sats.forEach((s, i) => {
    const tg = satTarget(i, tNow), dir = Math.sign(tg.sp);
    const vx = -Math.sin(tg.a) * dir, vy = Math.cos(tg.a) * dir;   // 回っていた向き（接線）へ飛び出す
    const mk = (ang, dmg, r) => {
      const c = Math.cos(ang), sn = Math.sin(ang);
      G.shots.push({ x: s.x, y: s.y, vx: (vx * c - vy * sn) * speed, vy: (vx * sn + vy * c) * speed, dmg: dmg * dm, r, color: s.color, kind: s.kind, life: 2 + lv("homing") * .15, age: 0, tg: targets.length ? targets[ti++ % targets.length] : null, batch: id, split: lv("split"), pierce: pierceN(lv("speed")), bounce: G.awake.speed });   // スピードの型：当たると次の敵へはね返る
    };
    if (s.kind === "spark") { mk(-.25, 1, 3.5); mk(0, 1, 3.5); mk(.25, 1, 3.5); }   // きらめき弾は3つに分かれる
    else if (s.kind === "heavy") mk(0, 3, 6);
    else mk(0, 1, 4);
  });
  G.sats = [];
  heroOnce("release");
  sfx.release(n); music.hype(.15);
}
