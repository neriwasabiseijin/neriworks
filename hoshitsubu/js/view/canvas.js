"use strict";
// キャンバス：360x640 の論理座標を、共通バーの下の枠いっぱい（9:16）に拡大して描く

const cv = $("cv"), g = cv.getContext("2d");
let viewScale = 1, dpr = 1;
function refit() {
  const app = $("app"), aw = app.clientWidth, ah = app.clientHeight;
  const w = Math.min(aw, ah * W / H), h = w * H / W;
  const stage = $("stage");
  stage.style.width = w + "px"; stage.style.height = h + "px";
  dpr = Math.min(2, window.devicePixelRatio || 1);   // 3倍は重いわりに見た目がほぼ変わらない
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  viewScale = w / W;
}
addEventListener("resize", refit);
