"use strict";
// 強化カード：レベルが上がった波の終わりに2枚。それぞれに大彗星の技がランダムに1つ付き、選ばなかった方の技が大彗星のものになる

// 出やすさ：取ったカードほど出やすく（1 + Lv×0.5）、配られて選ばなかったカードは出るたびに ×0.6（下限0.1）。
// いちばん合計Lvの高い系統のカードは、さらに ×1.5。最大（Lv9）のカードは出ない
const openCards = () => CARD_KEYS.filter(k => lv(k) < CARD_MAX);
function topCat() { let best = null, bl = 0; for (const c of CAT_KEYS) { const l = catLv(c); if (l > bl) { bl = l; best = c; } } return best; }
function cardWeight(k, top) {
  if (lv(k) >= CARD_MAX) return 0;
  const w = lv(k) > 0 ? 1 + lv(k) * .5 : Math.max(.1, .6 ** (G.skips[k] || 0));
  return w * (CARDS[k].cat === top ? 1.5 : 1);
}
function drawWeighted(keys, top) {
  let r = Math.random() * keys.reduce((s, k) => s + cardWeight(k, top), 0);
  for (const k of keys) { r -= cardWeight(k, top); if (r <= 0) return k; }
  return keys[keys.length - 1];
}
// 大彗星の技の今のLv（前の大彗星から引き継ぐ分＋次の大彗星へ渡すことが決まった分）
const techLv = k => G.bossCards.filter(x => x === k).length + G.stash.filter(x => x === k).length;
function dealCards() {
  const pool = openCards();
  if (pool.length < 2) return null;
  const top = topCat(), a = drawWeighted(pool, top), b = drawWeighted(pool.filter(k => k !== a), top);
  // 2枚に別々の技を付ける（Lv9に届いた技は付かない）
  const tp = TECH_KEYS.filter(k => techLv(k) < CARD_MAX), ta = pick(tp), tb = pick(tp.filter(k => k !== ta)) || ta;
  G.deal = { [a]: ta, [b]: tb };
  return [a, b];
}
// 選べるカードが1枚以下：最後の1枚はそのまま取り、全部最大ならレベルアップは点になる
function autoCards() {
  const last = openCards()[0];
  if (last) { G.picks[last] = lv(last) + 1; G.pickOrder.push(last); G.pending--; checkAwake(); if (last === "ice") G.iceLeft = iceN(); }
  if (G.pending > 0) { const pts = 1000 * G.pending; G.score += pts; G.pending = 0; scorePop(G.p.x, G.p.y - 40, pts, 4); }
  if (last) checkName(last);
  heroOnce("joy"); sfx.chord(true);
}
function chooseCard(k, other) {
  G.picks[k] = lv(k) + 1; G.pickOrder.push(k);
  if (lv(other) === 0) G.skips[other] = (G.skips[other] || 0) + 1;
  if (G.deal[other]) G.stash.push(G.deal[other]);   // 選ばなかったカードに付いていた技が、次の大彗星のものに
  G.pending--;
  heroOnce("joy");
  checkAwake(); checkName(k);
  if (k === "ice") G.iceLeft = iceN();
}
// 節目（Lv3・6・9）：届いた順を覚えておく。名前の並びと帽子が変わったら、カード選びのあとで見せる
const mileOf = k => Math.floor(lv(k) / NAME_STEP);
function checkName(k) {
  const before = starName(), m = G.mile[k] || (G.mile[k] = []);
  while (m.length < mileOf(k)) m.push(++G.mileSeq);
  const head = nameKeys()[0] || null;
  if (head !== G.hat) { G.hatOld = G.hat; G.hat = head; G.hatT = -99; }   // かぶるのは名乗りの演出の中で
  if (starName() !== before) { G.renamed = true; if (G.oldName == null) G.oldName = before; }   // 続けて選んだときは、最初の名前をふっとばす
}
// 系統ボーナス（型）：合計Lvが10・20に届いたら目覚める。テクニカルは段ごとに星のいのちが1つ増える。
// 目覚めたことは、カード選びのあとの名乗りで知らせる（quiet：ビューワーの作り直しでは知らせない）
function checkAwake(quiet) {
  for (const c of CAT_KEYS) {
    const n = AWAKE_AT.filter(x => catLv(c) >= x).length;
    while (n > G.awake[c]) {
      const k = ++G.awake[c]; G.awakeNew = c;
      if (c === "tech") G.lives++;
      if (!quiet) G.awakeMsgs.push({ c, n: k });
    }
  }
}
// 星の名前：節目（Lv3・6・9）に届いたカードでつける。高い節目のカードほど前、同じ節目なら先に届いたカードが前。
// 1つなら全部、2つなら1番目の前半＋2番目の後半、3つなら1番目の前半＋2番目の「中」＋3番目の後半。いちばん前のカードの帽子をかぶる
// つなぎ目で「ン」が2つ並んだら1つにまとめる（パン＋ンドラ → パンドラ）
const joinName = (...a) => a.reduce((s, w) => s.endsWith("ン") && w.startsWith("ン") ? s + w.slice(1) : s + w);
function starName() {
  const keys = nameKeys();
  if (!keys.length) return "ななしの星";
  if (keys.length === 1) return CARDS[keys[0]].word[2];
  if (keys.length === 3) return joinName(CARDS[keys[0]].word[0], CARDS[keys[1]].word[3], CARDS[keys[2]].word[1]);
  return joinName(CARDS[keys[0]].word[0], CARDS[keys[1]].word[1]);
}
function starTitle() {
  const t = CAT_KEYS.map(c => [c, catLv(c)]).sort((a, b) => b[1] - a[1]), sum = t.reduce((s, x) => s + x[1], 0);
  if (!sum) return { text: "", cat: null };
  if (t[0][1] / sum >= .6) return { text: TITLES[t[0][0]], cat: t[0][0] };
  if (t[2][1] / sum < .2) { const k = [t[0][0], t[1][0]].sort().join("+"); return { text: TITLES[k], cat: TITLE_CAT[k] }; }
  return { text: TITLES.all, cat: null };
}
function nameKeys() {
  const n = k => (G.mile[k] || []).length;   // 届いたと記録ずみの節目の数（checkName で増える）
  const keys = CARD_KEYS.filter(k => n(k) > 0), at = k => G.mile[k][n(k) - 1];
  keys.sort((a, b) => n(b) - n(a) || at(a) - at(b));
  return keys.slice(0, 3);
}
