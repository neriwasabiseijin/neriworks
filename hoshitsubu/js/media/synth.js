"use strict";
// 音の土台：共通の AudioContext（MG.sound.ctx）に、BGM と効果音の2系統をつなぐ。素材ファイルは使わず合成する。
// 耳に刺さらないよう、どちらも 3200Hz より上を落とす。

const synth = (() => {
  let ac = null;
  const bus = {};          // music / sfx：それぞれの入口
  const wetIn = {};        // music / sfx：こだま（ディレイ）の入口
  let noiseBuf = null;

  function chain(dest) {
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200; lp.Q.value = .5;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    const post = ac.createGain(); post.gain.value = 1.6;
    lp.connect(comp).connect(post).connect(dest);
    // こだま
    const d = ac.createDelay(1); d.delayTime.value = .33;
    const fb = ac.createGain(); fb.gain.value = .3;
    const dl = ac.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 1400;
    const wi = ac.createGain(); wi.gain.value = .28;
    wi.connect(d); d.connect(dl).connect(fb).connect(d); dl.connect(lp);
    return { lp, wi };
  }
  function init() {
    if (ac) return true;
    if (!window.MG || !MG.sound || !MG.sound.ctx) return false;
    ac = MG.sound.ctx;
    const m = chain(MG.sound.bgm), s = chain(MG.sound.sfx);
    bus.musicOut = m.lp; wetIn.music = m.wi;
    bus.sfx = ac.createGain(); bus.sfx.connect(s.lp); wetIn.sfx = s.wi;
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    return true;
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const tame = f => Math.min(1, Math.sqrt(500 / f)); // 高い音ほど小さく
  // dest：つなぐ先のノード。kind：こだまをどちらの系統に送るか
  function note({ f, t, dur = .3, g = .1, type = "sine", atk = .005, lp = 0, dest, kind = "music", wet = 0, bend = 0 }) {
    const o = ac.createOscillator(); o.type = type;
    if (bend) { o.frequency.setValueAtTime(f * bend, t); o.frequency.exponentialRampToValueAtTime(f, t + Math.min(.08, dur / 2)); }
    else o.frequency.setValueAtTime(f, t);
    const e = ac.createGain(), peak = g * tame(f);
    e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(peak, t + atk); e.gain.exponentialRampToValueAtTime(.0001, t + atk + dur);
    let n = o; if (lp) { const fl = ac.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = lp; n.connect(fl); n = fl; }
    n.connect(e); e.connect(dest);
    if (wet) { const w = ac.createGain(); w.gain.value = wet; e.connect(w).connect(wetIn[kind]); }
    o.start(t); o.stop(t + atk + dur + .05);
  }
  function noise({ t, dur = .2, g = .05, type = "lowpass", f = 1200, f2 = 0, q = .7, atk = .003, dest }) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const e = ac.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.linearRampToValueAtTime(g, t + atk); e.gain.exponentialRampToValueAtTime(.0001, t + atk + dur);
    s.connect(fl).connect(e).connect(dest); s.start(t); s.stop(t + atk + dur + .05);
  }
  return { init, note, noise, mtof, bus, get ac() { return ac; } };
})();
