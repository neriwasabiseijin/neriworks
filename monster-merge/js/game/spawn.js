"use strict";
// What drops next, rock pacing and late-game difficulty (heat), and dropping a piece.

function makeNext() {
  if (lv("bomb") && ++bombCount >= bombEvery(lv("bomb"))) { bombCount = 0; return { kind: "bomb" }; }
  if (lv("rainbow") && ++rainbowCount >= rainbowEvery(lv("rainbow"))) { rainbowCount = 0; return { kind: "rainbow" }; }
  return { kind: "mon", tier: nextDropTier() };
}
function stoneInterval() { return Math.max(heat() >= 6 ? 1 : 2, 7 - Math.floor(drops / 25) - Math.floor(level / 3)); }
// Late-game pressure: grows with level past 8 and with every 30 drops, and jumps once all upgrades are taken.
function heat() { return Math.max(0, level - 8) + Math.floor(drops / 25) + maxedLevels * 2; }
function stonesPerFall() { return Math.min(5, 1 + Math.floor(heat() / 3)); }

function dropNow() {
  if (state !== "play" || cutin || dropCooldown > 0) return;
  const r = pieceRadius(cur);
  const x = Math.max(BOX_L + r, Math.min(BOX_R - r, aimX));
  if (cur.kind === "mon") addMonster(cur.tier, x, DROP_Y); else addSpecial(cur.kind, x, DROP_Y);
  sfx.drop();
  cur = next; next = makeNext();
  drops++;
  dropCooldown = 0.5;
  if (drops >= plannedStone.at) {
    const plan = plannedStone;
    plannedStone = planStone(drops + stoneInterval());
    setTimeout(() => state !== "title" && state !== "over" && engine && addStone(plan), 350);
    for (const e of plan.extra || []) setTimeout(() => state !== "title" && state !== "over" && engine && addStone(e), 350 + e.delay);
  }
  if (lv("thunder") && ++thunderCount >= thunderEvery(lv("thunder"))) { thunderCount = 0; thunder(); }
}
