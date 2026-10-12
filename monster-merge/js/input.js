"use strict";
// Pointer and keyboard controls.

function toLocal(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; }
let aiming = false;
cv.addEventListener("pointerdown", (e) => {
  if (state !== "play") return;
  if (cutin) { cutin.time = Math.max(cutin.time, cutin.dur - 0.25); return; }
  const [x, y] = toLocal(e);
  if (y < BOX_T - 10) return;
  aiming = true; aimX = x;
  cv.setPointerCapture?.(e.pointerId);
});
cv.addEventListener("pointermove", (e) => { if (state === "play" && (aiming || e.pointerType === "mouse")) aimX = toLocal(e)[0]; });
cv.addEventListener("pointerup", (e) => { if (!aiming) return; aiming = false; aimX = toLocal(e)[0]; dropNow(); });
cv.addEventListener("pointercancel", () => { aiming = false; });
window.addEventListener("keydown", (e) => {
  if (state === "levelup" && ["1", "2", "3"].includes(e.key)) { if (!$("levelup").classList.contains("locked")) pickUpgrade(Number(e.key) - 1); return; }
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
  else if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
  else if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") {
    if (state === "levelup" || e.target.tagName === "BUTTON") return;
    e.preventDefault();
    if (state === "title") startGame();
    else if (cutin) cutin.time = Math.max(cutin.time, cutin.dur - 0.25);
    else if (state === "play") dropNow();
    return;
  } else return;
  e.preventDefault();
});
window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
});
