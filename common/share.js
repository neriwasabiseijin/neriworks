/*
 * ミニゲーム共通：リザルトのシェア（結果画像＋投稿文）。
 * 使い方は common/README.md を参照。
 *
 *   <script src="../common/share.js"></script>   （system.js の後ならどこでもよい）
 *
 *   MG.share.prepare(canvas, { text, name })  ゲームオーバー時に結果画像を作っておく
 *   MG.share.open()                            「シェアする」ボタンを押したときに呼ぶ
 *
 * スマホ：OSの共有シート（画像＋投稿文）。LINE・X・写真に保存などはOS側で選ぶ。
 * 共有シートが使えないとき（PC、アプリ内ブラウザ、失敗したとき）：このファイルのシェア画面を出す。
 *   画像のプレビュー（スマホは長押しで保存）、X・LINE（画像をコピーしてから投稿画面を開く）、
 *   画像を保存（アプリ内ブラウザでは保存できないので出さない）、LINE内なら「ブラウザで開く」。
 */
(() => {
  "use strict";
  const ua = navigator.userAgent;
  const isLine = /\bLine\//i.test(ua);
  // アプリ内ブラウザ（LINE / Instagram / Facebook / X など）。ダウンロードが効かないことが多い
  const inApp = isLine || /FBAN|FBAV|Instagram|Twitter|MicroMessenger|; wv\)/i.test(ua);
  const touch = matchMedia("(pointer: coarse)").matches;

  let text = "", name = "result.png", dataURL = "", file = null, blobURL = "";
  let panel = null;

  // 共有シートはボタンを押した瞬間に呼ばないと止められるので、画像は先に作っておく
  function prepare(canvas, opt = {}) {
    text = opt.text || "";
    name = opt.name || "result.png";
    file = null; dataURL = "";
    if (blobURL) { URL.revokeObjectURL(blobURL); blobURL = ""; }
    try {
      dataURL = canvas.toDataURL("image/png");
      canvas.toBlob(b => {
        if (!b) return;
        file = new File([b], name, { type: "image/png" });
        blobURL = URL.createObjectURL(b);
      }, "image/png");
    } catch (e) {} // file:// で開いて画像が使えないときは文字だけになる
  }

  function open() {
    if (touch && navigator.share) {
      const data = { text };
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file];
      navigator.share(data).catch(e => { if (e.name !== "AbortError") showPanel(); });
      return;
    }
    showPanel();
  }

  // X / LINE の投稿画面は画像を受け取れないので、先にクリップボードへ入れて貼り付けてもらう。
  // await してから window.open すると iPhone の Safari ではポップアップが止められるため、どちらも同じ瞬間に呼ぶ。
  function copyImage() {
    if (!file || !navigator.clipboard || !window.ClipboardItem) return Promise.resolve(false);
    try { return navigator.clipboard.write([new ClipboardItem({ "image/png": file })]).then(() => true, () => false); }
    catch (e) { return Promise.resolve(false); }
  }
  function go(url) {
    const w = window.open(url, "_blank");
    if (w) w.opener = null; else location.href = url; // 新しいタブを開けないアプリ内ブラウザ
  }
  function post(url, where) {
    const copied = copyImage();
    go(url);
    copied.then(ok => toast(ok ? `画像をコピーしました。${where}に貼り付けてね` : touch ? "画像は長押しで保存して添付してね" : "画像は「保存」してから添付してね"));
  }
  function save() {
    if (!blobURL) { toast(location.protocol === "file:" ? "ファイルを直接開いたときは画像を作れません" : "画像を作れませんでした"); return; }
    const a = document.createElement("a");
    a.href = blobURL; a.download = name;
    document.body.append(a); a.click(); a.remove();
  }
  function externalURL() {
    const u = new URL(location.href);
    u.searchParams.set("openExternalBrowser", "1"); // LINE のアプリ内ブラウザから既定のブラウザで開き直す
    return u.href;
  }

  function showPanel() {
    if (!panel) build();
    const img = panel.querySelector("img");
    img.hidden = !dataURL;
    if (dataURL) img.src = dataURL;
    panel.querySelector(".mg-share-hint").hidden = !(dataURL && touch);
    panel.querySelector("[data-act=save]").hidden = inApp;
    panel.querySelector(".mg-share-ext").hidden = !isLine;
    panel.hidden = false;
    panel.querySelector("[data-act=x]").focus();
  }
  function hidePanel() { panel.hidden = true; }

  function toast(msg) {
    const t = panel.querySelector(".mg-share-toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), 2400);
  }

  function build() {
    const st = document.createElement("style");
    st.textContent = `
.mg-share { position: fixed; inset: var(--mg-bar-h, 0px) 0 0 0; z-index: 9000; display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(6, 4, 16, .78); font-family: system-ui, sans-serif; -webkit-tap-highlight-color: transparent; }
.mg-share[hidden] { display: none; }
.mg-share-box { position: relative; width: 100%; max-width: 360px; max-height: 100%; overflow: auto; display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 18px 16px 16px; border-radius: 18px; background: #1d1838; color: #f5efff; box-shadow: 0 10px 40px rgba(0,0,0,.5); }
.mg-share-box h2 { margin: 0; font-size: 17px; }
.mg-share-box img { width: 100%; max-width: 300px; aspect-ratio: 1; border-radius: 10px; -webkit-touch-callout: default; user-select: auto; }
.mg-share-hint { margin: -4px 0 0; font-size: 12px; color: #b9b0e0; }
.mg-share-btns { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.mg-share-btns button { font: inherit; font-size: 14px; font-weight: 700; min-width: 76px; height: 44px; padding: 0 14px; border: 0; border-radius: 12px; color: #fff; cursor: pointer; }
.mg-share-btns button[hidden] { display: none; }
.mg-share-btns [data-act=x] { background: #111; box-shadow: 0 3px 0 #000; }
.mg-share-btns [data-act=line] { background: #06c755; box-shadow: 0 3px 0 #04883a; }
.mg-share-btns [data-act=save] { background: #3a3266; box-shadow: 0 3px 0 #241e45; }
.mg-share-btns button:active { transform: translateY(2px); box-shadow: none; }
.mg-share-ext { font-size: 13px; color: #9fd0ff; }
.mg-share-ext[hidden] { display: none; }
.mg-share-close { background: none; border: 0; box-shadow: none; border-radius: 8px; transform: none; color: #b9b0e0; font: inherit; font-size: 14px; padding: 6px 12px; cursor: pointer; }
.mg-share-toast { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); width: max-content; max-width: 90%; padding: 8px 14px;
  border-radius: 999px; background: #000c; color: #fff; font-size: 13px; pointer-events: none; }
.mg-share-toast[hidden] { display: none; }`;
    document.head.append(st);
    panel = document.createElement("div");
    panel.className = "mg-share";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "シェア");
    panel.innerHTML = `<div class="mg-share-box">
  <h2>シェア</h2>
  <img alt="結果の画像">
  <p class="mg-share-hint">画像を長押しすると保存できます</p>
  <div class="mg-share-btns">
    <button data-act="x" aria-label="Xでポスト">𝕏 ポスト</button>
    <button data-act="line">LINE</button>
    <button data-act="save">画像を保存</button>
  </div>
  <a class="mg-share-ext" target="_blank">ブラウザで開くと共有ボタンが使えます</a>
  <button class="mg-share-close">とじる</button>
  <p class="mg-share-toast" role="status" hidden></p>
</div>`;
    panel.querySelector(".mg-share-ext").href = externalURL();
    panel.addEventListener("click", e => {
      if (e.target === panel) return hidePanel(); // 外側をタップで閉じる
      const act = e.target.closest("[data-act]");
      if (!act) return;
      if (act.dataset.act === "x") post("https://x.com/intent/post?text=" + encodeURIComponent(text), "投稿欄");
      else if (act.dataset.act === "line") post("https://line.me/R/share?text=" + encodeURIComponent(text), "トーク");
      else save();
    });
    panel.querySelector(".mg-share-close").onclick = hidePanel;
    addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) hidePanel(); });
    document.body.append(panel);
  }

  window.MG = window.MG || {};
  window.MG.share = { prepare, open };
})();
