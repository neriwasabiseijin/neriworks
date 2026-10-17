"use strict";
// 効果音。粒の音は柔らかい短い電子音、高い音ほど小さめ（ベル・鉄琴のような金属音は使わない）。
// 弾をとらえるたびに、曲のキーに合った音が一段ずつ上がる（速く続けるとフレーズになる）。

const sfx = (() => {
  const { note, noise, mtof } = synth;
  let capIdx = 0, lastCap = 0, lastGem = 0, lastPop = 0;
  // 同じ音が一度に重なりすぎると重くなるので、短い間隔で鳴らしすぎない
  const gap = (last, t, s) => t - last >= s;
  const ok = () => synth.init();
  const now = () => synth.ac.currentTime + .01;
  const n = o => note({ dest: synth.bus.sfx, kind: "sfx", ...o });
  const z = o => noise({ dest: synth.bus.sfx, ...o });
  return {
    capture() {
      if (!ok()) return; const t = now();
      if (!gap(lastCap, t, .035)) return;
      if (t - lastCap > 1.2) capIdx = 0; lastCap = t;
      n({ f: mtof(music.pent(capIdx)), t, dur: .16, g: .17, type: "triangle", bend: .85, wet: .3, lp: 2200 });
      capIdx = Math.min(capIdx + 1, 11);
    },
    release(k) {
      if (!ok()) return; const t = now(); capIdx = 0;
      z({ t, dur: .45, g: .05 + Math.min(.12, k * .004), f: 250, f2: 1800, atk: .12 });
      const m = Math.min(8, 2 + Math.floor(k / 6));
      for (let i = 0; i < m; i++) n({ f: mtof(music.pent(i * 2)), t: t + .03 + i * .04, dur: .1, g: .045, type: "square", lp: 1500, wet: .4 });
    },
    pop(kills) { if (!ok()) return; const t = now(); if (!gap(lastPop, t, .03)) return; lastPop = t; n({ f: mtof(music.pent(2 + Math.min(kills, 12))), t: now(), dur: .14, g: .16, type: "triangle", bend: .7 }); },
    gem() { if (!ok()) return; const t = now(); if (!gap(lastGem, t, .045)) return; lastGem = t; n({ f: mtof(music.pent(7 + Math.floor(Math.random() * 3))), t: now(), dur: .06, g: .05, type: "sine" }); },
    hit() { if (!ok()) return; const t = now(); for (let i = 0; i < 5; i++) n({ f: mtof(music.pent(8 - i)), t: t + i * .06, dur: .12, g: .1, type: "triangle", lp: 1200 }); z({ t, dur: .3, g: .12, f: 900, f2: 200 }); },
    // 殻が割れる：低いドンと、くだける音、下がっていく粒（高すぎない音域で）
    shell() { if (!ok()) return; const t = now(); n({ f: 80, t, dur: .5, g: .4, type: "sine", bend: .5 }); z({ t, dur: .6, g: .3, type: "bandpass", f: 1400, f2: 300, q: .7 }); [9, 7, 5, 4, 2, 0].forEach((m, i) => n({ f: mtof(music.pent(m)), t: t + .04 + i * .05, dur: .14, g: .1, type: "triangle", lp: 1600 })); },
    shellForm() { if (!ok()) return; const t = now(); for (let i = 0; i < 5; i++) n({ f: mtof(music.pent(i)), t: t + i * .18, dur: .08, g: .05, type: "triangle", lp: 1400 }); },
    shellBack() { if (!ok()) return; const t = now(); z({ t, dur: .25, g: .12, f: 300, f2: 1400, atk: .15 }); n({ f: mtof(music.pent(5)), t: t + .1, dur: .3, g: .1, type: "triangle", lp: 1500 }); },
    // カードが燃える：ボッという低めの息の音
    fire() { if (!ok()) return; const t = now(); z({ t, dur: .35, g: .22, f: 700, f2: 180, atk: .02 }); n({ f: 90, t, dur: .3, g: .25, type: "sine", bend: .6 }); },
    steal() { if (!ok()) return; n({ f: mtof(music.pent(4)), t: now(), dur: .2, g: .08, type: "triangle", bend: 1.4, lp: 1200 }); },
    chord(up) { if (!ok()) return; const t = now(); (up ? [60, 64, 67, 71, 74] : [57, 60, 64]).forEach((m, i) => n({ f: mtof(m + 12), t: t + i * .06, dur: .6, g: .08, type: "triangle", wet: .4 })); },
    bossIn() { if (!ok()) return; const t = now(); [38, 41, 45].forEach((m, i) => n({ f: mtof(m), t: t + i * .25, dur: 1, g: .25, type: "triangle", lp: 800 })); },
    warn() { if (!ok()) return; const t = now(); n({ f: mtof(69), t, dur: .08, g: .06, type: "square", lp: 1400 }); n({ f: mtof(69), t: t + .14, dur: .08, g: .06, type: "square", lp: 1400 }); },
    // タイトルの起動：ひゅーんと飛んできて、キュピーンと光る（高すぎない音域で、やわらかく）
    whoosh() { if (!ok()) return; const t = now(); z({ t, dur: .3, g: .06, f: 400, f2: 1600, atk: .35 }); },
    kyupin() { if (!ok()) return; const t = now(); n({ f: mtof(76), t, dur: .12, g: .08, type: "triangle", bend: 1.5, lp: 2400 }); n({ f: mtof(83), t: t + .09, dur: .5, g: .07, type: "sine", wet: .5 }); n({ f: mtof(88), t: t + .13, dur: .35, g: .03, type: "sine", wet: .5 }); },
    // 超新星の衝撃波：低いドン → 広がる風 → 明るく駆け上がる粒（被弾の「下がる音」と逆向きにして聞き分けられるように）
    nova() { if (!ok()) return; const t = now(); n({ f: 70, t, dur: .45, g: .38, type: "sine", bend: .6 }); z({ t, dur: .5, g: .16, f: 300, f2: 2600, atk: .04 }); [0, 2, 4, 7, 9, 11].forEach((m, i) => n({ f: mtof(music.pent(m)), t: t + .05 + i * .045, dur: .22, g: .08, type: "triangle", lp: 2400, wet: .45 })); },
    // 氷の衣が割れる：パリーン。くだける音のあと、やわらかい粒が下がっていく（高すぎない音域で）
    ice() { if (!ok()) return; const t = now(); z({ t, dur: .22, g: .14, type: "bandpass", f: 2400, f2: 900, q: .8 }); [11, 9, 7, 10, 8].forEach((m, i) => n({ f: mtof(music.pent(m)), t: t + .02 + i * .035, dur: .09, g: .05, type: "triangle", lp: 2600 })); n({ f: mtof(music.pent(9)), t: t + .2, dur: .5, g: .035, type: "sine", wet: .5 }); },
    // 帽子がポン！と乗る：やわらかく持ち上がる音＋小さな和音
    pon() { if (!ok()) return; const t = now(); n({ f: mtof(72), t, dur: .12, g: .13, type: "sine", bend: .55 }); n({ f: mtof(music.pent(7)), t: t + .07, dur: .2, g: .05, type: "triangle", wet: .4, lp: 2400 }); n({ f: mtof(music.pent(9)), t: t + .12, dur: .3, g: .035, type: "sine", wet: .5 }); },
    // レベルアップ：ふわっと持ち上がってから、ぴょこぴょこと駆け上がる
    levelUp() { if (!ok()) return; const t = now(); n({ f: mtof(music.pent(2)), t, dur: .25, g: .1, type: "sine", bend: .5 }); [4, 6, 8].forEach((m, i) => n({ f: mtof(music.pent(m)), t: t + .12 + i * .07, dur: i === 2 ? .5 : .12, g: .08, type: "triangle", lp: 2400, wet: i === 2 ? .5 : .2 })); },
    // 大彗星を倒した：低いドーンのあと、ゆったり広がるファンファーレ
    bossDown() { if (!ok()) return; const t = now(); n({ f: 60, t, dur: .7, g: .4, type: "sine", bend: .5 }); z({ t, dur: .9, g: .2, f: 1600, f2: 200, atk: .02 }); [48, 55, 60].forEach(m => n({ f: mtof(m), t: t + .35, dur: 1.6, g: .09, type: "triangle", lp: 1200, wet: .5 })); [67, 72, 76].forEach((m, i) => n({ f: mtof(m), t: t + .35 + i * .16, dur: i === 2 ? 1.2 : .4, g: .08, type: "triangle", lp: 2200, wet: .5 })); },
    // 名乗りで古い名前がふっとぶ：ドカッとぶつかって、くるくる遠ざかる
    knock() { if (!ok()) return; const t = now(); n({ f: 110, t, dur: .25, g: .32, type: "sine", bend: .45 }); z({ t, dur: .18, g: .18, type: "bandpass", f: 800, f2: 250, q: .9 }); [9, 8, 7, 6, 5].forEach((m, i) => n({ f: mtof(music.pent(m)), t: t + .1 + i * .05, dur: .07, g: .07 - i * .01, type: "triangle", lp: 2000 })); },
    // 超新星の溜まりきり：キュイーンと上がって、やわらかく光る
    novaReady() { if (!ok()) return; const t = now(); z({ t, dur: .25, g: .05, f: 500, f2: 2000, atk: .2 }); n({ f: mtof(music.pent(4)), t: t + .15, dur: .15, g: .08, type: "triangle", bend: .6, lp: 2200 }); n({ f: mtof(music.pent(9)), t: t + .24, dur: .45, g: .06, type: "sine", bend: .8, wet: .5 }); },
    tap() { if (!ok()) return; n({ f: mtof(72), t: now(), dur: .08, g: .07, type: "triangle" }); },
  };
})();
