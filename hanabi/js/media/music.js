"use strict";
// BGM：夏祭りのお囃子ふう（合成）。太鼓・鉦（かね）・笛。
// 連鎖や歓声で盛り上がるほど、太鼓の手数と音量が増える

const music = (() => {
  const FUE = [587, 659, 784, 880, 988, 1175, 1319]; // 笛：レミソラシレミ（祭りっぽい音階）
  const STEP = BEAT_STEP;                             // 16分音符の長さ（秒）。連鎖の拍と同じ格子
  let ac = null, out = null, noise = null, timer = 0, idx = 3, step = 0, next = 0;

  function attach(a, master) {
    ac = a;
    // BGM の出口は全作品共通の MG.sound.bgm（音量画面の「BGM」で調整。0 で消音）
    out = ac.createGain(); out.connect(window.MG && MG.sound ? MG.sound.bgm : master);
    noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    align(ac.currentTime + 0.1);
    timer = setInterval(schedule, 50);
  }

  // いまの盛り上がり（0〜1）
  function heat() {
    if (typeof G === "undefined" || G.mode === "title") return 0;
    const chain = G.pending ? Math.min(1, G.chainNow / 8) : 0;
    const cheer = typeof crowd !== "undefined" ? Math.min(1, crowd.cheer * 0.4) * (0.5 + crowd.power * 0.5) : 0;
    return Math.min(1, 0.25 + chain * 0.6 + cheer * 0.5);
  }

  // 大太鼓：ドン
  function taiko(t, gain) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.45);
    hit(t, 0.05, 700, "lowpass", gain * 0.5);
  }
  // 締太鼓：ツク（短い。高すぎると耳につくので低めの帯域）
  function shime(t, gain) { hit(t, 0.04, 1500, "bandpass", gain); }
  // 鉦：チキ。高い倍音は耳につくので、低めの柔らかい音を高域を切って小さく鳴らす
  function kane(t, gain) {
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1800; f.connect(out);
    [880, 1320].forEach((hz, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "triangle"; o.frequency.value = hz;
      g.gain.setValueAtTime(gain / (i + 2), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g).connect(f); o.start(t); o.stop(t + 0.1);
    });
  }
  function hit(t, dur, freq, type, gain) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = type === "bandpass" ? 3 : 0.7;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
  }
  // 笛：ゆれのある長い音（主役になりすぎないよう、全体で約3dB控えめ）
  function fue(f, t, dur, gain) {
    gain *= 0.7;
    const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6);
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.04);
    g.gain.setValueAtTime(gain, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }

  // 拍は音の時計の0秒からの格子にそろえる（連鎖の開くタイミングと同じ格子）
  function align(t) { step = Math.ceil(t / STEP); next = step * STEP; }

  // 少し先まで予約して、テンポが揺れないようにする
  function schedule() {
    if (document.hidden) { align(ac.currentTime + 0.1); return; }
    while (next < ac.currentTime + 0.25) { play(step, next); step++; next += STEP; }
  }

  function play(s, t) {
    const h = heat(), i = s % 16, quiet = typeof G !== "undefined" && (G.mode === "title" || !!G.wait);
    // 連鎖のあいだは太鼓をひかえて、花火の音をリズムの主役にする
    if (typeof G !== "undefined" && G.pending && (fusing() || G.bursts.length)) {
      if (i % 8 === 0) taiko(t, 0.1);
      if (i % 4 === 0 && Math.random() < 0.7) fue(FUE[idx], t, STEP * 4, 0.025);
      return;
    }
    // 大太鼓「ドン・ドン・ドコ」。盛り上がると手数が増える
    const don = quiet ? [0, 8] : h > 0.6 ? [0, 3, 6, 8, 10, 11, 14] : h > 0.4 ? [0, 6, 8, 11, 14] : [0, 6, 8, 11];
    if (don.includes(i)) taiko(t, (0.16 + h * 0.14) * (i === 0 ? 1.15 : 1));
    // 締太鼓：裏で刻む
    if (!quiet && i % 2 === 1 && (h > 0.35 || i % 4 === 3)) shime(t, 0.035 + h * 0.03);
    // 鉦：チャンチキ
    if ([2, 6, 10, 13, 14].includes(i) && (h > 0.3 || i % 8 === 2)) kane(t, quiet ? 0.012 : 0.02 + h * 0.015);
    // 笛：2拍ごとに、ゆるく上下する旋律
    if (i % 4 === 0 && Math.random() < 0.85) {
      idx = Math.max(0, Math.min(FUE.length - 1, idx + [-2, -1, 1, 2, 0, 1][Math.floor(Math.random() * 6)]));
      fue(FUE[idx], t, STEP * (Math.random() < 0.4 ? 4 : 2), quiet ? 0.03 : 0.04);
    } else if (i % 4 === 2 && h > 0.5 && Math.random() < 0.5) {
      fue(FUE[Math.min(FUE.length - 1, idx + 1)], t, STEP * 1.5, 0.03);
    }
  }

  // 特大花火の前の静けさ：BGM も引く（効果音とは出口が別なので、ここで下げる）
  function duck(on) {
    if (!out) return;
    out.gain.cancelScheduledValues(ac.currentTime);
    out.gain.setTargetAtTime(on ? 0.2 : 1, ac.currentTime + (on ? 0 : 1.5), on ? 0.06 : 0.5);
  }
  return { attach, duck };
})();
