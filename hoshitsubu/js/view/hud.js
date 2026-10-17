"use strict";
// HUD：大事なものはすべて上に（指で隠れないように）。
// 左上に点数と波・段階、右上に残り（減ると大きく割れて知らせる）、その下に衛星メーターと経験値。ボス戦はその下にボスの体力

function drawLife(x, y, on, k) {
  g.save(); g.translate(x, y);
  if (k > 0) { const s = 1 + (1 - k) * 1.6; g.scale(s, s); g.globalAlpha = k; }
  g.fillStyle = on ? "#ffe7a3" : k > 0 ? "#ff6b8a" : "rgba(255,255,255,.15)"; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
  if (on || k > 0) { g.fillStyle = "#4a3a5a"; g.fillRect(-4, -2, 2, 3); g.fillRect(2, -2, 2, 3); }
  g.restore();
}
function drawHUD() {
  g.textAlign = "left"; g.fillStyle = "#f4f0ff"; g.font = "700 17px 'Zen Maru Gothic', sans-serif";
  g.fillText(G.score.toLocaleString(), 12, 24);
  g.font = "500 12px 'Zen Maru Gothic', sans-serif"; g.fillStyle = "#b9aee0";
  // レベルが上がった瞬間は「LvN」がポンと大きく金色に弾み、星が飛び散る
  const head = "第" + G.wave + "波　" + st().name + "　";
  g.fillText(head, 12, 41);
  const lp = G.lvPulse || 0, lx = 12 + g.measureText(head).width, lvT = "Lv" + (G.level + 1);
  if (lp > 0) {
    const e = 1 - lp, pop = 1 + Math.sin(Math.min(1, e / .35) * Math.PI) * .7 * (1 - e * .4);
    const tw = g.measureText(lvT).width, cx = lx + tw / 2, cy = 37;
    for (let i = 0; i < 6; i++) { // 小さな星が散る
      const a = i / 6 * TAU - Math.PI / 2, d = 8 + e * 22, s = 3.2 * (1 - e);
      g.save(); g.translate(cx + Math.cos(a) * d * 1.4, cy + Math.sin(a) * d); g.rotate(e * 3); g.fillStyle = i % 2 ? "#ffe7a3" : "#8ff0d2"; g.globalAlpha = 1 - e;
      g.beginPath(); for (let j = 0; j < 8; j++) { const b = j / 8 * TAU, q = j % 2 ? s * .35 : s; g.lineTo(Math.cos(b) * q, Math.sin(b) * q); } g.closePath(); g.fill(); g.restore();
    }
    g.save(); g.translate(lx, 41); g.scale(pop, pop); g.font = "700 12px 'Zen Maru Gothic', sans-serif";
    g.fillStyle = e < .7 ? "#ffe7a3" : "#b9aee0"; g.lineWidth = 3; g.strokeStyle = "rgba(14,11,34,.8)"; g.strokeText(lvT, 0, 0); g.fillText(lvT, 0, 0); g.restore();
  } else g.fillText(lvT, lx, 41);
  // 残り：小さな星3つ。減った瞬間は、なくなった星が赤くふくらんで消え、残りが点滅する
  const k = G.lifeHit / 1.2, blink = k > 0 && Math.floor(k * 10) % 2;
  const healing = lv("heal") > 0 && G.lives < lifeMax();
  const nL = Math.max(3, G.lives + (k > 0 || healing ? 1 : 0));
  for (let i = 0; i < nL; i++) {
    const x = W - 22 - (nL - 1 - i) * 24, y = 20, on = i < G.lives;
    if (!on && i === G.lives && k > 0) { drawLife(x, y, false, 0); drawLife(x, y, false, k); }
    else if (!(on && blink)) drawLife(x, y, on, 0);
    // 星の治癒：次に戻る星のまわりに、たまり具合をミント色の輪で出す
    if (healing && i === G.lives && k <= 0) { g.strokeStyle = "#8ff0d2"; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 11, -Math.PI / 2, -Math.PI / 2 + TAU * (G.healN || 0) / healNeed(lv("heal"))); g.stroke(); }
    // 戻った瞬間は、その星がふくらんで光る
    if (G.lifeHeal > 0 && i === G.lives - 1) { g.save(); g.globalAlpha = G.lifeHeal; g.strokeStyle = "#ffe7a3"; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9 + (1 - G.lifeHeal) * 14, 0, TAU); g.stroke(); g.restore(); }
  }
  if (k > 0) { // 画面のふちを赤く
    const v = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .7);
    v.addColorStop(0, "rgba(255,80,110,0)"); v.addColorStop(1, `rgba(255,80,110,${.35 * k})`);
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  // 経験値：かけらと同じミント色のひし形を頭につけ、かけらを拾うたびにひし形が光る
  const pul = G.gemPulse / .25, gy = 55, lvE = 1 - lp;
  if (lp > 0) { g.strokeStyle = `rgba(143,240,210,${lp})`; g.lineWidth = 2; g.beginPath(); g.arc(20, gy, 8 + lvE * 16, 0, TAU); g.stroke(); }   // レベルアップ：ひし形から輪が広がる
  g.save(); g.translate(20, gy); g.scale(1 + pul * .5 + lp * .6, 1 + pul * .5 + lp * .6); if (lp > 0) g.rotate(lvE * lvE * TAU);   // くるっと1回転
  g.fillStyle = `rgba(143,240,210,${.25 + pul * .4})`; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill();
  g.fillStyle = "#8ff0d2"; g.beginPath(); g.moveTo(0, -6); g.lineTo(4.2, 0); g.lineTo(0, 6); g.lineTo(-4.2, 0); g.closePath(); g.fill();
  g.fillStyle = "#fff"; g.fillRect(-1, -1, 2, 2); g.restore();
  g.fillStyle = "rgba(143,240,210,.15)"; g.beginPath(); g.roundRect(32, gy - 3, W - 44, 6, 3); g.fill();
  g.fillStyle = "#8ff0d2"; g.beginPath(); g.roundRect(32, gy - 3, Math.max(6, (W - 44) * G.xp / xpNeed()), 6, 3); g.fill();
  if (lp > 0) { // レベルアップ：ゲージ全体が白く光り、光が右へ走る
    g.fillStyle = `rgba(255,255,255,${.55 * lp * lp})`; g.beginPath(); g.roundRect(32, gy - 3, W - 44, 6, 3); g.fill();
    const sx = 32 + (W - 44) * Math.min(1, lvE * 1.6), sg = g.createLinearGradient(sx - 40, 0, sx, 0); sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(1, `rgba(255,255,255,${lp})`);
    g.fillStyle = sg; g.fillRect(Math.max(32, sx - 40), gy - 4, Math.min(40, sx - 32), 8);
  }
  // ボスの体力と殻：左に大彗星の顔、角丸のゲージ。その下に持っている技を、小さな印とLvで並べる
  const b = G.boss;
  if (b && b.y >= b.ty) {
    const bx = 46, bw = W - bx - 14, by = 74;
    g.save(); g.beginPath(); g.arc(28, by + 1, 12, 0, TAU); g.fillStyle = "rgba(10,6,30,.6)"; g.fill(); g.clip();   // 大彗星の顔だけを丸く切り抜く
    atlas.draw(g, "boss", "fly", tNow, 28, by + 4, 12); g.restore();
    g.strokeStyle = "#ff9ecf"; g.lineWidth = 1.5; g.beginPath(); g.arc(28, by + 1, 12, 0, TAU); g.stroke();
    g.fillStyle = "rgba(10,6,30,.6)"; g.beginPath(); g.roundRect(bx - 2, by - 5, bw + 4, 12, 6); g.fill();
    g.fillStyle = "#ff9ecf"; g.beginPath(); g.roundRect(bx, by - 3, Math.max(4, bw * Math.max(0, b.hp / b.hpMax)), 8, 4); g.fill();
    g.fillStyle = "rgba(255,255,255,.35)"; g.beginPath(); g.roundRect(bx + 2, by - 2, Math.max(0, bw * Math.max(0, b.hp / b.hpMax) - 4), 2, 1); g.fill();
    if (b.broken <= 0 && b.shell > 0) { g.strokeStyle = "rgba(190,230,255,.9)"; g.lineWidth = 2; g.beginPath(); g.roundRect(bx - 2, by - 5, (bw + 4) * b.shell / b.shellMax, 12, 6); g.stroke(); }
    const eq = TECH_KEYS.filter(k => bossLv(k));
    g.textAlign = "center"; g.font = "700 9px 'Zen Maru Gothic', sans-serif";
    eq.forEach((k, i) => {
      const x = bx + 9 + i * 23, y = by + 20, col = "#ff9ecf";
      g.fillStyle = "rgba(10,6,30,.75)"; g.beginPath(); g.arc(x, y, 9.5, 0, TAU); g.fill();
      g.strokeStyle = col; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 9.5, 0, TAU); g.stroke();
      g.drawImage(cardIcon(BOSS_TECHS[k].icon, col), x - 7, y - 7, 14, 14);
      g.fillStyle = "#fff"; g.lineWidth = 2.5; g.strokeStyle = "rgba(10,6,30,.9)"; g.strokeText(bossLv(k), x + 8, y + 10); g.fillText(bossLv(k), x + 8, y + 10);
    });
  }
  if (G.waveState === "leave" && held && G.endT <= 0) { g.textAlign = "center"; g.fillStyle = "#ffe7a3"; g.font = `${HEAD_W} 15px ${HEAD_FONT}`; g.fillText(G.pending ? "指を離すと カードえらびへ" : "指を離すと次の波へ", W / 2, H / 2); }
}
