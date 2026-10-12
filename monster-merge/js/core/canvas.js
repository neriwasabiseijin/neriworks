"use strict";
// Canvas setup: 360x640 logical size scaled to the screen and device pixel ratio.

const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
const stage = document.getElementById("stage");
const app = document.getElementById("app"); // システムバーの下の領域
let scale = 1, dpr = 1;
function resize() {
  const vw = app.clientWidth, vh = app.clientHeight;
  const s = Math.min((vw - 16) / W, (vh - 16) / H);
  scale = Math.max(0.4, s);
  dpr = Math.min(window.devicePixelRatio || 1, 3);
  stage.style.width = W * scale + "px";
  stage.style.height = H * scale + "px";
  cv.width = Math.round(W * scale * dpr);
  cv.height = Math.round(H * scale * dpr);
  buildPieceCache();
}
window.addEventListener("resize", resize);
