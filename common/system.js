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
  // data-loading を付けたゲームは、いつ開いても黒い幕に「Loading...」と進み具合を出し、
  // ゲームが MG.loading.done() を呼ぶまで幕を上げない（タイトル画面も準備ができるまで見せない）。
  let flag = null;
  try { flag = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch {}
  const root = document.documentElement;
  const waitGame = me && "loading" in me.dataset;
  let bar = null, stall = 0, done = false;
  const reveal = () => {
    if (done) return;
    done = true;
    clearTimeout(stall);
    requestAnimationFrame(() => {
      root.classList.add("mg-booted");
      setTimeout(() => root.classList.remove("mg-booting", "mg-booted"), 600);
    });
  };
  if (flag === "on" || waitGame) root.classList.add("mg-booting");
  if (waitGame) {
    const box = document.createElement("div");
    box.className = "mg-loading";
    box.setAttribute("role", "status");
    box.setAttribute("aria-label", "Loading");
    box.innerHTML = `<p aria-hidden="true">${[..."Loading..."].map(c => `<span>${c}</span>`).join("")}</p><div class="mg-loading-bar"><i></i></div>`;
    loadingToy(box);
    root.append(box); // <body> はまだ無いので <html> 直下に置く
    bar = box.querySelector("i");
    // 読み込みが止まったまま一定時間たったら、真っ暗のままにはせず幕を上げる
    const watch = () => { clearTimeout(stall); stall = setTimeout(() => { console.warn("[system.js] loading stalled; revealing the game"); reveal(); }, 20000); };
    watch();
    window.MG = {
      loading: {
        progress(n, total) { if (done) return; bar.style.width = Math.min(100, n / Math.max(1, total) * 100) + "%"; watch(); },
        done() { if (done) return; bar.style.width = "100%"; setTimeout(reveal, 150); },
      },
    };
  } else if (flag === "on") {
    addEventListener("load", () => setTimeout(reveal, 80));
    setTimeout(reveal, 2500); // 読み込みが遅くても、いつまでも真っ暗にはしない
  }
  if (!window.MG) window.MG = { loading: { progress() {}, done() {} } }; // data-loading なしでも呼んでよい

  // 待っている間のおもちゃ：Loading... の文字がゆらゆら弾み、タップ / クリックすると近くの文字ほど強く跳ねる。
  // 文字ごとにばねで元に戻すので、連打すると重なって跳ねる。幕が消えたらループも止まる。
  function loadingToy(box) {
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const letters = [...box.querySelectorAll("p span")].map(el => ({ el, y: 0, vy: 0, s: 0, vs: 0, r: 0, vr: 0 }));
    box.addEventListener("pointerdown", e => {
      e.preventDefault(); // 下のゲームには伝えない（幕が全面を覆っている）
      for (const L of letters) {
        const b = L.el.getBoundingClientRect();
        const d = Math.hypot(b.left + b.width / 2 - e.clientX, b.top + b.height / 2 - e.clientY);
        const k = (0.06 + 0.94 * Math.max(0, 1 - d / 170) ** 1.6) * (calm ? 0.12 : 1);
        L.vy -= 800 * k; L.vs += 7 * k; L.vr += (Math.random() * 2 - 1) * 420 * k;
      }
      if (!calm) sparkle(e.clientX, e.clientY);
    });
    function sparkle(x, y) {
      for (let i = 0; i < 8; i++) {
        const dot = document.createElement("i");
        dot.className = "mg-spark";
        dot.style.left = x + "px"; dot.style.top = y + "px";
        box.append(dot);
        const a = i / 8 * Math.PI * 2 + Math.random() * 0.5, dist = 26 + Math.random() * 30;
        dot.animate([
          { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist}px)) scale(.2)`, opacity: 0 },
        ], { duration: 420 + Math.random() * 160, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => dot.remove();
      }
    }
    let last = performance.now();
    const spring = (L, p, v, k, c, dt) => { L[v] += (-k * L[p] - c * L[v]) * dt; L[p] += L[v] * dt; };
    requestAnimationFrame(function step(now) {
      if (!root.classList.contains("mg-booting")) return; // 幕が消えたら止める
      const dt = Math.min(0.05, (now - last) / 1000) / 2; last = now;
      letters.forEach((L, i) => {
        for (let n = 0; n < 2; n++) { spring(L, "y", "vy", 170, 8, dt); spring(L, "s", "vs", 260, 12, dt); spring(L, "r", "vr", 200, 10, dt); }
        const wave = calm ? 0 : -4 * Math.max(0, Math.sin(now / 1000 * 5.2 - i * 0.6)); // 約1.2秒でひと回りする小さな波
        const st = Math.max(-0.35, Math.min(0.45, -L.vy / 1600)); // 跳ね上がる間は縦に伸び、落ちて戻るときは潰れる
        L.el.style.transform = `translateY(${L.y + wave}px) rotate(${L.r}deg) scale(${1 + L.s - st * 0.5}, ${1 + L.s + st})`;
      });
      requestAnimationFrame(step);
    });
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
