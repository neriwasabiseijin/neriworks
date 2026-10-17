"use strict";
// あそびかた：実際のゲームの仕組みで、指のお手本が動かして見せる。場面ごとに「つぎへ」を押すまでくり返す。
// 初回の「あそぶ」で自動再生し、タイトルの「あそびかた」からいつでも見られる。スキップ可。

// 弾を星へ向けて流し込む（チュートリアルで確実に吸いつくところを見せる）
function tutStream(t, every, kind = "normal") {
  const k = Math.floor(t / every);
  if (k === G.tutK) return;
  G.tutK = k;
  // 敵がいればその敵が撃つ（撃つ動きも見せる）。いなければ上から流す
  const live = G.enemies.filter(e => !e.dead);
  if (live.length) { const e = live[k % live.length]; fire(e.x, e.y, aim(e), 210, kind); shoot(e); }
  else { const x = rand(60, W - 60), y = 200; fire(x, y, Math.atan2(G.p.y - y, G.p.x - x), 210, kind); }
}

const TUT_SCENES = [
  {
    cap: "あなたは 生まれたての星",
    sub: "宇宙の果てをめざして、一等星になろう",
    len: 3.8, finger: false,
    setup() { heroOnce("joy"); },
    script(t) { return { held: false, x: W / 2, y: H * .78 - clamp(t / 3, 0, 1) * 90 }; },
    draw(t) { // 宇宙の果て：画面の上のほうで、金色の光がゆっくり脈打つ
      const k = .55 + .2 * Math.sin(t * 2.4), gr = g.createRadialGradient(W / 2, 150, 4, W / 2, 150, 120);
      gr.addColorStop(0, `rgba(255,246,214,${k + .3})`); gr.addColorStop(.25, `rgba(255,231,163,${k * .5})`); gr.addColorStop(1, "rgba(255,231,163,0)");
      g.fillStyle = gr; g.fillRect(0, 0, W, 330);
      // まん中に小さなきらめき
      g.save(); g.translate(W / 2, 150); g.rotate(t * .4); g.fillStyle = "#fff6d6"; const r = 13 + Math.sin(t * 2.4) * 3;
      g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? r * .28 : r; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); g.restore();
    },
  },
  {
    cap: "敵は 群れでやってくる",
    sub: "ひと群れが1波。波をこえるほど 果てに近づく",
    len: 3.8, finger: false,
    setup() { G.tutK = 0; },
    script() { return { held: false, x: W / 2, y: H * .7 }; },
    tick(t) { // 編隊が2つ、上から入ってくる（撃たない）
      const wave = (xs, y) => xs.forEach(x => spawnEnemy("chibi", { x, y: -20 - Math.random() * 20, goal: { x, y }, fire: 99 }));
      if (G.tutK === 0) { G.tutK = 1; wave([90, 130, 170], 210); }
      if (G.tutK === 1 && t > 1.1) { G.tutK = 2; wave([200, 240, 280], 290); }
    },
  },
  {
    cap: "5波ごとに 大彗星がくる",
    sub: "倒すと、もっと先へ進める",
    len: 3.2, finger: false,
    setup() {},
    script() { return { held: false, x: W / 2, y: H * .9 }; },
    draw(t) { drawNestAt(W / 2, -60 + clamp(t / 1.2, 0, 1) * 320, 1.3); },
  },
  {
    cap: "押すと、弾が吸いつく",
    sub: "どこを押してもOK。指を動かすと星も動く",
    len: 4.6,
    setup() { G.tutK = -1; },
    script(t) { return { held: t > .2, x: W / 2 + Math.sin(t * 1.4) * 50, y: H * .68 }; },
    tick(t) { if (t < 3.6) tutStream(t, .22); },
  },
  {
    cap: "はなすと、流星群",
    sub: "溜めるほど強い",
    len: 3.6,
    setup() {
      for (let i = 0; i < 20; i++) G.sats.push({ kind: i % 7 === 3 ? "spark" : "normal", color: SAT_COLORS[i % 5], x: G.p.x, y: G.p.y });
      [[90, 250], [160, 225], [230, 235], [290, 265]].forEach(([x, y]) => spawnEnemy("chibi", { x, y, goal: { x, y }, fire: 99 }));
    },
    script(t) { return { held: t < 1.2, x: W / 2, y: H * .7 }; },
  },
  {
    cap: "赤いとげ弾は、よける",
    sub: "とげ弾だけは吸いつかない",
    len: 3.4,
    setup() { for (let i = 0; i < 3; i++) fire(W / 2 + (i - 1) * 14, 200 - i * 36, Math.PI / 2, 160, "thorn"); },
    script(t) { return { held: true, x: W / 2 + clamp((t - .5) * 220, 0, 90), y: H * .7 }; },
  },
  {
    cap: "当たると 星のいのちが減る",
    sub: "ぜんぶなくなると おしまい",
    len: 3.6, finger: false,
    setup() { G.tutHit = 0; fire(W / 2, 170, Math.PI / 2, 190, "thorn"); },
    script() { return { held: false, x: W / 2, y: H * .62 }; },
    tick(t) {
      // チュートリアルでは当たり判定で減らないので、ここで当たったことにする
      for (const b of G.bullets) if (!b.dead && dist2(b, G.p) < (hitR() + 6) ** 2) { b.dead = true; G.tutHit = t; heroOnce("hit"); shake(6); sfx.hit(); }
    },
    draw(t) { // 星のいのち（ゲーム中は右上と同じ絵）を大きめに出し、当たった瞬間に1つが赤くふくらんで消える
      const hit = G.tutHit > 0, k = hit ? Math.max(0, 1 - (t - G.tutHit) / 1.2) : 0, n = hit ? 2 : 3;
      g.save(); g.translate(W / 2, 300); g.scale(1.6, 1.6);
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 24;
        if (i === n && k > 0) { drawLife(x, 0, false, 0); drawLife(x, 0, false, k); }
        else drawLife(x, 0, i < n, 0);
      }
      g.restore();
    },
  },
  {
    cap: "かけらでレベルアップ",
    sub: "倒した敵が落とす。押していると吸い寄せる",
    len: 3.8,
    setup() {
      G.tutXp = 0; G.tutLv = 0;
      [[120, 330], [240, 320], [180, 290], [150, 380], [220, 370]].forEach(([x, y]) => G.debris.push({ x, y, vx: 0, vy: 0, life: 6, sp: 0, rot: rand(0, TAU) }));
    },
    script(t) { return { held: t > .5, x: W / 2, y: t < .5 ? H * .72 : H * .72 - clamp((t - .5) * 160, 0, 120) }; },
    tick(t) { if (G.tutXp >= 5 && !G.tutLv) { G.tutLv = 1; heroOnce("levelup"); floatText(G.p.x, G.p.y - 34, "レベルアップ！", "#8ff0d2", 1.4); sfx.levelUp(); } },
  },
  {
    cap: "レベルアップで 強化カード",
    sub: "2枚から1枚えらんで、強くなる",
    len: 3.6, finger: false,
    setup() {},
    script() { return { held: false, x: W / 2, y: H * .9 }; },
    tick(t) { if (t > 1.9 && !G.tutGot) { G.tutGot = 1; heroOnce("joy"); floatText(G.p.x, G.p.y - 40, "引力 Lv1", "#8ff0d2", 1.4); sfx.chord(true); } },
    draw: t => drawCardDemo(t, false),
  },
  {
    cap: "のこった1枚の技は 大彗星のものに",
    sub: "カードの下に 大彗星の技が書いてある",
    len: 4.6, finger: false,
    setup() {},
    script() { return { held: false, x: W / 2, y: H * .9 }; },
    draw: t => drawCardDemo(t, true),
  },
];

const T = { on: false, i: 0, t: 0, after: null };

function startTutorial(after) {
  T.on = true; T.after = after; T.i = -1;
  only("tut");
  $("tutDots").innerHTML = TUT_SCENES.map(() => "<i></i>").join("");
  music.start(); music.muffle(false);
  nextScene();
}
function nextScene() {
  T.i++;
  if (T.i >= TUT_SCENES.length) return endTutorial();
  [...$("tutDots").children].forEach((d, i) => d.classList.toggle("on", i === T.i));
  $("tutCap").textContent = TUT_SCENES[T.i].cap;
  $("tutSub").textContent = TUT_SCENES[T.i].sub;
  playScene();
}
// 今の場面を最初から再生する
function playScene() {
  newGame(); scene = "tutorial"; held = false;
  G.waveState = "tut"; G.level = 2;
  T.t = 0;
  TUT_SCENES[T.i].setup();
}
function endTutorial() {
  T.on = false; store.set(TUT_KEY, "1"); held = false;
  const after = T.after; T.after = null;
  if (after) after(); else showTitle();
}
function updateTutorial(dt) {
  const sc = TUT_SCENES[T.i]; T.t += dt;
  if (T.t > sc.len) { playScene(); return; }
  const s = sc.script(T.t), p = G.p;
  if (held && !s.held) releaseAll();
  held = s.held;
  // お手本の指が動かした分だけ、星が動く（集めるほど重い）
  const k = Math.min(1, dt * 6) * (held ? weightMul() * 1.6 : 1);
  const dx = (s.x - p.x) * k, dy = (s.y - p.y) * k;
  p.x += dx; p.y += dy; p.mvx += dx; p.mvy += dy;
  if (sc.tick) sc.tick(T.t);
}
// 指のお手本：星の少し下を親指で押している（相対移動なので、指は星に重ならない）
function drawFinger() {
  const sc = TUT_SCENES[T.i]; if (sc.draw) sc.draw(T.t);
  if (sc.finger === false) return;
  const fx = G.p.x + 24, fy = G.p.y + 92;
  // 押す・はなすをなめらかに（0＝浮いている、1＝押している）
  T.press = (T.press || 0) + ((held ? 1 : 0) - (T.press || 0)) * .35;
  const k = T.press, lift = 1 - k;
  g.save();
  // 押しているところ：ふれた点の波紋
  if (k > .5) {
    g.strokeStyle = `rgba(255,255,255,${.45 * k})`; g.lineWidth = 2;
    g.beginPath(); g.arc(fx, fy, 20 + Math.sin(tNow * 6) * 2, 0, TAU); g.stroke();
    g.fillStyle = `rgba(255,255,255,${.25 * k})`; g.beginPath(); g.arc(fx, fy, 13, 0, TAU); g.fill();
  } else { // 浮いているときは、指の影だけ落ちる
    g.fillStyle = `rgba(20,10,40,${.25 * lift})`; g.beginPath(); g.ellipse(fx, fy, 13, 9, -.5, 0, TAU); g.fill();
  }
  drawThumb(g, fx + 7 * lift, fy - 12 * lift, 1 + .06 * lift, k);
  g.restore();
}
// 親指のイラスト：指先 (x, y) が押す点。右下から伸びて、爪がこちらを向く
function drawThumb(c, x, y, s, press) {
  c.save(); c.translate(x, y); c.rotate(-.55); c.scale(s, s);
  c.globalAlpha = .96;
  const skin = c.createLinearGradient(-24, 0, 24, 0);
  skin.addColorStop(0, "#f9cdbd"); skin.addColorStop(.45, "#ffe9dc"); skin.addColorStop(1, "#f6c2b2");
  // 指のかたち：先が丸く、根元に向かって少し太る
  const body = () => {
    c.beginPath();
    c.moveTo(-19, 10);
    c.bezierCurveTo(-19, -16, 19, -16, 19, 10);
    c.bezierCurveTo(21, 40, 26, 80, 29, 140);
    c.lineTo(-29, 140);
    c.bezierCurveTo(-26, 80, -21, 40, -19, 10);
    c.closePath();
  };
  body(); c.fillStyle = skin; c.fill();
  // ふちどり：先端は細く、側面ほどしっかり
  c.strokeStyle = "rgba(176,110,112,.75)"; c.lineCap = "round";
  c.lineWidth = 1.2; c.beginPath(); c.moveTo(-18, 3); c.bezierCurveTo(-16, -15, 16, -15, 18, 3); c.stroke();
  c.lineWidth = 2; c.beginPath(); c.moveTo(-19, 12); c.bezierCurveTo(-21, 40, -26, 80, -29, 140); c.stroke();
  c.beginPath(); c.moveTo(19, 12); c.bezierCurveTo(21, 40, 26, 80, 29, 140); c.stroke();
  // 押しているときは指先がほんのり赤い
  if (press > .05) {
    const tip = c.createRadialGradient(0, -2, 1, 0, -2, 20);
    tip.addColorStop(0, `rgba(255,150,160,${.45 * press})`); tip.addColorStop(1, "rgba(255,150,160,0)");
    c.fillStyle = tip; c.beginPath(); c.arc(0, -2, 20, 0, TAU); c.fill();
  }
  // 爪
  c.beginPath(); c.moveTo(-12, 24); c.bezierCurveTo(-14, 2, -8, -5, 0, -5); c.bezierCurveTo(8, -5, 14, 2, 12, 24);
  c.quadraticCurveTo(0, 28, -12, 24); c.closePath();
  c.fillStyle = "#fff4f1"; c.fill();
  c.strokeStyle = "rgba(230,150,160,.8)"; c.lineWidth = 1.2; c.stroke();
  c.fillStyle = "rgba(255,255,255,.9)"; c.beginPath(); c.ellipse(-5, 7, 2.4, 7, -.15, 0, TAU); c.fill();
  // 関節のしわ
  c.strokeStyle = "rgba(190,120,118,.55)"; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-10, 50); c.quadraticCurveTo(0, 55, 10, 50); c.stroke();
  c.beginPath(); c.moveTo(-6, 57); c.quadraticCurveTo(0, 60, 6, 57); c.stroke();
  c.restore();
}
// カードの場面：2枚が配られ、片方が選ばれ、もう片方が裏返って大彗星へ飛ぶ
let nestImg = null;
// 大彗星のシルエットを (x, y) に描く（1回だけ焼いておく）
function drawNestAt(x, y, k) {
  if (!nestImg) { nestImg = document.createElement("canvas"); nestImg.width = 400; nestImg.height = 280; drawNest(nestImg); }
  g.drawImage(nestImg, x - 100 * k, y - 80 * k, 200 * k, 140 * k);
}
// toBoss=false：えらんだ1枚が星に入る（のこりは置いたまま薄く）。true：のこりの1枚が裏返って大彗星へ飛ぶ
function drawCardDemo(t, toBoss) {
  const bx = W / 2, by = 260;
  if (toBoss) drawNestAt(bx, by, 1);
  const card = (x, y, s, flip, label, chosen, alpha = 1) => {
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.scale(s * Math.max(.05, Math.abs(flip)), s);
    const back = flip < 0;
    g.fillStyle = back ? "#2a1440" : "rgba(31,25,66,.95)"; g.strokeStyle = back ? "#6a3fa0" : chosen ? "#ffe7a3" : "#8ff0d2"; g.lineWidth = 3;
    g.beginPath(); g.roundRect(-46, -64, 92, 128, 12); g.fill(); g.stroke();
    if (back) { g.drawImage(cardIcon("speed", "#ff9ecf"), -14, -34, 28, 28); g.fillStyle = "#ff9ecf"; g.font = `${HEAD_W} 15px ${HEAD_FONT}`; g.textAlign = "center"; g.fillText("速い弾", 0, 16); }   // 裏は付いていた技
    if (!back) {
      const k = label === "引力" ? "grav" : "speed";
      g.save(); g.beginPath(); g.roundRect(-46, -64, 92, 128, 12); g.clip(); g.globalAlpha *= .09; g.drawImage(cardIcon(k, "#ffffff"), -20, -10, 84, 84); g.restore();
      g.drawImage(cardIcon(k, "#8ff0d2"), -36, -48, 22, 22);
      g.fillStyle = "#8ff0d2"; g.font = `${HEAD_W} 15px ${HEAD_FONT}`; g.textAlign = "left"; g.fillText(label, -10, -31); g.textAlign = "center"; g.fillStyle = "#b9aee0"; g.font = "500 11px 'Zen Maru Gothic', sans-serif"; g.fillText("あたらしい力 Lv1", 0, -10);
      // 下の段：付いている大彗星の技（本番のカードと同じく、ピンク）
      g.strokeStyle = "rgba(255,158,207,.4)"; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(-36, 14); g.lineTo(36, 14); g.stroke(); g.setLineDash([]);
      g.drawImage(cardIcon(label === "引力" ? "star" : "speed", "#ff9ecf"), -9, 22, 18, 18);
      g.fillStyle = "#ff9ecf"; g.font = `${HEAD_W} 13px ${HEAD_FONT}`; g.fillText(label === "引力" ? "大玉" : "速い弾", 0, 56);
    }
    g.restore();
  };
  const deal = clamp(t / .5, 0, 1), y0 = 400, lx = W / 2 - 60, rx = W / 2 + 60;
  g.textAlign = "center"; g.font = `${HEAD_W} 14px ${HEAD_FONT}`;
  if (!toBoss) {
    // えらんだ「引力」が星へ吸いこまれる
    const go = clamp((t - 1.3) / .6, 0, 1), e = go * go;
    card(rx, y0 + (1 - deal) * 40, 1, 1, "加速", false, t > 1.1 ? .35 : 1);
    if (go < 1) card(lx + (G.p.x - lx) * e, y0 + (1 - deal) * 40 + (G.p.y - y0) * e, (t > 1.1 ? 1.06 : 1) * (1 - e * .8), 1, "引力", t > 1.1);
    if (t > 1.1 && go < 1) { g.fillStyle = "#ffe7a3"; g.fillText("えらぶ", lx, y0 + 90); }
    return;
  }
  const flip = clamp((t - 1.4) / .3, 0, 1), go = clamp((t - 1.9) / .5, 0, 1);
  if (t < 1.1) card(lx, y0 + (1 - deal) * 40, 1, 1, "引力", false);
  else if (t < 1.6) { const e = clamp((t - 1.1) / .5, 0, 1) ** 2; card(lx + (G.p.x - lx) * e, y0 + (G.p.y - y0) * e, 1.06 * (1 - e * .8), 1, "引力", true); }
  // 近づいたところでボッと燃えて、火の玉が大彗星へ吸いこまれる
  const cx = rx + (bx - rx) * .62, cy = y0 + (by - y0) * .62;
  if (go < 1) { const e = go * go * .62; card(rx + (bx - rx) * e / .62 * .62, y0 + (1 - deal) * 40 + (by - y0) * e, 1 - e * .9, Math.cos(flip * Math.PI), "加速", false); }
  const fb = clamp((t - 2.4) / .6, 0, 1);
  if (go >= 1 && fb < 1) {
    const pop = clamp((t - 2.4) / .15, 0, 1), mv = clamp((t - 2.6) / .4, 0, 1) ** 2;
    const fx = cx + (bx - cx) * mv, fy = cy + (by - cy) * mv, r = 30 * (pop < 1 ? pop * 1.3 : 1) * (1 - mv * .75) * (1 + Math.sin(t * 50) * .06);
    drawFlame(g, fx, fy, r * 1.4, t);
  }
  if (t > 1.1 && t < 1.6) { g.fillStyle = "#ffe7a3"; g.fillText("えらぶ", lx, y0 + 90); }
  if (fb >= 1) { g.fillStyle = "#ff9ecf"; g.fillText("速い弾は大彗星のものに", bx, by + 76); }
}
$("tutNext").onclick = () => { sfx.tap(); nextScene(); };
$("tutSkip").onclick = () => { sfx.tap(); endTutorial(); };
