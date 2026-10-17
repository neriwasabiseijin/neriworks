"use strict";
// BGM「ゆめチップ」（138BPM）。Fmaj7→Em7→Dm7→Cmaj7 を2小節ずつ、ベースは8分で同じ音を刻む。
// リスクとリターンで変わる：
//  ・溜めている間：衛星が増えるほどこもって静かになり、細かい刻みと低い鼓動が加わる。満杯で和音がゆらゆら揺れる
//  ・放って敵を落としている間：ドラム→アルペジオ→16分の上ものが重なり、数秒かけて引いていく
//  ・ボス戦は暗い和音に切り替わり、ドラムが鳴り続ける。ボスのカードの数だけ低い不穏な音が重なる
//  ・カード選びと音量画面の間は、水の中のようにこもる

const music = (() => {
  const { note, noise, mtof } = synth;
  const SD = 60 / 138 / 4;
  const PENT = [0, 2, 4, 7, 9];
  const NORMAL = [[53, [0, 4, 7, 11]], [52, [0, 3, 7, 10]], [50, [0, 3, 7, 10]], [48, [0, 4, 7, 11]]];
  const BOSS = [[50, [0, 3, 7, 10]], [46, [0, 4, 7, 11]], [43, [0, 3, 7, 10]], [45, [0, 4, 7, 10]]];
  let ac, bus, lpf, trem, lfoDepth, drone, timer = 0, playing = false, step = 0, nextT = 0;
  let tension = 0, hype = 0, muffled = false, paused = false, boss = false;
  const chord = bar => { const [r, iv] = (boss ? BOSS : NORMAL)[bar % 4]; return iv.map(x => r + x); };
  const pent = i => 60 + Math.floor(i / 5) * 12 + PENT[i % 5];

  function init() {
    if (ac) return true;
    if (!synth.init()) return false;
    ac = synth.ac;
    trem = ac.createGain(); trem.gain.value = .85; trem.connect(synth.bus.musicOut);
    lpf = ac.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 6000; lpf.connect(trem);
    bus = ac.createGain(); bus.gain.value = .9; bus.connect(lpf);
    const lfo = ac.createOscillator(); lfo.frequency.value = 5.5;
    lfoDepth = ac.createGain(); lfoDepth.gain.value = 0; lfo.connect(lfoDepth).connect(trem.gain); lfo.start();
    drone = ac.createGain(); drone.gain.value = 0; drone.connect(trem);
    [36.7, 36.9].forEach(f => { const o = ac.createOscillator(); o.type = "triangle"; o.frequency.value = f; o.connect(drone); o.start(); });
    return true;
  }
  function kick(t, g = .34) {
    const o = ac.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + .18);
    const e = ac.createGain(); e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(.0001, t + .25);
    o.connect(e).connect(bus); o.start(t); o.stop(t + .3);
  }
  function stepMusic(s, t) {
    const ct = chord(Math.floor(s / 32)), T = tension, Hy = hype, n = o => note({ dest: bus, ...o });
    if (s % 32 === 0) ct.forEach((m, k) => n({ f: mtof(m + 12), t: t + k * .02, dur: SD * 31, g: .022, type: "triangle", atk: .25, lp: 1300, wet: .2 }));
    if (s % 4 === 2) ct.forEach(m => n({ f: mtof(m + 12), t, dur: SD * 1.5, g: .02, type: "square", atk: .02, lp: 1200, wet: .3 }));
    if (s % 2 === 0) n({ f: mtof(ct[0] - 12), t, dur: SD * 1.6, g: .13, type: "triangle", lp: 650 });
    if (T > .25 && s % 2 === 1) noise({ t, dur: .025, g: .006 + T * .018, type: "bandpass", f: 2300, q: 2, dest: bus });
    if (T > .5 && s % 4 === 0) n({ f: mtof(ct[0] - 24), t, dur: SD * 2.5, g: .05 + T * .09, type: "sine" });
    if (Hy > .15 || boss) {
      if (s % 4 === 0) kick(t);
      if (s % 8 === 4) noise({ t, dur: .14, g: .05, type: "bandpass", f: 1300, q: .9, dest: bus });
      if (s % 4 === 2) noise({ t, dur: .04, g: .02, type: "bandpass", f: 2600, q: 1.2, dest: bus });
    }
    if (Hy > .45 && s % 2 === 0) n({ f: mtof(ct[(s / 2) % 4] + 24), t, dur: .09, g: .026, type: "square", lp: 1400, wet: .4 });
    if (Hy > .75) { n({ f: mtof(ct[s % 4] + 12), t, dur: .07, g: .02, type: "square", lp: 1300, wet: .3 }); if (s % 8 === 0) ct.forEach(m => n({ f: mtof(m + 12), t, dur: SD * 3, g: .025, type: "triangle", wet: .3 })); }
    hype = Math.max(0, hype - SD * .22);
  }
  function applyLP() { if (lpf) lpf.frequency.setTargetAtTime(muffled || paused ? 500 : 6000 - tension * 3800, ac.currentTime, .15); }
  function tick() {
    if (paused) { nextT = ac.currentTime + .05; return; }
    while (nextT < ac.currentTime + .15) { stepMusic(step, nextT); nextT += SD; step++; }
  }
  addEventListener("mg:pause", () => { paused = true; if (ac) applyLP(); });
  addEventListener("mg:resume", () => { paused = false; if (ac) applyLP(); });
  return {
    pent,
    start() { if (!init() || playing) return; playing = true; step = 0; nextT = ac.currentTime + .05; timer = setInterval(tick, 25); },
    stop() { playing = false; clearInterval(timer); },
    setTension(ratio, full) {
      if (!ac) return;
      if (Math.abs(ratio - tension) > .02) { tension = ratio; applyLP(); }
      lfoDepth.gain.setTargetAtTime(full ? .22 : 0, ac.currentTime, .1);
    },
    hype(x) { hype = Math.min(1, hype + x); },
    setBoss(b, cards = 0) { boss = b; if (drone) drone.gain.setTargetAtTime(b ? .03 + cards * .025 : 0, ac.currentTime, .5); },
    muffle(m) { muffled = m; if (m) tension = 0; if (ac) { applyLP(); lfoDepth.gain.setTargetAtTime(0, ac.currentTime, .1); } },
  };
})();
