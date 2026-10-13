"use strict";
// 毎フレームの更新と、ステージの終わりの判定

function update(dt) {
  // ヒットストップ：大きな瞬間に一瞬だけ止める
  if (G.freeze > 0) { G.freeze -= dt; return; }
  G.t += dt;
  for (const o of G.orbs) {
    if (o.move) updateMover(o, dt);
    o.x = (o.move ? o.mx : o.bx) + Math.sin(G.t * 0.5 + o.ph) * o.amp;
    o.y = o.by + Math.cos(G.t * 0.37 + o.ph) * o.amp * 0.6;
  }
  updateShells(dt);
  updateBursts(dt);
  updateClouds(dt);
  updateFinale(dt);
  updateTutorial(dt);
  updateSparks(dt);
  for (let i = G.stamps.length - 1; i >= 0; i--) if ((G.stamps[i].t += dt) > G.stamps[i].life) G.stamps.splice(i, 1);
  // 連鎖が広がるほど空を少し暗くして、光を際立たせる（フィナーレ直前はさらに暗く＝静）
  const dimTo = G.fin && !G.fin.fired ? 0.55 : G.pending && G.mode === "play" ? Math.min(0.3, G.chainNow * 0.04) : 0;
  G.dim += (dimTo - G.dim) * Math.min(1, dt * (dimTo > G.dim ? 4 : 1.5));
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const tx = G.texts[i];
    tx.life -= dt; tx.y -= dt * 14;
    if (tx.life <= 0) G.texts.splice(i, 1);
  }
  G.flash = Math.max(0, G.flash - dt * 1.6);
  G.shake = Math.max(0, G.shake - dt * 18);
  const glowTo = G.mode === "title" ? 0.25 : G.total ? G.popped / G.total : 0;
  G.glow += (glowTo - G.glow) * Math.min(1, dt * 1.5);

  if (G.mode === "over") demo(dt);
  if (G.mode === "title") titleDemo(dt);
  if (G.mode === "play" && !busy() && G.shells.length === 0) endOfShot();
  updateCheers(dt);
  updateWait(dt);
  if (G.mode === "over" && G.timer > 0 && (G.timer -= dt) <= 0) showResult();
  // ステージの切り替え：幕が下りて、裏で次の夜空を用意して、幕が上がる
  if (G.mode === "clear" && (G.timer -= dt) <= 0) {
    if (nightEnds()) startEnding(false);
    else { G.mode = "trans"; G.trans = { out: true, t: 0 }; }
  }
  if (G.mode === "ending") updateEnding(dt);
  if (G.trans && (G.trans.t += dt) >= (G.trans.out ? TRANS_OUT : TRANS_IN)) {
    if (G.trans.out) {
      G.stage++;
      G.texts = []; G.stamps = []; G.shells = []; G.bursts = [];
      startStage();
      G.mode = "play";
      G.trans = { out: false, t: 0 };
      startWait(false);
    } else G.trans = null;
  }
}

// 1発ぶんの連鎖が終わったとき。
// 目標に届いても、玉が残っていて弾もあれば続けられる（3発あれば必ず全部開ける配置なので、満開をねらえる）
function endOfShot() {
  const n = G.chainNow;
  const ends = G.orbs.length === 0 || G.shots === 0;
  if (G.pending) {
    G.pending = false;
    if (!ends) cheerShot(n);
    if (G.chainNow === 3) addText("3連鎖！", W / 2, 230, 30, 1.2, [255, 236, 170]);
    if (!G.reached && G.popped >= G.target && G.orbs.length > 0 && G.shots > 0) {
      G.reached = true;
      addText("目標達成！", W / 2, 300, 30, 1.8, [255, 236, 170]);
      addText(`のこり${G.orbs.length}こ　全部開けば満開ボーナス`, W / 2, 336, 14, 2.2, [255, 220, 200]);
      sfx.clear();
    }
  }
  if (G.orbs.length === 0) {
    // 満開：全部開いた
    const one = G.shots === SHOTS - 1;
    const bonus = 2000 + G.shots * 1000 + (one ? 3000 : 0);
    G.score += bonus;
    G.perfects = (G.perfects || 0) + 1;
    addStamp("満開", W / 2, 280, 84, [255, 200, 225], one ? "一発" : "");
    addText(`満開ボーナス +${bonus}`, W / 2, 350, 17, 1.8, [255, 236, 210]);
    sfx.sky();
    sfx.clear();
    G.mode = "clear";
    G.timer = 2.8;
    G.lastPerfect = true;
    cheerStage(one ? "ippatsu" : "perfect", n);
    if (earnsEncore()) { cheerEncore(); G.timer = 3.4; }
  } else if (G.shots === 0) {
    if (G.popped >= G.target) {
      addText("おみごと", W / 2, 300, 34, 1.6, [255, 236, 170]);
      if (!G.reached) sfx.clear();
      G.mode = "clear";
      G.timer = 2.4;
      G.lastPerfect = false;
      cheerStage(n <= 2 ? "weak" : "clear", n);
    } else if (G.stage > PROGRAM.length) {
      // アンコールは失敗にしない：届かなくても大団円でお開き
      startEnding(true);
    } else {
      // 観客のため息を見せてからリザルトへ
      G.mode = "over";
      endWait(); G.board = null;
      G.timer = 1.2; // showResult がさらに0.7秒待つ
      cheerStage("over", n);
    }
  }
}

// タイトルとリザルトの裏で、勝手に花火を上げておく
// タイトル：ロゴ（団扇）のまわりで、本編と同じ花火が音を立てずにゆっくり開く。
// タップ前は音が出せないので、音のない「絵」として見せる（ロゴの文字には重ねない）
const TITLE_SPOTS = [[62, 125], [338, 115], [48, 300], [352, 285], [200, 62], [52, 560], [348, 555]];
function titleDemo(dt) {
  if ((G.demoT -= dt) > 0) return;
  G.demoT = rnd(1.1, 2.0);
  let i = rndInt(0, TITLE_SPOTS.length - 1);
  if (i === G.titleSpot) i = (i + 1) % TITLE_SPOTS.length; // 同じ所に続けて開かない
  G.titleSpot = i;
  const [x, y] = TITLE_SPOTS[i];
  burst(x + rnd(-14, 14), y + rnd(-14, 14), rndInt(0, 3), 1, rnd(0.7, 1.05), 0, true, true);
}

function demo(dt) {
  if ((G.demoT -= dt) > 0) return;
  G.demoT = rnd(0.6, 1.3);
  const x = rnd(60, W - 60), y = rnd(120, 360), c = rndInt(0, 3);
  burst(x, y, c, 1, rnd(0.8, 1.4), 0, true);
}
