"use strict";
// Sound effects synthesized with WebAudio.

let ac = null;
function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } return ac; }
function tone(freq, dur, type = "sine", vol = 0.15, when = 0, slide = 1.5) {
  const a = audio(); if (!a) return;
  const t0 = a.currentTime + when;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
const sfx = {
  drop() { tone(320, 0.08, "triangle", 0.08); },
  merge(t, combo) { tone(260 * Math.pow(1.19, t) * (1 + Math.min(combo, 6) * 0.06), 0.16, "sine", 0.16); },
  cutin(t) { [0, 4, 7, 12].forEach((s, i) => tone(392 * Math.pow(2, (s + t) / 12), 0.22, "square", 0.05, i * 0.08)); },
  stone() { tone(90, 0.25, "sawtooth", 0.08, 0, 0.6); },
  crack() { tone(500, 0.1, "square", 0.06, 0, 0.4); },
  boom() { tone(70, 0.45, "sawtooth", 0.18, 0, 0.3); },
  zap() { tone(1200, 0.2, "sawtooth", 0.08, 0, 0.2); },
  level() { [0, 4, 7, 11, 14].forEach((s, i) => tone(523 * Math.pow(2, s / 12), 0.18, "triangle", 0.08, i * 0.06)); },
  over() { [0, -3, -7].forEach((s, i) => tone(330 * Math.pow(2, s / 12), 0.3, "triangle", 0.1, i * 0.18)); },
};
