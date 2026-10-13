"use strict";
// 大連鎖のしめくくり：連鎖が出つくしたら、一拍しずかになってから、まんなかで特大の花火が「ドカーン」

// 連鎖がもう広がらない（輪がすべて引火できる時間を過ぎ、導火線も残っていない）
function chainSettled() {
  return G.shells.length === 0 && !fusing() && G.bursts.every(b => b.demo || b.t > b.grow + RING_HOLD);
}

function updateFinale(dt) {
  if ((G.mode === "play" || G.mode === "tutorial") && G.pending && !G.fin && !G.finDone && G.chainNow >= FINALE_MIN && chainSettled()) {
    G.finDone = true;
    G.fin = { t: 0, x: G.chainX / G.chainNow, y: G.chainY / G.chainNow, n: G.chainNow, fired: false, at: waitToBeat(0.4) };
    G.fin.beat = beatAt(G.fin.at);
    sfx.hush();
  }
  const f = G.fin;
  if (!f) return;
  f.t += dt;
  if (!f.fired && beatLeft(f.beat) <= 0) {
    f.fired = true;
    bigBurst(f.x, Math.min(f.y, 360), f.n);
  }
  if (f.t > f.at + 1.8) G.fin = null;
}

function bigBurst(x, y, n) {
  const all = G.orbs.length === 0;
  const R = Math.min(190, 80 + n * 7) * (all ? 1.2 : 1);
  const bonus = n * 100;
  G.score += bonus;
  // 金のしだれ（長く残って、ゆっくり垂れる）
  const drag = 1.6, grow = 1.0, v0 = R * drag / (1 - Math.exp(-drag * grow));
  const count = Math.min(220, 120 + n * 6);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rnd(-0.03, 0.03);
    const sp = v0 * (rng() < 0.3 ? rnd(0.45, 0.7) : rnd(0.94, 1.04));
    sparkList.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, hist: [], life: rnd(3.2, 4.2), age: 0,
      rgb: rng() < 0.8 ? [255, 200, 110] : [255, 245, 220], drag, grow, glitter: true, size: 2.4 });
  }
  if (sparkList.length > SPARK_MAX + 300) sparkList.splice(0, sparkList.length - SPARK_MAX - 300);
  // 内側に色の輪をもう一つ
  sparks(x, y, [255, 140, 170], R * 0.5, 4, 0.7, 60, 2.4);
  lightUp(x, y, [255, 200, 120], R * 1.4);
  G.flash = 0.7;
  G.shake = Math.min(14, 6 + n * 0.5);
  G.freeze = 0.09;
  G.glow = Math.min(1, G.glow + 0.4);
  sfx.finale(n);
  const sub = n >= 12 ? "特大" : n >= 8 ? "大輪" : "";
  const sy = Math.max(170, Math.min(y - 30, 280)), size = n >= 8 ? 70 : 58;
  addStamp(`${n}連鎖`, W / 2, sy, size, [255, 226, 150], sub);
  addText(`連鎖ボーナス +${bonus}`, W / 2, sy + size * 0.95, 15, 1.6, [255, 236, 190]);
}
