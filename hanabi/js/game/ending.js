"use strict";
// ひと晩のしめくくり。
// 第九景「大詰め」をクリアするか、アンコールを満開で終えると、観客のアンコールで次の演目へ（最大 ENCORES 回）。
// そうでなければ（アンコールで目標に届かなくても）、スターマインの大団円で気持ちよくお開きにする。

const ENCORES = 99;
const ENCORE_MERCY = 3; // アンコールに入ってから使える泣きの一回の数
const ENDING_LEN = 4.8;

const encoresOf = stage => Math.max(0, stage - PROGRAM.length);

// 演目のクリア後、次にアンコールへ進めるか
const earnsEncore = () => G.stage >= PROGRAM.length && (G.stage === PROGRAM.length || G.lastPerfect) && encoresOf(G.stage) < ENCORES;
// 大詰め以降で、アンコールに進めなければ大団円
const nightEnds = () => G.stage >= PROGRAM.length && !earnsEncore();

function cheerEncore() {
  say(["アンコール！", "アンコール！！", "もう一回！"], 1);
}

function startEnding(missed) {
  endWait(); G.board = null;
  G.mode = "ending";
  G.ended = true;
  G.offerMercy = false; G.encoreOffer = false;
  G.endT = 0;
  G.endNext = 0.3;
  G.endBig = false; G.endSnap = false;
  G.orbs = []; G.clouds = []; G.shells = [];
  say(missed ? ["おしかった！", "最高の夜だった！"] : pickLines(["最高の夜だった！", "また来年も！", "ありがとー！", "たまや〜！", "かぎや〜！"], 3), 1);
}

// スターマイン：小さな花火が次々に上がり、最後に金の大輪
function updateEnding(dt) {
  G.endT += dt;
  if (G.endT < 3.2 && (G.endNext -= dt) <= 0) {
    G.endNext = rnd(0.1, 0.24);
    const x = rnd(50, W - 50), y = rnd(110, 400), c = rndInt(0, 3);
    burst(x, y, c, 1, rnd(1, 1.9), 0, true);
    sfx.boom(rndInt(0, 4), 0.6);
    crowd.cheer = 2; crowd.power = 1;
  }
  if (!G.endBig && G.endT > 3.4) {
    G.endBig = true;
    burst(W / 2, 230, 3, 1, 3.4, 0, true);
    sparks(W / 2, 230, [255, 210, 140], 210, 0, 1.4, 120, 3.2);
    G.flash = 0.7; G.shake = 8;
    sfx.finale(12);
    const n = encoresOf(G.stage);
    addStamp("大団円", W / 2 + (n ? 44 : 0), 260, 84, [255, 214, 150], n ? `アンコール${n}回` : "");
  }
  // シェア画像には、金の大輪が開ききってフラッシュが引いたころの夜空を使う
  if (G.endBig && !G.endSnap && G.endT > 4.3) { G.endSnap = true; snapSky(); }
  if (G.endT > ENDING_LEN) {
    G.mode = "over";
    G.timer = 0;
    showResult();
  }
}
