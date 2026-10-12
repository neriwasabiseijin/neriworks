"use strict";
// Title, result and share screens.

const $ = (id) => document.getElementById(id);
function showToast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(showToast.h); showToast.h = setTimeout(() => (t.hidden = true), 1600); }
function imgURL(m) { return m.toDataURL ? m.toDataURL() : m.src; }
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
function startGame() {
  audio();
  music.start();
  $("title").hidden = true; $("result").hidden = true; $("levelup").hidden = true;
  newGame();
}
$("startBtn").onclick = startGame;
$("musicBtn").setAttribute("aria-pressed", String(music.on));
$("musicBtn").onclick = (e) => { e.stopPropagation(); audio(); $("musicBtn").setAttribute("aria-pressed", String(music.toggle())); };
$("retryBtn").onclick = startGame;
