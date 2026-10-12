/*
 * ミニゲーム共通：システムバー（左上に電源、右上にBGM・オプション）と電源ON/OFF演出。
 * 使い方とデザインルールは common/README.md を参照。
 *
 *   <head> の system.css の直後に：
 *   <script src="../common/system.js" data-frame="#stage" data-right="#musicBtn"></script>
 *
 *   data-frame  バーの左右端をそろえるゲーム画面の要素（省略時は画面幅いっぱい）
 *   data-right  右上に置くゲーム側のボタン（カンマ区切りのセレクタ、左から順に並ぶ）
 *   data-home   戻り先（省略時 ../index.html）
 */
(() => {
  "use strict";
  const me = document.currentScript;
  const opt = k => (me && me.dataset[k]) || "";
  const HOME = opt("home") || "../index.html";
  const KEY = "minigames:power"; // トップと受け渡す合図（"on" = 起動してきた / "off" = 電源を切って戻る）

  // ---- 起動してきたときは黒から明ける
  // 描画前に黒い幕を出したいので、このスクリプトは <head> で読み込む（README 参照）。
  let flag = null;
  try { flag = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch {}
  const root = document.documentElement;
  if (flag === "on") {
    root.classList.add("mg-booting");
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      requestAnimationFrame(() => {
        root.classList.add("mg-booted");
        setTimeout(() => root.classList.remove("mg-booting", "mg-booted"), 600);
      });
    };
    addEventListener("load", () => setTimeout(reveal, 80));
    setTimeout(reveal, 2500); // 読み込みが遅くても、いつまでも真っ暗にはしない
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();

  function setup() {
    // ---- バー
    const bar = document.createElement("div");
    bar.className = "mg-bar";
    bar.innerHTML = `<div class="mg-bar-side mg-bar-left"></div><div class="mg-bar-side mg-bar-right"></div>`;
    document.body.append(bar);
    const left = bar.querySelector(".mg-bar-left"), right = bar.querySelector(".mg-bar-right");

    const power = document.createElement("button");
    power.type = "button";
    power.className = "mg-btn mg-power";
    power.setAttribute("aria-label", "ゲームをやめてトップに戻る");
    power.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/></svg><span class="mg-ask">やめる？</span>`;
    left.append(power);

    for (const sel of opt("right").split(",").map(s => s.trim()).filter(Boolean)) {
      const el = document.querySelector(sel);
      if (el) { el.classList.add("mg-btn"); right.append(el); }
    }

    // バーの左右端をゲーム画面にそろえる
    const frame = opt("frame") && document.querySelector(opt("frame"));
    const PAD = 4;
    function place() {
      if (!frame) { bar.style.left = bar.style.right = "10px"; return; }
      const r = frame.getBoundingClientRect();
      bar.style.left = Math.max(10, r.left + PAD) + "px";
      bar.style.right = Math.max(10, innerWidth - r.right + PAD) + "px";
    }
    place();
    addEventListener("resize", () => requestAnimationFrame(place));
    if (frame && window.ResizeObserver) new ResizeObserver(place).observe(frame);

    // バーのボタンへの操作がゲーム側の入力（タップで玉を落とす等）に伝わらないようにする
    for (const ev of ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend", "click"]) {
      bar.addEventListener(ev, e => e.stopPropagation());
    }

    // ---- 電源ボタン（2回押しで終了）
    let timer = 0, leaving = false;
    const disarm = () => { power.classList.remove("armed"); clearTimeout(timer); };
    power.addEventListener("click", () => {
      if (leaving) return;
      if (!power.classList.contains("armed")) {
        power.classList.add("armed");
        clearTimeout(timer);
        timer = setTimeout(disarm, 3000);
        return;
      }
      powerOff();
    });
    document.addEventListener("pointerdown", e => { if (!power.contains(e.target)) disarm(); }, true);

    // プツン…という音
    function offSound() {
      let ctx;
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.45);
      g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.55);
      const n = Math.floor(ctx.sampleRate * 0.04), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
      const s = ctx.createBufferSource(), sg = ctx.createGain(); s.buffer = buf; sg.gain.value = 0.5;
      s.connect(sg).connect(ctx.destination); s.start(t);
    }

    // ブラウン管の電源を切ったように、画面が横線→点に縮んで消える
    async function powerOff() {
      leaving = true;
      disarm();
      offSound();
      document.querySelectorAll("audio, video").forEach(m => { try { m.pause(); } catch {} });
      const o = document.createElement("div");
      o.className = "mg-off";
      o.innerHTML = `<div class="mg-white"></div><div class="mg-top"></div><div class="mg-bot"></div><div class="mg-line"></div>`;
      document.body.append(o);
      const q = s => o.querySelector(s);
      const go = () => {
        try { sessionStorage.setItem(KEY, "off"); } catch {}
        location.href = HOME;
      };
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        q(".mg-top").style.height = "100%";
        setTimeout(go, 150);
        return;
      }
      const f = (duration, easing, delay = 0) => ({ duration, easing, delay, fill: "forwards" });
      q(".mg-white").animate([{ opacity: 0 }, { opacity: 0.85 }, { opacity: 0.6 }], f(160, "ease-out"));
      q(".mg-top").animate([{ height: "0%" }, { height: "50%" }], f(220, "cubic-bezier(.7,0,1,.6)", 60));
      q(".mg-bot").animate([{ height: "0%" }, { height: "50%" }], f(220, "cubic-bezier(.7,0,1,.6)", 60));
      q(".mg-line").animate([
        { opacity: 0, width: "100%", height: "4px" },
        { opacity: 1, width: "100%", height: "4px", offset: 0.3 },
        { opacity: 1, width: "6px", height: "6px", offset: 0.75 },
        { opacity: 0, width: "2px", height: "2px" },
      ], f(620, "ease-in", 220));
      await new Promise(r => setTimeout(r, 1050));
      go();
    }

    // 「戻る」でこのページに戻ってきたときは元の状態に
    addEventListener("pageshow", e => {
      if (!e.persisted) return;
      document.querySelectorAll(".mg-off").forEach(el => el.remove());
      leaving = false;
    });
  }
})();
