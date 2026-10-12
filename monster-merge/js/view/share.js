"use strict";
// Result sharing: a square result card (board screenshot + score) for the share sheet, X, LINE or saving.

const SHARE_TAG = "#まるもんえぼりゅーしょん";
let shareFile = null, shareURL = null;

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
  shareFile = null;
  if (shareURL) { URL.revokeObjectURL(shareURL); shareURL = null; }
  let card;
  try { card = makeShareCard(); } catch (e) { return; }
  try {
    // throws when the canvas is tainted (e.g. images opened from file://); sharing then falls back to text only
    card.toBlob((blob) => {
      if (!blob) return;
      shareFile = new File([blob], `marumon-${score}.png`, { type: "image/png" });
      shareURL = URL.createObjectURL(blob);
    }, "image/png");
  } catch (e) {}
  $("shareBtn").hidden = !navigator.share;
}

async function copyImage() {
  if (!shareFile || !navigator.clipboard || !window.ClipboardItem) return false;
  try { await navigator.clipboard.write([new ClipboardItem({ "image/png": shareFile })]); return true; } catch (e) { return false; }
}

// Phones: the OS share sheet (LINE, X, Instagram...) with the image attached.
$("shareBtn").onclick = async () => {
  const data = { text: shareText() };
  if (shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) data.files = [shareFile];
  try { await navigator.share(data); } catch (e) { if (e.name !== "AbortError") showToast("シェアできませんでした"); }
};
// X / LINE web intents can't carry an image, so the card goes to the clipboard first for pasting.
$("xBtn").onclick = async () => {
  const copied = await copyImage();
  window.open("https://x.com/intent/post?text=" + encodeURIComponent(shareText()), "_blank", "noopener");
  showToast(copied ? "画像をコピーしました。投稿欄に貼り付けてね" : "テキストだけシェアします");
};
$("lineBtn").onclick = async () => {
  const copied = await copyImage();
  window.open("https://line.me/R/share?text=" + encodeURIComponent(shareText()), "_blank", "noopener");
  showToast(copied ? "画像をコピーしました。トークに貼り付けてね" : "テキストだけ送ります");
};
$("saveBtn").onclick = () => {
  if (!shareURL) { showToast(location.protocol === "file:" ? "ファイルを直接開いたときは画像を作れません" : "画像を作れませんでした"); return; }
  const a = document.createElement("a");
  a.href = shareURL; a.download = shareFile.name;
  document.body.appendChild(a); a.click(); a.remove();
};
