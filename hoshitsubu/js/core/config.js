"use strict";
// 定数：画面の大きさ、星の段階、強化カード、敵の基本値、調整値

const VERSION = "ver1.0.1";
// 見出し・数字（キャンバスに描く文字）のフォント。CSS の --display / --dw と合わせる
const HEAD_FONT = "'Yusei Magic', 'Zen Maru Gothic', sans-serif", HEAD_W = 400;
// ロゴと星の名前：かなはだるまドロップ、漢字は入っていないのでゆうせいマジックで出す
const LOGO_FONT = "'Darumadrop One', " + HEAD_FONT;
const W = 360, H = 640;          // 論理座標（縦長 9:16）。キャンバスはこれを拡大して描く
const TAU = Math.PI * 2;
const WAVE_TIME = 20;            // 1波の長さ（秒）

// 星の段階はレベルで決まる（from 以上で到達。内部のレベルは0始まり、表示は+1）
const STAGES = [
  { name: "星のたまご", from: 0 },
  { name: "ちいさな星", from: 2 },
  { name: "若い星", from: 4 },
  { name: "かがやく星", from: 7 },
  { name: "一等星", from: 10 },
];

// 強化カード：3系統×4種、各Lv1〜9。前半の段階ほど大きく伸び、Lv6〜9は少しずつ（grow）。
// me は [文の前, 段階→値, 文の後]。word は星の名前のもと [前半, 後半, そのまま, 中]
const CARD_MAX = 9;
// Lv5 で a5、Lv9 で a9 になる伸び方（Lv1〜5 はまっすぐ、そのあとゆるやか）
const grow = (l, a5, a9) => l <= 5 ? a5 * l / 5 : a5 + (a9 - a5) * (l - 5) / 4;
const pct = v => "+" + Math.round(v * 100) + "%";
const CATS = {
  power: { name: "パワー", color: "#ff9ecf" },
  tech:  { name: "テクニカル", color: "#8ff0d2" },
  speed: { name: "スピード", color: "#9cc8ff" },
};
const CAT_KEYS = Object.keys(CATS);
const CARDS = {
  star:   { cat: "power", name: "一番星",   me: ["放った衛星の威力 ", l => pct(grow(l, 1, 1.6)), ""],                       word: ["シリ", "リウス", "シリウス", "シリ"] },
  cap:    { cat: "power", name: "衛星の器", me: ["衛星の上限 ", l => "+" + Math.round(grow(l, 30, 45)), ""],            word: ["パン", "ンドラ", "パンドラ", "ンド"] },
  split:  { cat: "power", name: "分裂",     me: ["放った衛星が敵に当たると", l => splitN(l) + "つに割れる。割れた粒の威力 " + pct(splitDmg(l) - 1), ""],              word: ["ポップ", "コーン", "ポップコーン", "プコ"] },
  nova:   { cat: "power", name: "超新星",   me: ["しばらく押し続けてから放つと衝撃波", l => "Lv" + l, "が出る。まわりの敵と弾を吹きとばす"], word: ["スーパ", "ノヴァ", "スーパーノヴァ", "パノ"] },
  grav:   { cat: "tech",  name: "引力",     me: ["引力圏の広さ ", l => pct(grow(l, .6, .9)), ""],       word: ["グラビ", "ビティ", "グラビティ", "ラビ"] },
  heal:   { cat: "tech",  name: "星の治癒", me: ["かけらを", l => healNeed(l) + "個", "集めるごとに、星のいのちが1つ戻る"], word: ["ヒー", "リング", "ヒーリング", "リン"] },
  ice:    { cat: "tech",  name: "氷の衣",   me: ["当たっても氷が守ってくれる（1波に", l => Math.ceil(l / 3) + "回）。割れた氷が、まわりの弾を消す（広さ ×" + (iceR(l) / 50).toFixed(1), "）"],       word: ["シャベ", "ベット", "シャーベット", "シャ"] },
  bless:  { cat: "tech",  name: "星の恵み", me: ["かけらでもらえる経験値 ", l => pct(grow(l, .75, 1.2)), ""], word: ["ハーベ", "ベスト", "ハーベスト", "ベス"] },
  speed:  { cat: "speed", name: "加速",     me: ["放った衛星の速さ ", l => pct(grow(l, .75, 1.1)) + (pierceN(l) ? "、敵を" + pierceN(l) + "体つらぬく" : ""), ""],                     word: ["ロケ", "ケット", "ロケット", "ロケ"] },
  homing: { cat: "speed", name: "追尾",     me: ["放った衛星が敵を追いかける力 ", l => "×" + (1 + grow(l, 1.5, 2.4)).toFixed(1), ""], word: ["ブーメ", "メラン", "ブーメラン", "メラ"] },
  twin:   { cat: "speed", name: "連星",     me: ["相棒星が回って弾から守ってくれる（", l => Math.ceil(l / 3) + "つ・守る広さ ×" + (twinR(l) / 12).toFixed(1), "）"],        word: ["サテ", "ライト", "サテライト", "テラ"] },
  light:  { cat: "speed", name: "身軽",     me: ["衛星を集めたときの重さ ", l => "−" + Math.round(grow(l, .5, .8) * 100) + "%", ""], word: ["フェザ", "ザー", "フェザー", "フェ"] },
};
const CARD_KEYS = Object.keys(CARDS);
// 大彗星の技：12種、各Lv1〜9。カードとは別もの。配られたカード2枚にランダムに1つずつ付き、選ばなかったカードの技が大彗星のものになる。
// どれも攻撃や動きが変わるもので、体力・殻・回復は増やさない（それは何体目かで決める）。text は [文の前, 段階→値, 文の後]、icon は絵を借りるカード
const BOSS_TECHS = {
  barrage: { name: "弾幕",     icon: "cap",    text: ["大彗星の撃つ弾の数 ", l => pct(grow(l, .75, 1.1)), ""] },
  splitb:  { name: "分裂弾",   icon: "split",  text: ["大彗星の弾が途中で", l => splitN(l) + "つに分裂する。割れた弾の速さ " + pct(splitbSp(l) - 1), ""] },
  burst:   { name: "殻はじけ", icon: "nova",   text: ["大彗星の殻が割れると、弾を", l => 4 + l * 2 + "発", "まき散らす"] },
  fastb:   { name: "速い弾",   icon: "speed",  text: ["大彗星の弾の速さ ", l => pct(grow(l, .5, .8)), ""] },
  chase:   { name: "追う弾",   icon: "homing", text: ["大彗星の弾があなたを", l => l <= 2 ? "ゆるく" : l <= 6 ? "しっかり" : "しつこく", "追う"] },
  kid:     { name: "子彗星",   icon: "twin",   text: ["大彗星に子彗星が付いて弾を撃つ（", l => Math.ceil(l / 3) + "つ・撃つ間隔 " + kidGap(l).toFixed(1) + "秒", "）"] },
  quick:   { name: "早足",     icon: "light",  text: ["大彗星の動きの速さ ", l => pct(grow(l, 1, 1.6)), "、ときどき素早く動く"] },
  big:     { name: "大玉",     icon: "star",   text: ["大彗星の弾の大きさ ", l => pct(grow(l, .75, 1.2)), ""] },
  pull:    { name: "引き寄せ", icon: "grav",   text: ["大彗星があなたを", l => l <= 2 ? "少しずつ" : l <= 6 ? "じわじわ" : "ぐいぐい", "引き寄せる"] },
  ring:    { name: "殻の輪",   icon: "heal",   text: ["大彗星の殻が戻るとき、弾の輪を撃つ（", l => ringN(l) + "発", "）"] },
  frost:   { name: "凍り弾",   icon: "ice",    text: ["大彗星の弾に、あとで砕けて広がる弾が", l => l <= 2 ? "ときどき" : l <= 6 ? "よく" : "たくさん", "まざる"] },
  minion:  { name: "子分よび", icon: "bless",  text: ["大彗星が子分を連れてくる（", l => Math.ceil(l / 3) + "体・倒されると " + minionGap(l).toFixed(1) + "秒で次", "）"] },
};
const TECH_KEYS = Object.keys(BOSS_TECHS);
const ringN = l => 8 + l * 2;                                  // 殻の輪：Lv1 10発〜Lv9 26発
const frostRate = l => grow(l, .15, .3);                       // 凍り弾：大彗星の弾のうち凍り弾になる割合
const pullSpeed = l => 14 + grow(l, 20, 34);                   // 引き寄せ：自機を寄せる速さ（px/秒）
const NAME_STEP = 3;   // 星の名前と帽子が変わる節目（Lv3・6・9）
const HAT_NAMES = { star: "王冠", cap: "パンダフード", split: "パーティー帽", nova: "つのかぶと", grav: "まじょの帽子", heal: "うさみみフード",
  ice: "ニット帽", bless: "むぎわら帽子", speed: "パイロット帽", homing: "ハンチング", twin: "ヘルメット", light: "ねこみみフード" };
const splitN = l => Math.ceil(l / 3) + 1;          // 分裂：Lv1〜3で2つ、4〜6で3つ、7〜9で4つ
// 数が Lv1・4・7 でしか増えないカードと技は、ほかの値をレベルごとに伸ばして、どのレベルでも強くなるようにする
const splitDmg = l => 1 + grow(l, .25, .5);        // 分裂：割れた粒の威力（Lv1 +5%〜Lv9 +50%）
const iceR = l => 50 + grow(l, 40, 80);            // 氷の衣：まわりの弾を凍らせる半径（Lv1 58〜Lv9 130）
const twinR = l => 12 + grow(l, 6, 12);            // 連星：相棒星が弾を防ぐ半径（Lv1 13〜Lv9 24）
const splitbSp = l => 1 + grow(l, .15, .3);        // 分裂弾：割れた弾の速さ
const kidGap = l => 1.8 - grow(l, .4, .7);         // 子彗星：撃つ間隔（秒）
const minionGap = l => 3.5 - grow(l, 1, 1.8);      // 子分よび：倒されてから次を呼ぶまで（秒）
const pierceN = l => Math.floor(l / 3);   // 加速：Lv3・6・9で、放った衛星が敵を1体ずつ多くつらぬく
const healNeed = l => Math.round(60 - grow(l, 25, 35));   // 星の治癒：星のいのちが1つ戻るまでに集めるかけらの数（Lv1 55個〜Lv9 25個）
const NOVA_T = 2.5;                                 // 超新星：衝撃波がたまるまで押し続ける秒数
const novaDmg = l => 2 * (1 + grow(l, 1.5, 2.5));   // 超新星の威力（衛星1つ=1。Lv1 2.6〜Lv5 5〜Lv9 7）
const novaR = l => 90 + grow(l, 50, 80);           // 超新星の半径（Lv1 100〜Lv9 170）
// 系統ボーナス（型）：同じ系統の合計Lvが10と20で目覚める
const AWAKE_AT = [10, 20];
// パワーの型：まとめて放つほど1つの威力が上がる（衛星1つにつき+1%、上限 +50%／+100%）
const powerMul = (n, a) => a ? 1 + Math.min(a * .5, n * .01) : 1;
// 名乗りで出す型の知らせ [1段目, 2段目]
const AWAKE_MSG = {
  power: ["まとめて放つほど威力アップ", "まとめて放つ威力がさらにアップ"],
  tech:  ["星のいのち +1", "星のいのち +1"],
  speed: ["放った衛星が1回はね返る", "放った衛星が2回はね返る"],
};
// 星の二つ名：取ったカードの系統の偏りで決める（1系統に6割以上なら特化、2系統なら組み合わせ、3系統なら全部）
const TITLES = {
  power: "どかーん", tech: "すくすく", speed: "びゅんびゅん",
  "power+tech": "がっしり", "power+speed": "ずばばん", "speed+tech": "くるくる",
  all: "きらきら",
};
// 組み合わせの二つ名の色（系統の色を使う）
const TITLE_CAT = { "power+tech": "power", "power+speed": "speed", "speed+tech": "tech" };

// 敵の基本値。wave は初登場の波（ボスを倒さないと次へ進めないので、6波＝ボス1回撃破後、11波＝2回撃破後）
const ENEMY = {
  chibi:   { hp: 1, r: 11, pts: 10, color: "#9fd8ff", wave: 1 },
  baramaki:{ hp: 2, r: 13, pts: 20, color: "#c9b6ff", wave: 2 },
  houki:   { hp: 3, r: 13, pts: 30, color: "#b48cff", wave: 3 },
  iwa:     { hp: 4, r: 14, pts: 30, color: "#9a95b5", wave: 4 },
  tsubu:   { hp: 4, r: 14, pts: 60, color: "#ff9f7a", wave: 3 },
  itazura: { hp: 1, r: 10, pts: 50, color: "#ffb36b", wave: 6 },
  kui:     { hp: 5, r: 15, pts: 80, color: "#5b5bd6", wave: 11 },
  minion:  { hp: 2, r: 9,  pts: 15, color: "#cfeaff", wave: 99 },
};
const BOSS_R = 36;

// 調整値（モックで好評だった量）。とげ弾は倒したボスの数×12%（上限60%）
const TUNE = { enemy: 1.4, fire: 1.4, thorn: 1 };
const SENS = 1.5;                // 指の移動量に対する自機の移動の倍率
const SAT_COLORS = ["#ffe58a", "#ff9ecf", "#8ff0d2", "#9cc8ff", "#d7b8ff"];
const THORN_COLOR = "#ff6b8a";

// テスト用（プレビュー用の1ファイル版だけ）。タイトルに「はじめる波」と無敵を出す
const DEV = { on: !!window.HOSHI_DEV, wave: 1, inv: false, xp: 1, short: false, lvup: 0 };
