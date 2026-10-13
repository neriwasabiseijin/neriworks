"use strict";
// ゲームの状態

const G = {
  mode: "title",      // title / play / clear / over
  t: 0,               // 経過時間（火の玉の揺れなどに使う）
  stage: 1, p: null,  // ステージ番号と stageParams
  score: 0, shots: SHOTS, queue: [],
  orbs: [], shells: [], bursts: [], clouds: [],
  total: 0, popped: 0, target: 0,
  chainNow: 0, maxChain: 0, pending: false,
  glow: 0, flash: 0, shake: 0,
  texts: [], stamps: [], cheers: [], timer: 0, demoT: 0,
  chainX: 0, chainY: 0, fin: null, finDone: false, dim: 0, freeze: 0,
};

function newGame() {
  rng = mulberry32(Date.now());
  G.stage = 1;
  G.score = 0;
  G.maxChain = 0;
  G.perfects = 0;
  G.ended = false;
  G.lastPerfect = false;
  G.cheers = [];
  resetCrowd();
  clearSky();
  startStage();
  G.trans = { out: false, t: 0 };
  startWait(true);
  G.mode = "play";
}

function startStage() {
  G.p = stageParams(G.stage);
  G.t = 0;
  G.shots = SHOTS;
  G.queue = Array.from({ length: SHOTS }, () => rndInt(0, G.p.colors - 1));
  G.orbs = makeOrbs(G.p);
  G.clouds = makeClouds(G.p, G.orbs);
  G.shells = [];
  G.bursts = [];
  G.total = G.orbs.length;
  G.popped = 0;
  G.chainNow = 0;
  G.reached = false;
  G.target = pickTarget(G.orbs, G.p, G.queue);
  // 演目名と目標は、合間の場内アナウンス（program.js）で知らせる
}

const fusing = () => G.orbs.some(o => o.fuse > 0);
const busy = () => G.shells.length > 0 || G.bursts.length > 0 || fusing() || !!G.fin;

// 筆文字のハンコ（「晴ッ」や大連鎖の表示）
function addStamp(s, x, y, size, rgb, sub = "") {
  G.stamps.push({ s, sub, x, y, size, rgb, t: 0, life: 1.5, rot: rnd(-0.14, -0.04) });
}

function addText(s, x, y, size, life = 1.1, rgb = [255, 255, 255]) {
  G.texts.push({ s, x, y, size, life, max: life, rgb });
}
