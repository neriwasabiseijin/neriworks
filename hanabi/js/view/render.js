"use strict";
// 1フレームの描画

const FONT_HUD = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Meiryo", sans-serif';
const FONT_BIG = '"Yuji Syuku", "Hiragino Mincho ProN", "Yu Mincho", serif';
const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

function draw() {
  const c = ctx;
  c.save();
  if (G.shake > 0) c.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
  drawSky(c, G.t, G.glow);
  if (G.mode === "play") drawFocusCount(c); // のこり秒数は夜空のいちばん奥（花火の明かりよりも奥）
  if (G.dim > 0.01) { c.fillStyle = `rgba(2,3,12,${G.dim})`; c.fillRect(-20, -20, W + 40, H + 40); }
  drawLights(c);
  drawStamps(c, true); // 「晴ッ」は火の玉や花火より奥に
  drawRings(c);
  drawLinks(c);
  drawOrbs(c);
  if (G.wreck) drawUfo(c, { x: G.wreck.x, y: G.wreck.y, fuse: 1 }, COLORS[G.wreck.color].rgb, 0);
  drawClouds(c);
  drawShells(c);
  drawSparks(c);
  drawBooms(c);
  if (G.mode === "play") { drawFocus(c); drawAim(c); drawLauncher(c); drawHud(c); }
  if (G.mode === "replay") { drawReplay(c); drawLauncher(c); }
  if (G.mode === "clear" || G.mode === "trans") drawHud(c);
  if (G.mode === "tutorial") { drawAim(c); drawLauncher(c); }
  drawTexts(c);
  drawBoard(c);
  drawStamps(c, false);
  drawCurtain(c);
  if (G.mode !== "title" && G.mode !== "tutorial") drawCrowd(c); // 観客は幕の手前に残す（切り替えの間もそこにいる）
  if (G.mode === "tutorial") drawTutorial(c); // 指のお手本は観客より手前
  drawCheers(c);
  c.restore();
  if (G.flash > 0) { c.fillStyle = `rgba(255,245,230,${G.flash * 0.35})`; c.fillRect(0, 0, W, H); }
}

// 導火線に火がついた玉と、火をつけた輪の中心を線で結ぶ。同じ色でつながった（輪が育つ）ときは、その色で太く光らせる
function drawLinks(c) {
  c.save();
  c.globalCompositeOperation = "lighter";
  c.lineCap = "round";
  for (const o of G.orbs) {
    const b = o.from;
    if (!(o.fuse > 0) || !b) continue;
    const same = o.color === b.color, k = 1 - o.fuse / o.fuseMax;
    c.strokeStyle = same ? rgba(COLORS[o.color].rgb, 0.75 - k * 0.3) : `rgba(255,255,255,${0.22 - k * 0.1})`;
    c.lineWidth = same ? 3 : 1;
    c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(o.x, o.y); c.stroke();
    if (same) { // 育つ印：玉のまわりに、その色の輪をひとつ
      c.lineWidth = 2;
      c.beginPath(); c.arc(o.x, o.y, ORB_TYPES[o.type].r * (1.8 + k * 0.8), 0, Math.PI * 2); c.stroke();
    }
  }
  c.restore();
}

function drawOrbs(c) {
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const o of G.orbs) {
    if (o.rise && G.rise && G.rise.t < o.rise.at) continue; // まだ地上（昇る前）
    const t = ORB_TYPES[o.type], rgb = COLORS[o.color].rgb;
    // 導火線に火がついた玉は、小さくなりながら光が消えていく（溜め）。消えきった瞬間に開く
    const k = o.fuse > 0 ? 1 - o.fuse / o.fuseMax : 0;
    const fade = o.fuse > 0 ? (1 - k * 0.88) * (0.75 + Math.random() * 0.25) : 1;
    const pulse = (1 + Math.sin(G.t * 3 + o.ph) * 0.08) * (1 - k * 0.35);
    const r = t.r * pulse * (o.type === "ufo" ? 0.6 : 1);
    const ox = o.x, oy = o.y;
    const g = c.createRadialGradient(ox, oy, 0, ox, oy, r * 2.6);
    g.addColorStop(0, rgba([255, 255, 255], 0.95 * fade));
    g.addColorStop(0.22, rgba(rgb, 0.9 * fade));
    g.addColorStop(0.5, rgba(rgb, 0.25 * fade * fade));
    g.addColorStop(1, rgba(rgb, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(ox, oy, r * 2.6, 0, Math.PI * 2); c.fill();
    if (o.type === "star") drawGlitter(c, ox, oy, r, fade);
    if (o.type === "double" && o.hits === 0) { // 殻：1回当てると割れる
      c.strokeStyle = rgba([235, 235, 255], 0.75); c.lineWidth = 2;
      c.setLineDash([5, 4]);
      c.beginPath(); c.arc(o.x, o.y, r * 1.6, G.t, G.t + Math.PI * 2); c.stroke();
      c.setLineDash([]);
    }
    if (o.type === "ufo") drawUfo(c, o, rgb, k);
    if (SHAPES[o.type]) drawRays(c, o, rgb, r, fade);
    if (o.type === "big") { c.strokeStyle = rgba(rgb, 0.6); c.lineWidth = 1.5; c.beginPath(); c.arc(o.x, o.y, r * 1.3, 0, Math.PI * 2); c.stroke(); }
  }
  c.restore();
}

// UFO：観客や町並みと同じドット絵（2px のマス）。灯りは自分の色（その色の玉としてつながる）。
// 導火線に火がつくと、あわててガタガタ震える
const UFO_ART = [
  "......gggg......",
  ".....gGGGGg.....",
  "....gGGGGGGg....",
  "..ssssssssssss..",
  ".sSSSSSSSSSSSSs.",
  "sSLSSLSSLSSLSSSs",
  ".sddddddddddddd.",
  "...dddddddddd...",
];
const UFO_PAL = { g: "#5f8f78", G: "#b8ffd8", s: "#9aa0b8", S: "#e6e9f3", d: "#5c6178" };
function drawUfo(c, o, rgb, k) {
  const px = 2, w = UFO_ART[0].length * px, h = UFO_ART.length * px;
  const shake = o.fuse > 0 ? (Math.random() < 0.5 ? -2 : 2) : 0;
  const x0 = Math.round((o.x - w / 2) / px) * px + shake, y0 = Math.round((o.y - h / 2) / px) * px;
  c.save();
  c.globalCompositeOperation = "source-over";
  c.globalAlpha = 1 - k * 0.5;
  let li = 0;
  UFO_ART.forEach((row, yy) => {
    for (let xx = 0; xx < row.length; xx++) {
      const ch = row[xx];
      if (ch === ".") continue;
      if (ch === "L") { // 灯り：順番に点滅
        const on = ((G.t * 6 | 0) + li++) % 3 !== 0;
        c.fillStyle = rgba(rgb, on ? 1 : 0.35);
      } else c.fillStyle = UFO_PAL[ch];
      c.fillRect(x0 + xx * px, y0 + yy * px, px, px);
    }
  });
  c.restore();
}

// ススキ玉・型物・しだれ：どう開くかが見えるしるし。ススキは向きに金色の穂、型物は☆のふち、しだれは下へ垂れる尾
function drawRays(c, o, rgb, r, fade) {
  const sh = SHAPES[o.type], wob = 1 + Math.sin(G.t * 4 + o.ph) * 0.06;
  c.lineCap = "round";
  if (sh.hw) {
    c.strokeStyle = rgba([255, 220, 150], 0.85 * fade);
    for (const f of [-sh.hw * 0.7, 0, sh.hw * 0.7]) {
      const len = r * (f ? 2.6 : 3.3) * wob;
      c.lineWidth = f ? 1.6 : 2.2;
      c.beginPath();
      c.moveTo(o.x + Math.cos(o.rot + f) * r * 0.9, o.y + Math.sin(o.rot + f) * r * 0.9);
      c.lineTo(o.x + Math.cos(o.rot + f) * len, o.y + Math.sin(o.rot + f) * len);
      c.stroke();
    }
  } else if (sh.inner) {
    c.strokeStyle = rgba([255, 250, 230], 0.85 * fade);
    c.lineWidth = 1.6;
    starPath(c, o.x, o.y, r * 2.2 * wob, r * 2.2 * wob * sh.inner / sh.len, o.rot);
    c.stroke();
  } else if (sh.drop) {
    c.strokeStyle = rgba([255, 220, 150], 0.8 * fade);
    c.lineWidth = 1.5;
    for (const dx of [-0.8, 0, 0.8]) {
      c.beginPath();
      c.moveTo(o.x + dx * r, o.y + r * 0.6);
      c.quadraticCurveTo(o.x + dx * r * 1.6, o.y + r * 1.2, o.x + dx * r * 1.5, o.y + r * (dx ? 2.4 : 2.9) * wob);
      c.stroke();
    }
  }
}

// ☆の形の道筋（先の長さ L、くびれ Li、rot に先を向ける）
function starPath(c, x, y, L, Li, rot) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5, rr = i % 2 ? Li : L;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}

// 錦玉：まわりを金の粒がきらきら回る（☆は型物の形なので使わない）
function drawGlitter(c, x, y, r, fade) {
  for (let i = 0; i < 6; i++) {
    const a = G.t * 0.9 + i * Math.PI / 3, tw = 0.5 + 0.5 * Math.sin(G.t * 5 + i * 2.1);
    c.fillStyle = rgba([255, 215, 120], (0.45 + 0.55 * tw) * fade);
    c.beginPath(); c.arc(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6, 1.3 + tw * 1.1, 0, Math.PI * 2); c.fill();
  }
}

// 光の輪：どこまで届くかが見えるように、縁をうっすら描く
function drawRings(c) {
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const b of G.bursts) {
    const k = Math.min(1, b.t / b.grow);
    const r = b.R * easeOut(k);
    const end = burstLife(b.shape, b.grow);
    const a = b.t < end ? 0.22 : Math.max(0, 0.22 - (b.t - end) * 0.6);
    const rgb = COLORS[b.color].rgb;
    const tri = b.shape && b.shape.tri; // ススキは丸い輪を出さない
    if (!tri) {
    const g = c.createRadialGradient(b.x, b.y, r * 0.2, b.x, b.y, r);
    g.addColorStop(0, rgba(rgb, 0));
    g.addColorStop(0.85, rgba(rgb, a * 0.18));
    g.addColorStop(1, rgba(rgb, a * 0.5));
    c.fillStyle = g;
    c.beginPath(); c.arc(b.x, b.y, r, 0, Math.PI * 2); c.fill();
    // ふちをくっきり：花火が重なっても、どの色の輪かが分かるように。同じ色で育った輪ほど太い。
    // 広がっている間だけ出し、広がりきったらすぐ消す（残ると目立ちすぎる）
    const edge = Math.max(0, 1 - Math.max(0, b.t - b.grow) / 0.12);
    if (edge > 0) {
      c.strokeStyle = rgba(rgb, 0.57 * edge);
      c.lineWidth = 1 + (b.mult - 1) * 2.2;
      c.beginPath(); c.arc(b.x, b.y, r, 0, Math.PI * 2); c.stroke();
    }
    }
    // 形のある花火：届く範囲をうっすら描く
    if (b.shape) {
      const sh = b.shape;
      c.fillStyle = rgba(rgb, a * 0.16);
      c.strokeStyle = rgba(rgb, a * 0.6);
      c.lineWidth = 1.5;
      const rs = reachAt(b.R, sh, b.grow, b.t).r; // 火の粉の広がりに合わせる
      if (sh.tri) {
        c.beginPath(); shapeOutline(c, b.x, b.y, rs, sh, b.rot); c.fill();
      } else if (sh.inner) {
        starPath(c, b.x, b.y, rs * sh.len, rs * sh.inner, b.rot); c.fill(); c.stroke();
      } else if (sh.drop) {
        const q = reachAt(b.R, sh, b.grow, b.t); // いまの広がりと、垂れた長さ
        c.beginPath(); shapeOutline(c, b.x, b.y, q.r, sh, 0, q.dv); c.fill();
      }
    }
  }
  c.restore();
}

function drawShells(c) {
  c.save();
  c.globalCompositeOperation = "lighter";
  for (const s of G.shells) {
    if (s.wait > 0) continue; // まだ筒の中
    const rgb = COLORS[s.color].rgb;
    s.trail.forEach((p, i) => {
      const a = (i + 1) / s.trail.length;
      c.fillStyle = rgba([255, 200, 140], a * 0.45);
      c.beginPath(); c.arc(p.x + Math.sin(i * 1.7 + G.t * 30) * 0.8, p.y, 0.8 + a * 1.8, 0, Math.PI * 2); c.fill();
    });
    if (s.dark !== undefined) continue; // 消えている間は何も見せない
    // 玉：てっぺんが近づくほど色が強くなる
    const near = Math.min(1, s.age / Math.max(0.1, s.age + s.vy / -GRAVITY));
    c.fillStyle = rgba([255, 230, 200], 0.9);
    c.beginPath(); c.arc(s.x, s.y, 2.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = rgba(rgb, 0.25 + near * 0.5);
    c.beginPath(); c.arc(s.x, s.y, 5 + near * 3, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}


// 次に狙いを決める玉（決めた数だけ先の玉）
const aimColor = () => G.queue[G.plans ? G.plans.length : 0];

// 引っ張っている間：てっぺんまでの点線と、開く大きさの輪
function drawAim(c) {
  if (!aim.on || busy() || G.rise || G.fired || aimColor() === undefined) return;
  const ap = apexOf(aim.angle, aim.power);
  const color = COLORS[aimColor()].rgb;
  c.save();
  c.fillStyle = "rgba(255,240,220,.75)";
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const t = ap.t * i / steps;
    const x = LAUNCH.x + ap.vx * t, y = LAUNCH.y + ap.vy * t + 0.5 * GRAVITY * t * t;
    c.beginPath(); c.arc(x, y, 1.6, 0, Math.PI * 2); c.fill();
  }
  c.setLineDash([4, 6]);
  c.strokeStyle = rgba(color, 0.8);
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(ap.x, ap.y, G.p.ring, 0, Math.PI * 2); c.stroke();
  // 輪にふれる玉が開いたときの輪も、うすい点線で見せる（同じ色なら育った大きさで。うすさは同じ）
  for (const o of G.orbs) {
    const t = ORB_TYPES[o.type];
    if (o.hits + 1 < t.hits || !shapeHit(ap.x, ap.y, G.p.ring, null, 0, o.x, o.y, t.r)) continue;
    const same = o.color === aimColor();
    const r = G.p.ring * t.ring * (same ? SAME_COLOR_GROW : 1), rgb = COLORS[o.color].rgb;
    c.strokeStyle = rgba(rgb, 0.35);
    c.lineWidth = 1;
    c.setLineDash([3, 6]);
    c.beginPath();
    shapeOutline(c, o.x, o.y, r, SHAPES[o.type], o.rot || 0);
    c.stroke();
  }
  c.restore();
}

// 開いたときに届く範囲のふち（丸い輪、または形のある開き方）
function shapeOutline(c, x, y, r, sh, rot, fall) {
  if (!sh) { c.arc(x, y, r, 0, Math.PI * 2); return; }
  if (sh.tri) { // ススキ：玉から rot の向きへのびる三角形
    const L = r * sh.len, w = L * Math.tan(sh.hw), cx = Math.cos(rot), cy = Math.sin(rot);
    c.moveTo(x, y);
    c.lineTo(x + cx * L - cy * w, y + cy * L + cx * w);
    c.lineTo(x + cx * L + cy * w, y + cy * L - cx * w);
    c.closePath();
  } else if (sh.inner) starPath(c, x, y, r * sh.len, r * sh.inner, rot);
  else if (sh.drop) { // 丸い輪を下へ垂れた長さぶん引きのばしたカプセル（省くと、最後に届く範囲）
    const rr = fall === undefined ? r * SHIDARE_SPREAD : r, f = fall === undefined ? SHIDARE_FALL : fall;
    c.arc(x, y, rr, Math.PI, Math.PI * 2); c.lineTo(x + rr, y + f); c.arc(x, y + f, rr, 0, Math.PI); c.closePath();
  }
}

function drawLauncher(c) {
  const { x, y } = LAUNCH;
  const pull = aim.on ? aim.power : 0;
  c.save();
  c.translate(x, y);
  c.rotate(aim.on ? aim.angle : 0);
  // 筒（引くほど縮む）
  const h = 34 - pull * 10;
  c.fillStyle = "#2b2140";
  c.fillRect(-9, -h + 18, 18, h);
  c.fillStyle = "#4a3a6a";
  c.fillRect(-11, -h + 16, 22, 5);
  if (G.queue.length && aimColor() !== undefined && !G.fired) {
    const rgb = COLORS[aimColor()].rgb;
    c.globalCompositeOperation = "lighter";
    const g = c.createRadialGradient(0, -h + 14, 0, 0, -h + 14, 18 + pull * 10);
    g.addColorStop(0, rgba(rgb, 0.9)); g.addColorStop(1, rgba(rgb, 0));
    c.fillStyle = g;
    c.beginPath(); c.arc(0, -h + 14, 18 + pull * 10, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

function drawHud(c) {
  c.save();
  c.font = `700 13px ${FONT_HUD}`;
  c.fillStyle = "rgba(230,220,255,.75)";
  c.textAlign = "left";
  c.fillText(programShort(G.stage), 16, 26);
  c.textAlign = "right";
  c.font = `700 22px ${FONT_HUD}`;
  c.fillStyle = "#fff4dc";
  c.fillText(G.score.toLocaleString(), W - 16, 30);
  // 目標：開いた数のゲージ
  const x0 = 16, y0 = 44, w = W - 32;
  c.fillStyle = "rgba(255,255,255,.1)";
  c.fillRect(x0, y0, w, 6);
  const f = Math.min(1, G.popped / G.target);
  const g = c.createLinearGradient(x0, 0, x0 + w, 0);
  g.addColorStop(0, "#ff8a6a"); g.addColorStop(1, "#ffd76a");
  c.fillStyle = g;
  c.fillRect(x0, y0, w * f, 6);
  c.textAlign = "left";
  c.font = `500 12px ${FONT_HUD}`;
  c.fillStyle = "rgba(230,220,255,.8)";
  c.fillText(G.reached ? `目標達成　満開まで あと${G.orbs.length}` : `目標 ${Math.min(G.popped, G.target)} / ${G.target}`, x0, y0 + 22);
  // シードは出さない（シードで遊ぶ機能は、いまは隠してある：SHOW_SEED）
  if (SHOW_SEED) {
    c.textAlign = "left";
    c.font = `500 10px ${FONT_HUD}`;
    c.fillStyle = "rgba(230,220,255,.45)";
    c.fillText(`${G.practice ? "練習　" : ""}シード ${G.seed}`, x0, y0 + 38);
  }
  c.restore();
}

// 集中タイム：まわりが青く沈み、時間がゆっくり流れているように見せる。のこりが減るほど、ふちが狭まる
function drawFocus(c) {
  if (!G.focus || G.fired) return;
  const k = Math.max(0, Math.min(1, G.focus.t / FOCUS_TIME));
  const inner = 180 + 120 * k;
  const g = c.createRadialGradient(W / 2, H * 0.42, inner, W / 2, H * 0.42, 520);
  g.addColorStop(0, "rgba(20,40,110,0)");
  g.addColorStop(1, `rgba(20,40,110,${0.32 + (1 - k) * 0.12})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

// 集中タイムののこり秒数：夜空の奥に、薄く大きく出す（5秒を切ると赤く脈打つ）
function drawFocusCount(c) {
  if (!G.focus || G.fired) return;
  const left = Math.max(0, Math.ceil(G.focus.t)), hurry = G.focus.t <= 5;
  const frac = G.focus.t - Math.floor(G.focus.t); // 1秒ごとに、少し大きく出てから落ちつく
  c.save();
  c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `400 ${Math.round(230 * (1 + 0.06 * frac))}px ${FONT_BIG}`;
  c.fillStyle = hurry ? `rgba(255,120,110,${0.12 + 0.06 * frac})` : "rgba(170,195,255,.065)";
  c.fillText(String(left), W / 2, 330);
  c.restore();
}

// お手本：答えの場所に印をつけてから、そこへ1発打ち上げて見せる
function drawReplay(c) {
  const r = G.replay, a = G.snap.answer;
  if (!r) return;
  c.save();
  c.textAlign = "center";
  c.font = `400 30px ${FONT_BIG}`;
  c.shadowColor = "rgba(255,220,160,.8)"; c.shadowBlur = 14;
  c.fillStyle = "#ffe9c4";
  c.fillText("お手本", W / 2, 40);
  c.shadowBlur = 0;
  c.font = `500 12px ${FONT_HUD}`;
  c.fillStyle = "rgba(230,220,255,.85)";
  c.fillText(a.n >= G.total ? "ここから火をつければ、全部つながりました" : "ここから火をつけるのが、いちばんつながりました", W / 2, 62);
  if (!G.fired) {
    const p = 1 + Math.sin(r.t * 6) * 0.08;
    c.strokeStyle = "rgba(255,236,190,.95)"; c.lineWidth = 2.5;
    c.setLineDash([6, 5]);
    c.beginPath(); c.arc(a.x, a.y, 22 * p, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
  }
  c.restore();
}

function drawTexts(c) {
  c.save();
  c.textAlign = "center";
  for (const t of G.texts) {
    const a = Math.min(1, t.life / t.max * 2);
    const big = t.size >= 20;
    c.font = big ? `400 ${t.size}px ${FONT_BIG}` : `700 ${t.size}px ${FONT_HUD}`;
    c.shadowColor = rgba(t.rgb, 0.8);
    c.shadowBlur = big ? 16 : 6;
    if (!big) { c.lineWidth = 3; c.strokeStyle = `rgba(6,6,20,${a * 0.8})`; c.strokeText(t.s, t.x, t.y); }
    c.fillStyle = rgba(t.rgb, a);
    c.fillText(t.s, t.x, t.y);
  }
  c.restore();
}

// 筆文字のハンコ：大きく叩きつけて、少しふるえて、すっと消える
function drawStamps(c, back) {
  for (const st of G.stamps) {
    if (!!st.back !== back) continue;
    const t = st.t;
    const inT = 0.14;
    const scale = t < inT ? 2.4 - 1.5 * (t / inT) : t < inT + 0.1 ? 0.9 + 0.1 * ((t - inT) / 0.1) : 1;
    const a = t < inT ? t / inT : t > st.life - 0.4 ? Math.max(0, (st.life - t) / 0.4) : 1;
    c.save();
    c.translate(st.x, st.y);
    c.rotate(st.rot);
    c.scale(scale, scale);
    c.globalAlpha = a;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `400 ${st.size}px ${FONT_BIG}`;
    c.lineJoin = "round";
    c.shadowColor = rgba(st.rgb, 0.9);
    c.shadowBlur = 26;
    c.lineWidth = st.size * 0.12;
    c.strokeStyle = "rgba(10,8,24,.85)";
    c.strokeText(st.s, 0, 0);
    c.fillStyle = rgba(st.rgb, 1);
    c.fillText(st.s, 0, 0);
    if (st.sub) {
      c.shadowBlur = 10;
      c.font = `400 ${st.size * 0.36}px ${FONT_BIG}`;
      c.lineWidth = 4;
      const sx = -st.size * 1.25, sy = -st.size * 0.72; // 左上に添える
      c.strokeText(st.sub, sx, sy);
      c.fillStyle = "#fff6e6";
      c.fillText(st.sub, sx, sy);
    }
    c.restore();
  }
}

// 演目の切り替え：前の演目の煙がたちこめて空をおおい、風で流れて晴れていく
const SMOKE = Array.from({ length: 16 }, (_, i) => ({ x: (i * 67) % 460 - 30, y: 60 + (i * 137) % 560, r: 90 + (i * 53) % 70, v: 10 + (i * 7) % 14 }));
function drawCurtain(c) {
  if (!G.trans) return;
  const e = x => x * x * (3 - 2 * x);
  const k = G.trans.out ? e(Math.min(1, G.trans.t / TRANS_OUT)) : 1 - e(Math.min(1, G.trans.t / TRANS_IN));
  if (k <= 0) return;
  c.save();
  c.fillStyle = `rgba(10,8,20,${k})`;
  c.fillRect(-20, -20, W + 40, H + 40);
  // 煙のかたまり：晴れるときは風下へ流れていく
  const drift = G.trans.out ? 0 : (1 - k) * 160;
  for (const s of SMOKE) {
    const x = s.x + drift + Math.sin(G.t * 0.4 + s.y) * 8, y = s.y - (1 - k) * 20;
    const g = c.createRadialGradient(x, y, 0, x, y, s.r);
    g.addColorStop(0, `rgba(70,62,92,${0.55 * k})`);
    g.addColorStop(1, "rgba(70,62,92,0)");
    c.fillStyle = g;
    c.fillRect(x - s.r, y - s.r, s.r * 2, s.r * 2);
  }
  c.restore();
}
