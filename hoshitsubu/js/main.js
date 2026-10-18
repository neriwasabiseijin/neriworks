"use strict";
// 起動とメインループ：アトラスとフォントがそろうまで黒い幕の Loading... のまま待ち、だめなら「もう一度読み込む」

// 黒い幕（Loading とスプラッシュ）が上がりはじめたら呼ぶ。幕がなければすぐ
function whenRevealed(fn) {
  const r = document.documentElement, up = () => r.classList.contains("mg-booted") || !r.classList.contains("mg-booting");
  if (up()) return fn();
  const mo = new MutationObserver(() => { if (up()) { mo.disconnect(); fn(); } });
  mo.observe(r, { attributes: true, attributeFilter: ["class"] });
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;
  if (scene !== "play") frozen = false;
  if (!(window.MG && MG.paused) && !frozen) { update(dt); drawMiniHeroes(dt); }
  draw();
  requestAnimationFrame(frame);
}

(async function boot() {
  const loading = (window.MG && MG.loading) || { progress() {}, done() {} };
  const fonts = ["400 20px 'Yusei Magic'", "400 20px 'Darumadrop One'", "500 16px 'Zen Maru Gothic'", "700 16px 'Zen Maru Gothic'", "900 16px 'Zen Maru Gothic'"];
  let n = 0; const total = 3;
  const ping = () => loading.progress(n, total);
  ping();
  const [okAtlas, okFonts, okHats] = await Promise.all([
    atlas.load(ping).then(v => { n++; ping(); return v; }),
    loadFontsRetry(fonts, ping).then(v => { n++; ping(); return v; }),
    hatAtlas.load(ping).then(v => { n++; ping(); return v; }),
  ]);
  refit();
  if (!okAtlas || !okFonts || !okHats) {
    console.warn("[hoshitsubu] load failed:", { atlas: okAtlas, fonts: okFonts, hats: okHats });
    only("fail");
    $("reloadBtn").onclick = () => location.reload();
    loading.done();
    requestAnimationFrame(frame);
    return;
  }
  const titleHeroM = miniHero("titleHero", "idle", false);
  { const m = miniHero("resHero", "joy", true); m.r = .15; m.look = true; } // リザルトの星は相棒星・氷の輪も描く
  buildDevPanel(); setupViewer();
  $("startBtn").onclick = play;
  $("howBtn").onclick = () => { sfx.tap(); startTutorial(null); };
  $("retryBtn").onclick = () => { sfx.tap(); startGame(); };
  $("shareBtn").onclick = () => MG.share.open();
  $("rankBtn").onclick = openRank; $("backBtn").onclick = openRank;
  $("rankClose").onclick = () => { sfx.tap(); showTitle(); };
  $("homeBtn").onclick = () => { sfx.tap(); music.muffle(false); showTitle(); };
  showTitle(); whenRevealed(() => titleIntro(titleHeroM));
  requestAnimationFrame(frame);
  loading.done();
  // 自動テスト用
  window.__hs = { get G() { return G; }, get scene() { return scene; }, startGame, gameOver, spawnBoss, gainXp: n => gainXp(n), setHeld: v => { held = v; if (!v) releaseAll(); } };
})();
