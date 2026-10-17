"use strict";
// 波（エンドレス）。1波およそ20秒、5波ごとにボス。ボスを倒すごとにとげ弾と新しい敵が加わる

function unlocked() { return Object.keys(ENEMY).filter(k => ENEMY[k].wave <= G.wave); }
const alive = t => G.enemies.filter(e => e.type === t && !e.dead).length;
function pickEnemy() {
  const w = G.wave;
  const weights = unlocked().map(k => {
    if (k === "itazura") return [k, Math.min(1, .2 + (w - 6) * .12)];
    if (k === "kui") return [k, alive("kui") >= (w >= 16 ? 2 : 1) ? 0 : Math.min(.8, .15 + (w - 11) * .1)];
    if (k === "tsubu") return [k, alive("tsubu") >= (w >= 8 ? 2 : 1) ? 0 : Math.min(.7, .3 + (w - 3) * .08)];
    return [k, 1];
  });
  let r = Math.random() * weights.reduce((a, x) => a + x[1], 0);
  for (const [k, wt] of weights) { r -= wt; if (r <= 0) return k; }
  return "chibi";
}
const waveTime = () => DEV.short ? 8 : WAVE_TIME;   // テスト欄の「波を短く」
const isBossWave = () => G.wave % 5 === 0;
// ボスを倒した直後の1波は少し易しくして、ひと息つかせる
const easeMul = () => G.wave % 5 === 1 && G.wave > 1 ? .75 : 1;

function startWave() {
  G.waveT = 0; G.waveState = "run"; G.spawnT = 1; G.iceLeft = iceN();
  floatText(W / 2, 260, isBossWave() ? "第" + G.wave + "波　大彗星" : "第" + G.wave + "波", "#f4f0ff", 1.6, 18);
  if (isBossWave()) G.bossIn = 1.6;   // 波の見出しが消えてから大彗星が来る
}
// 波の終わり：敵は去り、弾は消え、上から「休憩ライン」が降りてくる。星がラインにふれたらレベルアップの確認へ
const REST_SPEED = 75, SPAWN_STOP = 6;   // 終わる6秒前からは新しい敵を出さない（出てすぐ帰るように見えないように）
function endWave() {
  if (DEV.lvup) { G.level += DEV.lvup; G.pending += DEV.lvup; }   // テスト欄：波の終わりに必ずレベルアップ
  G.waveState = "rest"; G.restY = -16; G.restT = 0; G.endT = 0;   // ラインは画面の上の外から、ふわっと現れながら降りてくる
  G.bullets.forEach(b => addFx(b.x, b.y, b.color, 1));
  G.bullets = [];
  // まだ画面に入りきっていない敵は、そのまま消す（顔を出してすぐ帰るのを見せない）
  G.enemies = G.enemies.filter(e => e.x > -4 && e.x < W + 4 && e.y > -4 && e.y < H + 4);
}
function updateWave(dt) {
  if (G.viewer) return;   // カードビューワー：波は進めない
  updateHome(dt);
  if (G.waveState === "run") {
    G.waveT += dt;
    if (G.bossIn > 0 && (G.bossIn -= dt) <= 0) spawnBoss();
    if (!isBossWave()) {
      G.spawnT -= dt;
      const maxE = Math.round(Math.min(14, 4 + Math.floor(G.wave / 2)) * TUNE.enemy * easeMul());   // 後半は数ではなく、とげ弾や強い敵で手ごわくする（多すぎると重い）
      // 波の終わりぎわには新しい敵を出さない（出てすぐ帰っていくように見えるため）
      if (G.spawnT <= 0 && G.enemies.length < maxE && G.waveT < waveTime() - SPAWN_STOP) {
        const k = pickEnemy(), interval = Math.max(.4, 1.7 - G.wave * .07) / (TUNE.enemy * easeMul());
        if (k === "chibi") { spawnSquad(k, Math.min(5, 3 + Math.floor(G.wave / 4))); G.spawnT = interval * 2.2; }
        else { spawnEnemy(k); G.spawnT = interval; }
      }
      // 時間切れ、または新しい敵が出なくなったあとで敵を全部倒したら、すぐ休憩ラインへ
      // （全部倒したときは、かけらを拾う間として1秒待つ）
      const clear = G.waveT >= waveTime() - SPAWN_STOP && !G.enemies.some(e => !e.dead);
      G.clearT = clear ? (G.clearT || 0) + dt : 0;
      if (G.waveT >= waveTime() || G.clearT >= 1) { G.clearT = 0; endWave(); }
    }
  } else if (G.waveState === "rest") {
    G.restY += REST_SPEED * dt; G.restT += dt;
    if (Math.abs(G.p.y - G.restY) < starR() + 4 || G.restY > H + 10) { // ラインは画面の下まで降りるので、いつかは必ずふれる
      G.waveState = "leave"; G.endT = .4; sfx.chord(true);
      G.fx.push({ x: G.p.x, y: G.p.y, kind: "ring", r0: starR(), r1: starR() * 4, life: .4, max: .4, color: "#ffe7a3" });
    }
  } else if (G.waveState === "rename") {
    updateRename(dt);
  } else if (G.waveState === "leave") {
    G.endT -= dt;
    // 押したままなら、離すまで待つ（6秒たったら放つ）
    if (G.endT <= -6 && held) { releaseAll(); releaseInput(); }
    if (G.endT <= 0 && !held) {
      // 拾われなかったかけらも、次の波へ進むときに消える
      G.debris.forEach(d => addFx(d.x, d.y, "#8ff0d2", 1)); G.debris = [];
      if (G.pending > 0) showCards(); else nextWave();
    }
  }
}
// カード選びのあと：名前が変わっていれば名乗りの演出をはさんでから次の波へ
function afterCards() { scene = "play"; if (G.renamed || G.awakeMsgs.length) startRename(); else goHome(); }
// スタート地点へすっと戻りながら次の波を始める（戻るあいだは指で動かせない）
const HOME_T = .7;
function goHome() { G.home = { t: 0, x0: G.p.x, y0: G.p.y }; nextWave(); }
function updateHome(dt) {
  const h = G.home; if (!h) return;
  h.t += dt; const k = clamp(h.t / HOME_T, 0, 1), e = 1 - (1 - k) ** 3;
  G.p.x = h.x0 + (W / 2 - h.x0) * e; G.p.y = h.y0 + (H * .72 - h.y0) * e;
  if (k >= 1) G.home = null;
}
function nextWave() { scene = "play"; G.wave++; G.enemies = []; startWave(); }
