"use strict";
// 自機（ちいさな星）：成長、被弾、表情（アトラスの動き）の切り替え

function gainXp(n) {
  if (G.viewer) return;
  G.xp += n * DEV.xp;   // 星の恵みで小数になることがある（テスト欄の「経験値」で倍にできる）
  while (G.xp >= xpNeed()) {
    G.xp -= xpNeed(); const before = stageOf(G.level); G.level++; G.pending++;
    G.fx.push({ x: G.p.x, y: G.p.y, kind: "ring", r0: starR(), r1: starR() * (stageOf(G.level) > before ? 6 : 3.5), life: .45, max: .45, color: "#8ff0d2" });
    addFx(G.p.x, G.p.y, "#8ff0d2", 18); sfx.levelUp();
    heroOnce("levelup"); G.lvPulse = 1;   // HUD のレベルとゲージのアイコンも弾ませる
  }
}

// 星の治癒：かけらを決まった数集めるごとに、残りが1つ戻る
function healGem() {
  if (!lv("heal") || G.lives >= lifeMax()) { G.healN = 0; return; }
  if ((G.healN = (G.healN || 0) + 1) < healNeed(lv("heal"))) return;
  G.healN = 0; G.lives++; G.lifeHeal = 1; sfx.chord(true);
  G.fx.push({ x: G.p.x, y: G.p.y, kind: "ring", r0: starR(), r1: starR() * 4, life: .5, max: .5, color: "#ffe7a3" });
}

function hurt() {
  const p = G.p;
  if (p.inv > 0 || scene !== "play" || DEV.inv || G.viewer) return;
  if (G.iceLeft > 0) { // 氷の衣：防いだうえ、まわりの弾を凍らせて消す
    G.iceLeft--; p.inv = 1; iceShatter(p.x, p.y, starR() + G.iceLeft * 4); sfx.ice(); shake(9); hatKick(300, (Math.random() < .5 ? -1 : 1) * 6);
    const R = 40 + lv("ice") * 10; for (const b of G.bullets) if (dist2(b, p) < R * R) { b.dead = true; addFx(b.x, b.y, "#cfeaff", 1); }
    G.fx.push({ x: p.x, y: p.y, kind: "ring", r0: starR(), r1: R, life: .35, max: .35, color: "#cfeaff" });
    return;
  }
  G.lives--; p.inv = 1.6; G.lifeHit = 1.2; hatKick(380, (Math.random() < .5 ? -1 : 1) * 9);
  // 周回中の衛星の半分が散ってなくなる
  const lose = Math.ceil(G.sats.length / 2);
  for (let i = 0; i < lose; i++) { const s = G.sats.pop(); addFx(s.x, s.y, s.color, 2); }
  sfx.hit(); shake(14);   // 被弾した感じがはっきり出るように大きく揺らす
  if (G.lives <= 0) { heroOnce("over"); startDying(); } else heroOnce("hit");
}

function heroOnce(a) { if (G.p.once === "over") return; G.p.once = a; G.p.onceT = 0; }

// いまの動きを決める（hero-anim の試作と同じ決まり：押している間は落ち着いた動き、向きは0.12秒続いたら切り替える）
function updateHeroAnim(dt) {
  const p = G.p;
  p.t += dt; if (p.once) p.onceT += dt; if (p.catchT >= 0) p.catchT += dt;
  const sp = Math.hypot(p.vx, p.vy);
  if (held && sp > 40) {
    const d = Math.abs(p.vx) > Math.abs(p.vy) * 1.2 ? (p.vx > 0 ? "right" : "left") : Math.abs(p.vy) > Math.abs(p.vx) * 1.2 ? (p.vy > 0 ? "down" : "up") : p.dir;
    if (d && d !== p.dir) { p.candT = p.cand === d ? p.candT + dt : 0; p.cand = d; if (p.candT > .12 || !p.dir) { p.dir = d; p.moveT = 0; } } else p.cand = null;
    p.still = 0;
  } else { p.still += dt; if (p.still > .3) p.dir = null; }
  if (p.dir) p.moveT += dt;
  const pose = (a, t) => { p.anim = a; p.animT = t; };
  if (p.once) {
    if (p.once === "over" || p.onceT < atlas.duration("hero", p.once)) return pose(p.once, p.onceT);   // くり返す動き（joy）も1回流したら戻す
    p.once = null;
  }
  const fill = fillRatio();
  if (held && fill >= .2) {
    const tier = fill >= 1 ? "charge3" : fill >= .5 ? "charge2" : "charge1";
    if (tier === "charge1" && p.catchT >= 0 && !atlas.ended("hero", "catch", p.catchT)) return pose("catch", p.catchT);
    return pose(tier, p.t);
  }
  if (p.dir) return pose("move_" + p.dir, p.moveT);
  pose(G.lives === 1 && scene === "play" ? "pinch" : "idle", p.t);
}

// 移動の光の尾（スプライトに焼かず、移動の向きに沿って別に描く）
function updateTrail(dt) {
  const p = G.p, tr = p.trail;
  tr.push({ x: p.x, y: p.y, life: .22 });
  for (const q of tr) q.life -= dt;
  while (tr.length && tr[0].life <= 0) tr.shift();
}
