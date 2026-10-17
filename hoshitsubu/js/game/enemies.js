"use strict";
// 敵と敵の弾。敵は画面の上と左右の上半分から現れる（下からは出さない）

function edgeSpawn() {
  const side = Math.floor(Math.random() * 3);
  if (side === 0) return { x: rand(20, W - 20), y: -20 };
  if (side === 1) return { x: W + 20, y: rand(70, H * .5) };
  return { x: -20, y: rand(70, H * .5) };
}
function innerPoint(minD = 110) {
  for (let i = 0; i < 20; i++) { const q = { x: rand(40, W - 40), y: rand(80, H * .55) }; if (dist2(q, G.p) > minD ** 2) return q; }
  return { x: rand(40, W - 40), y: rand(80, H * .55) };
}
function toward(e, q, sp) { const a = Math.atan2(q.y - e.y, q.x - e.x); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; }
function outward(e, sp) { const a = Math.atan2(e.y - H / 2, e.x - W / 2); e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; }
function setAnim(e, a) { if (e.anim !== a) { e.anim = a; e.at = 0; } }

function spawnEnemy(type, opts = {}) {
  const d = ENEMY[type], diff = 1 + (G.wave - 1) * .06;
  const e = { type, hp: d.hp * (type === "iwa" ? 1 : diff), r: d.r, vx: 0, vy: 0, t: 0, fire: rand(.6, 1.4), state: 0, shots: 0, anim: "fly", at: rand(0, 1), hd: Math.PI / 2, ...edgeSpawn(), ...opts };
  if (type === "chibi" || type === "kui" || type === "tsubu" || type === "minion") { e.goal = e.goal || innerPoint(); toward(e, e.goal, type === "kui" ? 60 : type === "tsubu" || type === "minion" ? 70 : 85); }
  if (type === "baramaki") toward(e, { x: e.y < 0 ? rand(-20, W + 20) : W - e.x, y: e.y < 0 ? H * .45 : clamp(e.y + rand(-60, 60), 60, H * .5) }, 55);
  if (type === "iwa") { e.x = rand(30, W - 30); e.y = -20; toward(e, { x: e.x + rand(-60, 60), y: H + 40 }, 45); }
  if (type === "itazura") {
    // 画面の内側のふちに姿を見せ、約1秒「！」と赤い点線で進路を予告してから突っ込む（途中でねらい直さない）
    const side = Math.floor(Math.random() * 3);
    if (side === 0) { e.x = rand(30, W - 30); e.y = 70; } else { e.x = side === 1 ? W - 16 : 16; e.y = rand(90, H * .5); }
    e.wait = 1.1; e.lock = aim(e); e.hd = e.lock;
    sfx.warn();
  }
  if (e.vx || e.vy) e.hd = Math.atan2(e.vy, e.vx);
  G.enemies.push(e);
  return e;
}
// ちび流星は編隊でまとめて来る（一斉撃墜をねらえる）
function spawnSquad(type, n) {
  const base = edgeSpawn(), goal = innerPoint(), top = base.y < 0;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * 44;   // 重ならないように間をあける
    spawnEnemy(type, { x: base.x + (top ? off : 0), y: base.y + (top ? -Math.abs(off) * .6 : off), goal: { x: clamp(goal.x + off, 24, W - 24), y: clamp(goal.y - Math.abs(off) * .4, 70, H * .55) }, fire: .35 + i * .3 });   // 着いたらすぐ、1体ずつ順に撃つ
  }
}

function bulletSpeedMul() { return (1 + (G.wave - 1) * .025) * (1 + grow(bossLv("fastb"), .5, .8)); }
function fire(x, y, ang, sp, kind = "normal") {
  const b = { x, y, vx: Math.cos(ang) * sp * bulletSpeedMul(), vy: Math.sin(ang) * sp * bulletSpeedMul(), kind, color: kind === "thorn" ? THORN_COLOR : pick(SAT_COLORS), t: 0, homing: 0, split: 0, rot: rand(0, TAU), sz: 1 + grow(bossLv("big"), .75, 1.2) };   // 大玉：大彗星がいる間は弾が大きい
  G.bullets.push(b);
  return b;
}
function aim(e) { return Math.atan2(G.p.y - e.y, G.p.x - e.x); }
function randKind() { const r = Math.random(), t = thornRate(); return r < t ? "thorn" : r < t + .12 ? "spark" : "normal"; }
const shoot = e => { if (e.anim === "fly") setAnim(e, "act"); };

function updateEnemy(e, dt) {
  e.t += dt; e.at += dt;
  // 当たった・撃った（ひと吹き）の動きは一回流したら元に戻す。撃ち続ける・突っ込む・吸い取る間の act は続ける
  const sustained = e.type === "tsubu" || e.type === "itazura" || e.type === "kui";
  if ((e.anim === "hit" || (e.anim === "act" && !sustained)) && e.at >= atlas.duration(e.type, e.anim)) setAnim(e, "fly");
  const F = TUNE.fire;
  switch (e.type) {
    case "chibi":
      if (e.state === 0 && dist2(e, e.goal) < 25) { e.vx = e.vy = 0; e.state = 1; e.t = 0; }
      if (e.state === 1) {
        e.fire -= dt * F; if (e.fire <= 0) { e.shots++; fire(e.x, e.y, aim(e), 110, e.shots % 3 === 0 && thornOn() ? "thorn" : randKind()); e.fire = 1.5; shoot(e); }
        if (e.t > 4.6) { e.state = 2; outward(e, 55); }   // 3発ほど撃ってから、ゆっくり帰る
      }
      break;
    case "baramaki":
      e.fire -= dt * F; if (e.fire <= 0) { const a0 = aim(e); for (let i = -2; i <= 2; i++) fire(e.x, e.y, a0 + i * .3, 95, i === 0 && thornOn() ? "thorn" : randKind()); e.fire = 2; shoot(e); }
      break;
    case "houki":
      toward(e, G.p, 22);
      e.fire -= dt * F; if (e.fire <= 0) { fire(e.x, e.y, aim(e), 70, "normal").homing = 1.2; e.fire = 2.2; shoot(e); }
      break;
    case "iwa":
      e.fire -= dt * F; if (e.fire <= 0) { fire(e.x, e.y, Math.atan2(e.vy, e.vx) + rand(-.5, .5), 30, "heavy"); e.fire = 1.1; }
      break;
    case "itazura":
      if (e.state === 0) { e.wait -= dt; if (e.wait <= 0) { e.vx = Math.cos(e.lock) * 290; e.vy = Math.sin(e.lock) * 290; e.state = 1; setAnim(e, "act"); } }
      break;
    case "kui":
      if (e.state === 0 && dist2(e, e.goal) < 25) { e.vx = e.vy = 0; e.state = 1; e.t = 0; }
      if (e.state === 1) {
        e.fire -= dt * F;
        const near = held && G.sats.length && dist2(e, G.p) < 140 ** 2;
        if (near && e.fire <= 0) {
          const s = G.sats.pop(); G.fx.push({ x: s.x, y: s.y, tx: e, life: .4, color: s.color, kind: "suck" }); sfx.steal(); e.fire = .35;
        }
        if (near) { if (e.anim === "fly") setAnim(e, "act"); } else if (e.anim === "act") setAnim(e, "fly");
        if (e.t > 12) { e.state = 2; outward(e, 50); }
      }
      break;
    case "tsubu": // 約1秒、明るい帯で通り道を予告してから、星粒を2秒ほどまっすぐ大量に撃ち続ける
      if (e.state === 0 && dist2(e, e.goal) < 25) { e.vx = e.vy = 0; e.state = 1; e.t = 0; e.lock = aim(e); }
      else if (e.state === 1) { if (e.t > .9) { e.state = 2; e.t = 0; e.fire = 0; setAnim(e, "act"); } }
      else if (e.state === 2) {
        e.fire -= dt; if (e.fire <= 0) { fire(e.x + Math.cos(e.lock) * 14, e.y + Math.sin(e.lock) * 14, e.lock + rand(-.03, .03), 150, Math.random() < .15 ? "spark" : "normal"); e.fire = .055 / F; }
        if (e.t > 2.2) { e.state = 3; e.t = 0; e.shots++; setAnim(e, "fly"); }
      } else if (e.state === 3) { if (e.t > 2) { if (e.shots >= 2) { e.state = 4; outward(e, 60); } else { e.state = 1; e.t = 0; e.lock = aim(e); } } }
      break;
    case "minion":   // 大彗星の子分（子分よび）：決まった場所まで来て、自機をねらって撃つ
      if (e.goal && dist2(e, e.goal) < 25) { e.vx = e.vy = 0; e.goal = null; }
      e.fire -= dt * F; if (e.fire <= 0) { fire(e.x, e.y, aim(e), 100, randKind()); e.fire = 1.6; }
      break;
  }
  if (G.waveState === "rest" || G.waveState === "leave") outward(e, 150);
  e.x += e.vx * dt; e.y += e.vy * dt;
  // 尾の向き：動いている向きへなめらかに向ける（止まっているときは最後の向きのまま）
  atlas.facing(e);
  if (Math.hypot(e.vx, e.vy) > 5) e.hd += angDiff(Math.atan2(e.vy, e.vx), e.hd) * Math.min(1, dt * 8);
}

// 敵に当てる（岩くずの本体は放った衛星でしか壊れない）
function damageEnemy(e, dmg, batch) {
  e.hp -= dmg;
  if (e.hp <= 0) killEnemy(e, batch); else setAnim(e, "hit");
}

const volleyMul = k => k >= 8 ? 5 : k >= 5 ? 3 : k >= 3 ? 2 : k >= 2 ? 1.5 : 1;
function killEnemy(e, batch) {
  if (e.dead) return;
  e.dead = true;
  let pts = ENEMY[e.type].pts;
  if (batch && G.batches[batch]) {
    const b = G.batches[batch]; b.kills++;
    if (scene === "play") G.rec.bestVolley = Math.max(G.rec.bestVolley, b.kills);
    pts *= volleyMul(b.kills) * (b.crit ? 1.5 : 1) * (1 + b.n / 20);
    sfx.pop(b.kills); music.hype(.1 + b.kills * .04);
  } else sfx.pop(1);
  if (scene === "play") { G.score += Math.round(pts); G.rec.kills++; }
  scorePop(e.x, e.y - 12, pts, pts / ENEMY[e.type].pts);
  addFx(e.x, e.y, ENEMY[e.type].color, 8);
  G.corpses.push({ type: e.type, x: e.x, y: e.y, r: e.r, at: 0, flip: e.flip, vx: e.vx * .3, vy: e.vy * .3 });
  dropGems(e.x, e.y, e.type === "minion" ? 1 : rand(2, 4) | 0);
}
// 倒した敵のかけら＝経験値。衛星にはならない。約6秒で消える（最後の2秒でフェード）
function dropGems(x, y, n) { for (let i = 0; i < n; i++) G.debris.push({ x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-40, 40), vy: rand(-30, 30), life: 6, sp: 0, rot: rand(0, TAU) }); }
