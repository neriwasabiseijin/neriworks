"use strict";
// カードビューワー（テスト用）：カードを並べ、タップで自機が取ったことにする。下に並ぶ大彗星の技はタップで大彗星に持たせる。
// 上半分では本物のゲームを止めずに動かし、自機と大彗星の見た目・名前・攻撃の変わり方を見られる

const VIEW_BOSS_Y = 112, VIEW_HERO_Y = 236;
let viewBoss = {};   // 大彗星に持たせた技：{key: Lv}

function openViewer() {
  sfx.tap();
  newGame(); scene = "play"; G.viewer = true; G.wave = 5; G.bossCount = 1;
  viewBoss = {};
  music.start(); music.muffle(false); music.setBoss(true, 0);
  only("viewer");
  viewerRebuild();
}
function closeViewer() { sfx.tap(); $("viewer").hidden = true; music.setBoss(false); showTitle(); }

// 取ったカードから、自機と大彗星を作り直す
function viewerRebuild() {
  G.level = Object.values(G.picks).reduce((s, n) => s + n, 0);
  G.awake = { power: 0, tech: 0, speed: 0 }; G.lives = 3; checkAwake(true); G.iceLeft = iceN();
  G.p.x = W / 2; G.p.y = VIEW_HERO_Y; G.sats = []; G.shots = []; G.bullets = []; G.novaC = 0;
  G.bossCards = []; for (const k in viewBoss) for (let i = 0; i < viewBoss[k]; i++) G.bossCards.push(k);
  G.stash = []; spawnBoss();
  const b = G.boss; b.ty = VIEW_BOSS_Y; b.y = VIEW_BOSS_Y;
  viewerPanel();
}

// 自機は押したまま弾を集め、満杯か超新星がたまったら放つ。大彗星は倒れないように体力を戻す
function viewerTick(dt) {
  if (!G || !G.viewer || scene !== "play") return;
  if (G.ren) updateRename(dt);
  const p = G.p, v = G.vw || (G.vw = { rest: 0 });
  p.x += (W / 2 + Math.sin(tNow * .6) * 50 - p.x) * Math.min(1, dt * 2); p.y += (VIEW_HERO_Y - p.y) * Math.min(1, dt * 2);
  if (v.rest > 0) { v.rest -= dt; held = false; return; }
  held = true;
  const novaReady = lv("nova") && G.novaC >= 1;
  if ((fillRatio() >= 1 || novaReady || (G.sats.length && G.sats.length >= Math.min(12, capacity()) && !lv("nova"))) && G.sats.length) { releaseAll(); held = false; v.rest = .5; }
  if (G.boss) G.boss.hp = G.boss.hpMax;
}

function viewerPanel() {
  const t = starTitle(), b = G.boss;
  const catCol = t.cat ? CATS[t.cat].color : "#ffe7a3";
  const keys = CARD_KEYS.slice().sort((a, c) => CAT_KEYS.indexOf(CARDS[a].cat) - CAT_KEYS.indexOf(CARDS[c].cat));
  const bossEq = TECH_KEYS.filter(k => viewBoss[k]).map(k => BOSS_TECHS[k].name + "Lv" + viewBoss[k]).join("・") || "なし";
  $("vwHead").innerHTML =
    `<div class="vw-who"><span class="vw-lbl">自機</span><span>${st().name}　Lv${G.level + 1}　いのち${G.lives}</span>` +
    `<span class="vw-title" style="color:${catCol}">${t.text ? "「" + t.text + "」" : ""}</span><b class="vw-name">${starName()}</b></div>` +
    `<div class="vw-who boss"><span class="vw-lbl">大彗星</span><span>体力 ${Math.round(b.hpMax)}　殻 ${Math.round(b.shellMax)}</span><span class="vw-eq">装備：${bossEq}</span></div>`;
  drawCatBar(null, $("vwCat"));
  const box = $("vwCards"); box.innerHTML = "";
  for (const k of keys) {
    const c = CARDS[k], me = lv(k), el = document.createElement("div");
    el.className = "card vw-card cat-" + c.cat; el.setAttribute("role", "button"); el.tabIndex = 0;
    const meTxt = me >= CARD_MAX ? effText([c.me[0], c.me[1], c.me[2]], 0, me, "up") : effText(c.me, me, me + 1, "up");
    el.innerHTML = `<img class="bgico" src="${iconURL(k, "#ffffff")}" alt=""><span class="tag">${CATS[c.cat].name}</span><span class="head"><img class="ico" src="${iconURL(k, CATS[c.cat].color)}" alt=""><b>${c.name}</b></span>` +
      `<span class="lv">自機 Lv${me}${me < CARD_MAX ? " → Lv" + (me + 1) : "（最大）"}</span><span class="me">${meTxt}</span>` +
      `<span class="vw-word"><span class="parts"><i>前<b>${c.word[0]}</b></i><i>中<b>${c.word[3]}</b></i><i>後<b>${c.word[1]}</b></i><br><i>1つだけ<b>${c.word[2]}</b></i></span><span class="hat"><img src="${hatURL(k)}" alt="">${HAT_NAMES[k]}</span></span>` +
      `<span class="vw-btns"><button type="button" class="vw-b vw-me">自機が取る</button></span>`;
    const take = () => {
      if (lv(k) >= CARD_MAX) return; sfx.chord(false); G.picks[k] = lv(k) + 1; G.pickOrder.push(k); checkName(k);
      const before = { ...G.awake }; viewerRebuild();
      for (const c of CAT_KEYS) for (let n = before[c] + 1; n <= G.awake[c]; n++) G.awakeMsgs.push({ c, n });   // 型の目覚めも名乗りで見せる
      if (G.renamed || G.awakeMsgs.length) startRename();
    };
    el.onclick = take;
    box.appendChild(el);
  }
  // 大彗星の技：タップで大彗星に持たせる
  const th = document.createElement("p"); th.className = "vw-hint"; th.textContent = "大彗星の技"; box.appendChild(th);
  for (const k of TECH_KEYS) {
    const t = BOSS_TECHS[k], bl = viewBoss[k] || 0, el = document.createElement("div");
    el.className = "card vw-card vw-tech"; el.setAttribute("role", "button"); el.tabIndex = 0;
    const txt = bl >= CARD_MAX ? effText(t.text, 0, bl, "bad") : effText(t.text, bl, bl + 1, "bad");
    el.innerHTML = `<span class="head"><img class="ico" src="${iconURL(t.icon, "#ff9ecf")}" alt=""><b>${t.name}</b></span><span class="lv">大彗星 Lv${bl}${bl < CARD_MAX ? " → Lv" + (bl + 1) : "（最大）"}</span><span class="boss">${txt}</span>`;
    el.onclick = () => { if (bl >= CARD_MAX) return; sfx.tap(); viewBoss[k] = bl + 1; viewerRebuild(); };
    box.appendChild(el);
  }
}

function setupViewer() {
  if (!DEV.on) return;
  const btn = document.createElement("button"); btn.type = "button"; btn.className = "secondary vw-open"; btn.textContent = "カードビューワー";
  btn.onclick = openViewer;
  document.querySelector("#title .dev").appendChild(btn);
  $("vwReset").onclick = () => { sfx.tap(); G.picks = {}; G.pickOrder = []; G.hat = null; G.hatOld = null; G.ren = null; G.oldName = null; G.mile = {}; G.mileSeq = 0; viewBoss = {}; viewerRebuild(); };
  $("vwClose").onclick = closeViewer;
}

// 帽子を1つ切り出した画像（ビューワーのカード用）
const hatURLs = {};
function hatURL(k) {
  if (hatURLs[k]) return hatURLs[k];
  const h = hatAtlas.def.hats[k], [x, y, w, hh] = h.rect, c = document.createElement("canvas");
  c.width = w; c.height = hh; c.getContext("2d").drawImage(hatAtlas.img, x, y, w, hh, 0, 0, w, hh);
  return (hatURLs[k] = c.toDataURL());
}
