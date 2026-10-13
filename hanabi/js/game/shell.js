"use strict";
// 花火玉：引っ張った向きと強さから撃ち出し、弧のてっぺんで開く

function launchVelocity(angle, power) {
  const v = V_MIN + power * (V_MAX - V_MIN);
  return { vx: Math.sin(angle) * v, vy: -Math.cos(angle) * v };
}

// てっぺんの位置（狙いの表示用）
function apexOf(angle, power) {
  const { vx, vy } = launchVelocity(angle, power);
  const t = -vy / GRAVITY;
  return { x: LAUNCH.x + vx * t, y: LAUNCH.y + vy * t + 0.5 * GRAVITY * t * t, t, vx, vy };
}

function fire(angle, power) {
  if ((G.mode !== "play" && G.mode !== "tutorial") || G.shots <= 0 || busy()) return;
  const { vx, vy } = launchVelocity(angle, power);
  const color = G.queue.shift();
  G.shots--;
  G.chainNow = 0;
  G.pending = true;
  G.chainX = G.chainY = 0;
  G.finDone = false;
  // 拍にのせるため、指をはなしてから次の拍まで筒の中で待つ（長くても16分音符ひとつ）
  const wait = launchDelay();
  G.shells.push({ x: LAUNCH.x, y: LAUNCH.y, vx, vy, color, trail: [], age: 0, ember: 0, wait, waitAt: beatAt(wait) });
  sfx.launch(-vy / GRAVITY, wait);
}

function updateShells(dt) {
  for (let i = G.shells.length - 1; i >= 0; i--) {
    const s = G.shells[i];
    if (s.wait > 0 && (s.wait = beatLeft(s.waitAt)) > 0) continue;
    s.age += dt;
    // てっぺんで光が消え、一瞬の「間」のあとに開く
    if (s.dark !== undefined) {
      s.trail.shift(); s.trail.shift();
      s.x += s.vx * dt; s.y += 4 * dt;
      if ((s.dark = beatLeft(s.darkAt)) <= 0) { G.shells.splice(i, 1); burst(s.x, s.y, s.color, 1, 1, 0, false); }
      continue;
    }
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 26) s.trail.shift();
    // 昇りながら、こぼれる火の粉
    if ((s.ember -= dt) <= 0) { s.ember = 0.03; ember(s.x, s.y); }
    s.vy += GRAVITY * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.vy >= 0) { s.dark = apexPause(); s.darkAt = beatAt(s.dark); s.vx *= 0.2; }
  }
}
