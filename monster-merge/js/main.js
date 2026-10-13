"use strict";
// Main loop and boot: wait for fonts and images, then start the frame loop.

function frame(ts) {
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0);
  lastT = ts;
  if (!(window.MG && MG.paused)) update(dt); // the shared volume screen pauses the game while it is open
  render();
  requestAnimationFrame(frame);
}

(async function boot() {
  // the shared black cover (../common/system.js, data-loading) shows "Loading..." with 2 web fonts + every image
  // as its progress, and only lifts once the title is ready
  const loading = (window.MG && MG.loading) || { progress() {}, done() {} }; // the single-file bundle has no system.js
  const fonts = [`900 20px 'M PLUS Rounded 1c'`, `20px 'Mochiy Pop One'`];
  const total = fonts.length + assetCount();
  let fontsDone = 0, imagesDone = 0;
  const progress = () => loading.progress(Math.min(total, fontsDone + imagesDone), total);
  progress();
  // fonts and images load side by side; fonts give up after a few seconds so a blocked font host can't stall the game
  const fontLoad = Promise.race([
    Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => {}).then(() => { fontsDone++; progress(); }))),
    new Promise((r) => setTimeout(r, 4000)),
  ]).catch(() => {});
  await Promise.all([fontLoad, loadAssets((d) => { imagesDone = d; progress(); })]);
  fontsDone = fonts.length; progress();
  resize();
  $("titleBest").textContent = best ? "ベスト " + best : "";
  const chain = $("titleChain");
  for (let t = 1; t <= 8; t++) { const im = document.createElement("img"); im.src = imgURL(monImg[t]); im.alt = NAMES[t]; chain.appendChild(im); }
  requestAnimationFrame(frame);
  ready = true;
  loading.done();
  // hooks for automated play-testing
  window.__mm = {
    get state() { return state; }, get score() { return score; }, get drops() { return drops; }, get level() { return level; }, get ups() { return ups; }, get maxTier() { return maxTier; },
    startCutin: (t) => { cutin = { tier: t, time: 0.6, dur: 99 }; }, newGame, pick: pickUpgrade, drop: dropNow, setAim: (x) => (aimX = x),
    tick(n) { for (let i = 0; i < n; i++) { if (cutin) cutin = null; update(1 / 60); if (state === "lvintro") { lvIntro = 2; update(0); } if (state !== "play") break; } },
    forceLv: () => { score = Math.max(score, xpNeed(level)); }, cur: () => cur, stoneLeft: () => plannedStone ? plannedStone.at - drops : -1, get cutin() { return cutin; },
    get pinch() { return pinch; }, give: (id) => { ups[id] = (ups[id] || 0) + 1; }, shake: () => shake,
    snapshot: () => bodies().filter((b) => !b.isStatic).map((b) => ({ l: b.label, t: b.tier, x: b.position.x, y: b.position.y })),
  };
})();
