"use strict";
// 連鎖を拍にのせる。開くタイミングをお囃子と同じ拍の格子にそろえて「ドン・ドドン・ドパパパン」にする。
// どの玉がつながるか（パズルの中身）は変えない。変わるのは開く瞬間だけ。
//  - 1〜2段目は8分音符の上、3段目からは16分音符の上で開く（深いほど細かく刻む）
//  - 同じ拍には1つしか開かせない。近く（先に輪にふれた）玉から順に、次の空いた拍へ並べる
//  - プレイヤーの玉は16分の拍で打ち上がり（ヒュ〜の鳴り始め）、てっぺんの間のあと8分の拍で開く
//  - 特大花火は、静けさのあと次の4分音符の頭に落とす
// BGM を切っていても拍の格子は同じように流れる。

const BEAT = { slots: new Set(), paused: 0 };

// 拍の格子の時計（音が使えるときは音の時計、まだなら画面の時計）。
// ポーズ（音量画面）のあいだも音の時計とお囃子は進むので、止めていた分を16分の拍の倍数にそろえて差し引く。
// こうすると再開後も、導火線や開く瞬間は止めた時点の残りのまま、お囃子の拍の上にのり続ける
const beatNow = () => sfx.now() - BEAT.paused;
let pausedAt = 0;
addEventListener("mg:pause", () => { pausedAt = sfx.now(); });
addEventListener("mg:resume", () => { BEAT.paused += Math.ceil((sfx.now() - pausedAt) / BEAT_STEP) * BEAT_STEP; });

// 段ごとの決まり：unit=何個おきの16分の上で開くか、min=最低限の溜め（秒）
const BEAT_RULE = [
  null,
  { unit: 2, min: 0.38 },  // 1段目：ドン（たっぷり溜める）
  { unit: 2, min: 0.2 },   // 2段目：ドドン
  { unit: 1, min: 0.08 },  // 3段目から：パパパン
];

// 拍の格子で、いまから min 秒以上あとの、unit 個おきの16分の拍までの秒数。
// take なら同じ拍に2つ開かないよう、その拍を取っておく
function toBeat(min, unit, take) {
  const now = beatNow();
  let k = Math.ceil((now + min) / BEAT_STEP - 1e-6);
  while (k % unit || (take && BEAT.slots.has(k))) k++;
  if (take) {
    BEAT.slots.add(k);
    // 過ぎた拍は忘れる
    if (BEAT.slots.size > 48) for (const s of BEAT.slots) if (s * BEAT_STEP < now - 1) BEAT.slots.delete(s);
  }
  return k * BEAT_STEP - now;
}

// 引火したときに、開くまでの導火線の長さを決める
function fuseOnBeat(depth) {
  const rule = BEAT_RULE[Math.min(depth, 3)];
  return toBeat(rule.min, rule.unit, true);
}

// 打ち上げ：指をはなしてから、次の16分の拍で「ポン」と上がる
const launchDelay = () => toBeat(0, 1, false);
// プレイヤーの玉：てっぺんの「間」のあと、8分の拍の上で開く
const apexPause = () => toBeat(APEX_PAUSE, 2, true);

// 特大花火：次の4分音符の頭までの秒数（最低 min 秒は待つ）
const waitToBeat = min => toBeat(min, 4, false);

// 拍にのせた待ち時間は、拍の時計で数える（画面のコマ落ちで拍からずれないように）
// beatAt：いまから left 秒後の拍の時刻。beatLeft：その時刻まであと何秒か
const beatAt = left => beatNow() + left;
const beatLeft = at => at - beatNow();
