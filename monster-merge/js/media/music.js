"use strict";
// Background music sequencer: chord loop, melody, pinch arrangement and level-up ducking.

// A small step sequencer: 王道進行 (IV-V-iii-vi) in C, pad + bass + arpeggio + melody + drums at 112 BPM.
const music = (() => {
  const STEP_CALM = 60 / 112 / 4, STEP_PINCH = 60 / 132 / 4;
  let STEP_T = STEP_CALM;
  const CH = [
    { root: 41, tones: [53, 57, 60, 64] }, // Fmaj7
    { root: 43, tones: [55, 59, 62, 65] }, // G7
    { root: 40, tones: [52, 55, 59, 62] }, // Em7
    { root: 45, tones: [57, 60, 64, 67] }, // Am7
    { root: 38, tones: [50, 53, 57, 60] }, // Dm7
    { root: 43, tones: [55, 59, 62, 65] }, // G7
    { root: 36, tones: [52, 55, 59, 64] }, // Cmaj7
    { root: 45, tones: [57, 61, 64, 67] }, // A7
  ];
  // fixed melody so the loop is recognisable: [step, midi, length in steps] per bar
  const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79];
  const r = mulberry32(20261012); // fixed seed: the melody is the same every play
  const MEL = CH.map((c) => {
    const notes = [];
    const rhythm = [[0, 3], [3, 3], [6, 2], [8, 4], [12, 2], [14, 2]].filter(() => r() > 0.3);
    for (const [st, len] of rhythm) {
      const target = c.tones[Math.floor(r() * 4)] + 12;
      const nearest = PENTA.reduce((a, b) => Math.abs(b - target) < Math.abs(a - target) ? b : a);
      notes.push([st, nearest, len]);
    }
    return notes;
  });
  let on = store.get("monster-merge-music") !== "0";
  let master = null, lp = null, noise = null, timer = null, nextTime = 0, step = 0;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function setup(a) {
    master = a.createGain(); master.gain.value = 0;
    lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 9000;
    master.connect(lp).connect(a.destination);
    noise = a.createBuffer(1, a.sampleRate * 0.3, a.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function note(a, t, freq, dur, type, vol, attack = 0.005) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function hit(a, t, dur, vol, freq) {
    const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    s.buffer = noise; f.type = "highpass"; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  function kick(a, t) {
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.2);
  }
  function schedule(a, t, s) {
    const bar = Math.floor(s / 16) % CH.length, st = s % 16, c = CH[bar];
    const busy = level >= 3 || pinch;
    STEP_T = pinch ? STEP_PINCH : STEP_CALM;
    if (pinch) {
      // pinch: driving 8th-note bass, alarm blips, four-on-the-floor
      if (st % 2 === 0) note(a, t, hz(c.root + (st % 4 ? 12 : 0)), STEP_T * 1.4, "square", 0.05);
      if (st === 2 || st === 10) note(a, t, hz(c.tones[3] + 24), STEP_T * 1.2, "square", 0.022);
      if (st % 4 === 0) kick(a, t);
      hit(a, t, 0.025, 0.04, 8000);
      if (st === 0) c.tones.forEach((m) => note(a, t, hz(m), STEP_T * 15, "sawtooth", 0.012, 0.05));
      if (st % 2 === 0) { const order = [0, 2, 1, 3, 2, 0, 3, 1]; note(a, t, hz(c.tones[order[(st / 2) % 8]] + 12), STEP_T * 1.2, "sine", 0.04); }
      for (const [ms, m, len] of MEL[bar]) if (ms === st) note(a, t, hz(m + 12), STEP_T * len * 0.7, "square", 0.022, 0.01);
      if (st === 4 || st === 12) hit(a, t, 0.12, 0.12, 1800);
      return;
    }
    if (st === 0) c.tones.forEach((m) => note(a, t, hz(m), STEP_T * 15, "triangle", 0.025, 0.08));
    if ([0, 6, 8, 14].includes(st)) note(a, t, hz(c.root), STEP_T * 1.6, "square", 0.05);
    if (st % 2 === 0) { const order = [0, 1, 2, 3, 2, 1, 0, 2]; note(a, t, hz(c.tones[order[(st / 2) % 8]] + 12), STEP_T * 1.8, "sine", 0.045); }
    for (const [ms, m, len] of MEL[bar]) if (ms === st) note(a, t, hz(m), STEP_T * len * 0.95, "square", 0.028, 0.01);
    if (st === 0 || st === 8 || (busy && st === 10)) kick(a, t);
    if (st === 4 || st === 12) hit(a, t, 0.12, 0.12, 1800);
    if (st % 2 === 1 || (busy && st % 2 === 0)) hit(a, t, 0.03, busy ? 0.05 : 0.035, 7000);
  }
  function tick() {
    const a = ac; if (!a) return;
    while (nextTime < a.currentTime + 0.15) { schedule(a, nextTime, step); nextTime += STEP_T; step++; }
  }
  return {
    get on() { return on; },
    start() {
      const a = audio(); if (!a || !on) return;
      if (a.state === "suspended") a.resume();
      if (!master) setup(a);
      if (timer) return;
      nextTime = a.currentTime + 0.05; step = 0;
      master.gain.cancelScheduledValues(a.currentTime);
      master.gain.setValueAtTime(0, a.currentTime); master.gain.linearRampToValueAtTime(0.7, a.currentTime + 0.6);
      timer = setInterval(tick, 25);
    },
    stop() {
      if (!timer || !ac) return;
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setValueAtTime(master.gain.value, ac.currentTime); master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.5);
      const t = timer; timer = null; setTimeout(() => clearInterval(t), 550);
    },
    duck(d) { if (lp && ac) lp.frequency.setTargetAtTime(d ? 700 : 9000, ac.currentTime, 0.15); },
    toggle() { on = !on; store.set("monster-merge-music", on ? "1" : "0"); if (on && state !== "title" && state !== "over") this.start(); else this.stop(); return on; },
  };
})();
