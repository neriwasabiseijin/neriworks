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

// practice：{ seed, stage } を渡すと、シードで遊ぶ（その景から。遊び終わるたびに、やり直し・お手本・次の景を選べる）
function newGame(practice) {
  rng = mulberry32(Date.now());
  G.seed = practice ? practice.seed : newSeed();
  G.practice = !!practice;
  G.stage = practice ? practice.stage : 1;
  store.set("hanabi-last-seed", String(G.seed)); // シードで遊ぶの入力に、最後のシードを入れておく
  G.score = 0;
  G.maxChain = 0;
  G.perfects = 0;
  G.offerMercy = false;
  G.retries = 0; // 泣きの一回を使った回数（1回目はただ、2回目から点を引く）
  G.encoreRetries = 0; G.encoreOffer = false; // アンコールで使った泣きの一回（ENCORE_MERCY 回まで）
  G.bestSaved = false; G.newBest = false; // その夜のベストを記録したか（saveBest）
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

// 景の盤面づくり。盤面はシードと景の番号だけで決まる（乱数は景ごとに専用のものを使う）
function* stageGen(stage) {
  const p = stageParams(stage);
  const queue = Array.from({ length: SHOTS }, () => rndInt(0, p.colors - 1));
  const orbs = yield* orbsGen(p, queue);
  yield;
  const answer = findAnswer(orbs, p, queue[0]); // しくじったときのお手本
  const clouds = makeClouds(p, orbs);
  const target = pickTarget(orbs, p, queue);
  return { p, queue, orbs, answer, clouds, target };
}

// 先読み：次の景の盤面を、いまの景を遊んでいるあいだに毎フレーム少しずつ作っておく
function prepareStage(stage) {
  G.pre = { seed: G.seed, stage, it: stageGen(stage), rng: mulberry32(stageSeed(G.seed, stage)), out: null };
}
// ms ぶんだけ先読みを進める（Infinity なら作りきる）。ゲームの乱数は、先読みの乱数と入れかえて守る
function pumpStage(ms) {
  const pre = G.pre;
  if (!pre || pre.out) return;
  const keep = rng, t0 = performance.now();
  rng = pre.rng;
  try {
    do { const r = pre.it.next(); if (r.done) { pre.out = r.value; break; } } while (performance.now() - t0 < ms);
  } finally { rng = keep; }
}

function startStage() {
  if (!G.pre || G.pre.seed !== G.seed || G.pre.stage !== G.stage) prepareStage(G.stage);
  pumpStage(Infinity);
  const b = G.pre.out;
  G.pre = null;
  G.p = b.p;
  G.t = 0;
  G.shots = SHOTS;
  G.queue = b.queue;
  G.orbs = b.orbs;
  G.answer = b.answer;
  G.clouds = b.clouds;
  G.shells = [];
  G.bursts = [];
  G.total = G.orbs.length;
  G.popped = 0;
  G.chainNow = 0;
  G.reached = false;
  G.target = b.target;
  G.plans = [];    // 打ち上げる狙い（はなしたときに決まり、すぐ上がる）
  G.volley = null; // 打ち上げ中（決めた狙いを順に上げていく）
  G.fired = false; // このステージで打ち上げたか（1回きり）
  G.wreck = null;  // 開いて震えている UFO
  G.cloudGrumble = G.clouds.length ? 3.2 : 0; // 雲があると、観客が少ししてからぼやく
  // 泣きの一回とお手本のために、始まったときの盤面と点を取っておく
  G.snap = { orbs: G.orbs.map(o => ({ ...o, parent: null })), clouds: JSON.parse(JSON.stringify(G.clouds)), queue: G.queue.slice(),
    target: G.target, score: G.score, base: G.score, perfects: G.perfects, maxChain: G.maxChain, answer: G.answer };
  riseOrbs();
  prepareStage(G.stage + 1); // 次の景を、裏で作りはじめる
  // 演目名と目標は、合間の場内アナウンス（program.js）で知らせる
}

// 泣きの一回：しくじった景を、始まったときの盤面からやり直す。何度でもできるが、
// 1回目はただ、2回目は1/3景ぶん、3回目は2/3景ぶん…の点を引く（1景ぶん＝ここまでの1景あたりの平均点）
function mercyPenalty() {
  const worth = G.stage > 1 ? G.snap.base / (G.stage - 1) : 0; // 減点前の、この景に入ったときの点で数える
  return Math.min(G.snap.score, Math.round(worth * G.retries / 3 / 10) * 10);
}
function retryStage() {
  const pen = mercyPenalty();
  G.retries++; G.offerMercy = false;
  if (G.stage > PROGRAM.length) G.encoreRetries++;
  G.encoreOffer = false;
  G.snap.score -= pen;
  restartStage();
  cheerOne(pick(["泣きの1回！", "もう一回いける！", "がんばれー！"]));
}

// 景を、始まったときの盤面（同じ色・その景に入ったときの点）からやり直す
function restartStage() {
  const s = G.snap;
  G.orbs = s.orbs.map(o => ({ ...o })); G.clouds = JSON.parse(JSON.stringify(s.clouds)); G.queue = s.queue.slice();
  G.target = s.target; G.score = s.score; G.perfects = s.perfects; G.maxChain = s.maxChain;
  G.shots = SHOTS; G.shells = []; G.bursts = []; G.texts = []; G.stamps = []; G.booms = [];
  G.total = G.orbs.length; G.popped = 0; G.chainNow = 0; G.reached = false;
  G.plans = []; G.volley = null; G.fired = false; G.fin = null; G.finDone = false; G.wreck = null;
  G.cloudGrumble = G.clouds.length ? 3.2 : 0;
  riseOrbs();
  G.mode = "play";
  G.trans = { out: false, t: 0 };
  startWait(false);
}

// 火をつけ忘れた花火玉が、地上から「ぽぽぽぽぽん」と昇って夜空に並ぶ。
// 昇りきったら集中タイム（FOCUS_TIME 秒のうちに、狙いを決めて1発打ち上げる）
function riseOrbs() {
  const order = G.orbs.filter(o => !o.orbit).sort(() => rng() - 0.5);
  order.forEach((o, i) => {
    o.rise = { at: 0.5 + i * RISE_GAP, sx: Math.max(30, Math.min(W - 30, o.bx + rnd(-60, 60))), sy: SKY_BOTTOM + 90, popped: false };
    o.x = o.rise.sx; o.y = o.rise.sy;
  });
  let end = 0.5 + order.length * RISE_GAP + RISE_DUR;
  // UFO は打ち上げない：玉が昇りきってから、画面の外からチョロチョロと飛んでくる
  for (const o of G.orbs.filter(o => o.orbit)) {
    const left = o.bx < W / 2;
    o.rise = { ufo: true, at: end + 0.2, sx: left ? -40 : W + 40, sy: o.by + rnd(-50, 20), popped: false };
    o.x = o.rise.sx; o.y = o.rise.sy;
    end += 0.2 + UFO_IN;
  }
  G.rise = { t: 0, end };
  G.focus = null;
}
const UFO_IN = 1.4; // UFO が飛んでくる時間（秒）

// UFO の飛んでくる途中：右へ左へ小刻みにぶれながら、周回する位置へすべりこむ
function ufoIn(o, k) {
  const q = o.rise;
  if (k < 0) return;
  if (k >= 1) { o.rise = null; return; }
  const [tx, ty] = ufoPos(o), e = 1 - Math.pow(1 - k, 2);
  o.x = q.sx + (tx - q.sx) * e + Math.sin(k * Math.PI * 7) * 14 * (1 - k);
  o.y = q.sy + (ty - q.sy) * e + Math.sin(k * Math.PI * 11) * 9 * (1 - k);
}

function updateRise(dt) {
  const r = G.rise;
  if (!r) return;
  r.t += dt;
  for (const o of G.orbs) {
    const q = o.rise;
    if (!q) continue;
    if (q.ufo) { ufoIn(o, (r.t - q.at) / UFO_IN); continue; }
    const k = (r.t - q.at) / RISE_DUR;
    if (k < 0) continue;
    if (!q.popped) { q.popped = true; sfx.pon(); }
    if (k >= 1) { o.rise = null; continue; }
    const e = 1 - Math.pow(1 - k, 3); // 昇るほどゆっくり
    o.x = q.sx + (o.bx - q.sx) * e;
    o.y = q.sy + (o.by - q.sy) * e;
    if (Math.random() < 0.6) ember(o.x, o.y + 6);
  }
  if (r.t >= r.end) {
    G.rise = null;
  }
}

// 集中タイム：昇りきって、場内アナウンスが終わったら数えはじめる。時間切れで、狙いが決まっていれば打ち上がる
function updateFocus(dt) {
  if (G.mode !== "play" || G.fired || G.rise || G.wait) return;
  if (!G.focus) G.focus = { t: FOCUS_TIME, tick: 6 };
  const f = G.focus;
  f.t -= dt;
  // のこり5秒からは、1秒ごとにカチッ
  const sec = Math.ceil(f.t);
  if (sec < f.tick) { f.tick = sec; if (sec <= 5 && sec > 0) sfx.plan(0); }
  if (f.t > 0) return;
  if (aim.on) { fire(aim.angle, aim.power); aim.on = false; aim.id = null; } // 引いている途中なら、その狙いで上げる
  else {
    G.fired = true; // 何も上げずにおしまい（観客のため息）
    addText("時間切れ…", W / 2, 300, 30, 1.6, [200, 210, 255]);
  }
}

const fusing = () => G.orbs.some(o => o.fuse > 0);
const busy = () => !!G.volley || G.shells.length > 0 || G.bursts.length > 0 || fusing() || !!G.fin;

// 筆文字のハンコ（「晴ッ」や大連鎖の表示）
function addStamp(s, x, y, size, rgb, sub = "", back = false) {
  G.stamps.push({ s, sub, x, y, size, rgb, t: 0, life: 1.5, rot: rnd(-0.14, -0.04), back });
}

function addText(s, x, y, size, life = 1.1, rgb = [255, 255, 255]) {
  G.texts.push({ s, x, y, size, life, max: life, rgb });
}
