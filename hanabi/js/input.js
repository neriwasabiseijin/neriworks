"use strict";
// 引っ張り操作。どこを押してもよく、引いた向きと逆へ飛ぶ。

const aim = { on: false, sx: 0, sy: 0, angle: 0, power: 0, ok: false, id: null };

function aimFrom(e) {
  const p = toWorld(e.clientX, e.clientY);
  const dx = aim.sx - p.x, dy = aim.sy - p.y;     // 引いた向きの逆
  const len = Math.hypot(dx, dy);
  aim.ok = len >= PULL_MIN && dy < 4;              // 下へ引いたとき（=上へ撃つ）だけ有効
  aim.angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, Math.atan2(dx, -dy)));
  aim.power = Math.min(1, Math.max(0, (len - PULL_MIN) / (PULL_MAX - PULL_MIN)));
  aim.on = aim.ok;
}

stage.addEventListener("pointerdown", e => {
  if ((G.mode !== "play" && !drilling()) || e.button === 2) return; // あそびかたの「やってみよう」でも引ける
  sfx.unlock();
  endWait(); // 合間でも、引っぱり始めればすぐ始まる
  const p = toWorld(e.clientX, e.clientY);
  aim.sx = p.x; aim.sy = p.y; aim.id = e.pointerId; aim.on = false; aim.ok = false;
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener("pointermove", e => { if (aim.id === e.pointerId) aimFrom(e); });
stage.addEventListener("pointerup", e => {
  if (aim.id !== e.pointerId) return;
  aimFrom(e);
  if (aim.ok) fire(aim.angle, aim.power); // はなすと打ち上がる
  aim.on = false; aim.id = null;
});
stage.addEventListener("pointercancel", () => { aim.on = false; aim.id = null; });
stage.addEventListener("contextmenu", e => { e.preventDefault(); aim.on = false; aim.id = null; });

// LINE などのアプリ内ブラウザは、下へのドラッグで画面ごと閉じようとする。
// 遊ぶ場所でのタッチの移動は既定の動作（スクロール・閉じる操作）を止める。
// タップの既定動作は止めないので、ボタンや pointer イベントの操作には影響しない。
document.getElementById("app").addEventListener("touchmove", e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
