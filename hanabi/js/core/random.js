"use strict";
// シード付き乱数。newGame() でプレイ開始時刻から6けたのシードを作るので、毎回ちがう夜空になる。
// 景ごとの盤面は「シード＋景の番号」だけで決まる（stageSeed）。シードを入れれば同じ景を再現できる

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(Date.now());
const newSeed = () => 100000 + Math.floor(Math.random() * 900000);
const stageSeed = (seed, stage) => Math.imul(seed, 2654435761) + Math.imul(stage, 40503) >>> 0;
const rnd = (a, b) => a + rng() * (b - a);
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
