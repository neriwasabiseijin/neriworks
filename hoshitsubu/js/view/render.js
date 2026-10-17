"use strict";
// 描画：背景 → かけら → 敵 → 弾 → 流星群 → 自機と衛星 → エフェクト → 文字 → HUD

// 背景：パステル寄りの紫〜紺の宇宙。星雲と、お菓子のような惑星が奥からゆっくり流れてくる（前へ進んでいる感じ）
// 色の段差（グラデーション）は1枚に焼き、星雲と惑星は小さな絵に焼いて、それぞれの速さで下へ流す
let bgImg = null;
const bgLayers = [];
function sprite(w, h, fn) { const S = 2, c = document.createElement("canvas"); c.width = w * S; c.height = h * S; const x = c.getContext("2d"); x.scale(S, S); fn(x); return c; }
function bakeBackground() {
  bgImg = sprite(W, H, x => { const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#241650"); bg.addColorStop(.55, "#160f3a"); bg.addColorStop(1, "#0e0b22"); x.fillStyle = bg; x.fillRect(0, 0, W, H); });
  const neb = (r, col) => sprite(r * 2, r * 2, x => { const gr = x.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = gr; x.fillRect(0, 0, r * 2, r * 2); });
  // お菓子のような惑星：ストライプのキャンディ星と、リングのある小さな星
  const planet = (r, c1, c2, ring) => sprite(r * 4, r * 4, x => { x.translate(r * 2, r * 2); x.globalAlpha = .55; drawPlanet(x, 0, 0, r, c1, c2, ring); });
  const layer = (img, w, h, xx, y, sp) => bgLayers.push({ img, w, h, x: xx, y, sp });
  layer(neb(170, "rgba(255,140,210,.16)"), 340, 340, 70, 150, 6); layer(neb(190, "rgba(120,170,255,.14)"), 380, 380, 300, 330, 6); layer(neb(160, "rgba(150,255,220,.08)"), 320, 320, 120, 560, 6);
  layer(planet(26, "#ffb3d9", "#fff0f7", false), 104, 104, 300, 110, 11); layer(planet(14, "#9cc8ff", "#e6f2ff", true), 56, 56, 48, 430, 15);
}
function drawPlanet(x, cx, cy, r, c1, c2, ring) {
    x.save(); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.clip();
    x.fillStyle = c1; x.fillRect(cx - r, cy - r, r * 2, r * 2);
    x.fillStyle = c2; for (let i = -3; i <= 3; i++) { x.beginPath(); x.ellipse(cx, cy + i * r * .36, r * 1.2, r * .09, -.25, 0, TAU); x.fill(); }
    const sh = x.createRadialGradient(cx - r * .4, cy - r * .4, r * .1, cx, cy, r); sh.addColorStop(0, "rgba(255,255,255,.35)"); sh.addColorStop(1, "rgba(40,20,80,.45)");
    x.fillStyle = sh; x.fillRect(cx - r, cy - r, r * 2, r * 2); x.restore();
    if (ring) { x.strokeStyle = "rgba(255,231,163,.35)"; x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cy, r * 1.7, r * .45, -.3, 0, TAU); x.stroke(); }
}
// 背景は自機の動きにゆるく追従する（奥ほど小さく動く）。チュートリアルやタイトルでは中央へもどる
const bgCam = { x: 0, y: 0 };
function scrollBackground(dt) {
  const tx = G && G.p ? (G.p.x - W / 2) : 0, ty = G && G.p ? (G.p.y - H * .68) : 0, k = Math.min(1, dt * 1.2);
  bgCam.x += (tx - bgCam.x) * k; bgCam.y += (ty - bgCam.y) * k;
  for (const l of bgLayers) { l.y += l.sp * dt; if (l.y - l.h / 2 > H) { l.y = -l.h / 2; l.x = rand(30, W - 30); } }
}

function drawBackground() {
  if (!bgImg) bakeBackground();
  g.drawImage(bgImg, 0, 0, W, H);
  for (const l of bgLayers) { const f = .03 + l.sp * .006; g.drawImage(l.img, l.x - l.w / 2 - bgCam.x * f, l.y - l.h / 2 - bgCam.y * f, l.w, l.h); }
  for (const s of bgStars) { const f = s.z * .1, x = ((s.x - bgCam.x * f) % W + W) % W; g.fillStyle = `rgba(255,255,255,${.25 + s.z * .5})`; g.fillRect(x, s.y - bgCam.y * f, s.z * 1.6, s.z * 1.6); }
}

function drawWarn(e) { // いたずら流れ星の予告：「！」と赤い点線
  const blink = Math.floor(e.wait * 8) % 2 === 0;
  const wx = e.x + Math.cos(e.lock + Math.PI / 2) * 22, wy = e.y + Math.sin(e.lock + Math.PI / 2) * 22;
  g.save();
  g.strokeStyle = "rgba(255,107,138,.45)"; g.lineWidth = 10; g.setLineDash([10, 8]);
  g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + Math.cos(e.lock) * 800, e.y + Math.sin(e.lock) * 800); g.stroke();
  g.setLineDash([]);
  g.fillStyle = blink ? THORN_COLOR : "#ffb36b"; g.beginPath(); g.arc(wx, wy, 11, 0, TAU); g.fill();
  g.fillStyle = "#1a1530"; g.font = "700 15px 'Zen Maru Gothic', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", wx, wy + 1); g.textBaseline = "alphabetic";
  g.restore();
}
// 休憩ライン：画面の端から端まで、金色に光る帯。上から降りてくる
function drawRestLine(y) {
  const gr = g.createLinearGradient(0, y - 14, 0, y + 14);
  gr.addColorStop(0, "rgba(255,231,163,0)"); gr.addColorStop(.5, "rgba(255,231,163,.35)"); gr.addColorStop(1, "rgba(255,231,163,0)");
  g.fillStyle = gr; g.fillRect(0, y - 14, W, 28);
  g.strokeStyle = "#ffe7a3"; g.lineWidth = 2; g.setLineDash([10, 6]); g.lineDashOffset = -tNow * 30;
  g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.setLineDash([]);
  g.textAlign = "center"; g.font = `${HEAD_W} 13px ${HEAD_FONT}`; g.lineWidth = 4; g.strokeStyle = "rgba(14,11,34,.8)";
  g.strokeText("休憩ライン", W / 2, y - 10); g.fillStyle = "#ffe7a3"; g.fillText("休憩ライン", W / 2, y - 10);
}
function drawEnemy(e) {
  if (e.type === "itazura" && e.state === 0) drawWarn(e);
  if (e.type === "tsubu" && e.state === 1) { // 星粒の通り道を明るい帯で予告（とらえられる弾）
    g.save(); g.strokeStyle = `rgba(255,231,163,${.22 + .15 * Math.sin(tNow * 20)})`; g.lineWidth = 16; g.lineCap = "round";
    g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.x + Math.cos(e.lock) * 800, e.y + Math.sin(e.lock) * 800); g.stroke(); g.restore();
  }
  if (e.type === "kui") { // 吸い込みの範囲をうっすら
    g.fillStyle = "rgba(120,120,240,.07)"; g.beginPath(); g.arc(e.x, e.y, 140, 0, TAU); g.fill();
  }
  atlas.draw(g, e.type, e.anim, e.at, e.x, e.y, e.r, { heading: e.hd, flip: e.flip });
}
function drawBoss(b) {
  if (bossLv("kid")) for (let i = 0; i < bossTwinN(); i++) { const q = bossTwin(b, i); atlas.draw(g, "minion", "fly", tNow + i * .3, q.x, q.y, 9, { heading: Math.PI / 2 }); }
  atlas.draw(g, "boss", b.anim, b.at, b.x, b.y, BOSS_R, { heading: b.hd, flip: b.flip });
  if (b.broken > 0 && b.broken < 1) { // 殻がもどりかけ：うすい氷がつながっていく
    const k = 1 - b.broken; g.strokeStyle = `rgba(170,220,255,${.15 + .4 * k})`; g.lineWidth = 3; g.setLineDash([6, 6 * (1 - k) + 1]);
    g.beginPath(); g.arc(b.x, b.y, BOSS_R + 8, 0, TAU * k); g.stroke(); g.setLineDash([]);
  }
  if (b.broken <= 0 && b.y >= b.ty - 40) { // 氷の殻（厚さは身につけた氷の衣の段階で増える）
    const thick = 1 + Math.min(2, (b.n - 1) * .3), k = b.shell / b.shellMax;   // 何体目かで殻が厚くなる
    g.strokeStyle = `rgba(170,220,255,${.35 + .45 * k})`; g.lineWidth = 5 * thick; g.lineJoin = "round";
    g.beginPath(); for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU, r = BOSS_R + 6 + (i % 2) * 4; g.lineTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r); } g.stroke();
    if (bossLv("splitb")) { g.fillStyle = "#a9dcff"; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(b.x + Math.cos(a - .12) * 46, b.y + Math.sin(a - .12) * 46); g.lineTo(b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60); g.lineTo(b.x + Math.cos(a + .12) * 46, b.y + Math.sin(a + .12) * 46); g.fill(); } }
  }
}

function drawPlayer() {
  const p = G.p, r = starR(), full = isFull();
  if (held && inGame()) { // 引力圏：内側をうっすら塗るだけ。ふちほど少し明るい（ふちの線は引かない）
    const gr = gravR(), fg = g.createRadialGradient(p.x, p.y, gr * .4, p.x, p.y, gr);
    fg.addColorStop(0, "rgba(255,231,163,0)"); fg.addColorStop(.85, "rgba(255,231,163,.12)"); fg.addColorStop(1, "rgba(255,231,163,.2)");
    g.fillStyle = fg; g.beginPath(); g.arc(p.x, p.y, gr, 0, TAU); g.fill();
  }
  // 超新星のたまり具合：星のまわりのピンクの輪。たまりきると脈打つ
  if (G.novaC > 0 && held && inGame()) {
    const nr = r + 9, done = G.novaC >= 1;
    g.save(); g.lineCap = "round"; g.lineWidth = done ? 3.5 + Math.sin(tNow * 14) * 1.2 : 2.5;
    g.strokeStyle = done ? "#ff9ecf" : "rgba(255,158,207,.7)";
    g.beginPath(); g.arc(p.x, p.y, nr, -Math.PI / 2, -Math.PI / 2 + TAU * G.novaC); g.stroke(); g.restore();
  }
  // 移動の光の尾：移動の向きに沿って、通った所に細く残す
  const tr = p.trail;
  if (tr.length > 2) {
    g.save(); g.lineCap = "round";
    for (let i = 1; i < tr.length; i++) { const a = tr[i - 1], b = tr[i], k = b.life / .22; if (dist2(a, b) < .5) continue; g.strokeStyle = `rgba(255,231,163,${.35 * k})`; g.lineWidth = r * 1.1 * k; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    g.restore();
  }
  drawOrbs();
  for (let i = 0; i < twinN(); i++) { const tp = twinPos(i); g.fillStyle = "rgba(255,241,194,.35)"; g.beginPath(); g.arc(tp.x, tp.y, twinR(lv("twin")) - 3, 0, TAU); g.fill(); g.fillStyle = "#fff1c2"; g.beginPath(); g.arc(tp.x, tp.y, 6, 0, TAU); g.fill(); }
  if (p.inv > 0 && scene === "play" && Math.floor(p.inv * 12) % 2) return;
  const sh = full && held ? rand(-1.2, 1.2) : 0, x = p.x + sh, y = p.y + sh;
  const glow = g.createRadialGradient(x, y, 2, x, y, r * 2.6); glow.addColorStop(0, full && held ? "rgba(255,190,150,.6)" : "rgba(255,231,163,.5)"); glow.addColorStop(1, "rgba(255,231,163,0)");
  g.fillStyle = glow; g.beginPath(); g.arc(x, y, r * 2.6, 0, TAU); g.fill();
  lookHoops(g, x, y, r, tNow, "back");
  drawHatPlay(x, y, r, "back");
  atlas.draw(g, "hero", p.anim, p.animT, x, y, r);
  lookHoops(g, x, y, r, tNow, "front");
  drawHatPlay(x, y, r, "front");
  for (let i = 0; i < G.iceLeft; i++) { g.strokeStyle = "rgba(156,200,255,.7)"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r + 5 + i * 4, 0, TAU); g.stroke(); } // 残りの氷の枚数だけ輪
}

// 取ったカードで変わる星の見た目（相棒星・氷の輪）を、リザルトやシェア画像にも描く。
// k = 画面の星の大きさ ÷ ゲーム中の星の大きさ。t = 経過時間（null なら止めた絵）。layer "back" は星の後ろ（相棒星）、"front" は前（氷の輪）
function drawLook(c, x, y, k, t, layer) {
  if (!G) return;
  if (layer === "back") {
    const n = twinN();
    for (let i = 0; i < n; i++) {
      const a = (t == null ? 0 : t * 2.4 * (1 + lv("twin") * .08) - Math.PI / 4) + i * TAU / n, // t なし：横にならべて止める
         tx = x + Math.cos(a) * 46 * k, ty = y + Math.sin(a) * 46 * k;
      c.fillStyle = "rgba(255,241,194,.35)"; c.beginPath(); c.arc(tx, ty, (twinR(lv("twin")) - 3) * k, 0, TAU); c.fill();
      c.fillStyle = "#fff1c2"; c.beginPath(); c.arc(tx, ty, 6 * k, 0, TAU); c.fill();
    }
    lookOrbsStill(c, x, y, starR() * k);
    lookHoops(c, x, y, starR() * k, t, "back");
    return;
  }
  const r = starR() * k;
  lookHoops(c, x, y, r, t, "front");
  lookSatsStill(c, x, y, k, t);
  lookShotsStill(c, x, y, k, r);
  for (let i = 0; i < iceN(); i++) { c.strokeStyle = "rgba(156,200,255,.7)"; c.lineWidth = 2 * k; c.beginPath(); c.arc(x, y, r + (5 + i * 4) * k, 0, TAU); c.stroke(); }
}

function drawFx(f) {
  if (f.kind === "spike") { drawSpike(f); return; }
  if (f.kind === "ice" || f.kind === "crack") { drawIceFx(f); return; }
  if (f.kind === "nova") { // 超新星の衝撃波：透きとおった光の帯が広がる（加算で重ねる）
    const k = 1 - f.life / f.max, a = 1 - k, R = f.r0 + (f.r1 - f.r0) * (1 - (1 - k) ** 3), w = Math.min(R, 26 * a + 6);
    g.save(); g.globalAlpha = 1; g.globalCompositeOperation = "lighter";
    const gr = g.createRadialGradient(f.x, f.y, R - w, f.x, f.y, R);
    gr.addColorStop(0, "rgba(40,160,255,0)"); gr.addColorStop(.5, `rgba(40,190,255,${.4 * a})`); gr.addColorStop(.82, `rgba(110,240,255,${.9 * a})`); gr.addColorStop(1, `rgba(255,255,255,${a})`);
    g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, R, 0, TAU); g.arc(f.x, f.y, R - w, 0, TAU, true); g.fill();
    g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 1.5 + 1.5 * a; g.beginPath(); g.arc(f.x, f.y, R, 0, TAU); g.stroke();
    g.restore(); return;
  }
  if (f.kind === "ring") { // はじける光の輪
    const k = 1 - f.life / f.max;
    g.globalAlpha = (1 - k) * .9; g.strokeStyle = f.color; g.lineWidth = 3 * (1 - k) + .5;
    g.beginPath(); g.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * (1 - (1 - k) ** 2), 0, TAU); g.stroke(); return;
  }
  if (f.kind === "star") { // 4つのとがりのキラキラ
    const s = f.size * Math.min(1, f.life / f.max * 1.6);
    g.globalAlpha = Math.min(1, f.life * 3); g.fillStyle = f.color;
    g.save(); g.translate(f.x, f.y); g.rotate(f.rot || 0); g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = i % 2 ? s * .32 : s; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.closePath(); g.fill(); g.restore(); return;
  }
  if (f.kind === "shard") { // 破片：ふちの明るい小さな三角
    const s = f.size; g.globalAlpha = Math.min(1, f.life * 3);
    g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.beginPath(); g.moveTo(0, -s); g.lineTo(s * .8, s * .6); g.lineTo(-s * .7, s * .5); g.closePath();
    g.fillStyle = f.color; g.fill(); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = .8; g.stroke(); g.restore(); return;
  }
  g.globalAlpha = Math.min(1, f.life * 2); g.fillStyle = f.color; g.beginPath(); g.arc(f.x, f.y, f.kind === "suck" ? 3.5 : 2, 0, TAU); g.fill();
}

function draw() {
  g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  if (shakeAmt > 0) g.translate(rand(-shakeAmt, shakeAmt), rand(-shakeAmt, shakeAmt));
  drawBackground();
  if (!G || !atlas.img) return;
  G.debris.forEach(drawGem);
  G.corpses.forEach(c => {
    const over = Math.max(0, c.at - atlas.duration(c.type, "die")) / CORPSE_FADE;
    atlas.draw(g, c.type, "die", c.at, c.x, c.y, c.r, { flip: c.flip, ...(over ? { alpha: 1 - over, scale: 1 + over * .5 } : {}) });
  });
  if (G.waveState === "rest") { g.globalAlpha = Math.min(1, (G.restT || 0) / .6); drawRestLine(G.restY); g.globalAlpha = 1; }
  G.enemies.forEach(drawEnemy);
  if (G.boss) drawBoss(G.boss);
  // とげ弾はひと回り大きく、赤い輪が脈打つ（吸えない弾だとひと目で分かるように）
  const thornPulse = .5 + .5 * Math.sin(tNow * 10);
  G.bullets.forEach(b => {
    const sz = b.sz || 1;
    if (b.kind === "thorn") { g.strokeStyle = `rgba(255,70,100,${.35 + .45 * thornPulse})`; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, (10 + thornPulse * 2) * sz, 0, TAU); g.stroke(); drawPellet(b.x, b.y, "thorn", b.color, 1.45 * sz, true, b.rot); }
    else drawPellet(b.x, b.y, b.kind, b.color, sz, true, b.kind === "normal" ? b.rot : 0);
    if (b.frost) { // 凍り弾：とがった氷の輪が、砕ける前に速く光る
      const k = clamp(b.t / .9, 0, 1); g.strokeStyle = `rgba(207,234,255,${.5 + .5 * Math.sin(tNow * (8 + k * 30))})`; g.lineWidth = 1.6;
      g.beginPath(); for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU + b.rot, r = (i % 2 ? 7 : 10) * sz; g.lineTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r); } g.stroke();
    }
  });
  // 流星群：光の尾を引いて飛ぶ
  g.lineCap = "round";
  G.shots.forEach(drawShot);
  drawMarks();
  drawPlayer();
  const crit = isFull() && held;
  G.sats.forEach((s, i) => drawPellet(s.x + (crit ? rand(-1, 1) : 0), s.y + (crit ? rand(-1, 1) : 0), s.kind, s.color, crit ? 1.15 : 1, false, tNow * 2 + i));
  G.fx.forEach(drawFx); g.globalAlpha = 1;
  if (G.flash > 0) { g.fillStyle = `rgba(230,245,255,${G.flash * 2.5})`; g.fillRect(-20, -20, W + 40, H + 40); }
  g.textAlign = "center";
  G.texts.forEach(t => {
    if (!t.pop) { g.globalAlpha = 1; drawPaperText(t); return; }   // 文字の知らせは紙が開くように
    g.globalAlpha = Math.min(1, t.life / t.max * 2);
    const k = t.pop ? 1 + Math.max(0, 1 - t.age / .14) * .9 : 1;   // 点数はバン！と大きく出てから落ち着く
    g.font = `${HEAD_W} ${Math.round(t.size * k)}px ${HEAD_FONT}`;
    g.lineWidth = 4; g.strokeStyle = "rgba(14,11,34,.8)"; g.strokeText(t.text, t.x, t.y); g.fillStyle = t.color; g.fillText(t.text, t.x, t.y);
  }); g.globalAlpha = 1;
  drawRename();
  if ((scene === "play" || scene === "cards" || scene === "dying") && !G.viewer) drawHUD();
  if (scene === "tutorial") drawFinger();
}
