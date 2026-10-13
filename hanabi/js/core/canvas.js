"use strict";
// キャンバスを #app（バーの下の領域）に収まる最大の縦長サイズにする。

const app = document.getElementById("app");
const stage = document.getElementById("stage");
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
let viewScale = 1;

function fit() {
  const r = app.getBoundingClientRect();
  viewScale = Math.min(r.width / W, r.height / H);
  const cw = Math.floor(W * viewScale), ch = Math.floor(H * viewScale);
  stage.style.width = cw + "px";
  stage.style.height = ch + "px";
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.floor(cw * dpr);
  cv.height = Math.floor(ch * dpr);
  ctx.setTransform(viewScale * dpr, 0, 0, viewScale * dpr, 0, 0);
}
function toWorld(clientX, clientY) {
  const r = cv.getBoundingClientRect();
  return { x: (clientX - r.left) / viewScale, y: (clientY - r.top) / viewScale };
}
addEventListener("resize", fit);
fit();
