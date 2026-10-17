"use strict";
// 小さな便利関数

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
// 条件に合うものだけを残す（新しい配列を作らずに詰める。毎フレームのごみを減らす）
function keep(arr, fn) { let j = 0; for (let i = 0; i < arr.length; i++) { const x = arr[i]; if (fn(x)) arr[j++] = x; } arr.length = j; return arr; }
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
// 衛星の i 番目が何番目の輪の何番目か。内側の輪は8個、外へ行くほど4個ずつ増える
function slotOf(i) { let ring = 0, cap = 8, k = i; while (k >= cap) { k -= cap; ring++; cap = 8 + ring * 4; } return { ring, k, cap }; }

// ダブルタップ（0.35秒以内に2回押す）。演出を飛ばすのに使う
function onDoubleTap(el, f) {
  let last = 0;
  el.addEventListener("pointerdown", () => { const t = performance.now(); if (t - last < 350) { last = 0; f(); } else last = t; });
}
