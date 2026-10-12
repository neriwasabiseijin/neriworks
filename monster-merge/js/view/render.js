"use strict";
// Drawing the board, monsters, HUD, forecasts, effects and the level-up banner.

function drawPiece(t, x, y, angle, s = 1, face = "normal", sx = 1, sy = 1) {
  const set = pieceCache[t]; if (!set) return;
  const im = set[face] || set.normal;
  const size = imgSizeFor(t, RADII[t]) * s;
  const bd = bodyOf(t);
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  if (sx !== 1 || sy !== 1) { ctx.translate(0, RADII[t] * s); ctx.scale(sx, sy); ctx.translate(0, -RADII[t] * s); }
  ctx.drawImage(im, -bd.cx * size, -bd.cy * size, size, size);
  ctx.restore();
}
function drawMonster(b, now) {
  const t = b.tier;
  let face = "normal";
  if (pinch && simTime - b.born > 0.6) face = "panic";
  else if (b.happy > 0) face = "blink";
  const breath = Math.sin(now * 2.2 + b.phase) * 0.018;
  const sq = b.squash || 0;
  let x = b.position.x;
  if (face === "panic") x += Math.sin(now * 40 + b.phase) * 0.9;
  drawPiece(t, x, b.position.y, b.angle, 1 + b.pop * 0.25, face, 1 + sq * 0.1 - breath * 0.5, 1 - sq * 0.14 + breath);
  if (face === "panic" && !faceImg[t].panic) {
    // fallback sweat drop when no panic face art is available
    const r = RADII[t];
    ctx.fillStyle = "#9fdcff"; ctx.beginPath(); ctx.ellipse(x + r * 0.55, b.position.y - r * 0.7, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
  }
}
function drawImgCircle(im, x, y, r, angle = 0, pad = 1.12) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.drawImage(im, -r * pad, -r * pad, r * 2 * pad, r * 2 * pad);
  ctx.restore();
}
function drawHeld(p, x, y, fit) {
  if (!p) return;
  if (p.kind === "mon") drawPiece(p.tier, x, y, 0, fit ? fit / RADII[p.tier] : 1);
  else drawImgCircle(img[p.kind], x, y, fit || pieceRadius(p));
}
let bgCache = null;
function drawBackground() {
  if (!bgCache) {
    bgCache = document.createElement("canvas"); bgCache.width = W; bgCache.height = H;
    const g = bgCache.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1b1440"); grad.addColorStop(1, "#0d0a1e");
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    const r = mulberry32(7);
    for (let i = 0; i < 70; i++) { g.globalAlpha = 0.2 + r() * 0.6; g.fillStyle = "#e9dcff"; g.fillRect(r() * W, r() * H, 1.5, 1.5); }
    g.globalAlpha = 1;
  }
  ctx.drawImage(bgCache, 0, 0);
}
function render() {
  const k = scale * dpr;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const fdt = Math.min(0.05, (performance.now() - (render.last || performance.now())) / 1000); render.last = performance.now();
  shake = Math.max(0, Math.min(14, shake) - fdt * 40);
  if (shake > 0 && state === "play" && !cutin && !reduceMotion) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  drawBackground();
  // box
  roundRect(BOX_L - 4, BOX_T, BOX_R - BOX_L + 8, BOX_B - BOX_T + 6, 14);
  ctx.fillStyle = "rgba(60,48,120,.35)"; ctx.fill();
  ctx.strokeStyle = "#4b3f8f"; ctx.lineWidth = 3; ctx.stroke();
  // danger line
  const warn = dangerTime > 0 ? 0.5 + 0.5 * Math.sin(performance.now() / 80) : 0;
  ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
  ctx.strokeStyle = warn ? `rgba(255,70,90,${0.4 + warn * 0.6})` : "rgba(178,107,255,.55)";
  ctx.beginPath(); ctx.moveTo(BOX_L, DANGER_Y); ctx.lineTo(BOX_R, DANGER_Y); ctx.stroke(); ctx.setLineDash([]);
  // HUD: score, level bar, next
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.fillStyle = "#f5efff"; ctx.font = `24px ${POP}`;
  ctx.fillText(String(score), 16, 32);
  ctx.font = `600 11px ${FONT}`; ctx.fillStyle = "#a99fd0";
  ctx.fillText(`ベスト ${Math.max(best, score)}`, 16, 48);
  const prev = xpNeed(level - 1), need = xpNeed(level);
  const p = Math.max(0, Math.min(1, (score - prev) / (need - prev)));
  ctx.fillStyle = "#ffc53d"; ctx.font = `800 12px ${FONT}`; ctx.fillText(`Lv${level}`, 16, 66);
  roundRect(48, 57, 150, 10, 5); ctx.fillStyle = "#2a2350"; ctx.fill();
  if (p > 0) {
    roundRect(48, 57, 150 * p, 10, 5); ctx.fillStyle = "#ffc53d";
    if (p > 0.85) { ctx.shadowColor = "#ffc53d"; ctx.shadowBlur = 8 + 6 * Math.sin(performance.now() / 120); }
    ctx.fill(); ctx.shadowBlur = 0;
  }
  // owned upgrades
  let ux = 16;
  for (const key of Object.keys(UPGRADES)) {
    if (!lv(key)) continue;
    ctx.drawImage(img["up_" + key], ux, 74, 20, 20);
    if (UPGRADES[key].max > 1) { ctx.font = `800 9px ${FONT}`; ctx.fillStyle = "#fff"; ctx.fillText(String(lv(key)), ux + 16, 94); }
    ux += 24;
  }
  ctx.textAlign = "center"; ctx.font = `600 10px ${FONT}`; ctx.fillStyle = "#a99fd0";
  // next
  ctx.fillText("つぎ", W - 38, 84);
  ctx.beginPath(); ctx.arc(W - 38, 46, 26, 0, Math.PI * 2); ctx.fillStyle = "#1f1a3a"; ctx.fill(); ctx.strokeStyle = "#4b3f8f"; ctx.lineWidth = 2; ctx.stroke();
  if (state !== "title") drawHeld(next, W - 38, 46, 20);
  // forecasts: next stone and next lightning
  if (state !== "title" && plannedStone) {
    const left = plannedStone.at - drops; // drops until it falls, counting the one that triggers it
    const fx = W - 156, fy = 84;
    ctx.save();
    const urgent = left <= 1;
    ctx.drawImage(img.stone, fx - 9, fy - 15, 18, 18);
    ctx.textAlign = "left"; ctx.font = `800 11px ${FONT}`;
    ctx.fillStyle = urgent ? "#ff7a9a" : "#c9b8ff";
    const nSt = 1 + (plannedStone.extra ? plannedStone.extra.length : 0), xN = nSt > 1 ? ` ×${nSt}` : "";
    ctx.fillText(urgent ? `つぎで岩${xN}！` : `岩まで ${left}${xN}`, fx + 12, fy - 2);
    if (lv("thunder")) {
      const tl = thunderEvery(lv("thunder")) - thunderCount;
      ctx.drawImage(img.up_thunder, fx - 9, fy + 3, 16, 16);
      ctx.fillStyle = tl <= 1 ? "#fff06a" : "#e6dca0";
      ctx.fillText(tl <= 1 ? "つぎで雷！" : `雷まで ${tl}`, fx + 12, fy + 16);
    }
    ctx.restore();
    // ghost of the incoming stone over its landing column
    if (left <= 2) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 120);
      ctx.save();
      ctx.globalAlpha = (urgent ? 0.35 : 0.18) + pulse * 0.2;
      drawImgCircle(img.stone, plannedStone.x, BOX_T + plannedStone.r + 6, plannedStone.r, plannedStone.angle, 1.18);
      ctx.globalAlpha = urgent ? 0.5 : 0.25;
      ctx.strokeStyle = "#b26bff"; ctx.setLineDash([4, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(plannedStone.x, BOX_T + plannedStone.r * 2 + 10); ctx.lineTo(plannedStone.x, BOX_B); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    // crosshair on the stone the next lightning will hit
    if (lv("thunder") && thunderEvery(lv("thunder")) - thunderCount <= 1) {
      const n = lv("thunder") >= 3 ? 2 : 1;
      const targets = bodies().filter((b) => b.label === "stone").sort((a, b) => a.position.y - b.position.y).slice(0, n);
      for (const t of targets) {
        const rr = t.r + 8 + Math.sin(performance.now() / 100) * 2;
        ctx.strokeStyle = "#ffe14d"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(t.position.x, t.position.y, rr, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(t.position.x + Math.cos(a) * (rr - 5), t.position.y + Math.sin(a) * (rr - 5)); ctx.lineTo(t.position.x + Math.cos(a) * (rr + 6), t.position.y + Math.sin(a) * (rr + 6)); ctx.stroke(); }
      }
    }
  }
  // aim guide + held monster
  if (state === "play" && !cutin) {
    const r = pieceRadius(cur);
    const x = Math.max(BOX_L + r, Math.min(BOX_R - r, aimX));
    ctx.strokeStyle = "#a99fd0"; ctx.globalAlpha = 0.35; ctx.lineWidth = 2; ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.moveTo(x, DROP_Y + r); ctx.lineTo(x, BOX_B); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = dropCooldown > 0 ? 0.45 : 1;
    drawHeld(cur, x, DROP_Y);
    ctx.globalAlpha = 1;
  }
  const nowS = performance.now() / 1000;
  // bodies
  for (const b of bodies()) {
    if (b.isStatic) continue;
    if (b.label === "mon") drawMonster(b, nowS);
    else if (b.label === "stone") {
      drawImgCircle(b.hp < b.maxHp ? img.stone_cracked : img.stone, b.position.x + (b.pop ? (Math.random() - 0.5) * 3 : 0), b.position.y, b.r * (1 + b.pop * 0.1), b.angle, 1.18);
    } else {
      const pulse = b.fuse >= 0 ? 1 + Math.sin(simTime * 60) * 0.1 : 1;
      drawImgCircle(img[b.label], b.position.x, b.position.y, b.circleRadius * pulse, b.angle);
    }
  }
  // magnet links: a faint thread that only shows now and then
  for (const [a, b, k] of magnetLinks) {
    if (a.dead || b.dead) continue;
    const pulse = Math.pow(Math.max(0, Math.sin(nowS * 0.9 + a.id * 1.7)), 6);
    const al = pulse * (0.15 + k * 0.35);
    if (al < 0.02) continue;
    ctx.save(); ctx.globalAlpha = al;
    ctx.strokeStyle = "#ffb3cf"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.lineDashOffset = -nowS * 20;
    ctx.beginPath(); ctx.moveTo(a.position.x, a.position.y); ctx.lineTo(b.position.x, b.position.y); ctx.stroke();
    ctx.restore();
  }

  // effects
  for (const e of effects) {
    const q = e.life / e.max;
    ctx.globalAlpha = 1 - q;
    if (e.kind === "ring") { ctx.strokeStyle = e.color; ctx.lineWidth = 4 * (1 - q) + 1; ctx.beginPath(); ctx.arc(e.x, e.y, e.grow ? e.r * (0.3 + q * 0.7) : e.r * (0.8 + q * 0.8), 0, Math.PI * 2); ctx.stroke(); }
    else if (e.kind === "dot") { ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fill(); }
    else if (e.kind === "warn") { ctx.fillStyle = "#b26bff"; ctx.font = `900 22px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("▼", e.x, e.y + 14); }
    else if (e.kind === "bolt") {
      ctx.strokeStyle = "#fff6a0"; ctx.lineWidth = 4; ctx.shadowColor = "#ffe14d"; ctx.shadowBlur = 16;
      ctx.beginPath(); let yy = 0, xx = e.x + 20; ctx.moveTo(xx, yy);
      while (yy < e.y) { yy += 30; xx = e.x + (Math.random() - 0.5) * 30 * (1 - yy / e.y); ctx.lineTo(xx, Math.min(yy, e.y)); }
      ctx.stroke(); ctx.shadowBlur = 0;
    }
  }
  ctx.globalAlpha = 1;
  // combo badge
  if (comboShow > 0 && combo >= 2) {
    ctx.globalAlpha = Math.min(1, comboShow * 2);
    ctx.textAlign = "center"; ctx.font = `22px ${POP}`; ctx.lineWidth = 6; ctx.strokeStyle = "#120a22";
    const mult = comboMult();
    const txt = lv("combo") ? `${combo} COMBO ×${mult.toFixed(1)}` : `${combo} COMBO`;
    ctx.strokeText(txt, W / 2, DANGER_Y + 40); ctx.fillStyle = "#ffc53d"; ctx.fillText(txt, W / 2, DANGER_Y + 40);
    ctx.globalAlpha = 1;
  }
  if (cutin) drawCutin();
  if (state === "lvintro") drawLevelBanner();
}
function drawLevelBanner() {
  const p = Math.min(1, lvIntro / 1.0);
  ctx.save();
  ctx.fillStyle = `rgba(8,4,20,${0.55 * Math.min(1, p * 2)})`; ctx.fillRect(0, 0, W, H);
  const s = easeOutBack(Math.min(1, p / 0.45));
  ctx.translate(W / 2, H / 2 - 40); ctx.scale(s, s);
  const rays = ctx.createRadialGradient(0, 0, 10, 0, 0, 170);
  rays.addColorStop(0, "rgba(255,197,61,.55)"); rays.addColorStop(1, "rgba(255,197,61,0)");
  ctx.fillStyle = rays; ctx.beginPath(); ctx.arc(0, 0, 170, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  ctx.font = `36px ${POP}`; ctx.lineWidth = 10; ctx.strokeStyle = "#3a1d00";
  ctx.strokeText("LEVEL UP!", 0, 0); ctx.fillStyle = "#ffc53d"; ctx.fillText("LEVEL UP!", 0, 0);
  const allMax = !Object.keys(UPGRADES).some((k) => lv(k) < UPGRADES[k].max);
  const sub = allMax ? `Lv${level + 1}　岩がさらに増える！` : `Lv${level} → Lv${level + 1}`;
  ctx.font = `800 16px ${FONT}`; ctx.lineWidth = 6; ctx.strokeText(sub, 0, 36); ctx.fillStyle = allMax ? "#ff9ab3" : "#fff"; ctx.fillText(sub, 0, 36);
  ctx.restore();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + lvIntro * 2, rr = 60 + p * 110;
    star(W / 2 + Math.cos(a) * rr, H / 2 - 40 + Math.sin(a) * rr * 0.7, 5, "#fff6a0", 1 - p * 0.6);
  }
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
