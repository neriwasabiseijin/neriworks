"use strict";
// 定数とステージの難しさ。座標はすべて 400x720 の論理座標（画面に合わせて拡大縮小する）。

const W = 400, H = 720;
const LAUNCH = { x: W / 2, y: H - 74 };   // 発射台
const SKY_TOP = 96, SKY_BOTTOM = 520;      // 火の玉が浮かぶ範囲
const GRAVITY = 225;                       // 低めにして、ゆっくり昇るようにする（実物の尺玉くらいの間）
const V_MIN = 208, V_MAX = 531;            // 撃ち出す速さ（引きの強さで変わる）。重力と合わせて落としたので、軌道の形は前と同じ
const PULL_MIN = 14, PULL_MAX = 150;       // 引く長さ（これより短いと撃たない／これで最大）
const MAX_ANGLE = 0.9;                     // 真上からの最大の傾き（ラジアン）
const SHOW_SEED = false;                   // シードの表示と「シードで遊ぶ」（いまは隠す。true で出る）
const SHOTS = 1;                           // 1つの景に打ち上げられるのは1発だけ
const FOCUS_TIME = 30;                     // 集中タイム：火の玉が昇りきってから、狙って打ち上げるまでの持ち時間（秒）
const RISE_GAP = 0.1, RISE_DUR = 0.75;     // 火の玉が地上から「ぽぽぽぽぽん」と昇る間隔と、昇りきるまでの秒数

const RING_GROW = 0.9;     // 撃った花火の輪が最大になるまで（秒）
const CHAIN_GROW = 0.62;   // 連鎖で開く火の玉の輪が最大になるまで（深い段ほど速くなる）
const RING_HOLD = 0.1;     // 最大のまま引火できる時間
const FINALE_MIN = 4;      // この数以上つながったら、最後に「ドカーン」
const CLOUD_BLAST = 1.2;   // 雲を散らす爆風の広さ（光の輪の何倍か）
const CLOUD_CLEAR = 0.9;   // 雲がこの割合まで散ったら、少しおいて残りも一気に晴れる
const CLOUD_WAIT = 0.5;    // 晴れるまでの間（秒）
const APEX_PAUSE = 0.3;    // てっぺんで光が消えてから開くまでの最低限の「間」（そのあと次の8分の拍で開く）
const SAME_COLOR_GROW = 1.3, MAX_MULT = 2.4;
// 初手ボーナス：撃った玉と同じ色の火の玉が最初に開いたら、その1発の連鎖の点がすべて×1.2。
// 「同じ色の群れに撃ち込む」か「離れた端から撃って星や大玉を最後に開く」かで迷えるよう、
// 試算でどちらが得かが6:4くらいになる強さにしてある
const START_BONUS = 1.2;
const BEAT_STEP = 0.15;    // 16分音符の長さ（秒）。お囃子と連鎖の拍の格子（100 BPM）

const COLORS = [
  { name: "紅", rgb: [255, 92, 110] },
  { name: "藍", rgb: [96, 170, 255] },
  { name: "若葉", rgb: [130, 236, 150] },
  { name: "金", rgb: [255, 206, 92] },
];

// 火の玉の種類：r=見た目の半径、ring=開いたときの輪の倍率、score=点数の倍率、hits=開くまでに当てる回数。
// 点数は「100 × 連鎖の段数 × 倍率」なので、倍率の高い玉（大きい花火・星）ほど連鎖の後ろで開くと得。
// どこから撃ち込むかで開く順番を選び、大物を最後に回すのが腕前
const ORB_TYPES = {
  normal: { r: 10, ring: 1, score: 1, hits: 1 },
  big:    { r: 15, ring: 1.7, score: 3, hits: 1 },
  star:   { r: 12, ring: 1, score: 5, hits: 1 },
  double: { r: 12, ring: 1.5, score: 3, hits: 2 }, // 手間がかかるぶん、開くと大きい
  ufo:    { r: 12, ring: 1, score: 5, hits: 1 },    // UFO：めったに出ないレアもの。導火線の末尾近くに出て、点を稼がせてくれる
  susuki: { r: 11, ring: 1, score: 2, hits: 1 },    // ススキ玉：ふつうの輪に加えて、向いている方へ長くのびる
  kata:   { r: 12, ring: 1, score: 3, hits: 1 },    // 型物：☆の形に大きく開く
  shidare:{ r: 11, ring: 1, score: 2, hits: 1 },    // しだれ：丸く開いて、重さで下へ長く垂れる
};

// 形のある開き方。型物・しだれは「丸い輪＋形」、ススキは形だけ、形の大きさは丸い輪の半径 R の何倍かで決まる。
// 丸い輪と同じく、同じ色が続いて輪が育つと形も育つ（橋が届くかどうかが、どの色で連鎖してきたかで変わる）。
//   susuki：丸い輪は出さず、rot の向きへ、開き ±hw の三角形に len 倍までのびる
//   kata：rot に先を向けた☆。先の長さ len 倍、くびれ inner 倍
//   shidare：丸い輪がそのまま下へ垂れる（届く範囲は reachAt。縦長のカプセル）
const SHAPES = {
  susuki: { len: 2.8, hw: 0.28, tri: true },
  kata: { len: 2.6, inner: 1.05 },
  shidare: { drop: 2.6 },
};

// ☆の中心から角度 a（先からの角度）の向きの、☆のふちまでの距離
function starEdge(L, Li, a) {
  const k = Math.PI / 5;
  let t = ((a % (2 * k)) + 2 * k) % (2 * k);
  if (t > k) t = 2 * k - t; // 0（先）〜k（くびれ）に折りたたむ
  // 先 (L, 0) とくびれ (Li cos k, Li sin k) を結ぶ線と、角度 t の半直線の交点
  const px = L, py = 0, qx = Li * Math.cos(k), qy = Li * Math.sin(k);
  const dx = qx - px, dy = qy - py, c = Math.cos(t), s = Math.sin(t);
  return (px * dy - py * dx) / (c * dy - s * dx);
}

// しだれの届く範囲は、見た目の火の粉の動きそのもの：火の粉は輪の半径 R のあたりまで広がりながら（空気の抵抗で
// 少しずつ減速しつつ、もう少し先まで流れる）、重さで下へ垂れていく。なので届く範囲は
// 「いまの広がりの丸い輪を、垂れた長さぶん下へ引きのばしたカプセル」。火の粉がはっきり見えている SHIDARE_T 秒まで火がつく
const SPARK_DRAG = 2.4, SHIDARE_G1 = 40, SHIDARE_G2 = 120, SHIDARE_T = 2.4; // 垂れる重さ（広がりきるまで／そのあと）
// 火の粉は R の 0.7〜1倍の速さでばらけて飛ぶので、見た目のふちは外側の火の粉のあたり（0.95倍）
const spreadAt = (R, grow, t) => 0.95 * R * (1 - Math.exp(-SPARK_DRAG * t)) / (1 - Math.exp(-SPARK_DRAG * grow));
function gravDrop(grow, t) {
  const d = SPARK_DRAG, seg = (v, g, s) => [g / d + (v - g / d) * Math.exp(-d * s), g / d * s + (v - g / d) * (1 - Math.exp(-d * s)) / d];
  if (t <= grow) return seg(0, SHIDARE_G1, t)[1];
  const [v1, y1] = seg(0, SHIDARE_G1, grow);
  return y1 + seg(v1, SHIDARE_G2, t - grow)[1];
}
const easeOut3 = k => 1 - Math.pow(1 - Math.min(1, k), 3);
// ススキ・型物の火の粉も物理で飛ぶ（空気の抵抗で減速）。届く範囲は、その火の粉の広がり（grow 秒で 1）に合わせる。
// 火の粉は見た目の花火らしさを優先して、そのあとも少し先まで流れる
const shapeSpread = (grow, t) => Math.min(1, (1 - Math.exp(-SPARK_DRAG * t)) / (1 - Math.exp(-SPARK_DRAG * grow)));
const shapeSpreadTime = (grow, k) => -Math.log(1 - k * (1 - Math.exp(-SPARK_DRAG * grow))) / SPARK_DRAG; // 広がりが k になる秒数
// 開いてから t 秒の届く範囲：丸い輪の半径 r と、しだれなら垂れた長さ dv
function reachAt(R, shape, grow, t) {
  if (shape && shape.drop) return { r: spreadAt(R, grow, Math.min(t, SHIDARE_T)), dv: gravDrop(grow, Math.min(t, SHIDARE_T)) };
  if (shape) return { r: R * shapeSpread(grow, t), dv: undefined };
  return { r: R * easeOut3(t / grow), dv: undefined };
}
// 火がつけられる間（しだれは火の粉が垂れているあいだ）
const burstLife = (shape, grow) => shape && shape.drop ? SHIDARE_T : grow + RING_HOLD;
// 盤面づくりで、しだれが最後にどこまで届くかを見積もるとき（連鎖のふつうの広がる速さで）
const SHIDARE_SPREAD = spreadAt(1, CHAIN_GROW, SHIDARE_T), SHIDARE_FALL = gravDrop(CHAIN_GROW, SHIDARE_T);

// (bx, by) で開いた花火（丸い輪の半径 R、形 shape、向き rot）が (ox, oy) の玉（半径 or）に届くか。
// dv：しだれの垂れた長さ。省くと、しだれが最後に届く範囲（盤面づくり用の見積もり）
function shapeHit(bx, by, R, shape, rot, ox, oy, or, dv) {
  const dx = ox - bx, dy = oy - by, d = Math.hypot(dx, dy);
  if (shape && shape.tri) { // ススキ：玉から rot の向きへのびる三角形だけ（玉のまわりに丸い輪は出ない）
    const c = Math.cos(rot), s = Math.sin(rot), ax = dx * c + dy * s, py = Math.abs(-dx * s + dy * c);
    return ax >= -or && ax <= R * shape.len + or && py <= Math.max(0, ax) * Math.tan(shape.hw) + or / Math.cos(shape.hw);
  }
  if (shape && shape.drop) { // しだれ：丸い輪を下へ fall だけ引きのばしたカプセル
    const r = dv === undefined ? R * SHIDARE_SPREAD : R, fall = dv === undefined ? SHIDARE_FALL : dv;
    return Math.hypot(dx, dy - Math.max(0, Math.min(dy, fall))) <= r + or;
  }
  if (d <= R + or) return true;
  if (!shape || R <= 0) return false;
  const a = Math.atan2(dy, dx) - rot;
  return d <= starEdge(R * shape.len, R * shape.inner, a) + or; // 型物：☆
}

// 難しさの上げ方。ステージごとに「つまみ」を少しずつ回す（企画書の 8 章に表あり）
function stageParams(n) {
  const k = n - 1;
  return {
    count: Math.max(14, 20 - Math.floor(k * 0.8)), // 火の玉の数：減っていく＝まばらになる
    ratio: Math.min(0.75, 0.5 + k * 0.03),         // 目標＝火の玉の何割（お客さんが満足するくらい）
    ring: Math.max(42, 50 - k * 1.2),              // 輪の基本の半径：小さくなる
    colors: n < 3 ? 3 : 4,                         // 色の数：3色→4色（同色でつなぎにくくなる）
    groups: n <= 2 ? 2 : 3,                        // つながった群れの数（群れから群れへは橋でしか渡れない）
    sameColor: Math.max(0.45, 0.75 - k * 0.04),    // 群れの中で同じ色が続く確率：下がる＝色がまじる
    drift: 2,                                      // ふわふわ揺れる幅（小さく。大きく揺れると届く・届かないがぶれる）
    big: n >= 2 ? 0.12 : 0,                        // 大玉（助けになる）
    star: 0.1,
    double: n >= 4 ? 0.2 : 0,                                  // 二段玉（2回当てないと開かない）
    doubleMax: n < 4 ? 0 : n < 6 ? 1 : n < 8 ? 2 : 3,          // 1ステージの上限（多すぎると不発続きでテンポが悪い）
    ufo: n >= 3 ? 0.2 : 0,                                     // UFO が出る確率（レアもの。小さく周回する。1ステージに1つまで）
    flair: n <= 2 ? 1 : 2,                                     // 映え：どこへも届かない向きにのびるススキ（見た目の華やかさ）
    bridges: n <= 2 ? 1 : 2,                                   // 群れから群れへ届く橋（ススキ・型物）の数。1発で全部つながる道が1本ある
    gates: n <= 1 ? 0 : n <= 4 ? 1 : 2,                        // そのうち色の関所（いちばん育ったときだけ届く橋）の数
    full1Max: n <= 2 ? 99 : n <= 4 ? 3 : 2,                             // 1発で満開にできる入り口の数の上限（多いと見たまんまになる）
    traps: n <= 2 ? 0 : n <= 4 ? 1 : 2,                        // 関所の橋が育ちきらずに開いてしまう入り口（わな）の数の下限
    decoys: n === 1 ? 1 : 2,                                   // 罠ススキ：別の群れを向いているが、絶対に届かない・かすらない
    kata: n >= 7 ? 0.4 : 0,                                    // 橋が型物になる確率
    shidare: n >= 8 ? 0.4 : 0,                                 // 橋がしだれになる確率（行き先が下にあるときだけ届く）
    clouds: n >= 5 ? Math.min(3, 1 + Math.floor((n - 5) / 2)) : 0, // 雲（手前にかかるが、玉は透けて見える）
  };
}

const TRANS_OUT = 0.6, TRANS_IN = 0.9; // ステージ切り替えの幕（下りる・上がる秒数）
