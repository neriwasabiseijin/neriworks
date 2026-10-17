"use strict";
// 素材の読み込み。失敗・無応答（時間切れ）はキャッシュを避けて読み直し、それでもだめなら null を返す。
// 呼ぶ側は null なら始めずに「もう一度読み込む」を出す（仮の絵や代わりのフォントでは始めない）。

const bust = (src, i) => i && !src.startsWith("data:") ? src + (src.includes("?") ? "&" : "?") + "retry=" + i : src;
const wait = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms) => Promise.race([p, wait(ms).then(() => null)]);

// 何度か試す。try(i) は成功したら値、失敗なら null。onRetry は読み直す前に呼ぶ（黒い幕を待たせておくため）
async function retry(tryOnce, onRetry, times = 3) {
  for (let i = 0; i < times; i++) {
    if (i) { if (onRetry) onRetry(); await wait(600 * i); }
    const v = await tryOnce(i).catch(() => null);
    if (v) return v;
  }
  return null;
}

function loadImage(src, ms = 12000) {
  return withTimeout(new Promise(res => {
    const im = new Image();
    im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im.naturalWidth > 0 ? im : null));
    im.onerror = () => res(null);
    im.src = src;
  }), ms);
}
const loadImageRetry = (src, onRetry) => retry(i => loadImage(bust(src, i)), onRetry);

const loadJSONRetry = (src, onRetry) => retry(i => withTimeout(fetch(bust(src, i), { cache: i ? "reload" : "default" }).then(r => r.ok ? r.json() : null), 10000), onRetry);

// Web フォント。届かなければ Google Fonts の CSS を読み直してから、もう一度待つ
const FONT_SAMPLE = "星粒オービット第波強化をえらぶ大彗星一斉流星群臨界0123456789";
function fontsReady(faces) { return faces.every(f => document.fonts.check(f, FONT_SAMPLE)); }
async function loadFontsRetry(faces, onRetry) {
  if (!document.fonts) return true;
  return retry(async i => {
    if (i) {
      const old = $("webfonts");
      if (old) { const l = old.cloneNode(); l.href = bust(old.href.replace(/[?&]retry=\d+/, ""), i); old.replaceWith(l); await withTimeout(new Promise(r => { l.onload = l.onerror = r; }), 8000); }
    }
    await withTimeout(Promise.all(faces.map(f => document.fonts.load(f, FONT_SAMPLE))), 8000);
    return fontsReady(faces) || null;
  }, onRetry);
}
