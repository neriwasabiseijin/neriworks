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

// 読み込み：ロゴと文字（Web フォント）がそろうまで、黒い幕の Loading... のまま待つ
(function boot() {
  const SAMPLE = "夜空満開はなびチェイン第一二三四五六七八九景大詰めアンコール連鎖本日はこれにてお開き0123456789";
  const jobs = [];
  const logo = document.querySelector("#title .logo");
  if (logo) jobs.push(logo.decode ? logo.decode() : Promise.resolve());
  if (document.fonts) {
    for (const f of ["400 20px 'Yuji Syuku'", "500 20px 'Zen Maru Gothic'", "700 20px 'Zen Maru Gothic'", "400 16px 'DotGothic16'"]) {
      jobs.push(document.fonts.load(f, SAMPLE));
    }
  }
  // 1つが届かなくても、いつまでも待たない
  const capped = jobs.map(p => Promise.race([p.catch(() => {}), new Promise(r => setTimeout(r, 8000))]));
  let n = 0;
  MG.loading.progress(0, capped.length);
  capped.forEach(p => p.then(() => MG.loading.progress(++n, capped.length)));
  Promise.all(capped).then(() => { refit(); MG.loading.done(); });
})();
