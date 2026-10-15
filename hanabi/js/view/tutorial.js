"use strict";
// あそびかた：実際のゲームの仕組みで、指のお手本が撃って見せるチュートリアル。
// 初回の「あそぶ」で自動再生し、タイトルの「あそびかた」からいつでも見られる。

const TUT_KEY = "hanabi-tutorial-seen-v2"; // 1発きりのルールに変わったので、前に見た人にももう一度見せる

// aims: 狙う場所 [x, y]（この順に決める）、shells: 打ち上げる玉の色、orbs: [x, y, 色]
// 色は 0紅 1藍 2若葉 3金。launch: false の場面は、打ち上げない
const TUT_SCENES = [
  {
    cap: "しまった！\n火をつけずに打ち上げちゃった",
    sub: "夜空に浮いたままの花火玉に、\n1発の花火で火をつけて回ろう",
    shells: [3], aims: [], launch: false, rise: true,
    orbs: [[110, 250, 0], [200, 210, 3], [290, 250, 1], [150, 320, 2], [250, 320, 3]],
  },
  {
    cap: "下へ引っぱって、はなす",
    sub: "どこを押してもOK。引くほど高く上がります。\n1つの景に1発きり",
    shells: [3], aims: [[148, 292]],
    orbs: [[148, 292, 3], [200, 300, 0]],
  },
  {
    cap: "光の輪にふれた玉も開く",
    sub: "開いた玉の輪がまた次の玉にふれて、\n連鎖していきます",
    shells: [3], aims: [[96, 300]],
    orbs: [[140, 300, 1], [192, 290, 2], [244, 300, 0]],
  },
  {
    cap: "同じ色につながると、\n輪が育つ",
    sub: "打ち上げる玉の色と、\n浮いている玉の色を合わせよう",
    shells: [0], aims: [[70, 330]],
    orbs: [[70, 330, 0], [136, 300, 0], [212, 280, 0], [286, 280, 0], [350, 300, 0]],
  },
  {
    cap: "色が変わると、\n輪は元にもどる",
    sub: "ちがう色の玉で輪が小さくなり、\n離れた玉には届きません",
    shells: [0], aims: [[70, 330]],
    orbs: [[70, 330, 0], [136, 300, 1], [212, 280, 1], [286, 280, 2], [350, 300, 0]],
  },
  {
    cap: "全部開けば「満開」",
    sub: "目標の数まで開けば、お客さんは満足。\n次の景へ進みます",
    shells: [0], aims: [[70, 320]], mankai: true,
    orbs: [[70, 320, 0], [122, 298, 0], [172, 286, 0], [228, 286, 3], [278, 298, 3], [330, 320, 3]],
  },
  // ここからは「やってみよう」：自分で引っぱって打ち上げる。全部開けばクリア、だめなら同じ盤面でもう一回
  {
    cap: "やってみよう\n同じ色で、輪が育つ",
    sub: "狙っている間、次に開く輪の大きさが\n点線で見えます",
    shells: [0], aims: [], drill: true,
    orbs: [[70, 340, 0], [140, 320, 0], [225, 300, 0], [325, 290, 0], [300, 390, 1]],
  },
  {
    cap: "大玉は、\n輪が大きい",
    sub: "大きな輪で、まわりの玉に火を渡そう",
    shells: [1], aims: [], drill: true,
    orbs: [[200, 320, 0, "big"], [112, 300, 2], [288, 300, 2], [200, 232, 3], [200, 410, 3]],
  },
  {
    cap: "二段玉は、\n2回あてると開く",
    sub: "1回目で殻が割れて、2回目で大きく開きます",
    shells: [0], aims: [], drill: true,
    orbs: [[135, 360, 0], [135, 285, 0], [200, 320, 1, "double"], [270, 290, 2], [265, 365, 2]],
  },
  {
    cap: "ススキ玉は、\n向いた方へ長くのびる",
    sub: "ススキ玉から、遠くの玉へ火を渡そう",
    shells: [1], aims: [], drill: true,
    orbs: [[95, 410, 1], [150, 380, 1, "susuki", -0.588], [270, 300, 2], [320, 270, 2]],
  },
  {
    cap: "しだれは、\n下へ長く垂れる",
    sub: "上のしだれから、下の玉へ火を落とそう",
    shells: [2], aims: [], drill: true,
    orbs: [[200, 225, 2, "shidare", 0], [200, 375, 0], [155, 405, 0], [245, 405, 0], [135, 220, 1], [265, 220, 1]],
  },
  {
    cap: "型物は、\n☆の形に開く",
    sub: "☆の先が、離れた玉まで届きます",
    shells: [3], aims: [], drill: true,
    orbs: [[200, 360, 3, "kata", -Math.PI / 2], [200, 250, 1], [305, 326, 1], [265, 449, 1], [135, 449, 1], [95, 326, 1]],
  },
];
const drilling = () => T.on && TUT_SCENES[T.i] && TUT_SCENES[T.i].drill && !T.cleared;

// 指のお手本の動き（秒）：出る→引く→はなす（はなすと打ち上がる）
const TUT_AIM = { show: 0.25, pull: 0.5, hold: 1.3, next: 1.6 };

const T = { on: false, i: 0, t: 0, k: 0, kt: 0, idle: 0, done: false, rest: 0, loops: 0, fx: 0, fy: 0, tap: -1, after: null, shots: [] };

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

// 狙う場所で開く引き方を探す
function tutAimFor([x, y]) {
  let best = null;
  for (let a = -MAX_ANGLE; a <= MAX_ANGLE; a += 0.01) for (let w = 0; w <= 1; w += 0.01) {
    const q = apexOf(a, w), d = Math.hypot(q.x - x, q.y - y);
    if (!best || d < best.d) best = { a, w, d };
  }
  return best;
}

// 今の場面を最初から再生する（「つぎへ」を押すまでくり返す）
function playScene() {
  const sc = TUT_SCENES[T.i];
  T.t = 0; T.k = 0; T.kt = 0; T.idle = 0; T.done = false; T.rest = 0; T.mankai = false; T.tap = -1; T.cleared = false; T.miss = 0;
  setLines($("tutCap"), sc.cap);
  setLines($("tutSub"), sc.sub);
  $("tutNext").textContent = T.i === TUT_SCENES.length - 1 ? (T.after === showTitle ? "とじる" : "はじめる") : "つぎへ";
  [...$("tutDots").children].forEach((d, k) => d.classList.toggle("on", k === T.i));
  G.t = 0;
  G.orbs = sc.orbs.map(([x, y, color, type = "normal", rot = 0]) => ({ bx: x, by: y, mx: x, x, y, type, rot, color, ph: rnd(0, 6.28), amp: 0,
    hits: 0, hitBy: null, fuse: 0, from: null }));
  G.clouds = []; G.shells = []; G.bursts = []; G.texts = []; G.stamps = []; G.booms = []; G.fin = null; G.wreck = null;
  G.total = G.orbs.length; G.popped = 0; G.chainNow = 0; G.pending = false; G.finDone = false;
  G.plans = []; G.volley = null; G.fired = false;
  G.shots = SHOTS; G.queue = sc.shells.slice();
  G.target = 10;
  G.rise = null; G.focus = null;
  if (sc.rise) riseOrbs(); // 火をつけ忘れた玉が、ぽぽぽぽぽんと昇っていく
  T.shots = sc.aims.map(tutAimFor);
  T.fx = 200; T.fy = 470;
  aim.on = false;
}

function endTutorial() {
  T.on = false;
  store.set(TUT_KEY, "1");
  $("tut").hidden = true;
  aim.on = false;
  G.orbs = []; G.shells = []; G.bursts = []; G.stamps = []; G.texts = []; G.booms = []; G.fin = null;
  G.plans = []; G.volley = null; G.fired = false; G.wreck = null;
  G.mode = "title";
  const after = T.after; T.after = null;
  after && after();
}

const easeIO = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// 引いている途中の、引きの強さ（0〜1）
const tutPull = () => easeIO(Math.max(0, Math.min(1, (T.kt - TUT_AIM.pull) / (TUT_AIM.hold - TUT_AIM.pull - 0.15))));

function updateTutorial(dt) {
  if (!T.on) return;
  T.t += dt;
  const sc = TUT_SCENES[T.i];
  if (T.k < T.shots.length) {
    // 1発ずつ、引っぱってはなす
    T.kt += dt;
    const s = T.shots[T.k];
    aim.on = T.kt > TUT_AIM.pull;
    aim.angle = s.a; aim.power = s.w * tutPull();
    if (T.kt > TUT_AIM.hold && !G.fired && G.plans.length === T.k) {
      aim.on = false; planShot(s.a, s.w);
      if (sc.launch !== false) startVolley();
    }
    if (T.kt > TUT_AIM.next) { T.k++; T.kt = 0; }
  } else if (sc.drill) {
    // やってみよう：打ち上げた1発が出つくしたら、全部開いたかを見る
    if (G.fired && !busy() && !G.shells.length && !T.cleared && !T.miss) {
      if (G.orbs.length === 0) {
        T.cleared = true;
        addStamp("満開", W / 2, 280, 84, [255, 200, 225]); // 本番と同じ満開の演出
        sfx.sky(); sfx.clear();
      } else { T.miss = 1e-6; addText("もう一回！", W / 2, 300, 28, 1.3, [200, 210, 255]); }
    }
    if (T.miss && (T.miss += dt) > 1.5) playScene(); // 同じ盤面で、もう一回
  } else if (!busy()) {
    // 満開の場面：全部開ききったら「満開」のハンコ
    if (sc.mankai && !T.mankai && G.orbs.length === 0) {
      T.mankai = true;
      addStamp("満開", W / 2, 280, 84, [255, 200, 225]);
      sfx.sky(); sfx.clear();
    }
    if (!G.rise && (T.idle += dt) > (sc.mankai ? 1.4 : sc.launch === false ? 1.2 : 0.6)) T.done = true;
  }
  $("tutNext").classList.toggle("ready", T.done || T.loops > 0 || T.cleared);
  // 終わったら少し余韻を見せて、同じ場面をもう一度
  if (T.done && (T.rest += dt) > 1.6) { T.loops++; playScene(); }
}

// 指のお手本
function drawFinger(c, x, y, a, press) {
  c.fillStyle = `rgba(255,255,255,${0.55 * a})`;
  c.strokeStyle = `rgba(255,255,255,${0.9 * a})`; c.lineWidth = 2;
  c.beginPath(); c.arc(x, y, 16 * (press ? 0.85 : 1), 0, Math.PI * 2); c.fill(); c.stroke();
}

function drawTutorial(c) {
  if (!T.on) return;
  c.save();
  if (T.k < T.shots.length && T.kt > TUT_AIM.show && T.kt < TUT_AIM.hold + 0.05) {
    const s = T.shots[T.k];
    const L = PULL_MIN + s.w * tutPull() * (PULL_MAX - PULL_MIN);
    const fx = T.fx - Math.sin(s.a) * L, fy = T.fy + Math.cos(s.a) * L;
    const a = Math.min(1, (T.kt - TUT_AIM.show) / 0.2);
    c.strokeStyle = `rgba(255,255,255,${0.35 * a})`; c.lineWidth = 2; c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(T.fx, T.fy); c.lineTo(fx, fy); c.stroke(); c.setLineDash([]);
    c.fillStyle = `rgba(255,255,255,${0.12 * a})`;
    c.beginPath(); c.arc(T.fx, T.fy, 8, 0, Math.PI * 2); c.fill();
    drawFinger(c, fx, fy, a, T.kt > TUT_AIM.pull - 0.1);
  }
  c.restore();
}

$("tutNext").addEventListener("click", () => { sfx.unlock(); nextScene(); });
$("tutSkip").addEventListener("click", () => { sfx.unlock(); endTutorial(); });
$("howBtn").addEventListener("click", () => { sfx.unlock(); startTutorial(showTitle); });
