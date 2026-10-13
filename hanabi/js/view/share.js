"use strict";
// リザルトのシェア：夜空のスクリーンショットと点数・委員長のひとことを、正方形の結果画像にして MG.share に渡す。
// 共有シートは「シェアする」を押した瞬間に呼ばないと止められるので、画像はリザルトを出す前に作っておく。

const SHARE_TAG = "#夜空満開はなびチェイン";
const SHARE_BRUSH = '"Yuji Syuku", "Hiragino Mincho ProN", "Yu Mincho", serif';
const SHARE_BODY = '"Zen Maru Gothic", system-ui, sans-serif';
let shareShot = null;

// いちばん見せたい瞬間（大団円の金の大輪、またはお開きの瞬間）の夜空を写しておく
function snapSky() {
  const c = document.createElement("canvas");
  c.width = cv.width; c.height = cv.height;
  c.getContext("2d").drawImage(cv, 0, 0);
  shareShot = c;
}

function shareText(reach) {
  const page = /^https?:/.test(location.href) && !/claude\.ai|claudeusercontent/.test(location.href) ? "\n" + location.href.split("#")[0] : "";
  const comment = chairComment(G.score, G.stage).replace(/\n/g, "");
  return `夜空満開はなびチェイン\n${G.score.toLocaleString()}点（${reach}）\n実行委員長「${comment}」\n${SHARE_TAG}${page}`;
}

// 1行ずつ、幅に収まるよう文字を小さくして書く
function fitText(g, s, x, y, size, maxW, font, weight = 400) {
  g.font = `${weight} ${size}px ${font}`;
  const w = g.measureText(s).width;
  if (w > maxW) g.font = `${weight} ${size * maxW / w}px ${font}`;
  g.fillText(s, x, y);
}

function makeShareCard(reach) {
  const S = 1080, c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  // 背景：夜空の紺
  const bg = g.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, "#0b0c26"); bg.addColorStop(1, "#24163e");
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  const star = mulberry32(G.score || 1);
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(255,250,230,${0.2 + star() * 0.6})`;
    g.beginPath(); g.arc(star() * S, star() * S, star() < 0.85 ? 1.4 : 2.4, 0, Math.PI * 2); g.fill();
  }
  // 左：その夜の空（ゲーム画面）
  const bh = 1000, bw = Math.round(bh * W / H), bx = 40, by = 40;
  g.save();
  g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 30;
  g.fillStyle = "#070814"; g.fillRect(bx, by, bw, bh);
  g.restore();
  if (shareShot) g.drawImage(shareShot, bx, by, bw, bh);
  g.strokeStyle = "rgba(255,214,150,.45)"; g.lineWidth = 3; g.strokeRect(bx, by, bw, bh);

  // 右：題字・点数・委員長のひとこと
  const rx = bx + bw + 40, rw = S - rx - 40, cx = rx + rw / 2;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "rgba(255,180,110,.7)"; g.shadowBlur = 18;
  g.fillStyle = "#ffd9a0"; fitText(g, "夜 空 満 開", cx, 104, 40, rw, SHARE_BRUSH);
  g.fillStyle = "#fff0d6"; fitText(g, "はなび", cx, 190, 118, rw, SHARE_BRUSH);
  g.shadowBlur = 0;
  // 「チェイン」は朱の落款
  g.save();
  g.translate(cx + rw * 0.3, 290); g.rotate(-0.08);
  g.fillStyle = "#c42822"; g.beginPath(); g.roundRect(-46, -46, 92, 92, 8); g.fill();
  g.fillStyle = "#fff0e1"; g.font = `36px ${SHARE_BRUSH}`;
  [["チ", 20, -20], ["ェ", 20, 20], ["イ", -20, -20], ["ン", -20, 20]].forEach(([ch, x, y]) => g.fillText(ch, x, y));
  g.restore();

  g.fillStyle = "#c9b8e6"; g.font = `700 26px ${SHARE_BODY}`;
  g.fillText(G.ended ? "本日はこれにてお開き" : "おしまい", cx, 380);
  g.shadowColor = "rgba(255,190,120,.8)"; g.shadowBlur = 24;
  g.fillStyle = "#fff4e0"; fitText(g, G.score.toLocaleString(), cx, 470, 104, rw, SHARE_BRUSH);
  g.shadowBlur = 0;
  g.fillStyle = "#ffcf7a";
  fitText(g, `${reach}・${G.maxChain}連鎖` + (G.perfects ? `・満開${G.perfects}回` : ""), cx, 556, 28, rw, SHARE_BODY, 700);

  // 委員長のひとこと（和紙の札）
  const lines = chairComment(G.score, G.stage).split("\n");
  const py = 620, ph = 110 + lines.length * 56;
  g.fillStyle = "rgba(255,236,200,.08)"; g.strokeStyle = "rgba(255,214,150,.4)"; g.lineWidth = 2;
  g.beginPath(); g.roundRect(rx, py, rw, ph, 16); g.fill(); g.stroke();
  // 行ごとに縮めると大きさがばらつくので、いちばん長い行に合わせて全部そろえる
  g.textAlign = "left"; g.fillStyle = "#ffe9c8"; g.font = `36px ${SHARE_BRUSH}`;
  const size = Math.min(36, ...lines.map(l => 36 * (rw - 60) / g.measureText(l).width));
  g.font = `${size}px ${SHARE_BRUSH}`;
  lines.forEach((l, i) => g.fillText(l, rx + 30, py + 54 + i * 56));
  g.textAlign = "right"; g.fillStyle = "#a99fc4"; g.font = `500 22px ${SHARE_BODY}`;
  g.fillText("花火大会 実行委員長", rx + rw - 26, py + ph - 34);

  g.textAlign = "center"; g.fillStyle = "#8f84b8"; g.font = `500 24px ${SHARE_BODY}`;
  g.fillText(SHARE_TAG, cx, 1000);
  return c;
}

// リザルトを出す前に呼ぶ（筆文字を読み込んでから描く）
function prepareShare(reach) {
  const btn = $("shareBtn");
  btn.disabled = true;
  if (!shareShot) snapSky();
  const text = shareText(reach) + "夜空満開はなびチェイン0123456789,点・連鎖満開回お開きおしまい花火大会実行委員長";
  const fonts = document.fonts ? Promise.all([
    document.fonts.load(`40px ${SHARE_BRUSH}`, text),
    document.fonts.load(`700 28px ${SHARE_BODY}`, text),
    document.fonts.load(`500 22px ${SHARE_BODY}`, text),
  ]).catch(() => {}) : Promise.resolve();
  fonts.then(() => {
    try { MG.share.prepare(makeShareCard(reach), { text: shareText(reach), name: `hanabi-${G.score}.png` }); } catch (e) {}
    shareShot = null;
    btn.disabled = false;
  });
}

$("shareBtn").addEventListener("click", () => MG.share.open());
