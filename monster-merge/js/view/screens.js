"use strict";
// Title, result and share screens.

const $ = (id) => document.getElementById(id);
function showToast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(showToast.h); showToast.h = setTimeout(() => (t.hidden = true), 1600); }
// URL for an <img> showing an already-loaded image or a code-drawn canvas. Loaded images are copied into a data URL
// once, so the cards / title / result never fetch them again (on a slow connection a re-fetch showed as a blank icon).
const urlCache = new WeakMap();
function imgURL(m) {
  if (m.toDataURL) return m.toDataURL();
  if (!urlCache.has(m)) {
    let url = m.src;
    if (!url.startsWith("data:")) try { const c = document.createElement("canvas"); c.width = m.naturalWidth; c.height = m.naturalHeight; c.getContext("2d").drawImage(m, 0, 0); url = c.toDataURL("image/webp"); } catch (e) {} // file:// taints the canvas
    urlCache.set(m, url);
  }
  return urlCache.get(m);
}
function upgradeSummary() { return Object.keys(UPGRADES).filter((k) => lv(k)).map((k) => UPGRADES[k].name + (UPGRADES[k].max > 1 ? lv(k) : "")); }
function gameOver() {
  state = "over";
  sfx.over();
  music.stop();
  if (score > best) { best = score; store.set(bestKey, String(best)); }
  $("resMon").src = imgURL(monImg[maxTier]);
  $("resMonName").textContent = `さいこう進化：${NAMES[maxTier]}　Lv${level}　${drops}個`;
  $("resScore").textContent = score;
  const u = $("resUps"); u.textContent = "";
  for (const s of upgradeSummary()) { const sp = document.createElement("span"); sp.textContent = s; u.appendChild(sp); }
  $("resBest").textContent = "ベスト " + best;
  $("result").hidden = false;
  prepareShare();
}
let ready = false; // set by boot() in main.js once fonts and images are loaded
function startGame() {
  if (!ready) return;
  audio();
  music.start();
  $("title").hidden = true; $("result").hidden = true; $("levelup").hidden = true;
  newGame();
}
$("startBtn").onclick = startGame;
$("musicBtn").setAttribute("aria-pressed", String(music.on));
$("musicBtn").onclick = (e) => { e.stopPropagation(); audio(); $("musicBtn").setAttribute("aria-pressed", String(music.toggle())); };
$("retryBtn").onclick = startGame;
