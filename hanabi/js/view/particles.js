"use strict";
// 花火の星（尾を引く光の粒）、昇るときの火の粉、開いた瞬間の空の明かり、煙。
// 粒は上限を決めて、古いものから捨てる。

const SPARK_MAX = 1800;
const sparkList = [], lights = [], smokes = [];
const TRAIL = 7; // 尾に使う過去の位置の数

// 空に残った星・明かり・煙を消す（タイトルからゲームに入るとき、目隠しの裏で）
function clearSky() { sparkList.length = lights.length = smokes.length = 0; }

// 星が grow 秒かけて半径 R あたりまで広がるように初速を決める
function sparks(x, y, rgb, R, depth, grow, count = 0, life = 0) {
  const n = count || Math.min(84, 54 + depth * 3);
  const drag = 2.4;
  const v0 = R * drag / (1 - Math.exp(-drag * grow));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(-0.05, 0.05);
    const sp = v0 * (rng() < 0.25 ? rnd(0.5, 0.75) : rnd(0.92, 1.04)); // 外の輪と内の輪
    sparkList.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, hist: [],
      life: life ? rnd(life * 0.85, life * 1.1) : count ? 0.5 : rnd(2.0, 2.8), age: 0, rgb, drag, grow,
      glitter: rng() < 0.4, size: count && !life ? 1 : 2,
    });
  }
  if (sparkList.length > SPARK_MAX) sparkList.splice(0, sparkList.length - SPARK_MAX);
}

// 昇っている花火玉からこぼれる火の粉
function ember(x, y) {
  sparkList.push({ x: x + rnd(-1.5, 1.5), y, vx: rnd(-8, 8), vy: rnd(10, 30), hist: [], life: rnd(0.4, 0.8), age: 0,
    rgb: [255, 190, 120], drag: 2, grow: 0, glitter: true, size: 1 });
}

// 開いた瞬間、そのまわりの空と煙が照らされる
function lightUp(x, y, rgb, R) {
  lights.push({ x, y, rgb, R: R * 2.6, t: 0 });
  smokes.push({ x, y, R: R * 0.9, t: 0, rgb });
  if (lights.length > 40) lights.shift();
  if (smokes.length > 30) smokes.shift();
}

function updateSparks(dt) {
  let j = 0;
  for (let i = 0; i < sparkList.length; i++) {
    const s = sparkList[i];
    s.age += dt;
    if (s.age >= s.life) continue;
    s.hist.push(s.x, s.y);
    if (s.hist.length > TRAIL * 2) s.hist.splice(0, 2);
    const k = Math.exp(-s.drag * dt);
    // 広がりきるまでは重力を弱く、そのあとゆっくりしだれる
    const g = s.age < s.grow ? 12 : 46;
    s.vx *= k; s.vy = s.vy * k + g * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    sparkList[j++] = s;
  }
  sparkList.length = j;
  for (const l of lights) l.t += dt;
  for (const m of smokes) { m.t += dt; m.y += dt * 4; m.R += dt * 6; }
  while (lights.length && lights[0].t > 1.2) lights.shift();
  while (smokes.length && smokes[0].t > 5) smokes.shift();
}

function drawLights(c) {
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const l of lights) {
    const a = Math.max(0, 0.22 * (1 - l.t / 1.2)) * (l.t < 0.08 ? l.t / 0.08 : 1);
    const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.R);
    g.addColorStop(0, `rgba(${l.rgb[0]},${l.rgb[1]},${l.rgb[2]},${a})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(l.x - l.R, l.y - l.R, l.R * 2, l.R * 2);
  }
  // 煙：ほんのり色が残る
  for (const m of smokes) {
    const a = 0.07 * Math.min(1, m.t / 0.6) * Math.max(0, 1 - m.t / 5);
    const g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.R);
    g.addColorStop(0, `rgba(${(m.rgb[0] + 180) / 2 | 0},${(m.rgb[1] + 170) / 2 | 0},${(m.rgb[2] + 200) / 2 | 0},${a})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(m.x - m.R, m.y - m.R, m.R * 2, m.R * 2);
  }
  c.restore();
}

function drawSparks(c) {
  c.save();
  c.globalCompositeOperation = "lighter";
  c.lineCap = "round";
  c.lineJoin = "round";
  for (const s of sparkList) {
    const f = 1 - s.age / s.life;
    let a = Math.min(1, f * 1.6);
    // 終わりぎわはチカチカまたたく
    if (s.glitter && f < 0.45) a *= Math.sin(s.age * 50 + s.x * 3) > 0 ? 1 : 0.1;
    const [r, g, b] = s.rgb;
    const w = Math.max(0, 1 - s.age * 2.5); // 開いた直後は白っぽい
    const cr = r + (255 - r) * w | 0, cg = g + (255 - g) * w | 0, cb = b + (255 - b) * w | 0;
    // 尾
    if (s.hist.length >= 4) {
      c.strokeStyle = `rgba(${cr},${cg},${cb},${a * 0.5})`;
      c.lineWidth = s.size * 1.1;
      c.beginPath();
      c.moveTo(s.hist[0], s.hist[1]);
      for (let i = 2; i < s.hist.length; i += 2) c.lineTo(s.hist[i], s.hist[i + 1]);
      c.lineTo(s.x, s.y);
      c.stroke();
    }
    // 頭
    c.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
    c.beginPath(); c.arc(s.x, s.y, s.size * (0.8 + f * 0.8), 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
