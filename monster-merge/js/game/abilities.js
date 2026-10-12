"use strict";
// Scoring, evolution, and the upgrade effects (shockwave, bomb, thunder, magnet, rainbow merges).

function comboMult() { return Math.min(4, 1 + lv("combo") * 0.5 * Math.max(0, combo - 1)); }
function addScore(base) {
  const mult = comboMult();
  score += Math.round(base * mult);
}
function evolveAt(x, y, t, vx, vy) {
  // t is the tier that merged; spawn t+1 or finish the king
  combo = comboTimer > 0 ? combo + 1 : 1;
  comboTimer = 1.3; if (combo >= 2) comboShow = 1;
  if (t === 8) {
    addScore(KING_BONUS);
    burst(x, y, "#fff07a", 140); shake = 14;
    for (const s of bodies()) if (s.label === "stone") { burst(s.position.x, s.position.y, "#c58bff", s.r); removeBody(s); }
    sfx.cutin(12);
    return;
  }
  const nt = t + 1;
  const nb = addMonster(nt, x, y, vx, Math.min(0, vy));
  nb.pop = 1; nb.happy = 0.9;
  addScore(POINTS[nt]);
  sfx.merge(nt, combo);
  if (nt > maxTier) maxTier = nt;
  if (!seenTiers.has(nt) || nt >= 7) { seenTiers.add(nt); cutQueue.push(nt); }
  shockwave(x, y, RADII[nt], nb);
}
function shockwave(x, y, r, self) {
  const L = lv("shock");
  const reach = r + 10 + L * 22;
  const dmg = L >= 3 ? 2 : 1;
  if (L) effects.push({ kind: "ring", x, y, r: reach, life: 0, max: 0.4, color: "#5ad1ff", grow: true });
  for (const b of bodies()) {
    if (b === self || b.isStatic || b.dead) continue;
    const dx = b.position.x - x, dy = b.position.y - y, d = Math.hypot(dx, dy) || 1;
    const gap = d - radiusOf(b);
    if (b.label === "stone" && gap < reach) damageStone(b, dmg);
    else if (L && gap < reach && b.label !== "stone") {
      const k = (1 - Math.max(0, gap) / reach) * (2 + L * 1.5);
      Body.setVelocity(b, { x: b.velocity.x + dx / d * k, y: b.velocity.y + dy / d * k - 1 });
    }
  }
}
function damageStone(s, dmg) {
  if (s.dead) return;
  s.hp -= dmg; s.pop = 1;
  if (s.hp <= 0) {
    burst(s.position.x, s.position.y, "#c58bff", s.r);
    removeBody(s); addScore(15); sfx.crack();
  } else sfx.crack();
}
function explode(b) {
  const L = Math.max(1, lv("bomb"));
  const x = b.position.x, y = b.position.y, R = 70 + L * 14;
  removeBody(b);
  burst(x, y, "#ff9a3d", R); effects.push({ kind: "ring", x, y, r: R, life: 0, max: 0.45, color: "#ffd23f", grow: true });
  shake = 10; sfx.boom();
  for (const o of bodies()) {
    if (o.isStatic || o.dead) continue;
    const dx = o.position.x - x, dy = o.position.y - y, d = Math.hypot(dx, dy) || 1;
    if (d - radiusOf(o) > R) continue;
    if (o.label === "stone") { burst(o.position.x, o.position.y, "#c58bff", o.r); removeBody(o); addScore(15); }
    else if (o.label === "mon" && o.tier <= L + 2) { burst(o.position.x, o.position.y, COLORS[o.tier], RADII[o.tier]); removeBody(o); addScore(POINTS[o.tier] + 1); }
    else { const k = 7 * (1 - d / (R + 90)); Body.setVelocity(o, { x: o.velocity.x + dx / d * k, y: o.velocity.y + dy / d * k - 2 }); }
  }
}
function thunder() {
  const n = lv("thunder") >= 3 ? 2 : 1;
  const stones = bodies().filter((b) => b.label === "stone").sort((a, b) => a.position.y - b.position.y);
  for (const s of stones.slice(0, n)) {
    effects.push({ kind: "bolt", x: s.position.x, y: s.position.y, life: 0, max: 0.35 });
    burst(s.position.x, s.position.y, "#ffe14d", s.r);
    removeBody(s); addScore(15);
  }
  if (stones.length) { sfx.zap(); shake = 6; }
}
function applyMagnet() {
  magnetLinks = [];
  const L = lv("magnet"); if (!L) return;
  const mons = bodies().filter((b) => b.label === "mon");
  const cands = [];
  for (let i = 0; i < mons.length; i++) for (let j = i + 1; j < mons.length; j++) {
    const a = mons[i], b = mons[j];
    if (a.tier !== b.tier) continue;
    const dx = b.position.x - a.position.x, dy = b.position.y - a.position.y, d = Math.hypot(dx, dy) || 1;
    const range = 80 + RADII[a.tier] * 2 + L * 20;
    if (d > range) continue;
    const k = 1 - d / range;
    const f = (0.00008 + 0.00016 * L) * (0.3 + k) * a.mass;
    cands.push([a, b, k]);
    Body.applyForce(a, a.position, { x: dx / d * f, y: dy / d * f });
    Body.applyForce(b, b.position, { x: -dx / d * f, y: -dy / d * f });
  }
  // show only each monster's strongest pull so the board doesn't turn into a web
  const used = new Set();
  for (const c of cands.sort((p, q) => q[2] - p[2])) {
    if (used.has(c[0]) || used.has(c[1])) continue;
    used.add(c[0]); used.add(c[1]); magnetLinks.push(c);
  }
}

function resolveMerges() {
  for (const [a, b] of pendingPairs) {
    if (a.dead || b.dead) continue;
    removeBody(a); removeBody(b);
    const x = (a.position.x + b.position.x) / 2, y = (a.position.y + b.position.y) / 2;
    burst(x, y, COLORS[a.tier], RADII[a.tier]);
    evolveAt(x, y, a.tier, (a.velocity.x + b.velocity.x) / 2, (a.velocity.y + b.velocity.y) / 2);
  }
  pendingPairs = [];
  for (const [s, o] of pendingSpecial) {
    if (s.dead || o.dead) continue;
    removeBody(s);
    if (o.label === "stone") { burst(o.position.x, o.position.y, "#c58bff", o.r); removeBody(o); addScore(15); sfx.crack(); continue; }
    removeBody(o);
    burst(o.position.x, o.position.y, "#e0b0ff", RADII[o.tier] + 10);
    evolveAt(o.position.x, o.position.y, o.tier, o.velocity.x, o.velocity.y);
  }
  pendingSpecial = [];
}

function burst(x, y, color, r) {
  effects.push({ kind: "ring", x, y, r, life: 0, max: 0.35, color });
  for (let i = 0; i < 10 + r / 4; i++) {
    const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
    effects.push({ kind: "dot", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0, max: 0.5 + Math.random() * 0.3, color, size: 2 + Math.random() * 3 });
  }
}
