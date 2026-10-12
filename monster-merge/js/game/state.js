"use strict";
// Game state variables and starting a new game.

let engine, state = "title";
let playSeed = 0;
let score = 0, best = Number(store.get(bestKey) || 0), maxTier = 1;
let level = 1, ups = {}, pendingLevels = 0, offer = [];
let cur, next;
let maxedLevels = 0;
let aimX = W / 2, dropCooldown = 0, drops = 0, plannedStone = null, lvIntro = 0;
let bombCount = 0, rainbowCount = 0, thunderCount = 0;
let combo = 0, comboTimer = 0, comboShow = 0;
let seenTiers, cutQueue = [], cutin = null;
let effects = [], dangerTime = 0, simTime = 0, shake = 0, pinch = false, magnetLinks = [];
const keys = { left: false, right: false };
const lv = (k) => ups[k] || 0;

function newGame() {
  engine = Engine.create();
  engine.gravity.y = 1.15;
  engine.positionIterations = 8;
  engine.velocityIterations = 6;
  const wallOpt = { isStatic: true, friction: 0.2, label: "wall" };
  Composite.add(engine.world, [
    Bodies.rectangle((BOX_L + BOX_R) / 2, BOX_B + 30, BOX_R - BOX_L + 120, 60, wallOpt),
    Bodies.rectangle(BOX_L - 30, (BOX_T + BOX_B) / 2 - 200, 60, BOX_B - BOX_T + 500, wallOpt),
    Bodies.rectangle(BOX_R + 30, (BOX_T + BOX_B) / 2 - 200, 60, BOX_B - BOX_T + 500, wallOpt),
  ]);
  Events.on(engine, "collisionStart", onCollide);
  Events.on(engine, "collisionActive", onCollide);
  // each play gets its own seed from the start time; separate streams keep drops, rocks and upgrade offers independent
  playSeed = Date.now();
  rngDrop = mulberry32(seedOf("drop:" + playSeed));
  rngStone = mulberry32(seedOf("stone:" + playSeed));
  rngUp = mulberry32(seedOf("up:" + playSeed));
  score = 0; maxTier = 1; dangerTime = 0; pinch = false; magnetLinks = []; shake = 0; simTime = 0; effects = []; cutQueue = []; cutin = null;
  level = 1; ups = {}; pendingLevels = 0; maxedLevels = 0;
  drops = 0; plannedStone = planStone(STONE_START); lvIntro = 0; bombCount = rainbowCount = thunderCount = 0; combo = 0; comboTimer = 0;
  seenTiers = new Set([1, 2, 3]);
  cur = { kind: "mon", tier: nextDropTier() };
  next = { kind: "mon", tier: nextDropTier() };
  aimX = W / 2; dropCooldown = 0;
  state = "play";
}
