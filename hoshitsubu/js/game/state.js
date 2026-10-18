"use strict";
// 1プレイの状態と、レベルやカードから決まる値

let G = null;            // 1プレイの状態
let scene = "title";     // title / play / cards / dying / result / tutorial
let held = false;        // 押しているか（引力圏が開いている）
let frozen = false;      // 指をブラウザに取られて止めているか（画面にふれると再開）
let tNow = 0;            // 経過時間（衛星の公転などに使う）
const bgStars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: rand(.2, 1) }));

function newGame() {
  G = {
    p: { x: W / 2, y: H * .72, inv: 0, mvx: 0, mvy: 0, vx: 0, vy: 0, dir: null, cand: null, candT: 0, still: 0, moveT: 0,
         once: null, onceT: 0, catchT: -1, t: 0, anim: "idle", animT: 0, trail: [] },
    level: 0, xp: 0, pending: 0, lives: 3, score: 0, wave: 1, waveT: 0, waveState: "run", endT: 0,
    sats: [], bullets: [], debris: [], shots: [], enemies: [], corpses: [], fx: [], texts: [],
    boss: null, bossCount: 0, bossCards: [], skips: {}, awake: { power: 0, tech: 0, speed: 0 }, autoT: 0, xpFrac: 0, bossIn: 0, flash: 0, hitstop: 0, lifeHit: 0, lifeHeal: 0, healN: 0, novaC: 0, gemPulse: 0, restY: 0, stash: [], deal: {}, awakeMsgs: [], picks: {}, pickOrder: [], iceLeft: 0, hat: null, hatT: 0, hatOld: null, mile: {}, mileSeq: 0, renamed: false, oldName: null, hatFly: null, ren: null, home: null, restT: 0,
    spawnT: 1, batchId: 0, batches: {},
    rec: { kills: 0, bosses: 0, bestVolley: 0, crits: 0 },
    dyingT: 0,
  };
}
const lv = k => (G && G.picks[k]) || 0;
const stageOf = l => STAGES.filter(x => l >= x.from).length - 1;
const st = () => STAGES[stageOf(G.level)];
const starR = () => 13 + Math.min(G.level, 12) * 1.3;   // レベルごとにひと回り大きく（レベル13まで）
const hitR = () => starR() * .62;
const capacity = () => 24 + G.level * 3 + Math.round(grow(lv("cap"), 30, 45));
const gravR = () => (64 + G.level * 2.5) * (1 + grow(lv("grav"), .6, .9));
// 強化の効き目
const catLv = c => CARD_KEYS.reduce((s, k) => s + (CARDS[k].cat === c ? lv(k) : 0), 0);
const shotDmgMul = () => 1 + grow(lv("star"), 1, 1.6);
const shotSpeedMul = () => 1 + grow(lv("speed"), .75, 1.1);
const homingMul = () => 1 + grow(lv("homing"), 1.5, 2.4);
const twinN = () => Math.ceil(lv("twin") / 3);
const iceN = () => Math.ceil(lv("ice") / 3);
const gemXp = () => 1 + grow(lv("bless"), .75, 1.2);
const lifeMax = () => 3 + G.awake.tech;   // 星の治癒で戻せる上限（テクニカルの型で4・5）
const xpNeed = () => 12 + G.level * 4;   // 10波（2体目の大彗星）を越えるころに11〜12回ほど強化できる
const satWeight = () => G.sats.reduce((s, x) => s + (x.kind === "heavy" ? 3 : 1), 0);
const fillRatio = () => Math.min(1, satWeight() / capacity());
const isFull = () => satWeight() >= capacity();
const weightMul = () => 1 - .55 * (1 - grow(lv("light"), .5, .8)) * fillRatio();   // 満杯で約半分の速さ（身軽で軽くなる）
const bossLv = k => (G.boss ? G.boss.lv[k] || 0 : 0);   // 段階は登場時に数えておく
const thornRate = () => Math.min(.6, (G ? G.bossCount : 0) * .12 * TUNE.thorn);
const thornOn = () => thornRate() > 0;
const inGame = () => scene === "play" || scene === "tutorial";

const FX_MAX = 360;   // エフェクトの粒の上限（多いときは古いものから消す）
function addFx(x, y, color, n) { if (G.fx.length > FX_MAX) G.fx.splice(0, n); for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(30, 160); G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.3, .7), color, kind: "spark" }); } }
function floatText(x, y, text, color, life = 1, size = 15) { G.texts.push({ x, y, text, color, life, max: life, size }); }
// 点数：文字の説明は出さず、数字だけ。倍率がかかった分に比例して大きく、バン！とはじけて出る
function scorePop(x, y, pts, mul = 1) {
  const size = clamp(12 * mul, 12, 46), col = mul >= 5 ? "#ffe7a3" : mul >= 2 ? "#ff9ecf" : "#f4f0ff";
  G.texts.push({ x: clamp(x, 30, W - 30), y, text: Math.round(pts).toLocaleString(), color: col, life: .9 + Math.min(.8, mul * .1), max: .9 + Math.min(.8, mul * .1), size, pop: true, age: 0 });
}
// 倒れたとき：白く膨らんだ最後のコマのあと、光の輪とキラキラを放ってはじけ飛ぶ
function popBurst(x, y, r, color) {
  G.fx.push({ x, y, kind: "ring", r0: r * .8, r1: r * 2.6, life: .3, max: .3, color: "#ffffff" });
  const cols = ["#ffffff", color, "#ffe7a3", "#ff9ecf", "#8ff0d2", "#9cc8ff"];
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * TAU + rand(-.2, .2), s = rand(140, 260) * (r / 12);
    G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.35, .55), max: .55, color: cols[i % cols.length], kind: "star", size: rand(2.5, 4.5) * Math.max(1, r / 14) });
  }
  for (let i = 0; i < 7; i++) { // 体の破片：敵の色の小さなかけらが回りながら飛ぶ
    const a = i / 7 * TAU + rand(-.3, .3), s = rand(90, 190) * (r / 12);
    G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.4, .6), max: .6, color, kind: "shard", size: rand(2.5, 4) * Math.max(1, r / 14), rot: rand(0, TAU) });
  }
  addFx(x, y, color, 6);
}
