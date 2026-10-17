"use strict";
// 入力（相対移動）：画面のどこを押してもよく、指を動かした分の1.5倍だけ自機が同じ向きへ動く。離すと放つ

let pointerId = null, lastPX = 0, lastPY = 0;
cv.addEventListener("pointerdown", e => {
  if (scene !== "play" || pointerId !== null || (window.MG && MG.paused)) return;
  pointerId = e.pointerId; cv.setPointerCapture(e.pointerId);
  lastPX = e.clientX; lastPY = e.clientY; held = true;
});
cv.addEventListener("pointermove", e => {
  if (e.pointerId !== pointerId || scene !== "play") return;
  const k = 1 / viewScale, dx = (e.clientX - lastPX) * k, dy = (e.clientY - lastPY) * k;
  lastPX = e.clientX; lastPY = e.clientY;
  if (window.MG && MG.paused) return;
  const m = SENS * weightMul(), p = G.p, ox = p.x, oy = p.y;
  p.x = clamp(p.x + dx * m, 14, W - 14);
  p.y = clamp(p.y + dy * m, 60, H - 30);
  p.mvx += p.x - ox; p.mvy += p.y - oy;
});
function endPointer(e) {
  if (e.pointerId !== pointerId) return;
  pointerId = null;
  if (scene === "play" && held && !G.ren) releaseAll();   // 名乗りの間のタップ（飛ばす操作）では放たない
  held = false;
}
cv.addEventListener("pointerup", endPointer);
cv.addEventListener("pointercancel", endPointer);
// 押していた指を離したことにする（波の終わり、ゲームオーバー、カード選び）
function releaseInput() { pointerId = null; held = false; }
// 音量画面を開いたら、押していた指はいったん離したことにする（衛星は放たずに持ったまま）
addEventListener("mg:pause", () => { if (scene === "play") releaseInput(); });
// LINE などのアプリ内ブラウザは、下へのドラッグで画面ごと閉じようとする（はなびチェイン ver1.0.4 と同じ対策）。
// 画面の中でのタッチの移動は既定の動作を止める。ただし中身がはみ出してスクロールできる欄（リザルト・テスト欄・ビューワー）はそのまま
const SCROLLERS = "#result, .dev, .vw-cards, #rankList";
$("app").addEventListener("touchmove", e => {
  const s = e.target.closest && e.target.closest(SCROLLERS);
  if (s && s.scrollHeight > s.clientHeight + 1) return;
  if (e.cancelable) e.preventDefault();
}, { passive: false });
