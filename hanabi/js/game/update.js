"use strict";
// 毎フレームの更新と、ステージの終わりの判定

function update(dt) {
  // ヒットストップ：大きな瞬間に一瞬だけ止める
  if (G.freeze > 0) { G.freeze -= dt; return; }
  G.t += dt;
  pumpStage(3); // 次の景の盤面を、裏で少しずつ作る
  updateRise(dt);
  for (const o of G.orbs) {
    if (o.rise) continue; // 地上から昇っている途中
    if (o.orbit) { if (o.fuse <= 0) [o.x, o.y] = ufoPos(o); continue; } // 導火線に火がついたら止まる（あわてる）
    o.x = o.bx + Math.sin(G.t * 0.5 + o.ph) * o.amp;
    o.y = o.by + Math.cos(G.t * 0.37 + o.ph) * o.amp * 0.6;
  }
  updateFocus(dt);
  updateReplay(dt);
  updateVolley();
  updateShells(dt);
  updateBursts(dt);
  updateBooms(dt);
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
  G.flash = Math.max(0, G.flash - dt * 1.1); // ゆっくり引かせて、点滅に見えないように
  G.shake = Math.max(0, G.shake - dt * 18);
  const glowTo = G.mode === "title" ? 0.25 : G.total ? G.popped / G.total : 0;
  G.glow += (glowTo - G.glow) * Math.min(1, dt * 1.5);

  if (G.mode === "over") demo(dt);
  if (G.mode === "title") titleDemo(dt);
  if (G.mode === "play" && !busy() && G.shells.length === 0) endOfShot();
  updateCheers(dt);
  updateWait(dt);
  if (G.mode === "over" && G.timer > 0 && (G.timer -= dt) <= 0) showResult();
  if (G.mode === "pdone" && (G.timer -= dt) <= 0) { G.mode = "pmenu"; showPractice(); }
  // ステージの切り替え：幕が下りて、裏で次の夜空を用意して、幕が上がる
  if (G.mode === "clear" && (G.timer -= dt) <= 0) {
    $("clearAnswer").hidden = true;
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

// 打ち上げた連鎖が出つくしたとき。打ち上げは1つの景に1回きりなので、ここでその景の結果が決まる
function endOfShot() {
  if (!G.fired) return;
  const n = G.chainNow;
  if (G.pending) {
    G.pending = false;
    if (n === 3) addText("3連鎖！", W / 2, 230, 30, 1.2, [255, 236, 170]);
  }
  if (G.practice) return practiceEnd();
  if (G.orbs.length === 0) {
    // 満開：全部開いた
    const bonus = 3000;
    G.score += bonus;
    G.perfects = (G.perfects || 0) + 1;
    addStamp("満開", W / 2, 280, 84, [255, 200, 225]);
    addText(`満開ボーナス +${bonus}`, W / 2, 350, 17, 1.8, [255, 236, 210]);
    sfx.sky();
    sfx.clear();
    G.mode = "clear";
    G.timer = 2.8;
    G.lastPerfect = true;
    cheerStage("perfect", n);
    if (earnsEncore()) { cheerEncore(); G.timer = 3.4; }
  } else {
    if (G.stage > PROGRAM.length) {
      // アンコールは満開でなければミス。泣きの一回が残っていればリザルトで選べる。なければ大団円でお開き
      G.lastPerfect = false;
      if (G.encoreRetries < ENCORE_MERCY) {
        G.mode = "over";
        G.offerMercy = true; G.encoreOffer = true;
        endWait(); G.board = null;
        G.timer = 1.2;
        cheerStage(G.popped >= G.target ? "clear" : "over", n);
      } else startEnding(true);
    } else if (G.popped >= G.target) {
      addText("おみごと", W / 2, 300, 34, 1.6, [255, 236, 170]);
      sfx.clear();
      G.mode = "clear";
      G.timer = 3.6; // 「お手本を見る」を押せるよう、少し長めに
      G.lastPerfect = false;
      $("clearAnswer").hidden = !G.snap || !G.snap.answer;
      cheerStage(n <= 2 ? "weak" : "clear", n);
    } else {
      // 観客のため息を見せてからリザルトへ
      G.mode = "over";
      G.lastPerfect = false;
      G.offerMercy = true; // 泣きの一回（何度でも。2回目からは点を引く）
      endWait(); G.board = null;
      G.timer = 1.2; // showResult がさらに0.7秒待つ
      cheerStage("over", n);
    }
  }
}

// お手本：しくじった景の、始まったときの盤面で、満開にできる1発を打ち上げて見せる。
// 点や記録は動かさない（見終わったら、リザルトにもどる）
function startReplay() {
  const s = G.snap;
  G.replay = { t: 0, end: 0, keep: { score: G.score, perfects: G.perfects, maxChain: G.maxChain, popped: G.popped, total: G.total, target: G.target },
    aim: aimFor(s.answer.x, s.answer.y) };
  // お手本では玉を揺らさない（計算どおりにつながるように）
  G.orbs = s.orbs.map(o => ({ ...o, rise: null, x: o.bx, y: o.by, amp: 0, orbit: null }));
  G.clouds = []; // 雲は晴らしておく（答えが見えるように）
  G.queue = s.queue.slice();
  G.shots = SHOTS; G.shells = []; G.bursts = []; G.texts = []; G.stamps = []; G.booms = [];
  G.total = G.orbs.length; G.popped = 0; G.chainNow = 0; G.reached = false;
  G.plans = []; G.volley = null; G.fired = false; G.fin = null; G.finDone = false; G.wreck = null;
  G.board = null; G.wait = null; G.focus = null; G.rise = null; G.trans = null;
  G.mode = "replay";
}

function updateReplay(dt) {
  const r = G.replay;
  if (!r || G.mode !== "replay") return;
  r.t += dt;
  if (r.t > 1.2 && !G.plans.length && !G.fired) planShot(r.aim.a, r.aim.w);
  if (r.t > 2.4 && !G.fired) startVolley();
  if (!G.fired || busy() || G.shells.length) return;
  if ((r.end += dt) < 1.6) return;
  Object.assign(G, r.keep);
  G.pending = false; G.chainNow = 0; // お手本の連鎖を持ち越さない
  G.replay = null;
  G.orbs = []; G.bursts = []; G.texts = []; G.stamps = [];
  if (G.practice) { G.mode = "pmenu"; showPractice(); return; }
  if (G.replayThen === "clear") { G.replayThen = null; G.mode = "clear"; G.timer = 0.4; return; } // クリアのあとに見たお手本：次の景へ
  G.mode = "over";
  showResult();
}

// シードで遊んでいるとき：景が終わったら結果だけ見せて、やり直し・お手本・次の景のメニューへ（点は記録しない）
function practiceEnd() {
  G.lastPopped = G.popped;
  if (G.orbs.length === 0) {
    G.score += 3000;
    addStamp("満開", W / 2, 280, 84, [255, 200, 225]);
    sfx.sky(); sfx.clear();
  } else if (G.popped >= G.target) {
    addText("おみごと", W / 2, 300, 34, 1.6, [255, 236, 170]);
    sfx.clear();
  } else addText("とどかず…", W / 2, 300, 30, 1.6, [200, 210, 255]);
  G.mode = "pdone";
  G.timer = G.orbs.length === 0 ? 2.4 : 1.6;
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
