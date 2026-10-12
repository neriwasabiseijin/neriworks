"use strict";
// Seeded random numbers. newGame() seeds them from the play's start time, so every play is different.

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function seedOf(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
// Separate streams so choices in one (upgrades) don't shift the others (drops, stones).
let rngDrop, rngStone, rngUp;
function nextDropTier() {
  const total = DROP_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = rngDrop() * total;
  for (let t = 1; t < DROP_WEIGHTS.length; t++) { r -= DROP_WEIGHTS[t]; if (r < 0) return t; }
  return 1;
}
