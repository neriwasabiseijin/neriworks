"use strict";
// ひと晩の花火大会。ステージは大会のプログラム（演目）で、夜がふけるほど人が集まる。
// 演目の合間は「煙待ち」：煙が晴れるのを待つ間に、場内アナウンスと観客のざわめき。
// 待っている間も盤面は見えるので、作戦を考えられる。引っぱり始めればすぐ始まる。

const PROGRAM = ["宵の口", "大玉あがる", "四色の宴", "二段咲き", "雲間の花", "流れ星", "百花繚乱", "夜半の華", "大詰め"];
const KANJI = "一二三四五六七八九";
const WAIT_LEN = 3.6;     // 合間の長さ（秒）
const WAIT_SAY = 1.0;     // ざわめきが出るころ

// HUD用の短い名前（第三景 四色の宴）
const programShort = n => n <= PROGRAM.length ? `第${KANJI[n - 1]}景 ${PROGRAM[n - 1]}` : `アンコール その${n - PROGRAM.length}`;
const programName = n => n <= PROGRAM.length ? `第${KANJI[n - 1]}景「${PROGRAM[n - 1]}」` : `アンコール その${n - PROGRAM.length}`;

// 演目ごとに夜がふける（19:00 開幕、1演目12分）
function clockFor(n) {
  const m = 19 * 60 + (n - 1) * 12;
  return `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, "0")}`;
}

function startWait(first) {
  G.wait = { t: 0, first, chimed: false, said: false };
  const lines = [
    { s: `${clockFor(G.stage)}　場内アナウンス`, size: 11, dim: true },
    { s: (first ? "おまたせしました " : G.stage > PROGRAM.length ? "ご声援にこたえて " : "つづきまして ") + programName(G.stage), size: 15 },
    { s: `目標 ${G.target}こ`, size: 14 },
  ];
  if (STAGE_NEWS[G.stage]) lines.push({ s: STAGE_NEWS[G.stage], size: 12, news: true });
  G.board = { lines, t: 0, out: -1 };
}

function endWait() {
  if (!G.wait) return;
  G.wait = null;
  if (G.board) G.board.out = 0;
}

function updateWait(dt) {
  if (G.board) {
    G.board.t += dt;
    if (G.board.out >= 0 && (G.board.out += dt) > 0.5) G.board = null;
  }
  const w = G.wait;
  if (!w) return;
  w.t += dt;
  if (!w.chimed && w.t > 0.15) { w.chimed = true; sfx.chime(); }
  if (!w.said && w.t > WAIT_SAY) { w.said = true; cheerNext(w.first); }
  if (w.t > WAIT_LEN) endWait();
}
