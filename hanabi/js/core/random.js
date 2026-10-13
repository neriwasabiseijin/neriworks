"use strict";
// シード付き乱数。newGame() でプレイ開始時刻から作るので、毎回ちがう夜空になる。

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(Date.now());
const rnd = (a, b) => a + rng() * (b - a);
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
