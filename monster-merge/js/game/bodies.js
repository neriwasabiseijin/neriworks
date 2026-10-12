"use strict";
// Physics bodies: monsters, special pieces, cursed rocks and collision handling.

function pieceRadius(p) { return p.kind === "mon" ? RADII[p.tier] : p.kind === "bomb" ? 24 : 22; }

function addMonster(t, x, y, vx = 0, vy = 0) {
  const b = Bodies.circle(x, y, RADII[t], {
    restitution: 0.12, friction: 0.25, frictionStatic: 0.6, frictionAir: 0.008, density: 0.0012, label: "mon",
  });
  b.tier = t; b.born = simTime; b.pop = 0; b.happy = 0; b.squash = 0;
  b.phase = Math.random() * 6.28; b.blinkEvery = 2.5 + Math.random() * 3;
  Body.setVelocity(b, { x: vx, y: vy });
  Composite.add(engine.world, b);
  return b;
}
function addSpecial(kind, x, y) {
  const b = Bodies.circle(x, y, kind === "bomb" ? 24 : 22, {
    restitution: 0.2, friction: 0.2, frictionAir: 0.008, density: kind === "bomb" ? 0.004 : 0.0012, label: kind,
  });
  b.born = simTime; b.fuse = -1; b.pop = 0;
  Composite.add(engine.world, b);
  return b;
}
// Stones are planned when the previous one falls: the HUD counts down and shows where it will land.
function planStone(at) {
  const grow = 1 + Math.min(0.5, heat() * 0.04);
  const r = Math.round((20 + Math.floor(rngStone() * 14)) * grow);
  const x = BOX_L + r + rngStone() * (BOX_R - BOX_L - 2 * r);
  const angle = rngStone() * Math.PI;
  const extra = [];
  for (let i = 1; i < stonesPerFall(); i++) {
    const er = Math.round((18 + Math.floor(rngStone() * 12)) * grow);
    extra.push({ x: BOX_L + er + rngStone() * (BOX_R - BOX_L - 2 * er), r: er, angle: rngStone() * Math.PI, delay: i * 260 });
  }
  return { at, x, r, angle, extra };
}
function addStone(plan) {
  const { x, r } = plan;
  const b = Bodies.polygon(x, BOX_T - 10, 9, r, {
    restitution: 0.05, friction: 0.6, frictionStatic: 0.9, frictionAir: 0.004, density: 0.0035, label: "stone",
  });
  Body.setAngle(b, plan.angle);
  b.r = r; b.hp = (r >= 30 ? 3 : 2) + (heat() >= 14 ? 2 : heat() >= 8 ? 1 : 0); b.maxHp = b.hp; b.born = simTime; b.pop = 0;
  Composite.add(engine.world, b);
  effects.push({ kind: "warn", x, y: BOX_T + 6, life: 0, max: 0.6 });
  sfx.stone();
}
function bodies() { return engine ? Composite.allBodies(engine.world) : []; }
function radiusOf(b) { return b.label === "mon" ? RADII[b.tier] : b.label === "stone" ? b.r : b.circleRadius; }
function removeBody(b) { if (b.dead) return; b.dead = true; Composite.remove(engine.world, b); }

let pendingPairs = [], pendingSpecial = [];
function onCollide(ev) {
  for (const p of ev.pairs) {
    const a = p.bodyA, b = p.bodyB;
    if (ev.name === "collisionStart") for (const o of [a, b]) if (o.label === "mon") {
      const v = Math.abs(o.velocity.y) + Math.abs(o.velocity.x) * 0.5;
      if (v > 2) o.squash = Math.min(1, Math.max(o.squash || 0, v / 9));
    }
    if (a.label === "mon" && b.label === "mon" && a.tier === b.tier) pendingPairs.push([a, b]);
    for (const [s, o] of [[a, b], [b, a]]) {
      if (s.label === "rainbow" && (o.label === "mon" || o.label === "stone")) pendingSpecial.push([s, o]);
      if (s.label === "bomb" && o.label !== "bomb" && s.fuse < 0) s.fuse = 0.18;
    }
  }
}
