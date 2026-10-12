"use strict";
// Game constants: board size, monster sizes and points, drop weights, upgrade definitions.

const { Engine, Bodies, Composite, Events, Body } = Matter;

const W = 360, H = 640;
// Fonts (loaded from Google Fonts; fall back to system rounded fonts offline)
const FONT = "'M PLUS Rounded 1c','Hiragino Maru Gothic ProN','Meiryo',sans-serif";
const POP = "'Mochiy Pop One','M PLUS Rounded 1c',sans-serif";
const BOX_L = 14, BOX_R = 346, BOX_T = 104, BOX_B = 626;
const DROP_Y = 142, DANGER_Y = 172;
const RADII = [0, 20, 27, 35, 44, 54, 65, 77, 90];
const POINTS = [0, 0, 2, 5, 10, 20, 40, 80, 160];
const KING_BONUS = 400;
const NAMES = ["", "アクアスライム", "リーフボール", "スパークひよこ", "ムーンラビ", "フレイムフォックス", "シャドウインプ", "クリムゾンドラゴ", "キングドラゴン"];
const COLORS = ["", "#3fa9ff", "#47c76a", "#ffe066", "#ff7fc0", "#ff8a2a", "#9b6bff", "#ff3d4a", "#ffb000"];
const DROP_WEIGHTS = [0, 32, 30, 24, 14];
const DANGER_LIMIT = 2.0;
const STONE_START = 10; // drops before the first cursed stone

const UPGRADES = {
  shock:   { name: "衝撃波",       max: 3, glyph: "衝", color: "#5ad1ff", desc: (l) => `進化のたびに衝撃波。まわりを押しのけ、岩を砕く範囲が広がる（範囲 ${30 + l * 22}）` + (l >= 3 ? "。岩に2ダメージ" : "") },
  magnet:  { name: "磁力",         max: 3, glyph: "磁", color: "#ff6b8b", desc: (l) => `近くの同じモンスター同士がそっと引き寄せ合う（強さ ${l}）` },
  bomb:    { name: "ボム",         max: 3, glyph: "爆", color: "#ff9a3d", desc: (l) => `${bombEvery(l)}回に1回ボムが来る。岩と小さいモンスター（${l + 2}段階目まで）を吹き飛ばす` },
  rainbow: { name: "にじスライム", max: 3, glyph: "虹", color: "#c58bff", desc: (l) => `${rainbowEvery(l)}回に1回、どのモンスターとも合体できるにじスライムが来る。岩に当たると砕く` },
  thunder: { name: "雷撃",         max: 3, glyph: "雷", color: "#ffe14d", desc: (l) => `${thunderEvery(l)}回落とすごとに雷が落ち、いちばん高い岩を壊す` + (l >= 3 ? "（2本）" : "") },
  combo:   { name: "コンボ",       max: 3, glyph: "連", color: "#ff5a5a", desc: (l) => `続けて進化するとスコア倍率アップ（1回ごと +${(l * 0.5).toFixed(1)}倍、最大4倍）` },
};
const bombEvery = (l) => [0, 10, 7, 5][l];
const rainbowEvery = (l) => [0, 12, 9, 6][l];
const thunderEvery = (l) => [0, 8, 6, 5][l];
const xpNeed = (lv) => 30 * lv * (lv + 1); // total score needed to reach lv+1
