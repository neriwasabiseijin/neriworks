"use strict";
// 強化カードのアイコン（コードで描いて画像にしておく）。カードの名前の横に色つきで小さく、背景に白で大きく薄く置く

const ICON_DRAW = {
  star(x) { // 一番星：大きな4つのとがりの星と、小さなきらめき
    x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, r = i % 2 ? 11 : 38; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill();
    x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, r = i % 2 ? 3 : 10; x.lineTo(30 + Math.cos(a) * r, -28 + Math.sin(a) * r); } x.closePath(); x.fill();
  },
  nova(x) { // 超新星：まん中から光の輪と線が広がる
    x.beginPath(); x.arc(0, 0, 9, 0, TAU); x.fill();
    x.beginPath(); x.arc(0, 0, 22, 0, TAU); x.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; x.beginPath(); x.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); x.lineTo(Math.cos(a) * 42, Math.sin(a) * 42); x.stroke(); }
  },
  bless(x) { // 星の恵み：かけら（ひし形）と、ふえる印
    x.beginPath(); x.moveTo(-8, -30); x.lineTo(14, 0); x.lineTo(-8, 30); x.lineTo(-30, 0); x.closePath(); x.fill();
    x.save(); x.lineWidth = 7; x.beginPath(); x.moveTo(28, -26); x.lineTo(28, -2); x.moveTo(16, -14); x.lineTo(40, -14); x.stroke(); x.restore();
  },
  light(x) { // 身軽：羽根
    x.beginPath(); x.moveTo(-30, 34); x.quadraticCurveTo(-20, -10, 30, -36); x.quadraticCurveTo(20, 10, -30, 34); x.fill();
    x.save(); x.strokeStyle = "rgba(0,0,0,.45)"; x.lineWidth = 3; x.beginPath(); x.moveTo(-30, 34); x.quadraticCurveTo(-4, 0, 26, -32); x.stroke(); x.restore();
  },
  grav(x) { // 引力：まん中の星へ、まわりから矢印が集まる
    x.beginPath(); x.arc(0, 0, 10, 0, TAU); x.fill();
    for (let i = 0; i < 4; i++) { x.save(); x.rotate(i * TAU / 4 + TAU / 8); x.beginPath(); x.moveTo(40, 0); x.lineTo(20, 0); x.stroke(); x.beginPath(); x.moveTo(20, 0); x.lineTo(29, -8); x.lineTo(29, 8); x.closePath(); x.fill(); x.restore(); }
  },
  cap(x) { // 衛星の器：星のまわりの軌道に、たくさんの粒
    x.beginPath(); x.arc(0, 0, 12, 0, TAU); x.fill();
    x.beginPath(); x.arc(0, 0, 30, 0, TAU); x.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; x.beginPath(); x.arc(Math.cos(a) * 30, Math.sin(a) * 30, 6, 0, TAU); x.fill(); }
  },
  speed(x) { // 加速：前へ向いた二重の山形と、うしろの速さの線
    for (const o of [-6, 14]) { x.beginPath(); x.moveTo(o, -22); x.lineTo(o + 20, 0); x.lineTo(o, 22); x.stroke(); }
    for (const [y, l] of [[-14, 18], [0, 26], [14, 18]]) { x.beginPath(); x.moveTo(-40, y); x.lineTo(-40 + l, y); x.stroke(); }
  },
  split(x) { // 分裂：ひとつの粒が三つに分かれる
    x.beginPath(); x.arc(-26, 0, 10, 0, TAU); x.fill();
    for (const a of [-.6, 0, .6]) { x.beginPath(); x.moveTo(-14, 0); x.lineTo(-14 + Math.cos(a) * 38, Math.sin(a) * 38); x.stroke(); x.beginPath(); x.arc(-14 + Math.cos(a) * 44, Math.sin(a) * 44, 7, 0, TAU); x.fill(); }
  },
  homing(x) { // 追尾：的へ曲がって向かう矢印
    x.beginPath(); x.arc(24, -18, 14, 0, TAU); x.stroke(); x.beginPath(); x.arc(24, -18, 5, 0, TAU); x.fill();
    x.beginPath(); x.moveTo(-36, 30); x.quadraticCurveTo(-30, -24, 8, -14); x.stroke();
    x.beginPath(); x.moveTo(14, -12); x.lineTo(2, -22); x.lineTo(0, -4); x.closePath(); x.fill();
  },
  ice(x) { // 氷の衣：雪の結晶
    for (let i = 0; i < 6; i++) { x.save(); x.rotate(i * TAU / 6); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -38); x.moveTo(0, -22); x.lineTo(-10, -32); x.moveTo(0, -22); x.lineTo(10, -32); x.stroke(); x.restore(); }
  },
  heal(x) { // 星の治癒：十字の入ったハート
    x.beginPath(); x.moveTo(0, 34); x.bezierCurveTo(-46, 6, -30, -38, 0, -16); x.bezierCurveTo(30, -38, 46, 6, 0, 34); x.closePath(); x.stroke();
    x.save(); x.lineWidth = 7; x.beginPath(); x.moveTo(0, -4); x.lineTo(0, 18); x.moveTo(-11, 7); x.lineTo(11, 7); x.stroke(); x.restore();
  },
  twin(x) { // 連星：ふたつの星がまわりあう
    x.save(); x.setLineDash([6, 6]); x.beginPath(); x.ellipse(0, 0, 36, 22, -.4, 0, TAU); x.stroke(); x.restore();
    const star = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, q = i % 2 ? r * .4 : r; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.closePath(); x.fill(); };
    star(-28, 12, 15); star(28, -12, 11);
  },
};
// ゆらめく炎（燃えたカード）。下が丸く、上がとがった炎を、紫→橙→黄→白の順に重ね、先が左右にゆれる
function drawFlame(x, cx, cy, s, t) {
  x.save();
  const layers = [["rgba(150,60,240,.55)", 1], ["rgba(255,110,50,.92)", .8], ["rgba(255,190,80,.95)", .56], ["rgba(255,244,205,.95)", .3]];
  layers.forEach(([col, k], i) => {
    const w = s * .5 * k, h = s * 1.25 * k * (1 + Math.sin(t * 13 + i) * .08 + Math.sin(t * 21 + i * 2) * .05);
    const sway = (Math.sin(t * 7 + i * .8) + Math.sin(t * 11.3 + i) * .5) * s * .14 * (1.2 - k * .5);
    const by = cy + s * .35 * k;
    x.fillStyle = col; x.beginPath();
    x.moveTo(cx - w, by);
    x.bezierCurveTo(cx - w * 1.05, by - h * .55, cx + sway * .4 - w * .35, by - h * .8, cx + sway, by - h);
    x.bezierCurveTo(cx + sway * .4 + w * .35, by - h * .8, cx + w * 1.05, by - h * .55, cx + w, by);
    x.arc(cx, by, w, 0, Math.PI); x.closePath(); x.fill();
  });
  // 火の粉
  for (let i = 0; i < 4; i++) { const ph = (t * 1.3 + i / 4) % 1; x.fillStyle = `rgba(255,190,110,${1 - ph})`; x.beginPath(); x.arc(cx + Math.sin(i * 2.1 + t * 3) * s * .3, cy - ph * s * 1.3, s * .04 * (1 - ph) + .5, 0, TAU); x.fill(); }
  x.restore();
}
const iconCache = new Map();
// 96px四方の画像。color で塗りと線を同じ色に
function cardIcon(k, color) {
  const key = k + color;
  if (!iconCache.has(key)) {
    const c = document.createElement("canvas"); c.width = c.height = 96;
    const x = c.getContext("2d"); x.translate(48, 48); x.fillStyle = x.strokeStyle = color; x.lineWidth = 6; x.lineCap = x.lineJoin = "round";
    ICON_DRAW[k](x);
    iconCache.set(key, c);
  }
  return iconCache.get(key);
}
const iconURL = (k, color) => cardIcon(k, color).toDataURL();
