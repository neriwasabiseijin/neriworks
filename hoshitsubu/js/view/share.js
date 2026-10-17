"use strict";
// シェア画像：ゲームオーバーの瞬間の盤面を背景に、星の絵と名前、成長段階、スコア、取ったカードを載せた正方形。
// 共有シートは押した瞬間に呼ばないと止められるので、リザルトを出す前に作って MG.share に渡しておく。

const SHARE_TAG = "#星粒オービット";
let boardShot = null;
function snapBoard() {
  const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height;
  c.getContext("2d").drawImage(cv, 0, 0); boardShot = c;
}
function fitText(x, s, px, y, size, maxW, font, wt = 700) {
  x.font = `${wt} ${size}px ${font}`;
  const w = x.measureText(s).width; if (w > maxW) x.font = `${wt} ${size * maxW / w}px ${font}`;
  x.fillText(s, px, y);
}
function prepareShare() {
  const S = 1080, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d");
  const LOGO = LOGO_FONT, POP = HEAD_FONT, BODY = "'Zen Maru Gothic', sans-serif";
  x.fillStyle = "#0e0b22"; x.fillRect(0, 0, S, S);
  if (boardShot) { // 盤面の真ん中を正方形に切り出す
    const bw = boardShot.width, bh = boardShot.height, side = Math.min(bw, bh);
    x.globalAlpha = .55; x.drawImage(boardShot, (bw - side) / 2, (bh - side) / 2, side, side, 0, 0, S, S); x.globalAlpha = 1;
  }
  const veil = x.createLinearGradient(0, 0, 0, S); veil.addColorStop(0, "rgba(14,11,34,.35)"); veil.addColorStop(.5, "rgba(14,11,34,.6)"); veil.addColorStop(1, "rgba(14,11,34,.9)");
  x.fillStyle = veil; x.fillRect(0, 0, S, S);
  x.textAlign = "center";
  // タイトルロゴ：タイトル画面と同じく、金の「星粒」とピンクの「オービット」の2段。まわりに光、下に紫の影
  const logo = (t, y, size, col, glow, shade) => {
    x.font = `400 ${size}px ${LOGO}`;
    x.fillStyle = shade; x.fillText(t, S / 2, y + size * .07);
    x.save(); x.shadowColor = glow; x.shadowBlur = size * .4; x.fillStyle = col; x.fillText(t, S / 2, y); x.restore();
  };
  logo("星粒", 84, 64, "#ffe7a3", "rgba(255,231,163,.5)", "#b77fd8");
  logo("オービット", 146, 60, "#ff9ecf", "rgba(255,158,207,.55)", "#7a5fd0");
  // 区切り線：両はしが消えていく細い金の線
  const line = ly => {
    const lw = 300, lg = x.createLinearGradient(S / 2 - lw, 0, S / 2 + lw, 0);
    lg.addColorStop(0, "rgba(255,231,163,0)"); lg.addColorStop(.5, "rgba(255,231,163,.75)"); lg.addColorStop(1, "rgba(255,231,163,0)");
    x.fillStyle = lg; x.fillRect(S / 2 - lw, ly - 1.5, lw * 2, 3);
  };
  // こえた波とスコア
  const cleared = G.wave - 1;
  x.fillStyle = "#ffe7a3"; fitText(x, cleared > 0 ? `第${cleared}波クリア！` : "第1波で おしまい", S / 2, 222, 46, S - 160, LOGO, 400);
  x.fillStyle = "#f4f0ff"; fitText(x, G.score.toLocaleString() + " 点", S / 2, 340, 110, S - 120, POP, HEAD_W);
  line(392);
  // 星の絵（相棒星が横に出るときは少し小さく）
  const hy = 522, hr = twinN() ? 74 : 88;
  const glow = x.createRadialGradient(S / 2, hy, 10, S / 2, hy, 160); glow.addColorStop(0, "rgba(255,231,163,.55)"); glow.addColorStop(1, "rgba(255,231,163,0)");
  x.fillStyle = glow; x.fillRect(S / 2 - 180, hy - 160, 360, 320);
  drawLook(x, S / 2, hy, hr / starR(), null, "back");
  // よろこびアニメの1コマ目は跳ねる前に縮んだ絵なので、ふつうの形の2コマ目を使う
  if (G.hat) drawHat(x, G.hat, S / 2, hy, hr, { layer: "back" });
  atlas.draw(x, "hero", "joy", 1.5 / (atlas.anim("hero", "joy").fps || atlas.def.fps), S / 2, hy, hr);
  if (G.hat) drawHat(x, G.hat, S / 2, hy, hr, { layer: "front" });
  drawLook(x, S / 2, hy, hr / starR(), null, "front");
  // 二つ名・名前・段階
  const ti = starTitle();
  if (ti.text) { x.fillStyle = ti.cat ? CATS[ti.cat].color : "#ffe7a3"; fitText(x, ti.text, S / 2, 690, 46, S - 160, LOGO, 400); }
  x.fillStyle = "#ff9ecf"; fitText(x, starName(), S / 2, 778, 96, S - 120, LOGO, 400);
  x.fillStyle = "#b9aee0"; fitText(x, st().name + "　Lv" + (G.level + 1), S / 2, 836, 36, S - 160, BODY, 500);
  // 取ったカードの小さな札
  // リザルトと同じ並び（系統ごと）・同じ色（系統の色、星の名前になったカードは金色で光る）
  const keys = CARD_KEYS.filter(k => lv(k)).sort((a, b) => CAT_KEYS.indexOf(CARDS[a].cat) - CAT_KEYS.indexOf(CARDS[b].cat)), top = nameKeys();
  x.font = `700 28px ${BODY}`;
  const items = keys.map(k => CARDS[k].name + lv(k)), pad = 20, gap = 12;
  const ws = items.map(t => x.measureText(t).width + pad * 2), total = ws.reduce((a, b) => a + b, 0) + gap * Math.max(0, ws.length - 1);
  let px = (S - Math.min(total, S - 80)) / 2;
  const k = Math.min(1, (S - 80) / Math.max(1, total));
  items.forEach((t, i) => {
    const w = ws[i] * k;
    const col = top.includes(keys[i]) ? "#ffe7a3" : CATS[CARDS[keys[i]].cat].color;   // リザルトの札（css .chips span.cat-*）と同じ系統の色
    x.save(); if (top.includes(keys[i])) { x.shadowColor = "rgba(255,231,163,.7)"; x.shadowBlur = 18; }
    x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.roundRect(px, 866, w, 52, 26); x.stroke(); x.restore();
    x.fillStyle = col; x.font = `700 ${28 * k}px ${BODY}`; x.fillText(t, px + w / 2, 902);
    px += w + gap * k;
  });
  line(958);
  x.fillStyle = "#b9aee0"; fitText(x, "倒した敵　" + G.rec.kills.toLocaleString() + "体", S / 2, 1018, 38, S - 160, BODY, 500);
  const page = /^https?:/.test(location.href) && !/claude\.ai|claudeusercontent/.test(location.href) ? "\n" + location.href.split("#")[0].split("?")[0] : "";
  const text = `星粒オービット\n${st().name} ${starTitle().text ? starTitle().text + "の" : ""}${starName()}\n${G.score.toLocaleString()}点（第${G.wave}波）\n${SHARE_TAG}${page}`;
  if (window.MG && MG.share) MG.share.prepare(c, { text, name: "hoshitsubu-result.png" });
}
