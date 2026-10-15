"use strict";
// 川岸の観客。連鎖っぷりと盤面の消えっぷりに応じて、フキダシで感想や歓声を出す

const FONT_DOT = '"DotGothic16", "MS Gothic", monospace';

// 連鎖の大きさごとの歓声（開いた数で段階を分ける）
const CHEER_SHOT = [
  { min: 0, n: 1, lines: ["あれ？", "あれれ…", "おしい…", "ドンマイ！", "あらら"] },
  { min: 1, n: 1, lines: ["おっ", "きれい〜", "いいね", "ふむふむ", "まだまだ！"] },
  { min: 3, n: 2, lines: ["たまや〜！", "いいぞー！", "おお〜っ", "つながった！", "きれ〜い！"] },
  { min: 5, n: 2, lines: ["かぎや〜！", "すごい！", "うおおお！", "連鎖だ！", "ブラボー！"] },
  { min: 8, n: 3, lines: ["なにこれ！？", "すっげえええ！", "職人だ…", "鳥肌立った", "天才か！"] },
  { min: 12, n: 3, lines: ["伝説だ…", "ひぃぃ！", "神ーーっ！", "もう一回見たい！", "語り継ぐわ"] },
];

// ステージの終わりの感想（盤面の消えっぷりで分ける）
const CHEER_STAGE = {
  perfect: ["満開だー！", "夜空まるごと！", "完璧！", "いい夜だ〜", "全部開いた！"],
  almost: ["あと少しで満開…", "おしい！ほぼ満開", "おみごと！", "あとちょっと〜！"],
  clear: ["よかったよー", "たまや〜", "次も見せて！", "いい感じ！"],
  weak: ["しまらないなぁ…", "最後ちょっと…", "あれで終わり？", "うーん", "まあまあかな"],
  over: ["あ〜…", "まだ見たかった", "また来るね", "次こそ！", "ドンマイ…"],
};

// フキダシの出る場所（発射台の左右、観客の頭の上）
const CHEER_SLOTS = [
  { x: 64, y: H - 104 }, { x: 336, y: H - 104 },
  { x: 128, y: H - 142 }, { x: 272, y: H - 142 },
  { x: 76, y: H - 180 }, { x: 324, y: H - 180 },
];

// ステージが始まるときのワクワク
const CHEER_NEXT = ["次はどうかな？", "わくわく…", "まだまだ見たい！", "次も頼むよー！", "どんなのが来る？", "始まるぞ！", "待ってました！"];
const CHEER_FIRST = ["始まるよ！", "たのしみ〜", "いい場所とれた！", "たまやの準備OK"];
// 新しいしかけが出るステージは、それに気づいた一言をまぜる
// 人が増えたときの一言（だんだん大げさに）
const CHEER_GROW = ["人が集まってきた！", "にぎわってきたね", "すごい人だかり！", "押さないで〜", "町じゅう来てる！"];

// 観客（並びは毎回同じ。発射台のまわりはあける）。スコアが伸びるほど前から順に人が増える
// row 0 が最前列。うしろの列ほど小さく暗い
const CROWD = (() => {
  const list = [];
  let s = 7;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let row = 2; row >= 0; row--) {
    const gap = [148, 140, 136][row], gapR = [252, 312, 316][row];
    for (let x = 6 + row * 5; x < W - 6; x += 9 + r() * 5) {
      if (x > gap && x < gapR) continue;
      list.push({ x: x | 0, row, h: 10 + (r() * 6 | 0) - row, ph: r() * 6.28, rank: r() + row * 0.6 });
    }
  }
  return list; // 描く順はうしろの列から
})();
// 来る順（前の列から、ばらばらに）
const CROWD_ORDER = CROWD.slice().sort((a, b) => a.rank - b.rank);
const CROWD_START = 8;

const crowd = { cheer: 0, power: 0, n: 0, next: 0, step: 0 };

// スコアから観客の人数を決める
const crowdFor = score => Math.min(CROWD.length, CROWD_START + Math.floor(Math.sqrt(score) / 3.5));

function resetCrowd() {
  crowd.n = 0; crowd.step = 0;
  for (const p of CROWD) p.in = -1;
}
resetCrowd();

const pick = arr => arr[Math.random() * arr.length | 0];

function pickLines(lines, n) {
  const pool = lines.slice(), out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.random() * pool.length | 0, 1)[0]);
  return out;
}

// フキダシをまとめて出す。少しずつずらしてポンポンと出る
function say(lines, power) {
  G.cheers = [];
  const slots = CHEER_SLOTS.slice(0, Math.max(2, lines.length + 1));
  lines.forEach((s, i) => {
    const slot = slots.splice(Math.random() * slots.length | 0, 1)[0];
    G.cheers.push({ s, x: slot.x, y: slot.y, t: -i * 0.18, life: 2.1 + power * 0.3 });
  });
  crowd.cheer = 1.6 + power * 0.5;
  crowd.power = power;
}

// kind: perfect / clear / weak / over。chain はその景の連鎖数
function cheerStage(kind, chain) {
  if (kind === "weak" && G.total - G.popped <= Math.max(1, G.total * 0.1)) kind = "almost";
  if (kind === "clear" && G.total - G.popped <= Math.max(1, G.total * 0.1)) kind = "almost";
  const power = { perfect: 1, almost: 0.6, clear: 0.4, weak: 0, over: 0 }[kind];
  const lines = pickLines(CHEER_STAGE[kind], kind === "over" || kind === "weak" ? 2 : 3);
  // 連鎖が大きければ、その歓声もひとつ混ぜる
  if (kind !== "over" && kind !== "weak" && chain >= 5) {
    let tier = 0;
    CHEER_SHOT.forEach((c, i) => { if (chain >= c.min) tier = i; });
    lines[0] = pick(CHEER_SHOT[tier].lines);
  }
  say(lines, power);
}

function cheerOne(s) {
  if (G.cheers.some(b => b.s === s)) return;
  const free = CHEER_SLOTS.filter(sl => !G.cheers.some(b => b.x === sl.x && b.y === sl.y && b.t < b.life));
  const slot = pick(free.length ? free : CHEER_SLOTS);
  G.cheers.push({ s, x: slot.x, y: slot.y, t: 0, life: 1.8 });
  crowd.cheer = Math.max(crowd.cheer, 1.2);
  crowd.power = Math.max(crowd.power, 0.5);
}

// 演目の合間：煙待ちのざわめき
function cheerNext(first) {
  const lines = pickLines(first ? CHEER_FIRST : CHEER_NEXT, 2);
  say(lines, 0.25);
}

function updateCheers(dt) {
  for (let i = G.cheers.length - 1; i >= 0; i--) if ((G.cheers[i].t += dt) > G.cheers[i].life) G.cheers.splice(i, 1);
  crowd.cheer = Math.max(0, crowd.cheer - dt);
  // 観客が増える：ひとりずつ、少し間をおいて駆けつける
  if (G.mode === "title" || G.mode === "tutorial") return;
  if ((crowd.next -= dt) <= 0 && crowd.n < crowdFor(G.score)) {
    CROWD_ORDER[crowd.n++].in = G.t;
    crowd.next = 0.07;
    // 12人増えるごとに、人が増えたことに気づく
    const step = Math.floor((crowd.n - CROWD_START) / 12);
    if (step > crowd.step) {
      crowd.step = step;
      cheerOne(CHEER_GROW[Math.min(CHEER_GROW.length - 1, step - 1)]);
    }
  }
}

// 観客：ドット絵ふうの小さな影。歓声のときは跳ねる、盛り上がるほど手を上げる
function drawCrowd(c) {
  const lit = 0.12 + G.glow * 0.25 + G.flash * 0.6;
  const k = Math.min(1, crowd.cheer);
  for (const p of CROWD) {
    if (p.in < 0) continue;
    const base = H - 18 - p.row * 11;
    // 来たばかりの人は、下からぴょこっと出てくる
    const age = G.t - p.in;
    const rise = age >= 0 && age < 0.3 ? Math.round((1 - age / 0.3) * 18) - (age > 0.18 ? 3 : 0) : 0;
    // 歓声で跳ねる。合間は、そわそわと小さく体をゆらす
    const jump = k > 0 ? Math.round(Math.abs(Math.sin(G.t * 11 + p.ph)) * (2 + crowd.power * 5) * k)
      : G.wait && Math.sin(G.t * 3.1 + p.ph * 7) > 0.75 ? 1 : 0;
    const y = base - jump + rise;
    const shade = [40, 30, 22][p.row];
    c.fillStyle = `rgb(${shade + lit * 70 | 0},${shade - 6 + lit * 50 | 0},${shade + 22 + lit * 80 | 0})`;
    c.fillRect(p.x - 6, y - p.h + 3, 12, p.h + jump + 18); // 肩とからだ
    c.fillRect(p.x - 5, y - p.h + 1, 10, 2);
    c.fillRect(p.x - 4, y - p.h - 8, 8, 8);                 // 頭
    if (k > 0 && crowd.power > 0.3 && Math.sin(p.ph * 3) > -0.2) { // バンザイ
      c.fillRect(p.x - 8, y - p.h - 8, 2, 12);
      c.fillRect(p.x + 6, y - p.h - 8, 2, 12);
    }
  }
}

// フキダシ：角をドットで欠いた四角と、段々のしっぽ
function drawCheers(c) {
  if (!G.cheers.length) return;
  c.save();
  c.font = `400 16px ${FONT_DOT}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  for (const b of G.cheers) {
    if (b.t < 0) continue;
    // ポンと出て、最後は消える（ドット感を出すため拡大は段階的に）
    const pop = b.t < 0.12 ? (b.t < 0.06 ? 0.6 : 1.15) : 1;
    const a = Math.min(1, (b.life - b.t) / 0.35);
    const tw = Math.ceil(c.measureText(b.s).width);
    const w = (tw + 18) * pop | 0, h = 28 * pop | 0;
    const x = Math.round(Math.max(4, Math.min(W - 4 - w, b.x - w / 2)));
    const y = Math.round(b.y - h / 2 - (b.t < 0.12 ? 0 : Math.min(4, (b.t - 0.12) * 6)));
    c.globalAlpha = a;
    // 縁（濃い色）→ 中身（白）
    const fill = "#fffaf0";
    c.fillStyle = "#1a1430";
    c.fillRect(x + 2, y - 2, w - 4, h + 4);
    c.fillRect(x - 2, y + 2, w + 4, h - 4);
    c.fillRect(x, y, w, h);
    c.fillStyle = fill;
    c.fillRect(x + 2, y, w - 4, h);
    c.fillRect(x, y + 2, w, h - 4);
    // しっぽ（観客のほうへ）
    const tx = Math.round(Math.max(x + 8, Math.min(x + w - 14, b.x - 3)));
    c.fillStyle = "#1a1430";
    c.fillRect(tx - 2, y + h, 12, 4); c.fillRect(tx, y + h + 4, 8, 4); c.fillRect(tx + 2, y + h + 8, 4, 4); c.fillRect(tx + 4, y + h + 12, 2, 2);
    c.fillStyle = fill;
    c.fillRect(tx, y + h - 2, 8, 4); c.fillRect(tx + 2, y + h + 2, 4, 4); c.fillRect(tx + 4, y + h + 6, 0 + 2, 4);
    if (pop === 1) {
      c.fillStyle = "#2a1f45";
      c.fillText(b.s, x + w / 2, y + h / 2 + 1);
    }
  }
  c.restore();
}
