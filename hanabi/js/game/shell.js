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

// てっぺんが (x, y) に来る引き方（お手本用）。粗く探してから、まわりを細かく探す
function aimFor(x, y) {
  let best = null;
  const look = (a0, a1, da, w0, w1, dw) => {
    for (let a = a0; a <= a1; a += da) for (let w = w0; w <= w1; w += dw) {
      if (Math.abs(a) > MAX_ANGLE || w < 0 || w > 1) continue;
      const q = apexOf(a, w), d = Math.hypot(q.x - x, q.y - y);
      if (!best || d < best.d) best = { a, w, d };
    }
  };
  look(-MAX_ANGLE, MAX_ANGLE, 0.01, 0, 1, 0.01);
  const { a, w } = best;
  look(a - 0.01, a + 0.01, 0.0005, w - 0.01, w + 0.01, 0.0005);
  return best;
}

// 引っぱってはなすと、その狙いで打ち上がる（1つの景に1発きり）
const planning = () => G.mode === "play" || G.mode === "tutorial" || G.mode === "replay";

function fire(angle, power) {
  if (!planning() || busy() || G.rise) return;
  planShot(angle, power);
  startVolley();
}

function planShot(angle, power) {
  if (G.fired) return;
  if (G.plans.length >= G.shots) G.plans.pop(); // 狙い直し
  G.plans.push({ angle, power, color: G.queue[G.plans.length] }); // はなしたときの音はなし（拍に合わせて「ポン」と上がるだけ）
}
// 決めた狙いで打ち上げる（1ステージに1発きり）
function startVolley() {
  if (!planning() || G.fired || !G.plans.length || busy()) return;
  G.fired = true;
  G.volley = { i: 0, at: beatAt(launchDelay()) };
}
// 打ち上げ：4分音符おきに「ドン・ドン・ドン」と上げる。何発でも、ひとつながりの連鎖として数える
function updateVolley() {
  const v = G.volley;
  if (!v || beatLeft(v.at) > 0) return;
  const p = G.plans[v.i];
  launchShell(p.angle, p.power, v.i === 0);
  if (++v.i >= G.plans.length) { G.volley = null; G.plans = []; return; }
  v.at = beatAt(toBeat(0.3, 4, false));
}

function launchShell(angle, power, first) {
  const { vx, vy } = launchVelocity(angle, power);
  const color = G.queue.shift();
  G.shots--;
  if (first) {
    G.chainNow = 0;
    G.pending = true;
    G.chainX = G.chainY = 0;
    G.finDone = false;
  }
  // 拍にのせるため、次の8分の拍まで筒の中で待つ
  const wait = launchDelay();
  G.shells.push({ x: LAUNCH.x, y: LAUNCH.y, vx, vy, color, trail: [], age: 0, ember: 0, wait, waitAt: beatAt(wait) });
  // 笛の「ヒュ〜〜」は、鳴り終わりも8分の拍にそろえる（てっぺんに着くころの、いちばん近い8分の拍で止む）
  const E = BEAT_STEP * 2, flight = -vy / GRAVITY;
  sfx.launch(Math.max(E * 2, Math.round(flight / E) * E), wait);
}

function updateShells(dt) {
  for (let i = G.shells.length - 1; i >= 0; i--) {
    const s = G.shells[i];
    if (s.wait > 0 && (s.wait = beatLeft(s.waitAt)) > 0) continue;
    s.age += dt;
    // てっぺんで光が消え、一瞬の「間」のあとに開く
    if (s.dark !== undefined) {
      s.trail.shift(); s.trail.shift();
      // その場で止まって開く（狙いの輪の真ん中で開くように）
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
    if (s.vy >= 0) { s.dark = apexPause(); s.darkAt = beatAt(s.dark); }
  }
}
