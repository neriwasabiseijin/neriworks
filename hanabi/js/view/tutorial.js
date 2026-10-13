"use strict";
// あそびかた：実際のゲームの仕組みで、指のお手本が撃って見せるチュートリアル。
// 初回の「あそぶ」で自動再生し、タイトルの「あそびかた」からいつでも見られる。

const TUT_KEY = "hanabi-tutorial-seen";

// x, y, 色（0紅 1藍 2若葉 3金）
const TUT_SCENES = [
  {
    cap: "下へ引っぱって、はなす",
    sub: "どこを押してもOK。\n引くほど高く上がり、いちばん上で開きます",
    shell: 3, aimAt: [200, 250], orbs: [],
  },
  {
    cap: "光の輪にふれた玉も開く",
    sub: "開いた玉の輪がまた次の玉にふれて、\n連鎖していきます",
    shell: 3, aimAt: [96, 300],
    orbs: [[140, 300, 1], [192, 290, 2], [244, 300, 0]],
  },
  {
    cap: "同じ色につながると、\n輪が育つ",
    sub: "打ち上げる玉の色（発射台の光）と、\n浮いている玉の色を合わせよう",
    shell: 0, aimAt: [70, 330],
    orbs: [[70, 330, 0], [136, 300, 0], [212, 280, 0], [286, 280, 0], [350, 300, 0]],
  },
  {
    cap: "色が変わると、\n輪は元にもどる",
    sub: "ちがう色の玉で輪が小さくなり、\n離れた玉には届きません",
    shell: 0, aimAt: [70, 330],
    orbs: [[70, 330, 0], [136, 300, 1], [212, 280, 1], [286, 280, 2], [350, 300, 0]],
  },
  {
    cap: "全部開けば「満開」",
    sub: "夜空の火の玉を、\nのこらず咲かせよう",
    shell: 3, aimAt: [212, 262], mankai: true,
    orbs: [[90, 300, 3], [150, 275, 3], [212, 262, 3], [274, 275, 3], [334, 300, 3]],
  },
];

const T = { on: false, i: 0, t: 0, fired: false, idle: 0, done: false, rest: 0, loops: 0, a: 0, w: 0, sx: 0, sy: 0, after: null };

function startTutorial(after) {
  T.on = true; T.after = after; T.i = -1;
  $("title").hidden = true; $("result").hidden = true;
  $("tut").hidden = false;
  $("tutDots").innerHTML = TUT_SCENES.map(() => "<i></i>").join("");
  G.mode = "tutorial";
  G.p = stageParams(1);
  G.stage = 1;
  nextScene();
}

function nextScene() {
  T.i++;
  T.loops = 0;
  if (T.i >= TUT_SCENES.length) return endTutorial();
  playScene();
}

// 今の場面を最初から再生する（「つぎへ」を押すまでくり返す）
function playScene() {
  const sc = TUT_SCENES[T.i];
  T.t = 0; T.fired = false; T.idle = 0; T.done = false; T.rest = 0; T.mankai = false;
  setLines($("tutCap"), sc.cap);
  setLines($("tutSub"), sc.sub);
  $("tutNext").textContent = T.i === TUT_SCENES.length - 1 ? (T.after === showTitle ? "とじる" : "はじめる") : "つぎへ";
  [...$("tutDots").children].forEach((d, k) => d.classList.toggle("on", k === T.i));
  G.t = 0;
  G.orbs = (sc.orbs || []).map(([x, y, color]) => ({ bx: x, by: y, mx: x, x, y, type: "normal", color, ph: rnd(0, 6.28), amp: 0, move: 0, wait: 0,
    hits: 0, hitBy: null, fuse: 0, from: null }));
  G.clouds = []; G.shells = []; G.bursts = []; G.texts = []; G.stamps = []; G.fin = null;
  G.total = G.orbs.length; G.popped = 0; G.chainNow = 0; G.pending = false; G.finDone = false;
  G.shots = 9; G.queue = Array(9).fill(sc.shell ?? 3);
  G.target = 10;
  if (sc.aimAt) {
    // その位置で開く引き方を探す
    let best = null;
    for (let a = -MAX_ANGLE; a <= MAX_ANGLE; a += 0.01) for (let w = 0; w <= 1; w += 0.01) {
      const q = apexOf(a, w), d = Math.hypot(q.x - sc.aimAt[0], q.y - sc.aimAt[1]);
      if (!best || d < best.d) best = { a, w, d };
    }
    T.a = best.a; T.w = best.w;
    T.sx = 200; T.sy = 470;
  }
}

function endTutorial() {
  T.on = false;
  store.set(TUT_KEY, "1");
  $("tut").hidden = true;
  aim.on = false;
  G.orbs = []; G.shells = []; G.bursts = []; G.stamps = []; G.texts = []; G.fin = null;
  G.mode = "title";
  const after = T.after; T.after = null;
  after && after();
}

const easeIO = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function updateTutorial(dt) {
  if (!T.on) return;
  T.t += dt;
  const sc = TUT_SCENES[T.i];
  if (!T.fired) {
    const e = easeIO(Math.max(0, Math.min(1, (T.t - 0.6) / 1.0)));
    aim.on = T.t > 0.6;
    aim.angle = T.a; aim.power = T.w * e;
    if (T.t > 1.9) { aim.on = false; T.fired = true; fire(T.a, T.w); }
  } else if (!busy()) {
    // 満開の場面：全部開ききったら「満開」のハンコ
    if (sc.mankai && !T.mankai && G.orbs.length === 0) {
      T.mankai = true;
      addStamp("満開", W / 2, 280, 84, [255, 200, 225]);
      sfx.sky(); sfx.clear();
    }
    if ((T.idle += dt) > (sc.mankai ? 1.4 : 0.6)) T.done = true;
  }
  $("tutNext").classList.toggle("ready", T.done || T.loops > 0);
  // 終わったら少し余韻を見せて、同じ場面をもう一度
  if (T.done && (T.rest += dt) > 1.6) { T.loops++; playScene(); }
}

// 指のお手本と、発射台の色の説明
function drawTutorial(c) {
  if (!T.on) return;
  const sc = TUT_SCENES[T.i];
  if (!T.fired && T.t > 0.3) {
    const e = easeIO(Math.max(0, Math.min(1, (T.t - 0.6) / 1.0)));
    const L = PULL_MIN + T.w * e * (PULL_MAX - PULL_MIN);
    const fx = T.sx - Math.sin(T.a) * L, fy = T.sy + Math.cos(T.a) * L;
    const a = Math.min(1, (T.t - 0.3) / 0.3);
    c.save();
    c.strokeStyle = `rgba(255,255,255,${0.35 * a})`; c.lineWidth = 2; c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(T.sx, T.sy); c.lineTo(fx, fy); c.stroke(); c.setLineDash([]);
    c.fillStyle = `rgba(255,255,255,${0.12 * a})`;
    c.beginPath(); c.arc(T.sx, T.sy, 8, 0, Math.PI * 2); c.fill();
    const press = T.t > 0.5 ? 0.85 : 1;
    c.fillStyle = `rgba(255,255,255,${0.55 * a})`;
    c.strokeStyle = `rgba(255,255,255,${0.9 * a})`; c.lineWidth = 2;
    c.beginPath(); c.arc(fx, fy, 16 * press, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();
  }
}

$("tutNext").addEventListener("click", () => { sfx.unlock(); nextScene(); });
$("tutSkip").addEventListener("click", () => { sfx.unlock(); endTutorial(); });
$("howBtn").addEventListener("click", () => { sfx.unlock(); startTutorial(showTitle); });
