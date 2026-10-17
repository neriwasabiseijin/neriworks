"use strict";
// カード選び：ゲームが一瞬止まってカードが2枚。それぞれに大彗星の技が1つ付いている。
// 選ぶと、選ばなかった方が裏返って（裏は付いていた技）上の「大彗星の巣」へ飛んでいく
// 効果は「灰色（今）→色つき（取ったあと）」で書く。大彗星の技も同じ書き方

function effText([pre, f, post], from, to, cls) {
  const v = from > 0 ? diffVal(f(from), f(to), cls) : `<em class="${cls}">${f(to)}</em>`;
  return pre + v + post;
}
// 値が「・」「。」で区切られた複数の数のときは、変わった数だけ「古い→新しい」にする（同じ言葉をくり返さない）
function diffVal(a, b, cls) {
  const sa = a.split(/([・。])/), sb = b.split(/([・。])/);
  if (sa.length !== sb.length) return `<s class="old">${a}</s>→<em class="${cls}">${b}</em>`;
  return sa.map((x, i) => {
    const y = sb[i];
    if (i % 2) return y;
    if (x === y) return `<em class="${cls}">${y}</em>`;
    let n = 0; while (n < x.length && n < y.length && x[n] === y[n]) n++;
    while (n > 0 && /[0-9.+\-−×]/.test(x[n - 1])) n--;   // 数の途中では切らない
    return y.slice(0, n) + `<s class="old">${x.slice(n)}</s>→<em class="${cls}">${y.slice(n)}</em>`;
  }).join("");
}
let pickSkip = null;   // カードを選んだあとの演出を飛ばす（ダブルタップ）
onDoubleTap($("cardpick"), () => { if (pickSkip) pickSkip(); });
function showCards() {
  const dealt = dealCards();
  if (!dealt) { autoCards(); $("cardpick").hidden = true; music.muffle(false); afterCards(); return; }
  scene = "cards"; G.waveState = "pick";
  const [a, b] = dealt;
  const box = $("cards"); box.innerHTML = ""; box.classList.remove("done");
  const ct = $("ctitle"); ct.textContent = "レベルアップ！" + (G.pending > 1 ? "（あと" + G.pending + "回）" : "");
  ct.classList.remove("paper"); void ct.offsetWidth; ct.classList.add("paper");   // 見出しも紙が開くように（続けて選ぶときも毎回）
  const els = [a, b].map((k, i) => {
    const c = CARDS[k], el = document.createElement("button");
    el.className = "card"; el.type = "button";
    const tk = G.deal[k], t = BOSS_TECHS[tk], bl = Math.min(CARD_MAX - 1, techLv(tk));
    el.classList.add("cat-" + c.cat);
    el.innerHTML = `<img class="bgico" src="${iconURL(k, "#ffffff")}" alt=""><span class="tag">${CATS[c.cat].name}</span><span class="head"><img class="ico" src="${iconURL(k, CATS[c.cat].color)}" alt=""><b>${c.name}</b></span><span class="lv">${lv(k) ? "Lv" + lv(k) + " → Lv" + (lv(k) + 1) : "あたらしい力　Lv1"}</span><span class="me">${effText(c.me, lv(k), lv(k) + 1, "up")}</span><span class="boss">${effText(t.text, bl, bl + 1, "bad")}</span>` +
      `<span class="back"><img class="ico" src="${iconURL(t.icon, "#ff9ecf")}" alt=""><b>${t.name}</b><span class="eff">${effText(t.text, bl, bl + 1, "bad")}</span></span>`;   // 裏返したときの面：付いていた技
    box.appendChild(el);
    return el;
  });
  els.forEach((el, i) => el.onclick = () => {
    if (box.classList.contains("done")) return;
    box.classList.add("done");
    const timers = [], later = (f, ms) => timers.push(setTimeout(f, ms));
    let skipped = false;
    const other = els[1 - i];
    el.classList.add("chosen"); other.classList.add("left"); sfx.chord(false);   // 選んだ方は大彗星の行、選ばなかった方は自分の行が灰色に
    G.awakeNew = null;
    chooseCard(i ? b : a, i ? a : b);
    drawCatBar(G.awakeNew);
    if (G.awakeNew) later(() => sfx.chord(true), 300);
    // 選ばなかった方は裏返り（裏面に大彗星が得る力を書いて、少し読ませる）、大彗星へ飛び、近づいたところでボッと燃えて火の玉になり、大彗星に吸いこまれる
    later(() => other.classList.add("flip"), 800);
    let to = null;
    later(() => {
      const r = other.getBoundingClientRect(), n = $("nest").getBoundingClientRect();
      to = { x: n.left + n.width / 2, y: n.top + n.height / 2 };
      other.style.setProperty("--dx", (to.x - r.left - r.width / 2) * .62 + "px");
      other.style.setProperty("--dy", (to.y - r.top - r.height / 2) * .62 + "px");
      other.classList.add("toBoss");
    }, 2050);
    later(() => {
      const r = other.getBoundingClientRect(), box0 = $("cardpick").getBoundingClientRect();
      other.classList.add("burnt"); sfx.fire();
      const fb = document.createElement("canvas"); fb.className = "flame"; fb.width = 160; fb.height = 200;
      fb.style.left = (r.left + r.width / 2 - box0.left) + "px"; fb.style.top = (r.top + r.height / 2 - box0.top) + "px";
      $("cardpick").appendChild(fb);
      // ボッと大きく燃え上がってから（0.3秒）、ゆれながら大彗星へ吸いこまれる（0.6秒）
      const fx = fb.getContext("2d"), t0 = performance.now(), dx = to.x - r.left - r.width / 2, dy = to.y - r.top - r.height / 2;
      (function burn(now) {
        const t = (now - t0) / 1000;
        if (t > .95 || skipped) { fb.remove(); return; }
        const pop = clamp(t / .3, 0, 1), mv = clamp((t - .3) / .6, 0, 1) ** 2;
        const s = (pop < 1 ? .2 + Math.sin(pop * Math.PI * .75) * 1.25 : 1) * (1 - mv * .7);
        fb.style.transform = `translate(${dx * mv}px, ${dy * mv}px) scale(${s})`; fb.style.opacity = 1 - clamp((mv - .7) / .3, 0, 1);
        fx.clearRect(0, 0, 160, 200); drawFlame(fx, 80, 120, 70, t);
        requestAnimationFrame(burn);
      })(t0);
    }, 2550);
    const stolen = () => {
      const lb = $("nestLabel"); lb.textContent = BOSS_TECHS[G.deal[i ? a : b]].name + "は大彗星のものに"; lb.classList.add("stolen");
    };
    later(() => {
      const nc = $("nest"); nc.classList.remove("gulp"); void nc.offsetWidth; nc.classList.add("gulp"); sfx.steal(); stolen();
    }, 3300);
    const finish = () => { pickSkip = null; if (G.pending > 0) showCards(); else { $("cardpick").hidden = true; music.muffle(false); afterCards(); } };
    later(finish, 4350);   // 「〇〇は大彗星のものに」を読む間をとる
    // ダブルタップ：最後のコマ（裏返ったカードが大彗星のものになった状態）まで飛ばし、少し見せてから進む
    pickSkip = () => {
      skipped = true; timers.forEach(clearTimeout); pickSkip = null;
      other.classList.add("flip", "burnt"); stolen();
      setTimeout(finish, 600);
    };
  });
  drawNest($("nest"));
  drawCatBar(null);
  $("nestLabel").textContent = "大彗星"; $("nestLabel").classList.remove("stolen");
  $("cardpick").hidden = false;
  music.muffle(true);
}

// 3系統の合計Lv。次の型（10・20）までのバーつき。目覚めた系統は光る
function drawCatBar(fresh, el = $("catbar")) {
  el.innerHTML = CAT_KEYS.map(c => {
    const l = catLv(c), next = AWAKE_AT.find(x => l < x), prev = [...AWAKE_AT].reverse().find(x => l >= x) || 0;
    const k = next ? (l - prev) / (next - prev) : 1;
    return `<span class="cb cat-${c}${G.awake[c] ? " on" : ""}${fresh === c ? " fresh" : ""}"><b>${CATS[c].name}</b> ${l}${"★".repeat(G.awake[c])}<i style="--k:${k}"></i></span>`;
  }).join("");
}
// 大彗星のシルエット（正体はまだ見せない）。カード選びとチュートリアルで使う
function drawSilhouette(x, k, a, t, cx, cy, r, heading) {
  const c = document.createElement("canvas"); c.width = x.canvas.width; c.height = x.canvas.height;
  const q = c.getContext("2d"); q.setTransform(x.getTransform());
  atlas.draw(q, k, a, t, cx, cy, r, { heading });
  q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = "source-in";
  const gr = q.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, "#5a2f8a"); gr.addColorStop(1, "#1e0f36");
  q.fillStyle = gr; q.fillRect(0, 0, c.width, c.height);
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
  x.shadowColor = "rgba(190,120,255,.8)"; x.shadowBlur = 12 * (c.width / 200);
  x.drawImage(c, 0, 0); x.restore();
}
function drawNest(cvs) {
  const x = cvs.getContext("2d"); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cvs.width, cvs.height);
  drawSilhouette(x, "boss", "fly", 0, cvs.width / 2, cvs.height * .76, cvs.height * .21, Math.PI / 2);   // 尾が上へのびるので、体は下寄りに
}
