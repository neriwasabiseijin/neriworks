"use strict";
// ボス：大彗星（5波ごと）。頭の核は氷の殻に覆われ、一度にたくさん当てると割れてしばらくむき出しになる。
// 攻撃は 輪 → 渦巻き → 尾を振ってまき散らす を順に繰り返す。
// 技（BOSS_TECHS）＝前の大彗星から引き継いだもの ＋ 選ばれなかったカードに付いていたもの ＋ 1体目だけ自分で1つ持ってくるもの（同じ技は9段階まで）
// 体力と殻は何体目かだけで決まる（技では増えない）

const BOSS_LV_MAX = CARD_MAX;
function bossDeck() {
  const deck = G.bossCards.slice(), add = k => { if (deck.filter(c => c === k).length < BOSS_LV_MAX) { deck.push(k); return true; } return false; };
  const fresh = [];
  for (const k of G.stash) if (add(k)) fresh.push(k);
  const free = TECH_KEYS.filter(k => deck.filter(c => c === k).length < BOSS_LV_MAX);
  if (G.bossCount === 0 && free.length && !G.viewer) { const k = pick(free); add(k); fresh.push(k); }
  return { deck, fresh };
}
function spawnBoss() {
  const n = G.bossCount + 1;
  const { deck: cards, fresh } = bossDeck(); G.stash = []; G.bossCards = cards.slice();
  const lvs = {}; for (const c of cards) lvs[c] = (lvs[c] || 0) + 1;
  const shellMax = 10 * (1 + n * .15);
  const hp = 72 + n * 45;   // 育った自機で25〜35秒ほどの戦いになる体力
  G.boss = { isBoss: true, type: "boss", r: BOSS_R, x: W / 2, y: -80, ty: 215, hp, hpMax: hp, dashT: 3, shell: shellMax, shellMax, broken: 0, t: 0, phase: 0, phaseT: 0, cards, lv: lvs, n,
             minionT: 2, twinA: 0, twinFire: 1, dir: 1, anim: "fly", at: 0, hd: Math.PI / 2, sp: 0, cnt: 0 };
  if (!G.viewer) { music.setBoss(true, cards.length); sfx.bossIn(); }
}
const bossTwinN = () => Math.ceil(bossLv("kid") / 3);
// 大彗星が撃つ弾：凍り弾がまざる
function bossFire(x, y, a, sp, kind) { const q = fire(x, y, a, sp, kind); if (bossLv("frost") && kind !== "thorn" && Math.random() < frostRate(bossLv("frost"))) { q.frost = 1; q.split = 1; q.color = "#bfe6ff"; } return q; }
function bossTwin(b, i) { const a = b.twinA + i * TAU / bossTwinN(); return { x: b.x + Math.cos(a) * 75, y: b.y + Math.sin(a) * 40 }; }

function updateBoss(b, dt) {
  b.t += dt; b.at += dt;
  const base = b.broken > 0 ? "broken" : "fly";
  if ((b.anim === "hit" || b.anim === "act") && b.at >= atlas.duration("boss", b.anim)) setAnim(b, base);
  else if ((b.anim === "fly" || b.anim === "broken") && b.anim !== base) setAnim(b, base);
  if (b.y < b.ty) { b.y += 90 * dt; return; }
  // 早足：動きが速く、ときどき横へ素早く動く
  const mv = 30 * (1 + grow(bossLv("quick"), 1, 1.6)) * (b.dash > 0 ? 4 : 1);
  if (bossLv("quick")) { b.dashT -= dt; if (b.dashT <= 0) { b.dash = .35; b.dashT = rand(2.5, 4) - bossLv("quick") * .15; } }
  if (b.dash > 0) b.dash -= dt;
  b.x += b.dir * mv * dt; if (b.x < 80) { b.x = 80; b.dir = 1; } else if (b.x > W - 80) { b.x = W - 80; b.dir = -1; }
  b.vx = b.dir * mv; atlas.facing(b);
  // 引き寄せ：自機を大彗星のほうへ少しずつ寄せる（近づきすぎたら止める）
  if (bossLv("pull") && scene === "play" && G.waveState === "run") {
    const d = Math.sqrt(dist2(b, G.p)) || 1, v = pullSpeed(bossLv("pull")) * clamp((d - 140) / 60, 0, 1) * dt;
    G.p.x += (b.x - G.p.x) / d * v; G.p.y += (b.y - G.p.y) / d * v;
  }
  // 子分よび：子分を連れてくる。倒されたら、少しして次を呼ぶ
  if (bossLv("minion") && scene === "play") {
    const N = Math.ceil(bossLv("minion") / 3), have = G.enemies.filter(e => e.type === "minion" && !e.dead).length;
    if (have < N) { b.minionT -= dt; if (b.minionT <= 0) { spawnEnemy("minion", { x: b.x, y: b.y + 20, goal: innerPoint(90) }); b.minionT = 3; } }
  }
  b.hd = Math.PI / 2 - b.dir * .3; // 尾は上へなびく（下へ進んでいる向きで描く）
  if (b.broken > 0) {
    const was = b.broken; b.broken -= dt;
    if (was > 1 && b.broken <= 1) sfx.shellForm();   // もどる1秒前から殻がつながりはじめる
    if (b.broken <= 0) {
      b.shell = b.shellMax; sfx.shellBack(); G.fx.push({ x: b.x, y: b.y, kind: "ring", r0: BOSS_R * 2, r1: BOSS_R + 8, life: .3, max: .3, color: "#cfeaff" }); addFx(b.x, b.y, "#cfeaff", 10);
      if (bossLv("ring")) { const k = ringN(bossLv("ring")), off = rand(0, TAU); for (let i = 0; i < k; i++) bossFire(b.x, b.y, off + i / k * TAU, 75, randKind()); }   // 殻の輪
    }
  }
  else b.shell = Math.min(b.shellMax, b.shell + b.shellMax * .35 / (1 + b.t / 15) * dt); // 小出しでは割れない（長引くほど戻りが遅くなり、いつかは割れる）
  const many = 1 + grow(bossLv("barrage"), .75, 1.1);
  const act = () => { if (b.anim !== "hit") setAnim(b, "act"); };
  b.phaseT += dt;
  if (b.phase === 0) { // 輪のように全方向へ
    if (b.phaseT > 1.4) { const k = Math.round(14 * many), off = rand(0, TAU); for (let i = 0; i < k; i++) bossFire(b.x, b.y, off + (i / k) * TAU, 85, randKind()); b.phaseT = 0; act(); if (++b.cnt >= 3) { b.phase = 1; b.cnt = 0; } }
  } else if (b.phase === 1) { // 渦巻き状に撃ち続ける
    b.sp -= dt; if (b.sp <= 0) { const a = b.t * 3.2, arms = many > 1.4 ? 3 : 2; for (let i = 0; i < arms; i++) bossFire(b.x, b.y, a + i * TAU / arms, 90, randKind()); b.sp = .12; }
    if (b.phaseT > 3) { b.phase = 2; b.phaseT = 0; act(); }
  } else { // 尾を振って星くずを広くまき散らす
    b.sp -= dt; if (b.sp <= 0) { const k = Math.round(3 * many); for (let i = 0; i < k; i++) bossFire(b.x + rand(-40, 40), b.y - 20, Math.PI / 2 + rand(-.9, .9), rand(50, 110), Math.random() < .25 ? "heavy" : randKind()); b.sp = .25; }
    if (b.phaseT > 3) { b.phase = 0; b.phaseT = 0; }
  }
  if (bossLv("kid")) { b.twinA += dt * 1.5; b.twinFire -= dt; if (b.twinFire <= 0) { for (let i = 0; i < bossTwinN(); i++) { const p = bossTwin(b, i); bossFire(p.x, p.y, Math.atan2(G.p.y - p.y, G.p.x - p.x), 110, "normal"); } b.twinFire = 1.6; } }
}
function damageBoss(b, dmg, batch) {
  if (b.y < b.ty) return;
  if (b.broken > 0) { b.hp -= dmg; addFx(b.x + rand(-20, 20), b.y + rand(-20, 20), "#ff9ecf", 3); setAnim(b, "hit"); }
  else { b.shell -= dmg; if (b.shell <= 0) shatterShell(b); }
  if (b.hp <= 0) killBoss(b);
}
// 殻が割れた：画面が一瞬白く光り、氷の破片が大きく飛び散る
function shatterShell(b) {
  b.broken = 4; b.shell = 0;
  setAnim(b, "broken");
  sfx.shell(); shake(9); G.flash = .18; G.hitstop = .08;
  G.fx.push({ x: b.x, y: b.y, kind: "ring", r0: BOSS_R, r1: BOSS_R * 3.4, life: .4, max: .4, color: "#ffffff" });
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * TAU + rand(-.15, .15), s = rand(160, 320);
    G.fx.push({ x: b.x + Math.cos(a) * BOSS_R, y: b.y + Math.sin(a) * BOSS_R, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.5, .8), max: .8, color: i % 3 ? "#bfe6ff" : "#ffffff", kind: "shard", size: rand(4, 8), rot: rand(0, TAU) });
  }
  addFx(b.x, b.y, "#cfeaff", 18);
  // 殻はじけ：割れたとき、まわりに弾をまき散らす
  if (bossLv("burst")) { const k = 4 + bossLv("burst") * 2, off = rand(0, TAU); for (let i = 0; i < k; i++) bossFire(b.x, b.y, off + i / k * TAU, 120, randKind()); }
}
function killBoss(b) {
  const pts = 500 * b.n * (1 + b.cards.length * .25);   // 強いボスほど点が高い
  if (scene === "play") { G.score += Math.round(pts); G.rec.bosses++; }
  G.bossCount++;
  scorePop(b.x, b.y, pts, 6);
  addFx(b.x, b.y, "#ffe7a3", 60); shake(8);
  G.corpses.push({ type: "boss", x: b.x, y: b.y, r: b.r, at: 0, flip: b.flip, vx: 0, vy: 0 });
  G.boss = null; music.setBoss(false); sfx.bossDown();
  dropGems(b.x, b.y, 24); G.debris.slice(-24).forEach(d => { d.auto = rand(.35, .6); d.vx *= 3; d.vy = d.vy * 3 - 60; });   // ごほうびは自動で集まる
  endWave();
}
