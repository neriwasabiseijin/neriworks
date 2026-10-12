"use strict";
// Level thresholds and the upgrade card screen.

function checkLevel() {
  while (score >= xpNeed(level + pendingLevels)) pendingLevels++;
}
function openLevelUp() {
  const pool = Object.keys(UPGRADES).filter((k) => lv(k) < UPGRADES[k].max);
  if (!pool.length) { level++; pendingLevels--; maxedLevels++; state = "play"; dropCooldown = 0.3; music.duck(false); return; }
  offer = [];
  while (offer.length < Math.min(3, pool.length)) {
    const k = pool[Math.floor(rngUp() * pool.length)];
    if (!offer.includes(k)) offer.push(k);
  }
  const box = $("cards"); box.textContent = "";
  offer.forEach((k, i) => {
    const u = UPGRADES[k], nl = lv(k) + 1;
    const b = document.createElement("button");
    b.className = "card"; b.id = "card" + i;
    const im = document.createElement("img"); im.src = imgURL(img["up_" + k]); im.alt = "";
    const tx = document.createElement("span"); tx.style.minWidth = "0";
    const nm = document.createElement("b"); nm.textContent = `${i + 1}. ${u.name}` + (u.max > 1 ? `  Lv${nl}` : "");
    const ds = document.createElement("small"); ds.textContent = u.desc(nl);
    tx.append(nm, ds); b.append(im, tx);
    b.onclick = () => pickUpgrade(i);
    box.appendChild(b);
  });
  $("lvTitle").textContent = `レベルアップ！ Lv${level + 1}`;
  const lvEl = $("levelup");
  lvEl.hidden = false; lvEl.classList.add("locked");
  setTimeout(() => lvEl.classList.remove("locked"), 550); // ignore taps that were meant for the board
  state = "levelup";
}
function pickUpgrade(i) {
  if (state !== "levelup") return;
  const k = offer[i]; if (!k) return;
  ups[k] = lv(k) + 1;
  level++; pendingLevels--;
  $("levelup").hidden = true;
  state = "play";
  dropCooldown = 0.3;
  music.duck(false);
}
