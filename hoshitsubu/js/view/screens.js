"use strict";
// 画面の切り替え：タイトル、プレイ開始、ゲームオーバー、リザルト

const overlays = ["title", "result", "cardpick", "tut", "fail", "viewer", "rank"];
function only(id) { for (const o of overlays) $(o).hidden = o !== id; }

// 小さなキャンバスに主人公を描き続ける（タイトルとリザルト）
const miniHeroes = [];
function miniHero(id, anim, spin) { const c = $(id), m = { c, x: c.getContext("2d"), anim, spin, t: 0, on: false }; miniHeroes.push(m); return m; }

// 起動アニメ（タイトルを最初に出すときだけ）：流れ星が飛んできて星が生まれ、ロゴが1文字ずつ弾み、ボタンが下から出る
function titleIntro(hero) {
  const t = $("title"), logo = t.querySelector(".logo");
  if (!logo.dataset.split) { // ロゴを1文字ずつに分ける
    let i = 0;
    const wrap = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) { const f = document.createDocumentFragment(); for (const ch of n.textContent) { const s = document.createElement("i"); s.className = "ch"; s.style.setProperty("--i", i++); s.textContent = ch; f.appendChild(s); } n.replaceWith(f); }
      else wrap(n);
    });
    wrap(logo); logo.dataset.split = "1";
  }
  const hc = $("titleHero"), r = hc.getBoundingClientRect(), tr = t.getBoundingClientRect();
  t.style.setProperty("--hx", r.left - tr.left + r.width / 2 + "px"); t.style.setProperty("--hy", r.top - tr.top + r.height / 2 + "px");
  t.classList.remove("intro"); void t.offsetWidth; t.classList.add("intro");
  hero.anim = "idle";
  sfx.whoosh();
  setTimeout(() => { sfx.kyupin(); kyupin(); }, 540);
  setTimeout(() => { hero.anim = "joy"; hero.t = 0; sfx.chord(true); }, 1200);
  setTimeout(() => { hero.anim = "idle"; }, 2500);
  setTimeout(() => t.classList.remove("intro"), 3650);
}
// キュピーン：クシャッと丸めた紙を広げるように、折れ目のあるギザギザの光が数コマで開く（12コマ/秒）
// 各コマ = [開き具合, しわ, 回転（度）]。丸まった玉 → 半びらき → 開ききって少しはみ出す → ゆらぎながら止まる → しぼむ
// 開きながら時計回りに30度ほど回る
const KYUPIN_FRAMES = [[.16, 1, 0], [.45, .75, 9], [1.1, .35, 18], [.94, .2, 24], [1, .14, 28], [1.02, .14, 30], [.62, .3, 31], [.28, .6, 32]];
function kyupinDraw(f) {
  const c = $("kyupin"), x = c.getContext("2d"), S = c.width, C = S / 2;
  x.clearRect(0, 0, S, S);
  if (f >= KYUPIN_FRAMES.length) return false;
  const [open, crumple, rot] = KYUPIN_FRAMES[f], seed = f * 7.3 + 1;
  const rnd = i => { const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); };
  // 頂点：とがった先（上下左右が長く、ななめが中くらい）と、そのあいだのへこみ。しわが強いほど長さと向きが乱れる
  const pts = [], N = 16;
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU - Math.PI / 2 + rot * Math.PI / 180 + (rnd(i) - .5) * .5 * crumple;
    const big = i % 4 === 0 ? 1 : i % 2 === 0 ? .58 : .26;
    const r = C * .94 * open * (big + (rnd(i + 50) - .5) * .5 * crumple);
    pts.push([C + Math.cos(a) * Math.max(8, r), C + Math.sin(a) * Math.max(8, r)]);
  }
  const glow = x.createRadialGradient(C, C, 4, C, C, C * .7 * Math.max(.3, open));
  glow.addColorStop(0, "rgba(255,246,214,.7)"); glow.addColorStop(1, "rgba(255,231,163,0)");
  x.fillStyle = glow; x.fillRect(0, 0, S, S);
  // 折り紙の面：中心から隣どうしの頂点への三角を、2色で交互にぬる（折れ目が見える）
  x.lineJoin = "round";
  for (let i = 0; i < N; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % N];
    x.beginPath(); x.moveTo(C, C); x.lineTo(ax, ay); x.lineTo(bx, by); x.closePath();
    x.fillStyle = i % 2 ? "#ffe7a3" : "#fff6dc"; x.fill();
  }
  // 折れ目の線と、ふちどり
  x.strokeStyle = "rgba(255,170,90,.5)"; x.lineWidth = 2;
  for (let i = 0; i < N; i++) { const [px, py] = pts[i]; x.beginPath(); x.moveTo(C, C); x.lineTo(px, py); x.stroke(); }
  x.beginPath(); pts.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath();
  x.strokeStyle = "#ffae5e"; x.lineWidth = 4; x.stroke();
  // まん中の白い光
  const core = x.createRadialGradient(C, C, 2, C, C, 46 * Math.max(.4, open));
  core.addColorStop(0, "#ffffff"); core.addColorStop(.5, "rgba(255,255,255,.8)"); core.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = core; x.beginPath(); x.arc(C, C, 46 * Math.max(.4, open), 0, TAU); x.fill();
  return true;
}
function kyupin() {
  let f = 0;
  const step = () => { if (kyupinDraw(f++)) setTimeout(step, 1000 / 12); };
  step();
}
function drawMiniHeroes(dt) {
  for (const m of miniHeroes) {
    if (m.c.offsetParent === null) continue;
    m.t += dt;
    // 動きの並び（m.seq = [[動き, 回数], ...]）：回数ぶん流したら次へ。最後の動きはそのまま続ける
    if (m.seq && m.seq.length > 1 && m.t >= atlas.duration("hero", m.seq[0][0]) * m.seq[0][1]) { m.seq.shift(); m.anim = m.seq[0][0]; m.t = 0; }
    const s = m.c.width; m.x.clearRect(0, 0, s, s);
    const glow = m.x.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s * .48); glow.addColorStop(0, "rgba(255,231,163,.45)"); glow.addColorStop(1, "rgba(255,231,163,0)");
    m.x.fillStyle = glow; m.x.fillRect(0, 0, s, s);
    // くるりと回る：横につぶして戻す
    const k = m.spin && m.t < 1.2 ? Math.cos(m.t / 1.2 * TAU * 2) : 1;
    const hr = s * (m.r || .26), lk = m.look && G ? hr / starR() : 0;
    if (lk) drawLook(m.x, s / 2, s / 2, lk, m.t, "back");
    m.x.save(); m.x.translate(s / 2, s / 2); m.x.scale(Math.abs(k) < .08 ? .08 : k, 1);
    // 帽子は胴体に合わせて跳ね、つぶれる（コマの中の胴体の位置と大きさに合わせる）
    const ps = lk && G.hat ? atlas.pose("hero", m.anim, m.t) : null, hp = ps && { dy: ps.y * hr + hatAt(G.hat) * hr * (ps.sy - 1), sx: ps.sx, sy: ps.sy };
    if (ps) drawHat(m.x, G.hat, 0, 0, hr, { layer: "back", ...hp });
    atlas.draw(m.x, "hero", m.anim, m.t, 0, 0, hr);
    if (ps) drawHat(m.x, G.hat, 0, 0, hr, { layer: "front", ...hp });
    m.x.restore();
    if (lk) drawLook(m.x, s / 2, s / 2, lk, m.t, "front");
  }
}

function showTitle() {
  scene = "title"; G = null; releaseInput();
  $("version").textContent = VERSION;
  const best = +store.get(BEST_KEY, 0);
  $("titleBest").textContent = best ? "ベスト " + best.toLocaleString() : "";
  $("rankBtn").hidden = !loadRank().length;   // 記録が1つもないときは出さない
  only("title");
  music.muffle(false);
}

function startGame() {
  newGame(); scene = "play";
  if (DEV.on && DEV.wave > 1) { G.wave = DEV.wave; G.bossCount = Math.floor((DEV.wave - 1) / 5); }
  only(null);
  music.start(); music.muffle(false); music.setBoss(false);
  startWave();
}
function play() {
  sfx.tap();
  if (store.get(TUT_KEY, "") !== "1") startTutorial(startGame);
  else startGame();
}

// 点数を0から数え上げる（はじめは速く、最後はゆっくり）
function countUp(el, to, ms) {
  const t0 = performance.now();
  const step = now => { const k = Math.min(1, (now - t0) / ms), v = Math.round(to * (1 - (1 - k) ** 3)); el.textContent = v.toLocaleString(); if (k < 1) requestAnimationFrame(step); };
  el.textContent = "0"; requestAnimationFrame(step);
}
function gameOver() {
  scene = "result"; releaseInput();
  music.setBoss(false); music.muffle(true);
  const replay = G.replay;   // マイランキングから開いたリザルト（保存しない）
  if (replay) boardShot = null; else snapBoard();
  const best = +store.get(BEST_KEY, 0), isBest = !replay && G.score > best;
  if (isBest) store.set(BEST_KEY, G.score);
  const rank = replay || addRank();
  countUp($("resScore"), G.score, 900);
  $("resBest").textContent = replay ? "マイランキング " + replay + "位" : isBest ? "ベスト更新！" : rank ? "マイランキング " + rank + "位！" : "ベスト " + best.toLocaleString();
  $("resBest").classList.toggle("new", isBest || (!replay && rank === 1));
  $("retryBtn").hidden = !!replay; $("backBtn").hidden = !replay;
  $("resStage").textContent = st().name + "（Lv" + (G.level + 1) + "）";
  { const m = miniHeroes.find(m => m.c.id === "resHero"); if (m) { m.seq = null; m.anim = "idle"; m.spin = false; m.t = 1.2; } }
  const name = $("resName"); name.textContent = ""; name.classList.remove("pop"); $("resTitle").textContent = ""; $("resTitle").classList.remove("pop");
  // 取ったカードが順に並び、重ねた数の多い2枚が光って、星の名前が現れる
  const keys = CARD_KEYS.filter(k => lv(k)).sort((a, b) => CAT_KEYS.indexOf(CARDS[a].cat) - CAT_KEYS.indexOf(CARDS[b].cat)), top = nameKeys();
  const chips = $("resCards"); chips.innerHTML = "";
  keys.forEach((k, i) => { const s = document.createElement("span"); s.textContent = CARDS[k].name + " Lv" + lv(k); s.className = "cat-" + CARDS[k].cat; s.style.animationDelay = (.5 + i * .12) + "s"; chips.appendChild(s); });
  if (!keys.length) chips.innerHTML = "<span>強化なし</span>";
  const delay = 600 + keys.length * 120 + 300, g0 = G;
  setTimeout(() => {
    if (G !== g0 || scene !== "result") return;   // その前にリザルトを閉じた
    [...chips.children].forEach((s, i) => { if (top.includes(keys[i])) s.classList.add("top"); });
    name.textContent = starName(); name.classList.add("pop");
    const ti = starTitle(), te = $("resTitle"); te.textContent = ti.text; te.style.color = ti.cat ? CATS[ti.cat].color : ""; te.classList.add("pop");
    const m = miniHeroes.find(m => m.c.id === "resHero"); if (m) { m.seq = resultJoy(); m.anim = m.seq[0][0]; m.t = 0; m.spin = joyLevel() >= 4; }
    sfx.chord(true);
  }, delay);
  const rec = [["とどいた波", G.wave], ["倒した大彗星", G.rec.bosses], ["倒した敵", G.rec.kills], ["一度に倒した数", G.rec.bestVolley], ["満杯で放った回数", G.rec.crits]];
  $("resRecs").innerHTML = rec.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("");
  prepareShare();
  only("result");
}

// マイランキング：よかったプレイを点数の高い順に5件まで残す。タップでそのときのリザルトをもう一度見られる
// 名前・二つ名・帽子・星の絵は、残したカードと節目から作り直す
function addRank() {
  const r = { score: G.score, wave: G.wave, level: G.level, picks: { ...G.picks }, mile: JSON.parse(JSON.stringify(G.mile)), awake: { ...G.awake },
    rec: { ...G.rec }, bossCount: G.bossCount, hat: G.hat, at: Date.now() };
  const a = loadRank(); a.push(r); a.sort((x, y) => y.score - x.score || x.at - y.at);
  const i = a.indexOf(r); if (i >= RANK_N) return 0;
  saveRank(a.slice(0, RANK_N)); return i + 1;
}
function rankGame(r) {
  newGame();
  Object.assign(G, { score: r.score, wave: r.wave, level: r.level, picks: r.picks, mile: r.mile || {}, awake: r.awake || G.awake, rec: { ...G.rec, ...r.rec }, bossCount: r.bossCount || 0, hat: r.hat || null, hatT: 1 });
  G.iceLeft = iceN();
}
// ランキングの行の絵：そのときの帽子をかぶった星（帽子がなければ星だけ）
function rankFace(c, hat) {
  const x = c.getContext("2d"), S = c.width, r = S * .3, cy = S * .64;
  x.clearRect(0, 0, S, S);
  if (hat) drawHat(x, hat, S / 2, cy, r, { layer: "back" });
  atlas.draw(x, "hero", "idle", 0, S / 2, cy, r);
  if (hat) drawHat(x, hat, S / 2, cy, r, { layer: "front" });
}
function openRank() {
  sfx.tap(); scene = "title"; G = null;
  const list = $("rankList"); list.innerHTML = "";
  loadRank().forEach((r, i) => {
    rankGame(r);
    const t = starTitle(), d = new Date(r.at), li = document.createElement("li");
    li.className = "rk" + (i === 0 ? " first" : ""); li.tabIndex = 0; li.setAttribute("role", "button");
    li.innerHTML = `<span class="no">${i + 1}</span><canvas class="face" width="120" height="120" aria-hidden="true"></canvas>` +
      `<span class="who"><b class="sc">${r.score.toLocaleString()}</b><span class="nm">${t.text ? `<i style="color:${t.cat ? CATS[t.cat].color : "#ffe7a3"}">${t.text}</i>` : ""}${starName()}</span>` +
      `<span class="sub">第${r.wave}波・${d.getMonth() + 1}/${d.getDate()}</span></span>`;
    const open = () => { sfx.tap(); rankGame(r); G.replay = i + 1; gameOver(); };
    li.onclick = open; li.onkeydown = e => { if (e.key === "Enter") open(); };
    list.appendChild(li);
    rankFace(li.querySelector(".face"), r.hat);
  });
  G = null;
  only("rank");
}

// テスト用：タイトルに「はじめる波」と無敵を出す（プレビュー版だけ）
function buildDevPanel() {
  if (!DEV.on) return;
  const d = document.createElement("details"); d.className = "dev";
  d.innerHTML = `<summary>テスト</summary><label>はじめる波 <output id="devWaveOut">1</output><input id="devWave" type="range" min="1" max="20" value="1"></label><label class="chk"><input id="devInv" type="checkbox"> 無敵</label>` +
    `<label>経験値 <select id="devXp"><option value="1">×1</option><option value="3">×3</option><option value="10">×10</option></select></label><label class="chk"><input id="devShort" type="checkbox"> 波を短く（8秒）</label>` +
    `<label>波の終わりにレベルアップ <select id="devLvup"><option value="0">なし</option><option value="1">+1</option><option value="3">+3</option></select></label>`;
  // 効果音の聞きくらべ
  const se = document.createElement("div"); se.className = "dev-se"; se.textContent = "効果音 ";
  [["レベルアップ", "levelUp"], ["大彗星撃破", "bossDown"], ["名前ふっとぶ", "knock"], ["超新星溜まり", "novaReady"], ["きらきら和音", "chord"]].forEach(([l, k]) => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = l; b.onclick = () => sfx[k](true); se.appendChild(b);
  });
  d.appendChild(se);
  $("title").appendChild(d);
  const sync = () => { DEV.wave = +$("devWave").value; DEV.inv = $("devInv").checked; DEV.xp = +$("devXp").value; DEV.short = $("devShort").checked; DEV.lvup = +$("devLvup").value; $("devWaveOut").textContent = DEV.wave + "波" + (DEV.wave % 5 === 0 ? "（ボス）" : ""); };
  d.addEventListener("input", sync); d.addEventListener("change", sync);
}

// リザルトの星の喜び方：とどいた波（4波ごとに1段、最大3）＋名前の長さ（つながったカードの数、最大3）で0〜6段
function joyLevel() { return clamp(Math.floor((G.wave - 1) / 4), 0, 3) + nameKeys().length; }
function resultJoy() {
  const j = joyLevel();
  if (j <= 0) return [["pinch", 1]];                        // すぐ負けた：しょんぼり
  if (j <= 2) return [["idle", 1]];                         // ふつう
  if (j === 3) return [["joy", 1], ["idle", 1]];            // ちょっとうれしい：1回跳ねる
  if (j === 4) return [["joy", 2], ["idle", 1]];            // うれしい：くるっと回って2回跳ねる
  if (j === 5) return [["levelup", 1], ["joy", 3], ["idle", 1]];
  return [["levelup", 1], ["joy", 1]];                      // 大満足：ずっと跳ねている
}
