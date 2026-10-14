/*
 * ミニゲーム共通：スプラッシュ画面（ロゴや注意書きを、黒い画面の上で順に見せる）
 * 読み込み（Loading...）が済んでからタイトルを見せるまでの間に流す。使い方は common/README.md。
 *
 *   <head> の system.js の直後に：
 *   <script src="../common/splash.js" data-src="#splash"></script>
 *
 *   <body> に、1枚ずつ <section> で書いた <template> を置く：
 *   <template id="splash">
 *     <section><img src="assets/logo.webp" alt="..."></section>
 *     <section data-sec="3">音を出して遊ぶのがおすすめです</section>
 *   </template>
 *
 *   data-src  スライドを書いた <template> のセレクタ（省略時 #splash）
 *   data-sec  その1枚を見せる秒数（省略時 2.4）。前後に0.5秒ずつフェードが付く
 *
 * 画面のどこかをタップすると、残りを飛ばしてタイトルへ進む（案内は出さない）。
 */
(() => {
  "use strict";
  const me = document.currentScript;
  const SRC = (me && me.dataset.src) || "#splash";
  const FADE = 500, GAP = 150, SEC = 2.4;
  const root = document.documentElement;
  root.classList.add("mg-booting"); // タイトルを見せる前に黒い幕を出す（描画前に付けるため <head> で読み込む）

  // スライドの画像は、読み込み中に先に取りに行く
  const ready = new Promise(res => {
    const go = () => {
      const tpl = document.querySelector(SRC);
      const imgs = tpl ? [...tpl.content.querySelectorAll("img")] : [];
      Promise.all(imgs.map(i => {
        const im = new Image();
        im.src = i.getAttribute("src");
        return im.decode().catch(() => {});
      })).then(() => res(tpl));
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
    else go();
  });

  const MG = window.MG || (window.MG = {});
  MG.splash = {
    // system.js が幕を上げる直前に呼ぶ。流し終えたら（またはタップで飛ばしたら）end() を呼ぶ
    play(end) {
      let finished = false, timer = 0;
      const wait = ms => new Promise(r => { timer = setTimeout(r, ms); });
      const box = document.createElement("div");
      box.className = "mg-splash";
      root.append(box);
      root.classList.add("mg-splashing"); // Loading... の表示を消す
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        box.classList.add("mg-out");
        root.classList.remove("mg-splashing");
        end();
        setTimeout(() => box.remove(), 600);
      };
      // タップで飛ばす。直前まで Loading... を連打していた指で飛ばしてしまわないよう、出始めは受け付けない。
      // 飛ばしたタップが下のボタン（あそぶ等）に届かないよう、消え終わるまで全面で操作を受け止める
      const t0 = performance.now();
      for (const ev of ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend", "click"]) {
        box.addEventListener(ev, e => {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          if (ev === "pointerup" && performance.now() - t0 > 350) finish();
        }, { passive: false });
      }
      (async () => {
        const tpl = await Promise.race([ready, new Promise(r => setTimeout(r, 3000))]);
        const slides = tpl ? [...tpl.content.children] : [];
        await wait(root.querySelector(".mg-loading") ? 350 : GAP);
        for (const s of slides) {
          if (finished) return;
          const el = s.cloneNode(true);
          el.classList.add("mg-slide");
          box.replaceChildren(el);
          await wait(30);
          el.classList.add("mg-in");
          await wait(FADE + (parseFloat(el.dataset.sec) || SEC) * 1000);
          if (finished) return;
          el.classList.remove("mg-in");
          await wait(FADE + GAP);
        }
        finish();
      })();
    },
  };
})();
