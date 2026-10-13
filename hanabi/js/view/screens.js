"use strict";
// タイトルとリザルト

const $ = id => document.getElementById(id);

// 大きい文字は、書いた改行（\n）の位置だけで折り返す。
// 1行が入りきらない狭い画面では、行の途中で折らずに文字を小さくする
const fitted = new Set();
function setLines(el, s) {
  el.replaceChildren(...s.split("\n").map(l => {
    const sp = document.createElement("span");
    sp.className = "ln"; sp.textContent = l;
    return sp;
  }));
  fitted.add(el);
  fitLines(el);
}
function fitLines(el) {
  el.style.fontSize = "";
  const room = el.clientWidth;
  if (!room) return; // 見えていない間は測れない（見えたときに測り直す）
  const widest = Math.max(...[...el.children].map(sp => sp.getBoundingClientRect().width));
  if (widest > room) el.style.fontSize = `${parseFloat(getComputedStyle(el).fontSize) * room / widest * 0.98}px`;
}
const refit = () => fitted.forEach(fitLines);
addEventListener("resize", refit);
document.fonts && document.fonts.ready.then(refit);
document.fonts && document.fonts.addEventListener("loadingdone", refit);

function showTitle() {
  const best = +store.get(BEST_KEY) || 0;
  $("titleBest").textContent = best ? `ベスト ${best.toLocaleString()}` : "";
  $("title").hidden = false;
  $("result").hidden = true;
}

function showResult() {
  const best = +store.get(BEST_KEY) || 0, bestChain = +store.get(CHAIN_KEY) || 0;
  const isBest = G.score > best;
  if (isBest) store.set(BEST_KEY, G.score);
  if (G.maxChain > bestChain) store.set(CHAIN_KEY, G.maxChain);
  $("resScore").textContent = G.score.toLocaleString();
  $("resHead").textContent = G.ended ? "本日はこれにてお開き" : "おしまい";
  $("resChain").textContent = `${G.maxChain}連鎖` + (G.perfects ? `・満開${G.perfects}回` : "");
  const reach = encoresOf(G.stage) ? `アンコール${encoresOf(G.stage)}回` : programShort(G.stage);
  $("resStage").textContent = reach;
  setLines($("resComment"), chairComment(G.score, G.stage));
  $("resBest").textContent = isBest ? "ベスト更新！" : `ベスト ${best.toLocaleString()}`;
  prepareShare(reach);
  setTimeout(() => { $("result").hidden = false; refit(); }, 700);
}

// 初めての人は、あそびかたを見てから始める
$("startBtn").addEventListener("click", () => {
  sfx.unlock();
  $("title").hidden = true;
  if (!store.get("hanabi-tutorial-seen")) startTutorial(() => newGame());
  else newGame();
});
$("retryBtn").addEventListener("click", () => { sfx.unlock(); $("result").hidden = true; newGame(); });

// 実行委員長のひとこと：スコアで決まる（届いた演目も少し加味）
const CHAIR = [
  { min: 0, s: "……まあ、\n来年もありますから。" },
  { min: 10000, s: "宵の口でお開きとは、\n少しさびしいですな。" },
  { min: 30000, s: "筋はいい。\n次は大詰めまで頼みますよ。" },
  { min: 60000, s: "お客さんの顔が明るかった。\nいい仕事です。" },
  { min: 100000, s: "町じゅうが見上げていましたよ。\nお見事！" },
  { min: 150000, s: "委員長を長年やっていますが、\nこんな夜は初めてです。" },
  { min: 210000, s: "伝説の夜です。\n来年も、ぜひあなたに。" },
];
function chairComment(score, stage) {
  const enc = encoresOf(stage);
  if (enc >= ENCORES) return "三度のアンコール！\nこの町の伝説になりました。";
  if (enc > 0 && score < 210000) return "アンコールまで！\n町の語り草になりますな。";
  let c = CHAIR[0];
  for (const t of CHAIR) if (score >= t.min) c = t;
  return c.s;
}

