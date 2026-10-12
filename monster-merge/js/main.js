"use strict";
// Main loop and boot: wait for fonts and images, then start the frame loop.

function frame(ts) {
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0);
  lastT = ts;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

(async function boot() {
  // wait briefly for the web fonts so the canvas text doesn't start in the fallback font
  try { await Promise.race([Promise.all([document.fonts.load(`900 20px 'M PLUS Rounded 1c'`), document.fonts.load(`20px 'Mochiy Pop One'`)]), new Promise((r) => setTimeout(r, 1500))]); } catch (e) {}
  await loadAssets();
  resize();
  $("titleBest").textContent = best ? "ベスト " + best : "";
  const chain = $("titleChain");
  for (let t = 1; t <= 8; t++) { const im = document.createElement("img"); im.src = imgURL(monImg[t]); im.alt = NAMES[t]; chain.appendChild(im); }
  requestAnimationFrame(frame);
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
