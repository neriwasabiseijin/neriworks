"use strict";
// 演目の合間の表示：場内アナウンスの電光掲示板（1文字ずつ流れる）

function drawBoard(c) {
  const b = G.board;
  if (!b) return;
  // 出てくる → 読み終わるころ薄くなって、下の玉が透けて見える → 合間が終われば消える
  const a = (b.out >= 0 ? Math.max(0, 1 - b.out / 0.5) : Math.min(1, b.t / 0.25)) * (b.t > 2.4 ? Math.max(0.55, 1 - (b.t - 2.4) * 0.8) : 1);
  const lh = 19, h = 12 + b.lines.length * lh, w = W - 40, x = 20, y = 74;
  c.save();
  c.globalAlpha = a;
  // 掲示板の枠（角はドットで欠く）
  c.fillStyle = "rgba(8,6,4,0.82)";
  c.fillRect(x + 2, y, w - 4, h); c.fillRect(x, y + 2, w, h - 4);
  c.fillStyle = "rgba(255,170,70,0.35)";
  c.fillRect(x + 2, y, w - 4, 2); c.fillRect(x + 2, y + h - 2, w - 4, 2);
  c.fillRect(x, y + 2, 2, h - 4); c.fillRect(x + w - 2, y + 2, 2, h - 4);
  // 文字：前の行から順に、1文字ずつ灯る
  c.textAlign = "center";
  c.textBaseline = "middle";
  let shown = Math.max(0, Math.floor((b.t - 0.3) / 0.03));
  b.lines.forEach((l, i) => {
    const s = l.s.slice(0, shown);
    shown = Math.max(0, shown - l.s.length);
    if (!s) return;
    c.font = `400 ${l.size}px ${FONT_DOT}`;
    const rgb = l.dim ? [200, 150, 90] : l.news ? [255, 220, 150] : [255, 180, 80];
    c.shadowColor = rgba(rgb, 0.8);
    c.shadowBlur = 8;
    c.fillStyle = rgba(rgb, 1);
    // 1文字ずつ並べると、左右がずれないよう全体の幅を先に測る
    const full = c.measureText(l.s).width;
    c.textAlign = "left";
    c.fillText(s, W / 2 - full / 2, y + 6 + lh / 2 + i * lh);
  });
  c.restore();
}
