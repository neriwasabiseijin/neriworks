"use strict";
// 効果音（WebAudio で合成。音源ファイルなし）

const sfx = (() => {
  let ac = null, master = null, noise = null, lastBoom = 0;
  function unlock() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    // 音の出口は全作品共通の MG.sound（BGM と効果音で音量を分ける。common/sound.js）
    const S = window.MG && MG.sound;
    try { ac = S ? S.ctx : new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    if (!ac) return;
    master = ac.createGain(); master.gain.value = 0.7; master.connect(S ? S.sfx : ac.destination);
    const n = ac.sampleRate * 1.5;
    noise = ac.createBuffer(1, n, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    music.attach(ac, master);
  }
  function noiseHit(t, dur, freq, type, gain) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // 低い音が下がっていく「ドーン」
  // 重低音の通り道：軽く歪ませて倍音を足す（スマホの小さなスピーカーでも「低い」と感じられる）
  let low = null;
  function lowBus() {
    if (low) return low;
    const sh = ac.createWaveShaper(), curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
    sh.curve = curve;
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420;
    const trim = ac.createGain(); trim.gain.value = 0.26; // 歪みで大きくなった分を戻す
    low = ac.createGain();
    low.connect(sh).connect(lp).connect(trim).connect(master);
    return low;
  }
  function thump(t, f0, f1, dur, gain, dest = master) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  // パチパチ：火花が散る音。高すぎるとチリチリ耳につくので、中くらいの高さの柔らかい粒を少しだけ
  function pop(t, gain) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = "bandpass"; f.frequency.value = 1100 + Math.random() * 900; f.Q.value = 1.2;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + 0.05);
  }
  // ドーン。おなかに響く低音（胴鳴り＋重低音＋あとに残るゴロゴロ）に、開く瞬間の破裂音をすこし。
  // 連鎖が深いほど少しずつ音程が上がる（上げすぎると軽くなるので半分の割合）
  function boom(depth, vol = 1) {
    if (!ac) return;
    const now = ac.currentTime;
    if (now - lastBoom < 0.035) return; // 同時にたくさん鳴らさない
    lastBoom = now;
    const t = now + 0.01, up = Math.pow(2, Math.min(depth, 14) / 24);
    const L = lowBus();
    thump(t, 130 * up, 46 * up, 0.7, 0.5 * vol, L);  // 胴鳴り（歪みで倍音が出て、スマホでも聞こえる）
    thump(t, 58 * up, 30, 1.6, 0.75 * vol, L);       // 重低音（長く尾を引く）
    noiseHit(t, 1.6, 140, "lowpass", 0.4 * vol);     // 空に残るゴロゴロ
    noiseHit(t, 0.08, 900 * up, "lowpass", 0.12 * vol); // 破裂の瞬間
    // パラパラ（火花が散る。少なめ・柔らかめ）
    for (let i = 0; i < 5; i++) pop(t + 0.9 + Math.random() * 1.1, 0.06 * vol);
  }
  // ポン（筒から出る音）＋ヒュ〜〜ルルル（てっぺんまでずっと鳴る笛）
  function launch(flight, delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay, T = Math.max(0.5, flight);
    const p = ac.createOscillator(), pg = ac.createGain();
    p.type = "sine"; p.frequency.setValueAtTime(220, t); p.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    pg.gain.setValueAtTime(0.35, t); pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    p.connect(pg).connect(master); p.start(t); p.stop(t + 0.2);
    noiseHit(t, 0.1, 900, "lowpass", 0.35);

    const o = ac.createOscillator(), g = ac.createGain();
    const lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = "sine";
    // 笛玉の「ヒュ〜〜」は高い音から下がっていく
    o.frequency.setValueAtTime(2100, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(1500, t + T * 0.6);
    o.frequency.exponentialRampToValueAtTime(950, t + T);
    lfo.frequency.setValueAtTime(6, t); lfo.frequency.linearRampToValueAtTime(13, t + T); // だんだん「ルルル」と震える
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(90, t + T);
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.15);
    g.gain.setValueAtTime(0.07, t + T * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + T + 0.05);
    o.connect(g).connect(master);
    o.start(t + 0.05); lfo.start(t); o.stop(t + T + 0.1); lfo.stop(t + T + 0.1);
    // 風を切るシャー
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), sg = ac.createGain();
    s.buffer = noise; f.type = "bandpass"; f.Q.value = 2;
    f.frequency.setValueAtTime(4000, t); f.frequency.exponentialRampToValueAtTime(1500, t + T);
    sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.05, t + 0.2); sg.gain.exponentialRampToValueAtTime(0.0001, t + T);
    s.connect(f).connect(sg).connect(master); s.start(t); s.stop(t + T + 0.05);
  }
  // ポン（火をつけ忘れた花火玉が、地上から昇っていく音。軽く）
  function pon() {
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    const p = ac.createOscillator(), pg = ac.createGain();
    p.type = "sine"; p.frequency.setValueAtTime(260, t); p.frequency.exponentialRampToValueAtTime(90, t + 0.1);
    pg.gain.setValueAtTime(0.22, t); pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    p.connect(pg).connect(master); p.start(t); p.stop(t + 0.18);
    noiseHit(t, 0.06, 700, "lowpass", 0.18);
  }
  function crack() {
    if (!ac) return;
    noiseHit(ac.currentTime, 0.06, 1600, "bandpass", 0.6);
  }
  // 導火線のチリチリ（深い段ほど高い音）
  let lastFuse = 0;
  function fuse(depth) {
    if (!ac || ac.currentTime - lastFuse < 0.05) return;
    lastFuse = ac.currentTime;
    noiseHit(ac.currentTime, 0.12, 1800 + Math.min(depth, 10) * 150, "bandpass", 0.06);
  }
  // フィナーレ直前：音をすっと引いて「静」をつくる
  function hush() {
    if (!ac) return;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(0.15, ac.currentTime, 0.06);
    music.duck(true);
  }
  function tone(f, t, dur, gain, type = "triangle") {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  // ドカーン：低く長い爆発＋上がっていく鐘＋降りそそぐパチパチ
  function finale(n) {
    if (!ac) return;
    const t = ac.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(0.95, t);
    master.gain.setTargetAtTime(0.7, t + 1.5, 0.5);
    music.duck(false);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(lowBus()); o.start(t); o.stop(t + 1.7);
    noiseHit(t, 1.8, 380, "lowpass", 0.9);
    noiseHit(t, 0.35, 1600, "lowpass", 0.5);
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.slice(0, Math.min(6, 2 + Math.floor(n / 3))).forEach((f, i) => tone(f, t + 0.12 + i * 0.07, 1.4, 0.07));
    for (let i = 0; i < 24; i++) pop(t + 0.9 + Math.random() * 2.6, 0.07);
  }
  // 晴ッ：風を切るシャッ＋太鼓のドン＋鈴
  function sky() {
    if (!ac) return;
    const t = ac.currentTime;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = "bandpass"; f.Q.value = 1.5;
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(6000, t + 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + 0.45);
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(150, t + 0.05); o.frequency.exponentialRampToValueAtTime(55, t + 0.4);
    og.gain.setValueAtTime(0.7, t + 0.05); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(og).connect(master); o.start(t + 0.05); o.stop(t + 0.55);
    tone(1760, t + 0.08, 0.9, 0.06, "sine");
    tone(2637, t + 0.1, 0.7, 0.03, "sine");
  }
  function clear() {
    if (!ac) return;
    const t = ac.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.5);
      o.connect(g).connect(master); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.55);
    });
  }
  // 場内アナウンスのチャイム（ピンポンパンポーン）
  // UFO の爆発：ゲームのような「ドガーン」。花火のドーンとは別物に聞こえるよう、
  // 下がっていく矩形波と、段々に小さくなるザラザラした雑音（高い所は切って耳に痛くしない）
  function explode() {
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = "square"; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.5);
    f.type = "lowpass"; f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 0.65);
    for (let i = 0; i < 6; i++) noiseHit(t + i * 0.07, 0.09, 1300 - i * 150, "lowpass", 0.32 * Math.pow(0.72, i));
    thump(t, 90, 35, 0.5, 0.45, lowBus());
  }
  // 狙いを決めた：コッ（拍子木のような短い音。n 発目ほど少し高く。0 は取り消し）
  function plan(n) {
    if (!ac) return;
    const t = ac.currentTime;
    tone(n ? 520 + n * 90 : 380, t, 0.07, 0.1, "triangle"); noiseHit(t, 0.03, 1400, "bandpass", 0.15);
  }
  function chime() {
    if (!ac) return;
    const t = ac.currentTime;
    [698, 880, 1047, 1397].forEach((f, i) => tone(f, t + i * 0.16, 0.6, 0.06, "sine"));
  }
  // 拍の格子の時計：音が使えるときは音の時計に合わせる（お囃子とずれない）
  const now = () => ac ? ac.currentTime : performance.now() / 1000;
  return { unlock, boom, launch, pon, crack, fuse, hush, finale, sky, clear, chime, plan, explode, now };
})();
