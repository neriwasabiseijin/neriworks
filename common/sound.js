/*
 * ミニゲーム共通：音の出口と音量設定（BGM・効果音を別々に調整、全作品とトップページで共有）。
 *
 *   <head> の system.js の直後に：
 *   <script src="../common/sound.js" data-bgm="10" data-sfx="16"></script>
 *
 *   data-bgm / data-sfx  この作品の補正（dB）。測った音量と基準の差を入れる
 *   data-button          付けると右上に音量ボタンを置く（トップページなどボタン不要なら省く）
 *
 * ゲーム側：
 *   const ctx = MG.sound.ctx;              1ページ1つの AudioContext（自分で new しない）
 *   BGM は MG.sound.bgm、効果音は MG.sound.sfx に connect する（ctx.destination にはつながない）
 *   （MG.sound.ui は電源・起動音など共通部品の音用）
 *   addEventListener("mg:pause", …) / ("mg:resume", …)   音量画面を開いている間はゲームを止める
 *   MG.paused                               いま止めているか
 *
 * 音量の基準（ブラウザで測った値。測り方は common/README.md）
 *   BGM   ：-20 LUFS 前後
 *   効果音：よく鳴る音の瞬間値が -16 LUFS 前後（BGMより少し上）
 *   最後にリミッターを通して、大きな音だけ抑えて音割れを防ぐ
 */
(() => {
  "use strict";
  const me = document.currentScript;
  const MG = (window.MG = window.MG || {});
  const KEY = "neriworks:volume"; // 全作品で共有する設定（同じサイトの下なので localStorage が共通）
  const DEF = { bgm: 80, sfx: 80 }; // 80 が基準の音量。100 で約 +4dB
  const db = v => Math.pow(10, v / 20);
  const num = k => Number((me && me.dataset[k]) || 0) || 0;
  const trim = { bgm: db(num("bgm")), sfx: db(num("sfx")) };
  const UI = db(6); // 電源・起動音など共通部品の音（作品ごとの補正はかけず、効果音の音量に従う）

  let vol = { ...DEF };
  try { Object.assign(vol, JSON.parse(localStorage.getItem(KEY)) || {}); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(vol)); } catch {} };
  const curve = v => Math.pow(Math.max(0, Math.min(100, v)) / DEF.bgm, 2); // 耳の感じ方に近づける

  let ctx = null, nodes = null;
  function build() {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    const bgm = ctx.createGain(), sfx = ctx.createGain(), ui = ctx.createGain(), master = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.2;
    bgm.connect(master); sfx.connect(master); ui.connect(master);
    master.connect(limiter).connect(ctx.destination);
    nodes = { bgm, sfx, ui };
    apply();
    // スマホは操作があるまで音が出ないので、最初のタップで鳴らせる状態にする
    const resume = () => { if (ctx.state !== "running") ctx.resume(); };
    for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, resume, true);
    return nodes;
  }
  function apply() {
    if (!nodes) return;
    for (const k of ["bgm", "sfx"]) nodes[k].gain.setTargetAtTime(trim[k] * curve(vol[k]), ctx.currentTime, 0.03);
    nodes.ui.gain.setTargetAtTime(UI * curve(vol.sfx), ctx.currentTime, 0.03);
  }
  const ensure = () => nodes || build() || {};

  MG.paused = false;
  MG.sound = {
    get ctx() { ensure(); return ctx; },
    get bgm() { return ensure().bgm; },
    get sfx() { return ensure().sfx; },
    get ui() { return ensure().ui; },
    get volume() { return { ...vol }; },
    set(k, v) { vol[k] = Math.round(Math.max(0, Math.min(100, v))); apply(); save(); icon(); },
  };
  // ほかのタブ（別の作品）で変えたときも追従する
  addEventListener("storage", e => {
    if (e.key !== KEY) return;
    try { Object.assign(vol, JSON.parse(e.newValue) || {}); } catch {}
    apply(); icon(); sync();
  });

  // ---- 右上の音量ボタンと音量画面
  let btn = null, modal = null;
  const SPK = `<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" stroke="none"/>`;
  function icon() {
    if (!btn) return;
    const mute = !vol.bgm && !vol.sfx;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">${SPK}${
      mute ? `<path d="M16 9l5 6M21 9l-5 6"/>` : `<path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/>`}</svg>`;
    btn.setAttribute("aria-label", mute ? "音量（消音中）" : "音量");
  }
  function sync() {
    if (!modal) return;
    for (const k of ["bgm", "sfx"]) {
      modal.querySelector(`[name=${k}]`).value = vol[k];
      modal.querySelector(`[data-out=${k}]`).textContent = vol[k] ? vol[k] : "オフ";
    }
  }
  // 効果音のつまみを動かしたときのお試し音
  let lastBeep = 0;
  function beep() {
    const n = ensure(); if (!n.sfx) return;
    const now = performance.now(); if (now - lastBeep < 120) return; lastBeep = now;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(n.ui); o.start(t); o.stop(t + 0.2);
  }

  function open() {
    if (MG.paused) return;
    ensure();
    MG.paused = true;
    dispatchEvent(new Event("mg:pause"));
    sync();
    modal.hidden = false;
    modal.querySelector("[name=bgm]").focus();
  }
  function close() {
    if (!MG.paused) return;
    modal.hidden = true;
    MG.paused = false;
    btn.focus();
    dispatchEvent(new Event("mg:resume"));
  }

  function setup() {
    if (!me || !("button" in me.dataset)) return;
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mg-btn mg-vol-btn";
    icon();
    btn.addEventListener("click", open);
    const right = document.querySelector(".mg-bar-right"); // system.js が先に作っている
    (right || document.body).append(btn);

    modal = document.createElement("div");
    modal.className = "mg-vol";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "音量");
    const row = (k, label) => `<label class="mg-vol-row"><span>${label}</span>
      <input type="range" name="${k}" min="0" max="100" step="5"><output data-out="${k}"></output></label>`;
    modal.innerHTML = `<div class="mg-vol-card">
      <p class="mg-vol-title">ポーズ中</p>
      ${row("bgm", "BGM")}${row("sfx", "効果音")}
      <p class="mg-vol-note">ほかのゲームにも同じ音量が使われます</p>
      <button type="button" class="mg-vol-close">ゲームにもどる</button></div>`;
    document.body.append(modal);
    for (const k of ["bgm", "sfx"]) {
      modal.querySelector(`[name=${k}]`).addEventListener("input", e => {
        MG.sound.set(k, Number(e.target.value)); sync();
        if (k === "sfx") beep();
      });
    }
    modal.querySelector(".mg-vol-close").addEventListener("click", close);
    modal.addEventListener("click", e => { if (e.target === modal) close(); }); // 外側を押しても閉じる
    // 開いている間はゲームにキー操作を渡さない（つまみの ← → は効くように、画面の中では止めない）
    addEventListener("keydown", e => {
      if (!MG.paused) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
      else if (!modal.contains(e.target)) e.stopPropagation();
    }, true);
    // 音量画面への操作がゲームに伝わらないようにする
    for (const ev of ["keydown", "keyup", "pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend", "click"]) {
      modal.addEventListener(ev, e => e.stopPropagation());
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
