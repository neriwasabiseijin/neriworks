"use strict";
// Result sharing: a square result card (board screenshot + score), handed to the shared share button (../common/share.js).

const SHARE_TAG = "#まるもんえぼりゅーしょん";

function shareText() {
  const page = /^https?:/.test(location.href) && !/claude\.ai|claudeusercontent/.test(location.href) ? "\n" + location.href.split("#")[0] : "";
  return `まるもんえぼりゅーしょん\nスコア ${score}（Lv${level}）\nさいこう進化：${NAMES[maxTier]}（${maxTier}/8）\n${SHARE_TAG}${page}`;
}

// Build the card from the board as it looked at the moment the game ended.
function makeShareCard() {
  const S = 1080, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const bg = g.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, "#241a4a"); bg.addColorStop(1, "#0e0a1e");
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  // board screenshot on the left
  const bh = 1000, bw = bh * W / H, bx = 40, by = 40;
  g.save();
  g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 30;
  g.fillStyle = "#130f26"; g.fillRect(bx, by, bw, bh);
  g.restore();
  g.drawImage(cv, bx, by, bw, bh);
  g.strokeStyle = "#4b3f8f"; g.lineWidth = 4; g.strokeRect(bx, by, bw, bh);
  // result on the right
  const cx = bx + bw + (S - bx - bw) / 2;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#ffc53d"; g.font = `52px ${POP}`;
  g.fillText("まるもん", cx, 120);
  g.font = `40px ${POP}`; g.fillText("えぼりゅーしょん", cx, 180);
  g.fillStyle = "#a99fd0"; g.font = `700 30px ${FONT}`; g.fillText("スコア", cx, 330);
  g.fillStyle = "#f5efff"; g.font = `110px ${POP}`; g.fillText(String(score), cx, 420);
  g.fillStyle = "#ffc53d"; g.font = `800 34px ${FONT}`; g.fillText(`Lv${level}　${drops}個`, cx, 510);
  const m = monImg[maxTier], ms = 300;
  g.drawImage(m, cx - ms / 2, 560, ms, ms);
  g.fillStyle = "#f5efff"; g.font = `800 30px ${FONT}`; g.fillText(`さいこう進化：${NAMES[maxTier]}`, cx, 900);
  g.fillStyle = "#7a6fb0"; g.font = `700 24px ${FONT}`; g.fillText(SHARE_TAG, cx, 1000);
  return c;
}

function prepareShare() {
  const sh = window.MG && MG.share; // the single-file bundle has no common/share.js
  $("shareBtn").hidden = !sh;
  if (!sh) return;
  let card;
  try { card = makeShareCard(); } catch (e) { return; }
  sh.prepare(card, { text: shareText(), name: `marumon-${score}.png` });
}

$("shareBtn").onclick = () => MG.share.open();
