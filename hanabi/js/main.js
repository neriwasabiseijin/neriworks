"use strict";
// メインループと起動

buildSky();
showTitle();

let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;
  if (!(window.MG && MG.paused)) update(dt); // 音量画面（ポーズ）を開いている間は止める
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
