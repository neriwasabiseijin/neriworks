"use strict";
// 1フレームの更新（プレイ中とチュートリアル）

let shakeAmt = 0;
const CORPSE_FADE = .12;
function shake(n) { shakeAmt = Math.max(shakeAmt, n); }

function startDying() { scene = "dying"; G.dyingT = 0; releaseInput(); G.sats = []; music.muffle(true); }

function update(dt) {
  tNow += dt;
  shakeAmt = Math.max(0, shakeAmt - dt * 30);
  if (G) { G.flash = Math.max(0, G.flash - dt); G.lifeHit = Math.max(0, G.lifeHit - dt); G.lifeHeal = Math.max(0, (G.lifeHeal || 0) - dt * 1.5); G.gemPulse = Math.max(0, G.gemPulse - dt); G.lvPulse = Math.max(0, (G.lvPulse || 0) - dt); if (G.hitstop > 0) { G.hitstop -= dt; dt *= .15; } }   // 殻が割れた瞬間は少しだけ時間をゆっくりに
  bgStars.forEach(s => { s.y += s.z * 28 * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
  scrollBackground(dt);
  if (!G) return;
  G.texts.forEach(t => { t.life -= dt; t.age = (t.age || 0) + dt; if (t.pop) t.y -= 26 * dt; }); keep(G.texts, t => t.life > 0);   // 文字の知らせはその場で開いて丸まる
  G.fx.forEach(f => {
    f.life -= dt;
    if (f.kind === "suck") { f.x += (f.tx.x - f.x) * Math.min(1, dt * 8); f.y += (f.tx.y - f.y) * Math.min(1, dt * 8); }
    else if (f.kind !== "ring" && f.kind !== "nova" && f.kind !== "spike") { f.x += f.vx * dt; f.y += f.vy * dt; const dmp = f.kind === "star" || f.kind === "shard" ? .92 : .96; f.vx *= dmp; f.vy *= dmp; f.rot = (f.rot || 0) + dt * 6; }
  });
  keep(G.fx, f => f.life > 0); if (G.fx.length > FX_MAX * 1.5) G.fx.splice(0, G.fx.length - FX_MAX * 1.5);
  G.corpses.forEach(c => { c.at += dt; c.x += c.vx * dt; c.y += c.vy * dt; });
  // 消える動きは最後のコマで止まるので、そのあと少しふくらみながら消して、キラキラを散らす
  G.corpses.forEach(c => { if (!c.burst && c.at >= atlas.duration(c.type, "die")) { c.burst = true; popBurst(c.x, c.y, c.r, ENEMY[c.type] ? ENEMY[c.type].color : "#ffe7a3"); } });
  keep(G.corpses, c => c.at < atlas.duration(c.type, "die") + CORPSE_FADE);
  const p = G.p;
  // 入力で動いた分から、いまの速さを出す（表情の向きと光の尾に使う）
  p.vx = p.vx * .7 + (p.mvx / Math.max(dt, 1e-3)) * .3; p.vy = p.vy * .7 + (p.mvy / Math.max(dt, 1e-3)) * .3; p.mvx = p.mvy = 0;
  if (scene === "dying") {
    G.dyingT += dt; updateHeroAnim(dt);
    if (G.dyingT > 1.6) gameOver();
    return;
  }
  if (!inGame()) { if (scene === "cards") updateHeroAnim(dt); return; }
  p.inv = Math.max(0, p.inv - dt);
  if (G.viewer) viewerTick(dt);
  updateHeroAnim(dt); updateTrail(dt); updateOrbs(dt); updateHat(dt);

  if (scene === "play") updateWave(dt);
  else updateTutorial(dt);

  // 衛星を軌道へ寄せる
  G.sats.forEach((s, i) => { const tg = satTarget(i, tNow), k = Math.min(1, dt * 14); s.x += (tg.x - s.x) * k; s.y += (tg.y - s.y) * k; if (!s.orbit && dist2(s, tg) < 10 * 10) s.orbit = 1; });

  G.enemies.forEach(e => updateEnemy(e, dt));
  if (G.boss) updateBoss(G.boss, dt);

  // 敵の弾：引力圏に入るととらえられる（とげ弾は不可）。相棒星は弾を消す
  const gR2 = gravR() ** 2;
  const nb = [];
  G.bullets.forEach(b => {
    b.t += dt; b.rot += dt * 2;
    const hom = b.homing + grow(bossLv("chase"), 1.8, 2.6);
    if (hom) { const a = Math.atan2(p.y - b.y, p.x - b.x), sp = Math.hypot(b.vx, b.vy), cur = Math.atan2(b.vy, b.vx); const na = cur + clamp(angDiff(a, cur), -hom * dt, hom * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
    if (b.frost && b.t > .9) { // 凍り弾：少しあとで砕けて、まわりへ広がる
      const n = 5 + Math.ceil(bossLv("frost") / 3), off = rand(0, TAU), sp = 70 * bulletSpeedMul();
      for (let i = 0; i < n; i++) { const a = off + i / n * TAU; nb.push({ ...b, frost: 0, split: 1, t: 0, kind: "normal", color: "#bfe6ff", vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, sz: b.sz * .8 }); }
      G.fx.push({ x: b.x, y: b.y, kind: "ring", r0: 4, r1: 22, life: .25, max: .25, color: "#cfeaff" }); addFx(b.x, b.y, "#cfeaff", 4);
      b.dead = true; return;
    }
    if (G.boss && bossLv("splitb") && !b.split && b.t > .8) { // 大彗星の分裂弾：弾が途中で割れる
      b.split = 1; const sp = Math.hypot(b.vx, b.vy), a = Math.atan2(b.vy, b.vx), n = splitN(bossLv("splitb"));
      for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * .35; nb.push({ ...b, vx: Math.cos(a + o) * sp * splitbSp(bossLv("splitb")), vy: Math.sin(a + o) * sp * splitbSp(bossLv("splitb")) }); }
      b.dead = true; return;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    const d2 = dist2(b, p);
    if (held && b.kind !== "thorn" && d2 < gR2 && capture(b.kind, b.color, b.x, b.y)) { b.dead = true; return; }
    for (let i = 0; i < twinN(); i++) { const tp = twinPos(i); if (dist2(b, tp) < twinR(lv("twin")) ** 2) {
      // 相棒星：とげ弾は消し、ほかの弾は衛星にする（衛星がいっぱいなら消す）
      if (b.kind === "thorn") { b.dead = true; addFx(b.x, b.y, b.color, 3); return; }
      if (capture(b.kind, b.color, b.x, b.y)) { b.dead = true; return; }
      b.dead = true; addFx(b.x, b.y, b.color, 3); return;   // 衛星がいっぱいなら、消して守る
    } }
    const br = (b.kind === "heavy" ? 6 : 4) * (b.sz || 1);
    if (d2 < (hitR() + br) ** 2) { b.dead = true; hurt(); }
  });
  for (const b of nb) G.bullets.push(b);
  keep(G.bullets, b => !b.dead && b.x > -30 && b.x < W + 30 && b.y > -60 && b.y < H + 30);

  // かけら：引力圏が開いている間だけ圏内のものを吸い寄せる（弾と同じく、見た目の輪の中から）。押していないときは触れれば取れる
  const pullR = gravR();
  G.debris.forEach(d => {
    if (d.auto > 0 && (d.auto -= dt) <= 0) d.sp = 160;   // ボスのかけらは少し散ってから自動で集まる
    if (!d.sp) d.life -= dt; else d.life = Math.max(d.life, 2); // 吸い寄せ中は消えない（フェードも止まる）
    d.rot += dt * 3;
    const dd = Math.sqrt(dist2(d, p)) || 1;
    if (d.sp || (held && dd < pullR)) { d.sp = (d.sp || 140) + 700 * dt; d.x += (p.x - d.x) / dd * d.sp * dt; d.y += (p.y - d.y) / dd * d.sp * dt; }
    else { d.vx *= .96; d.vy = d.vy * .96 + 30 * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
    if (dd < starR() + 6) { d.dead = true; sfx.gem(); G.gemPulse = .25; if (scene === "play") { gainXp(gemXp()); healGem(); } else G.tutXp = (G.tutXp || 0) + 1; }
  });
  keep(G.debris, d => !d.dead && d.life > 0 && d.y < H + 20);

  // 周回中の衛星は盾：ぶつかった敵にダメージ（岩くずの本体には効かない）
  keep(G.sats, s => {
    if (!s.orbit) return true;   // 軌道に着くまでは敵に当たらない（撃った敵の目の前でとらえても、その場で割れない）
    for (const e of G.enemies) if (!e.dead && dist2(s, e) < (e.r + 4) ** 2) {
      addFx(s.x, s.y, s.color, 3);
      if (e.type === "itazura") { killEnemy(e, 0); return false; } // いたずら流れ星は衛星に当たると砕ける
      if (e.type !== "iwa") damageEnemy(e, 1, 0);
      return false;
    }
    return true;
  });

  // 放った衛星（流星群）：飛び出してから、狙った敵へ曲がっていく
  const add = [];
  G.shots.forEach(s => {
    s.life -= dt; s.age += dt;
    const gone = t => !t || t.dead || (t.isBoss && G.boss !== t);
    if (gone(s.tg)) {
      let best = null, bd = 1e9; for (const e of G.enemies) { const d = dist2(s, e); if (!e.dead && d < bd && !(s.hit && s.hit.includes(e))) { bd = d; best = e; } }
      if (G.boss && G.boss.y >= G.boss.ty && dist2(s, G.boss) < bd) best = G.boss;
      s.tg = best;
    }
    if (s.tg && s.age > .12) {
      const a = Math.atan2(s.tg.y - s.y, s.tg.x - s.x), cur = Math.atan2(s.vy, s.vx), sp = Math.hypot(s.vx, s.vy);
      const turn = 5 * homingMul() * dt, na = cur + clamp(angDiff(a, cur), -turn, turn);
      s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
    for (const e of G.enemies) if (!e.dead && dist2(s, e) < (e.r + s.r) ** 2) {
      if (s.hit && s.hit.includes(e)) continue;
      damageEnemy(e, s.dmg, s.batch); addFx(s.x, s.y, s.color, 4);
      // 加速：つらぬけるうちは飛びつづける（割れるのは止まったとき）
      if (s.pierce > 0) { s.pierce--; (s.hit = s.hit || []).push(e); s.tg = null; break; }
      // スピードの型：まだ当たっていない近くの敵へはね返る（いなければ止まる）
      if (s.bounce > 0) {
        (s.hit = s.hit || []).push(e);
        let nx = null, nd = 1e9; for (const o of G.enemies) { const d = dist2(s, o); if (!o.dead && o.hp > 0 && d < nd && !s.hit.includes(o)) { nd = d; nx = o; } }
        if (G.boss && G.boss.y >= G.boss.ty && dist2(s, G.boss) < nd) nx = G.boss;
        if (nx) {
          s.bounce--; s.tg = nx; s.age = .12; s.life = Math.max(s.life, 1);
          const a = Math.atan2(nx.y - s.y, nx.x - s.x), sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
          G.fx.push({ x: s.x, y: s.y, kind: "ring", r0: 3, r1: 14, life: .2, max: .2, color: "#9cc8ff" });
          break;
        }
      }
      s.dead = true;
      if (s.split > 0) { // 段階+1個に割れる（割れた粒はもう割れない）
        const a = Math.atan2(s.vy, s.vx), sp = Math.hypot(s.vx, s.vy), n = splitN(s.split);
        for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * .5; add.push({ ...s, dead: false, x: s.x + Math.cos(a) * (e.r + 8), y: s.y + Math.sin(a) * (e.r + 8), vx: Math.cos(a + o) * sp, vy: Math.sin(a + o) * sp, dmg: s.dmg * splitDmg(s.split), split: 0, pierce: 0, bounce: 0, hit: null, r: s.r * .8, life: .8, tg: null, trail: [] }); }
      }
      break;
    }
    if (!s.dead && G.boss && dist2(s, G.boss) < (BOSS_R + 8) ** 2) { s.dead = true; addFx(s.x, s.y, s.color, 3); damageBoss(G.boss, s.dmg, s.batch); }
    s.trail = s.trail || []; s.trail.push(s.x, s.y); if (s.trail.length > 12 + Math.min(lv("speed"), 6) * 2) s.trail.splice(0, 2);
  });
  for (const s of add) G.shots.push(s);
  keep(G.shots, s => !s.dead && s.life > 0 && s.x > -20 && s.x < W + 20 && s.y > -20 && s.y < H + 20);

  // 敵と自機の体当たり
  for (const e of G.enemies) if (!e.dead && dist2(e, p) < (e.r + hitR() + 1) ** 2) { hurt(); if (e.type === "itazura" || e.type === "minion") killEnemy(e, 0); }
  if (G.boss && dist2(G.boss, p) < (BOSS_R + hitR()) ** 2) hurt();
  keep(G.enemies, e => !e.dead && e.y < H + 40 && e.y > -80 && e.x > -60 && e.x < W + 60);

  // 超新星のため：押している間だけたまり、たまりきったら知らせる（離すと0にもどる）
  if (lv("nova") && held && scene === "play" && G.waveState === "run") {
    const was = G.novaC; G.novaC = Math.min(1, G.novaC + dt / NOVA_T);
    if (was < 1 && G.novaC >= 1) { sfx.novaReady(); G.fx.push({ x: p.x, y: p.y, kind: "ring", r0: starR() * 2.4, r1: starR() * 1.4, life: .3, max: .3, color: "#ff9ecf" }); }
  } else if (!held) G.novaC = 0;
  music.setTension(fillRatio(), isFull() && held);
}
function twinPos(i) { const a = tNow * 2.4 * (1 + lv("twin") * .08) + i * TAU / Math.max(1, twinN()); return { x: G.p.x + Math.cos(a) * 46, y: G.p.y + Math.sin(a) * 46 }; }
