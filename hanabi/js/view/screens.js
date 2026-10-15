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

// ベストは、その夜が本当に終わったときだけ記録する（泣きの一回が残るリザルトでは記録しない：やり直すと点がもどるため）
function saveBest() {
  if (G.bestSaved) return;
  G.bestSaved = true;
  const best = +store.get(BEST_KEY) || 0, bestChain = +store.get(CHAIN_KEY) || 0;
  G.newBest = G.score > best;
  if (G.newBest) store.set(BEST_KEY, G.score);
  if (G.maxChain > bestChain) store.set(CHAIN_KEY, G.maxChain);
}

function showResult() {
  const best = +store.get(BEST_KEY) || 0;
  if (!G.offerMercy) saveBest();
  $("resScore").textContent = G.score.toLocaleString();
  $("resHead").textContent = G.ended ? "本日はこれにてお開き" : "おしまい";
  $("resChain").textContent = `${G.maxChain}連鎖` + (G.perfects ? `・満開${G.perfects}回` : "");
  const reach = encoresOf(G.stage) ? `アンコール${encoresOf(G.stage)}回` : programShort(G.stage);
  $("resStage").textContent = reach;
  setLines($("resComment"), chairComment(G.score, G.stage));
  $("resBest").textContent = G.bestSaved && G.newBest ? "ベスト更新！" : `ベスト ${best.toLocaleString()}`;
  prepareShare(reach);
  $("mercyBtn").hidden = !G.offerMercy;
  // アンコールでのミス：泣きの一回か、ここでお開き（大団円）にするかを選ぶ
  $("retryBtn").textContent = G.encoreOffer ? "お開きにする" : "タイトルへ";
  if (G.encoreOffer) $("resHead").textContent = "アンコールならず";
  // アンコールでは、泣きの一回の残りをボタンの下に小さく出す
  $("mercyBtn").innerHTML = "泣きの1回！" + (G.encoreOffer ? `<small class="btn-sub">（あと${ENCORE_MERCY - G.encoreRetries}回）</small>` : "");
  $("resSeed").textContent = `シード ${G.seed}`;
  $("resSeed").hidden = !SHOW_SEED; // いまは隠す（config.js の SHOW_SEED）
  // 最後の景を満開で終えられなかったときは、その景のお手本を見られる（大団円のあとも）
  $("answerBtn").hidden = G.lastPerfect || !G.snap || !G.snap.answer;
  setTimeout(() => { $("result").hidden = false; refit(); }, 700);
}

// 初めての人は、あそびかたを見てから始める
$("startBtn").addEventListener("click", () => {
  sfx.unlock();
  $("title").hidden = true;
  if (!store.get(TUT_KEY)) startTutorial(() => newGame());
  else newGame();
});
// タイトルへ（もう一回遊ぶのはタイトルから）
$("retryBtn").addEventListener("click", () => {
  sfx.unlock();
  if (G.encoreOffer) { $("result").hidden = true; startEnding(true); return; }
  if (!G.practice) saveBest(); // 泣きの一回を使わずにやめたときも、ここでその夜はおしまい
  G.mode = "title"; G.orbs = []; G.clouds = []; G.shells = []; G.bursts = []; G.texts = []; G.stamps = []; G.cheers = []; G.trans = null;
  G.rise = null; G.focus = null; G.replay = null; G.board = null; G.wait = null;
  showTitle();
});

// シードで遊ぶ：シードと景を選んで、その景から。最後に遊んだシードを最初から入れておく
const SEED_KEY = "hanabi-last-seed";
$("stageIn").innerHTML = Array.from({ length: PROGRAM.length + ENCORES }, (_, i) => `<option value="${i + 1}">${programShort(i + 1)}</option>`).join("");
$("seedBtn").addEventListener("click", () => {
  sfx.unlock();
  $("seedIn").value = store.get(SEED_KEY) || "";
  $("seedErr").textContent = "";
  $("title").hidden = true; $("seedBox").hidden = false;
});
$("seedBack").addEventListener("click", () => { $("seedBox").hidden = true; showTitle(); });
$("seedGo").addEventListener("click", () => {
  sfx.unlock();
  const seed = +$("seedIn").value.replace(/\D/g, "");
  if (!(seed >= 100000 && seed <= 999999)) { $("seedErr").textContent = "シードは6けたの数字です"; return; }
  $("seedBox").hidden = true;
  newGame({ seed, stage: +$("stageIn").value });
});
// 遊び終わった景のメニュー
function showPractice() {
  setLines($("prHead"), `練習　シード ${G.seed}　${programShort(G.stage)}`);
  const all = G.lastPopped >= G.total;
  $("prRes").textContent = `${G.lastPopped} / ${G.total} 開いた（目標 ${G.target}）\n${all ? "満開！" : G.lastPopped >= G.target ? "おみごと" : "とどかず…"}`;
  $("prNext").hidden = G.stage >= PROGRAM.length + ENCORES;
  setTimeout(() => { if (G.mode === "pmenu") $("practice").hidden = false; }, 300);
}
const prGo = f => () => { sfx.unlock(); $("practice").hidden = true; f(); };
$("prAgain").addEventListener("click", prGo(() => restartStage()));
$("prAnswer").addEventListener("click", prGo(() => startReplay()));
$("prNext").addEventListener("click", prGo(() => { G.mode = "trans"; G.trans = { out: true, t: 0 }; }));
$("prTitle").addEventListener("click", prGo(() => $("retryBtn").click()));

// 泣きの一回：リザルトに「タイトルへ」と並べて出す（何度でも。2回目からは減点つき）
// 押すと、点を画面の真ん中に寄せて、赤い減点を出しながら減らしてから、その景をやり直す
$("mercyBtn").addEventListener("click", () => {
  sfx.unlock();
  const res = $("result"), sc = $("resScore"), pn = $("resPen");
  if (res.classList.contains("mercying")) return;
  const pen = mercyPenalty(), from = G.score, to = Math.max(0, from - pen);
  const r = sc.getBoundingClientRect(), box = res.getBoundingClientRect();
  sc.style.transform = `translateY(${box.top + box.height / 2 - (r.top + r.height / 2)}px)`;
  res.classList.add("mercying");
  pn.textContent = G.retries ? `−${pen.toLocaleString()}点` : "初回は無料！";
  setTimeout(() => {
    pn.hidden = false;
    const t0 = performance.now(), dur = pen ? 1100 : 0;
    const tick = () => {
      const k = dur ? Math.min(1, (performance.now() - t0) / dur) : 1;
      sc.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 2))).toLocaleString();
      if (k < 1) return requestAnimationFrame(tick);
      setTimeout(() => {
        res.hidden = true; res.classList.remove("mercying"); pn.hidden = true; sc.style.transform = "";
        retryStage();
      }, 900);
    };
    tick();
  }, 550);
});
// お手本を見る：しくじった景で、満開にできた1発を打ち上げて見せる
$("answerBtn").addEventListener("click", () => { sfx.unlock(); $("result").hidden = true; startReplay(); });
// 満開でないクリアのあと、次の景へ移るまでの間だけ出る「お手本を見る」。見終わったら次の景へ
$("clearAnswer").addEventListener("click", () => {
  if (G.mode !== "clear") return;
  sfx.unlock(); $("clearAnswer").hidden = true;
  G.replayThen = "clear"; startReplay();
});

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
  if (enc >= ENCORES) return "九十九回のアンコール！\nこの町の伝説になりました。";
  if (enc > 0 && score < 210000) return "アンコールまで！\n町の語り草になりますな。";
  let c = CHAIR[0];
  for (const t of CHAIR) if (score >= t.min) c = t;
  return c.s;
}

