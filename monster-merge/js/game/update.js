"use strict";
// Fixed-step simulation: physics, merges, danger line and pinch detection.

const STEP = 1 / 60;
let acc = 0, lastT = 0;
function update(dt) {
  if (state === "lvintro") {
    // short slow-motion banner before the cards appear
    lvIntro += dt;
    acc += dt * 0.25;
    while (acc >= STEP) { Engine.update(engine, STEP * 1000); resolveMerges(); simTime += STEP; acc -= STEP; }
    for (const e of effects) { e.life += dt * 0.5; if (e.kind === "dot") { e.x += e.vx * dt * 0.5; e.y += e.vy * dt * 0.5; } }
    effects = effects.filter((e) => e.life < e.max);
    if (lvIntro > 1.0) openLevelUp();
    return;
  }
  if (state !== "play") return;
  if (cutin) {
    cutin.time += dt;
    if (cutin.time >= cutin.dur) cutin = null;
    return;
  }
  if (cutQueue.length) { startCutin(cutQueue.shift()); return; }
  checkLevel();
  if (pendingLevels > 0) { state = "lvintro"; lvIntro = 0; sfx.level(); music.duck(true); return; }
  const speed = 260;
  if (keys.left) aimX -= speed * dt;
  if (keys.right) aimX += speed * dt;
  const r = pieceRadius(cur);
  aimX = Math.max(BOX_L + r, Math.min(BOX_R - r, aimX));
  dropCooldown = Math.max(0, dropCooldown - dt);
  comboTimer = Math.max(0, comboTimer - dt);
  if (comboTimer === 0) combo = 0;
  comboShow = Math.max(0, comboShow - dt * 0.8);
  acc += dt;
  while (acc >= STEP) {
    applyMagnet();
    Engine.update(engine, STEP * 1000);
    for (const b of bodies()) if (b.label === "bomb" && b.fuse >= 0 && (b.fuse -= STEP) <= 0) explode(b);
    resolveMerges();
    simTime += STEP;
    acc -= STEP;
    if (cutQueue.length) { acc = 0; break; }
  }
  // danger check: a settled monster or stone poking above the line
  let over = false, highest = Infinity;
  for (const b of bodies()) {
    if (b.isStatic) continue;
    if (b.pop > 0) b.pop = Math.max(0, b.pop - dt * 4);
    if (b.happy > 0) b.happy -= dt;
    if (b.squash > 0) b.squash = Math.max(0, b.squash - dt * 5);
    if (simTime - b.born > 1.4) highest = Math.min(highest, b.position.y - radiusOf(b));
    if (simTime - b.born > 1.4 && b.position.y - radiusOf(b) < DANGER_Y && Math.abs(b.velocity.y) < 1.5) over = true;
  }
  dangerTime = over ? dangerTime + dt : Math.max(0, dangerTime - dt * 2);
  pinch = dangerTime > 0 || highest < DANGER_Y + 60;
  if (dangerTime > DANGER_LIMIT) gameOver();
  for (const e of effects) {
    e.life += dt;
    if (e.kind === "dot") { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 400 * dt; }
  }
  effects = effects.filter((e) => e.life < e.max);
}
