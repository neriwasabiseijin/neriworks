// Synthesized music. The whole mix goes through one lowpass: a gray city sounds muffled,
// and the filter opens as color comes back.
let A=null,master,musicBus,lp,verbIn,sfxBus,distIn,noiseBuf,lat=0;
const mf=m=>440*Math.pow(2,(m-69)/12);

function initAudio(){
 if(A)return;
 A=new(window.AudioContext||window.webkitAudioContext)();
 const comp=A.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(A.destination);
 master=A.createGain();master.gain.value=0.72;master.connect(comp);
 // the cut sounds skip the music's compressor (a loud drop would push them down) and get a light limiter of their own
 sfxComp=A.createDynamicsCompressor();sfxComp.threshold.value=-8;sfxComp.ratio.value=8;sfxComp.attack.value=0.002;sfxComp.release.value=0.08;sfxComp.connect(A.destination);
 const len=A.sampleRate*2.4;verbBuf=A.createBuffer(2,len,A.sampleRate);
 for(let c=0;c<2;c++){const d=verbBuf.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);}
 noiseBuf=A.createBuffer(1,A.sampleRate,A.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
 buildBuses();
}
// Everything a song plays goes through these buses. Seeking (the BGM preview) swaps in a fresh set
// and lets the old one go silent, so notes already scheduled past the seek point never sound.
let verbBuf,busOut=null,trim=null,sfxComp=null;
function buildBuses(){
 busOut=A.createGain();busOut.connect(master);
 trim=A.createGain();trim.connect(busOut);
 lp=A.createBiquadFilter();lp.type='lowpass';lp.frequency.value=450;lp.Q.value=0.8;lp.connect(trim);
 musicBus=A.createGain();musicBus.connect(lp);
 const cvl=A.createConvolver();cvl.buffer=verbBuf;const vg=A.createGain();vg.gain.value=0.3;cvl.connect(vg);vg.connect(lp);verbIn=cvl;
 // shared distortion for the industrial kit and bass
 const ws=A.createWaveShaper();const cu=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/512-1;cu[i]=Math.tanh(x*4)*0.8;}ws.curve=cu;
 const wl=A.createBiquadFilter();wl.type='lowpass';wl.frequency.value=1800;ws.connect(wl);wl.connect(musicBus);distIn=ws;
 sfxBus=A.createGain();sfxBus.gain.value=0.8;sfxBus.connect(sfxComp);
}
// each section's loudness trim (songs.js lv), and the cut sounds a step louder where the band is full
const SFX_SEC={intro:0.8,build:0.85,drop:1.25,break:0.9,outro:1.15};
function applyTrim(si,t,tau){const db=SONG.lv?SONG.lv[si]:0;trim.gain.setTargetAtTime(Math.pow(10,db/20),t,tau);sfxBus.gain.setTargetAtTime(SFX_SEC[SECTIONS[si][0]],t,tau);}
function resetBuses(){const old=busOut,t=A.currentTime;old.gain.setValueAtTime(old.gain.value,t);old.gain.linearRampToValueAtTime(0,t+0.04);setTimeout(()=>old.disconnect(),120);
 if(rainNode){try{rainNode.s.stop();}catch(e){}rainNode=null;}buildBuses();}
function env(gn,t,a,peak,d){gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(peak,t+a);gn.gain.exponentialRampToValueAtTime(0.0001,t+a+d);}
// a tape stop (hip hop ending) drags every voice sounding after TAPE_T down in pitch
let TAPE_T=null;
function osc(type,f,t,dur,out){const o=A.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.connect(out);o.start(t);o.stop(t+dur+0.05);
 if(TAPE_T!==null&&t>=TAPE_T-0.001){o.detune.setValueAtTime(0,TAPE_T+0.12);o.detune.linearRampToValueAtTime(-2400,TAPE_T+0.9);}return o;}
function noise(t,dur,out){const s=A.createBufferSource();s.buffer=noiseBuf;s.connect(out);s.start(t,Math.random()*0.5);s.stop(t+dur+0.05);
 if(TAPE_T!==null&&t>=TAPE_T-0.001){s.playbackRate.setValueAtTime(1,TAPE_T+0.12);s.playbackRate.linearRampToValueAtTime(0.25,TAPE_T+0.9);}return s;}
function filt(type,f,q,out){const n=A.createBiquadFilter();n.type=type;n.frequency.value=f;if(q)n.Q.value=q;n.connect(out);return n;}
function gainTo(out){const g=A.createGain();g.connect(out);return g;}

// ---- drums ----
function kick(t,v,out){const kit=SONG.kit;
 if(kit==='jazz'){const gn=gainTo(out||musicBus);const o=osc('sine',110,t,0.3,gn);o.frequency.exponentialRampToValueAtTime(52,t+0.1);env(gn,t,0.004,v*0.45,0.22);return;}
 if(kit==='taiko'){// a big drum: a low boom with the skin's thud
  const gn=gainTo(out||musicBus);const o=osc('sine',92,t,0.75,gn);o.frequency.exponentialRampToValueAtTime(50,t+0.35);env(gn,t,0.004,v*1.05,0.65);
  const ng=gainTo(musicBus),nf=filt('lowpass',320,0,ng);noise(t,0.12,nf);env(ng,t,0.002,v*0.35,0.1);return;}
 if(kit==='edm'){// big kick that pumps the rest of the band
  const gn=gainTo(lp);const o=osc('sine',160,t,0.5,gn);o.frequency.exponentialRampToValueAtTime(42,t+0.12);env(gn,t,0.002,v,0.42);
  const ng=gainTo(lp),nf=filt('bandpass',2400,1,ng);noise(t,0.02,nf);env(ng,t,0.001,v*0.18,0.015);
  musicBus.gain.setValueAtTime(1,t);musicBus.gain.linearRampToValueAtTime(0.45,t+0.012);musicBus.gain.setTargetAtTime(1,t+0.04,0.07);return;}
 if(kit==='rock'||kit==='trap'){const gn=gainTo(out||musicBus);const o=osc('sine',kit==='trap'?175:150,t,0.35,gn);o.frequency.exponentialRampToValueAtTime(48,t+0.07);env(gn,t,0.002,v,0.28);
  const ng=gainTo(musicBus),nf=filt('bandpass',1800,1,ng);noise(t,0.02,nf);env(ng,t,0.001,v*0.16,0.015);return;}
 out=out||(kit==='ind'?distIn:musicBus);const gn=gainTo(out);
 const o=osc('sine',kit==='break'?170:150,t,0.45,gn);o.frequency.exponentialRampToValueAtTime(kit==='break'?52:44,t+(kit==='break'?0.08:0.13));env(gn,t,0.003,v*(kit==='ind'?0.7:1),kit==='break'?0.26:0.42);}
function snare(t,v){const kit=SONG.kit;
 if(kit==='jazz'){// brushes
  const gn=gainTo(musicBus),f=filt('bandpass',1600,0.5,gn);noise(t,0.22,f);gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v*0.45,t+0.012);gn.gain.exponentialRampToValueAtTime(0.0001,t+0.2);return;}
 if(kit==='taiko'){// the small tight drum: a dry "kat"
  const gn=gainTo(musicBus),f=filt('bandpass',1400,3,gn);noise(t,0.05,f);env(gn,t,0.001,v*0.9,0.04);
  const g2=gainTo(musicBus);const o=osc('triangle',620,t,0.06,g2);o.frequency.exponentialRampToValueAtTime(480,t+0.05);env(g2,t,0.001,v*0.4,0.05);return;}
 if(kit==='pop'||kit==='edm'||kit==='trap'){// handclaps (with a snare body for edm, a long tail for trap)
  for(let i=0;i<3;i++){const gn=gainTo(musicBus),f=filt('bandpass',1150,0.9,gn);if(kit==='trap')gn.connect(verbIn);noise(t+i*0.01,0.14,f);env(gn,t+i*0.01,0.002,v*(i===2?1:0.6),i===2?(kit==='trap'?0.24:0.15):0.02);}
  if(kit!=='edm')return;}
 if(kit==='rock'){const gn=gainTo(musicBus),f=filt('bandpass',1800,0.6,gn);gn.connect(verbIn);noise(t,0.24,f);env(gn,t,0.002,v,0.2);
  const g2=gainTo(musicBus);const o=osc('triangle',200,t,0.12,g2);o.frequency.exponentialRampToValueAtTime(150,t+0.1);env(g2,t,0.002,v*0.6,0.1);return;}
 if(kit==='house'){for(let i=0;i<3;i++){const gn=gainTo(musicBus),f=filt('bandpass',1250,0.9,gn);noise(t+i*0.011,0.12,f);env(gn,t+i*0.011,0.002,v*(i===2?1:0.6),i===2?0.16:0.02);}return;}
 const fq=kit==='break'?2300:kit==='ind'?2800:kit==='funk'?1900:1700,dur=kit==='ind'?0.32:kit==='break'?0.2:0.17;
 const gn=gainTo(kit==='ind'?distIn:musicBus),f=filt('bandpass',fq,0.7,gn);noise(t,dur+0.03,f);env(gn,t,0.002,v*(kit==='ind'?0.6:1),dur);
 const g2=gainTo(musicBus);const o=osc('triangle',kit==='break'?240:210,t,0.12,g2);o.frequency.exponentialRampToValueAtTime(140,t+0.1);env(g2,t,0.002,v*0.5,0.1);}
function hat(t,v,open){const kit=SONG.kit;
 if(kit==='jazz'){// a soft ride: a wash, not a bell
  const gn=gainTo(musicBus),f=filt('bandpass',3400,0.9,gn);noise(t,0.35,f);env(gn,t,0.003,v*0.8,0.3);return;}
 if(kit==='taiko'){const gn=gainTo(musicBus),f=filt('bandpass',2600,1.5,gn);noise(t,0.05,f);env(gn,t,0.002,v*0.6,0.035);return;}
 const gn=gainTo(musicBus),f=filt('bandpass',kit==='trap'?6000:5200,1.2,gn);noise(t,open?0.2:0.06,f);env(gn,t,0.002,v,open?0.16:kit==='trap'?0.03:0.045);}
function ghost(t,v){const kit=SONG.kit;
 if(kit==='jazz'){const gn=gainTo(musicBus),f=filt('bandpass',2600,2,gn);noise(t,0.04,f);env(gn,t,0.002,v*0.9,0.03);return;}// hi-hat foot "chick"
 if(kit==='taiko'){const gn=gainTo(musicBus),f=filt('bandpass',1000,4,gn);noise(t,0.04,f);env(gn,t,0.001,v*1.2,0.03);return;}// rim of the big drum
 const gn=gainTo(musicBus),f=filt('bandpass',kit==='house'?3200:2000,0.8,gn);noise(t,0.07,f);env(gn,t,0.002,v,0.06);}
// a wooden clapper (hyoshigi): the last word of the lantern street
function clapper(t,v){for(const d of[0,0.018]){const gn=gainTo(musicBus),f=filt('bandpass',1900,6,gn);gn.connect(verbIn);noise(t+d,0.04,f);env(gn,t+d,0.001,v,0.035);}
 const g2=gainTo(musicBus);osc('triangle',1180,t,0.08,g2);env(g2,t,0.001,v*0.25,0.06);}

// ---- bass ----
function bass(t,m,dur,v){const w=SONG.bassWave;
 if(w==='upright'){const gn=gainTo(musicBus),f=filt('lowpass',650,1,gn);osc('triangle',mf(m),t,dur,f);osc('sine',mf(m),t,dur,gn);
  gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v*0.9,t+0.008);gn.gain.exponentialRampToValueAtTime(v*0.35,t+0.12);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.05);return;}
 if(w==='octave'){const gn=gainTo(musicBus),f=filt('lowpass',1100,2,gn);osc('square',mf(m),t,dur,f);osc('sine',mf(m-12),t,dur,gn);env(gn,t,0.003,v*0.75,dur*0.9);return;}
 if(w==='wobble'){const gn=gainTo(musicBus),f=filt('lowpass',400,6,gn);osc('sawtooth',mf(m),t,dur,f);osc('sawtooth',mf(m)*1.01,t,dur,f);osc('sine',mf(m-12),t,dur,gn);
  const l=A.createOscillator();l.frequency.value=2/B;const lg=A.createGain();lg.gain.value=700;l.connect(lg);lg.connect(f.frequency);l.start(t);l.stop(t+dur+0.05);env(gn,t,0.005,v*0.8,dur);return;}
 if(w==='pick'){const gn=gainTo(musicBus),f=filt('lowpass',1400,1,gn);f.frequency.setValueAtTime(1400,t);f.frequency.exponentialRampToValueAtTime(420,t+0.1);osc('sawtooth',mf(m),t,dur,f);osc('sine',mf(m-12),t,dur,gn);env(gn,t,0.002,v*0.85,dur);return;}
 if(w==='808'){// long sine that drops slightly into the note, a touch of grit
  const gn=gainTo(musicBus);const o=osc('sine',mf(m)*1.5,t,dur+0.2,gn);o.frequency.exponentialRampToValueAtTime(mf(m),t+0.05);
  const g2=gainTo(distIn);const o2=osc('sine',mf(m)*1.5,t,dur+0.2,g2);o2.frequency.exponentialRampToValueAtTime(mf(m),t+0.05);env(g2,t,0.004,v*0.25,dur);
  gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v*1.2,t+0.006);gn.gain.setValueAtTime(v*1.1,t+dur*0.6);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.15);return;}
 if(w==='reese'){const gn=gainTo(musicBus),f=filt('lowpass',380,1,gn);osc('sawtooth',mf(m)*1.006,t,dur,f);osc('sawtooth',mf(m)*0.994,t,dur,f);osc('sine',mf(m-12),t,dur,gn);
  gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v,t+0.03);gn.gain.setValueAtTime(v,t+dur*0.8);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);return;}
 if(w==='slap'){const gn=gainTo(musicBus),f=filt('lowpass',2400,4,gn);f.frequency.setValueAtTime(2400,t);f.frequency.exponentialRampToValueAtTime(260,t+0.12);osc('square',mf(m),t,dur,f);osc('sine',mf(m-12),t,dur,gn);env(gn,t,0.003,v*0.9,dur);return;}
 if(w==='organ'){const gn=gainTo(musicBus),f=filt('lowpass',700,0.7,gn);osc('square',mf(m),t,dur,f);osc('sine',mf(m-12),t,dur,gn);env(gn,t,0.004,v*0.8,dur);return;}
 if(w==='dist'){const gn=gainTo(distIn),f=filt('lowpass',900,1,gn);osc('sawtooth',mf(m),t,dur,f);env(gn,t,0.003,v*0.8,dur);const g2=gainTo(musicBus);osc('sine',mf(m-12),t,dur,g2);env(g2,t,0.003,v*0.6,dur);return;}
 const gn=gainTo(musicBus),f=filt('lowpass',900,0,gn);f.frequency.setValueAtTime(w==='roll'?1200:900,t);f.frequency.exponentialRampToValueAtTime(240,t+dur);
 osc('sawtooth',mf(m),t,dur,f);osc('sine',mf(m-12),t,dur,gn);env(gn,t,0.004,v,dur);}

// ---- pads, keys, leads ----
function pad(t,ms,dur,v,gate){const st=SONG.pad;if(st==='none')return;
 const gn=gainTo(musicBus);gn.connect(verbIn);const f=filt('lowpass',st==='warm'?1100:1500,0,gn);
 for(const m of ms){if(st==='vocoder'){osc('square',mf(m)*1.004,t,dur+0.6,f);osc('square',mf(m)*0.996,t,dur+0.6,f);}
  else if(st==='warm'){osc('triangle',mf(m)*1.003,t,dur+0.6,f);osc('sine',mf(m)*0.997,t,dur+0.6,f);}
  else{osc('sawtooth',mf(m)*1.005,t,dur+0.6,f);osc('sawtooth',mf(m)*0.995,t,dur+0.6,f);}}
 gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v,t+0.2);
 if(gate){const pat=[1,0.15,1,1];const n=Math.round(dur/STEP);for(let i=0;i<n;i++)gn.gain.setValueAtTime(Math.max(0.0001,v*pat[i%4]),t+i*STEP);}
 gn.gain.setValueAtTime(v,t+dur);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.5);}
function arp(t,m,v){const gn=gainTo(musicBus);gn.connect(verbIn);const f=filt('lowpass',2400,0,gn);osc('triangle',mf(m),t,0.25,f);osc('square',mf(m),t,0.25,f).detune.value=6;env(gn,t,0.004,v,0.2);}
function piano(t,m,dur,v,out=musicBus){const gn=gainTo(out);gn.connect(verbIn);const f=filt('lowpass',3200,0,gn);
 const fr=mf(m),d=Math.min(2.2,0.5+dur*1.4);
 for(const[h,a]of[[1,1],[2,0.32],[3,0.12],[4,0.05]]){const g2=A.createGain();g2.gain.value=a;g2.connect(f);osc(h===1?'triangle':'sine',fr*h*(h>1?1.001:1),t,d,g2);}
 gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v,t+0.004);gn.gain.exponentialRampToValueAtTime(v*0.35,t+0.25);gn.gain.exponentialRampToValueAtTime(0.0001,t+d);}
function epiano(t,m,dur,v,out=musicBus){// soft bell-less electric piano: sine pair with a slow tremolo
 const gn=gainTo(out);gn.connect(verbIn);const f=filt('lowpass',2200,0,gn);const fr=mf(m),d=Math.min(2,0.4+dur*1.3);
 osc('sine',fr,t,d,f);const g2=A.createGain();g2.gain.value=0.25;g2.connect(f);osc('sine',fr*2.001,t,d*0.5,g2);
 const tr=A.createOscillator();tr.frequency.value=5;const tg=A.createGain();tg.gain.value=v*0.18;tr.connect(tg);tg.connect(gn.gain);tr.start(t);tr.stop(t+d+0.05);
 gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v,t+0.006);gn.gain.exponentialRampToValueAtTime(v*0.4,t+0.3);gn.gain.exponentialRampToValueAtTime(0.0001,t+d);}
function pluck(t,m,dur,v,out=musicBus){const gn=gainTo(out);gn.connect(verbIn);const f=filt('lowpass',2600,3,gn);f.frequency.setValueAtTime(2600,t);f.frequency.exponentialRampToValueAtTime(500,t+0.25);
 osc('sawtooth',mf(m)*1.003,t,0.5,f);osc('sawtooth',mf(m)*0.997,t,0.5,f);env(gn,t,0.003,v*0.8,0.35+dur*0.3);}
function sawLead(t,m,dur,v,out=musicBus){const gn=gainTo(out);gn.connect(verbIn);const f=filt('lowpass',1300,5,gn);f.frequency.setValueAtTime(1800,t);f.frequency.exponentialRampToValueAtTime(600,t+dur+0.1);
 osc('sawtooth',mf(m),t,dur+0.1,f);osc('square',mf(m-12)*1.002,t,dur+0.1,f);
 gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v*0.7,t+0.01);gn.gain.setValueAtTime(v*0.6,t+dur);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.12);}
function vib(o,t,rate,depth,delay){const l=A.createOscillator();l.frequency.value=rate;const lg=A.createGain();lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(depth,t+delay+0.1);l.connect(lg);lg.connect(o.detune);l.start(t);l.stop(t+3);}
function sax(t,m,dur,v,out=musicBus){// breathy reed: a buzzy wave through a moving formant, vibrato that blooms late
 const gn=gainTo(out);gn.connect(verbIn);const f=filt('bandpass',900,1.4,gn);f.frequency.setValueAtTime(800,t);f.frequency.linearRampToValueAtTime(1400,t+0.06);f.frequency.setTargetAtTime(1000,t+0.08,0.2);
 const lp2=filt('lowpass',2600,0,f);const o=osc('sawtooth',mf(m),t,dur+0.12,lp2);o.frequency.setValueAtTime(mf(m)*0.97,t);o.frequency.exponentialRampToValueAtTime(mf(m),t+0.04);vib(o,t,5.2,18,0.18);
 const ng=gainTo(gn),nf=filt('bandpass',1800,1,ng);noise(t,dur,nf);env(ng,t,0.02,v*0.12,dur);
 gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v*1.1,t+0.03);gn.gain.setValueAtTime(v*0.9,t+dur);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.1);}
function squareLead(t,m,dur,v,out=musicBus){const gn=gainTo(out);gn.connect(verbIn);const f=filt('lowpass',2200,1,gn);osc('square',mf(m),t,dur+0.05,f);osc('square',mf(m)*1.004,t,dur+0.05,f);
 gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v*0.5,t+0.005);gn.gain.setValueAtTime(v*0.45,t+dur);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.06);}
function supersaw(t,m,dur,v,out=musicBus){const gn=gainTo(out);gn.connect(verbIn);const f=filt('lowpass',2400,0.5,gn);
 for(const d of[-0.012,-0.006,0,0.006,0.012])osc('sawtooth',mf(m)*(1+d),t,dur+0.15,f);osc('sawtooth',mf(m-12),t,dur+0.15,f);
 gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v*0.32,t+0.01);gn.gain.setValueAtTime(v*0.28,t+dur);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.15);}
function gtr(t,m,dur,v,out){// overdriven lead guitar with a slow vibrato
 const gn=gainTo(distIn);const f=filt('lowpass',2400,1,gn);const o=osc('sawtooth',mf(m),t,dur+0.1,f);vib(o,t,5.5,25,0.15);const o2=osc('square',mf(m)*1.003,t,dur+0.1,f);vib(o2,t,5.5,25,0.15);
 gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v*0.9,t+0.006);gn.gain.setValueAtTime(v*0.8,t+dur);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.1);}
function power(t,root,dur,v){// power chord: root, fifth, octave, through the drive
 const gn=gainTo(distIn);const f=filt('lowpass',1700,1,gn);for(const iv of[0,7,12]){osc('sawtooth',mf(root+iv),t,dur,f);osc('sawtooth',mf(root+iv)*1.004,t,dur,f);}env(gn,t,0.003,v,dur);}
function lofi(t,m,dur,v,out=musicBus){// a worn electric piano on old tape: soft, a little out of tune
 const gn=gainTo(out);gn.connect(verbIn);const f=filt('lowpass',1500,0,gn);const d=Math.min(2,0.4+dur*1.3);
 const o=osc('triangle',mf(m),t,d,f);vib(o,t,0.8,9,0);const o2=osc('sine',mf(m)*2.002,t,d*0.4,f);
 gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v,t+0.01);gn.gain.exponentialRampToValueAtTime(v*0.4,t+0.3);gn.gain.exponentialRampToValueAtTime(0.0001,t+d);}
function shaku(t,m,dur,v,out=musicBus){// bamboo flute: scoops up into the note, breath, late vibrato
 const gn=gainTo(out);gn.connect(verbIn);const f=filt('lowpass',1900,0,gn);const o=osc('triangle',mf(m-1),t,dur+0.15,f);o.frequency.exponentialRampToValueAtTime(mf(m),t+0.07);vib(o,t,5,22,0.2);
 const o2=osc('sine',mf(m-1)*2,t,dur+0.15,f);o2.frequency.exponentialRampToValueAtTime(mf(m)*2,t+0.07);
 const ng=gainTo(gn),nf=filt('bandpass',mf(m)*2,2,ng);noise(t,dur,nf);env(ng,t,0.03,v*0.3,dur);
 gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v,t+0.05);gn.gain.setValueAtTime(v*0.85,t+dur);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.15);}
function koto(t,m,v,out=musicBus){// plucked silk string: bright attack, quick fall, a little bend
 const gn=gainTo(out);gn.connect(verbIn);const f=filt('lowpass',3000,2,gn);f.frequency.setValueAtTime(3000,t);f.frequency.exponentialRampToValueAtTime(700,t+0.3);
 const o=osc('triangle',mf(m),t,0.9,f);const o2=osc('sawtooth',mf(m),t,0.9,f);o2.detune.value=5;env(gn,t,0.002,v,0.7);}
function kotoGliss(t,ms,v){for(let i=0;i<6;i++)koto(t+i*0.035,ms[i%ms.length]+12*Math.floor(i/ms.length),v*(0.5+i*0.1));}
function lead(t,m,dur,v,out){const l=SONG.lead;return(l==='epiano'?epiano:l==='pluck'?pluck:l==='saw'?sawLead:l==='sax'?sax:l==='square'?squareLead:l==='supersaw'?supersaw:l==='gtr'?gtr:l==='lofi'?lofi:l==='shaku'?shaku:piano)(t,m,dur,v,out);}
function riser(t,dur,v){const gn=gainTo(musicBus),f=filt('bandpass',300,2,gn);f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(2600,t+dur);
 const s=A.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.connect(f);s.start(t);s.stop(t+dur+0.05);gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(v,t+dur);gn.gain.linearRampToValueAtTime(0,t+dur+0.04);}
function impact(t,v){const gn=gainTo(master);const o=osc('sine',70,t,1.8,gn);o.frequency.exponentialRampToValueAtTime(32,t+1.6);env(gn,t,0.005,v,1.7);}

// ---- sfx (not muffled: the hero's own color) ----
let slashN=0;
// The cut is a percussion voice, not a note: a swish of air shaped like the blade's path,
// with a short body so it lands like a snare or shaker in the groove.
function swish(t,f0,f1,dur,v,q,atk){const ng=gainTo(sfxBus),nf=filt('bandpass',f0,q||1.4,ng);nf.frequency.setValueAtTime(f0,t);nf.frequency.exponentialRampToValueAtTime(f1,t+dur);noise(t,dur+0.02,nf);
 ng.gain.setValueAtTime(0.0001,t);ng.gain.exponentialRampToValueAtTime(v,t+(atk||dur*0.35));ng.gain.exponentialRampToValueAtTime(0.0001,t+dur);}
function thump(t,f0,v,dur){const gn=gainTo(sfxBus);const o=osc('sine',f0,t,dur,gn);o.frequency.exponentialRampToValueAtTime(f0*0.45,t+dur);env(gn,t,0.002,v,dur);}
function sfxCut(mo,perfect,big){const t=A.currentTime,v=perfect?1:0.75;
 // a finisher hits hardest right on the cut: short, loud at once, no slow swell that would sound late
 if(big){const a=0.004;
  if(mo==='spin'){swish(t,3200,900,0.05,0.22*v,1.2,a);swish(t+0.03,3400,800,0.05,0.2*v,1.2,a);}
  else if(mo==='cross'){swish(t,3400,900,0.05,0.22*v,1.2,a);swish(t+0.03,900,3400,0.05,0.2*v,1.2,a);}
  else swish(t,3000,800,0.06,0.24*v,1,a);
  thump(t,120,0.3*v,0.12);
  {const ng=gainTo(sfxBus),nf=filt('bandpass',900,1.2,ng);noise(t+0.004,0.04,nf);env(ng,t+0.004,0.001,0.24*v,0.035);}
  {const ng=gainTo(sfxBus),nf=filt('lowpass',1200,0,ng);noise(t,0.07,nf);env(ng,t,0.002,0.14,0.06);}
  return;}
 if(mo==='cutUp'||mo==='rise'||mo==='jumpCut')swish(t,900,3400,0.09,0.2*v);
 else if(mo==='thrust'){swish(t,2400,1600,0.05,0.2*v,0.8);thump(t,170,0.16*v,0.06);}
 else if(mo==='spin'){swish(t,3000,900,0.07,0.18*v);swish(t+0.06,3200,800,0.09,0.2*v);}
 else if(mo==='cross'){swish(t,3200,900,0.06,0.2*v);swish(t+0.05,900,3200,0.07,0.2*v);}
 else if(mo==='sweep'||mo==='slideCut'){swish(t,2600,700,0.13,0.2*v,1);}
 else if(mo==='pierce'){swish(t,1800,2800,0.1,0.18*v);}
 else swish(t,3400,800,0.08,0.2*v);
 thump(t+0.01,150,0.13*v,0.07);
 // the drone's shell giving way: a dry crunch right after the blade passes
 {const ng=gainTo(sfxBus),nf=filt('bandpass',1300,1.2,ng);noise(t+0.015,0.05,nf);env(ng,t+0.015,0.001,0.16*v,0.045);}
}
function sfxWhoosh(up){const t=A.currentTime;const ng=gainTo(sfxBus),nf=filt('bandpass',up?900:600,1.5,ng);nf.frequency.setValueAtTime(up?600:1200,t);nf.frequency.exponentialRampToValueAtTime(up?1600:350,t+0.18);noise(t,0.22,nf);env(ng,t,0.01,0.12,0.18);}
function sfxSwing(){const t=A.currentTime;const ng=gainTo(sfxBus),nf=filt('bandpass',1500,0,ng);noise(t,0.07,nf);env(ng,t,0.002,0.04,0.06);}
function sfxMiss(){const t=A.currentTime;const gn=gainTo(sfxBus);const o=osc('sine',110,t,0.25,gn);o.frequency.exponentialRampToValueAtTime(48,t+0.2);env(gn,t,0.003,0.35,0.22);
 const ng=gainTo(sfxBus),nf=filt('lowpass',600,0,ng);noise(t,0.2,nf);env(ng,t,0.002,0.2,0.18);
 lp.frequency.cancelScheduledValues(t);lp.frequency.setTargetAtTime(260,t,0.02);}
function sfxRelease(good){const t=A.currentTime;impact(t,good?0.9:0.5);if(good){const c=CH[0];for(const m of[...c.pad,c.pad[0]+12,c.pad[2]+12])piano(t,m,2,0.1,sfxBus);}}

// ---- arrangement ----
function drumHit(p,st){return p[st]==='x';}
// feel: a player leans on the downbeat, rides the offbeat hats, lets the in-between 16ths fall back,
// and sits the backbeat a hair late. The jitter is hashed so a song plays the same every time.
const kv=st=>st===0?1.08:st===8?0.97:0.9;
const hv=(st,bar)=>(st%4===0?0.8:st%4===2?1:0.62)*(0.92+0.16*hash(bar,st,3));
const LAY=0.006;
// a phrase leans into the next one: the last beat of every 4 bars fills (bigger before a section change)
function fill(st,t,big){if(st<(big?12:14))return;const i=st-12;
 if(SONG.kit==='jazz'){if(st>=14)ghost(t,0.08+0.03*i);return;}
 if(SONG.kit==='rock'||SONG.kit==='taiko'){tom(t,[210,180,150,120][i],0.18+0.03*i);return;}
 snare(t,0.12+0.04*i);}
// the last chorus turns home through the dominant of its first chord, when the melody there fits over it
function turnChord(){const nx=CH[0],cur=CH[3];let r=nx.root+7;while(r>cur.root+6)r-=12;while(r<cur.root-6)r+=12;
 const pcs=[0,4,7,10].map(i=>(r+i)%12);if(cur.root%12===r%12)return null;
 const ok=MEL[3].filter(n=>n[0]>=8).every(n=>[0,2,4,7,9,10].includes(((n[1]-r)%12+12)%12));if(!ok)return null;
 const pad=cur.pad.map(m=>{let best=m,bd=99;for(let c=m-3;c<=m+3;c++)if(pcs.includes(((c%12)+12)%12)&&Math.abs(c-m)<bd){bd=Math.abs(c-m);best=c;}return best;});
 return{root:r,pad:[...new Set(pad)]};}
// melodies may sit off the 16th grid (triplets): such a note is placed from the unswung step time
let T0=0;
const onStep=(ms,st)=>Math.floor(ms)===st;
const atStep=(ms,t)=>ms===Math.floor(ms)?t:T0+(ms-Math.floor(ms))*STEP;
// walking bass: root, fifth, third, then a half step into the next chord
function walk(st,t,ch,next,v){if(st%4)return;const r=ch.root,n=next.root;const line=[r,r+7,r+(ch.pad.some(m=>(m-r)%12===3)?3:4)+12,n+(n>r?-1:1)];bass(t,line[st/4],B*0.9,v);}
// the band at full strength on one chord: shared by the drop and the endings
function bandKeys(st,t,ch,S,bar){const K=SONG.keys;
 if(K==='stab'&&st%4===2)for(const m of ch.pad)piano(t,m+12,STEP*1.5,0.06*S);
 if(K==='comp'&&(st===0||st===6||st===10))for(const m of ch.pad)epiano(t,m,STEP*3,0.06*S);
 if(K==='clav'&&(st===2||st===7||st===11||st===14))for(const m of ch.pad)pluck(t,m+12,STEP,0.05*S);
 if(K==='jcomp'&&(st===2||st===10||(bar%2===1&&st===7)))for(const m of ch.pad)piano(t,m,STEP*2,0.05*S);
 if(K==='power'&&st%2===0)power(t,ch.root+12,STEP*(st%8===0?1.8:0.9),0.16*S);
 if(K==='koto'){if(st===0)kotoGliss(t,ch.pad.map(m=>m+12),0.05*S);else if(st%4===2)koto(t,ch.pad[(st/4|0)%ch.pad.length]+12,0.05*S);}}
function trapRoll(st,t,v,bar){if(SONG.kit!=='trap')return;if(st===12||(bar%2===1&&st===6))for(let i=0;i<3;i++)hat(t+i*STEP*2/3,v);}
function playStep(s,t0){
 const bar=Math.floor(s/16),st=s%16;if(bar>=TOTAL_BARS)return;
 const t=t0+(st%2===1?SONG.swing*STEP:0)+(SONG.swing8&&st%4===2?SONG.swing8*STEP:0);T0=t0;
 const si=secAt(bar),type=SECTIONS[si][0],rel=bar-secStart[si],len=SECTIONS[si][1],k=KOF[si];
 if(rel===0&&st===0)applyTrim(si,t0,type==='drop'?0.03:0.3);
 let ch=CH[bar%4];const q=st%4===0,D=SONG.drums;
 const bassPat=()=>{for(const[bs,o,l]of SONG.bass)if(bs===st)return[o,l];return null;};
 if(type==='intro'){introStep(rel,st,t,ch);
 }else if(type==='build'){
  const r=ratio(k);
  if(drumHit(D.k,st))kick(t,0.85);
  if(SONG.walk)walk(st,t,ch,CH[(bar+1)%4],0.26);else if(st%2===0)bass(t,ch.root+(st%8===4?12:0),B*0.45,0.26);
  if(st===0)pad(t,ch.pad,BAR,0.02+0.07*r);
  if(rel>=4&&drumHit(D.h,st))hat(t,0.035);
  if(rel>=len-2){
   const roll=rel===len-2?(st%4===0):(st<8?st%2===0:true);
   if(roll)snare(t,0.12+0.25*((rel-(len-2))*16+st)/32);
   if(rel===len-2&&st===0)riser(t,BAR*2,0.18);
  }
 }else if(type==='drop'){
  const S=dropSat(k);
  if(keyupOn()&&k===1){// the last chorus steps up a whole tone halfway through
   if(rel===3&&st>=12)snare(t,0.18+0.04*(st-12));
   if(rel===4&&st===0){CH=CH.map(c=>({root:c.root+2,pad:c.pad.map(m=>m+2)}));MEL=MEL.map(b=>b.map(x=>[x[0],x[1]+2,...x.slice(2)]));MEL_END=MEL_END.map(x=>[x[0],x[1]+2,...x.slice(2)]);if(HOME)HOME={root:HOME.root+2,pad:HOME.pad.map(m=>m+2)};impact(t,0.5);cymbal(t,0.05);}}
  ch=CH[bar%4];
  const turn=k===1&&rel===3&&!keyupOn()&&SONG.turn!==false?turnChord():null;if(turn&&st>=8)ch=turn;
  if(drumHit(D.k,st))kick(t,kv(st));
  if(rel%4===3)fill(st,t,rel===len-1);
  if(rel===4&&st===0&&SONG.kit!=='jazz'&&SONG.kit!=='rock'&&!(keyupOn()&&k===1))cymbal(t,0.035);
  if(rel===0&&st===0)impact(t,0.6);
  if(SONG.walk)walk(st,t,ch,CH[(bar+1)%4],0.34);else{const bp=bassPat();// the second chorus kicks the bass up an octave into each new phrase
   if(bp){const up=k===1&&bar%4===3&&st>=12&&bp[0]<12?12:0;bass(t,ch.root+bp[0]+up,bp[1]*STEP*0.9,0.34*(st===0?1.1:0.95));}}
  if(drumHit(D.s,st))snare(t+LAY,0.32);
  if(drumHit(D.h,st))hat(t,((SONG.kit==='ind'?0.025:0.035)+0.04*S)*hv(st,bar),SONG.kit==='house'&&st%4===2);
  if(drumHit(D.g,st))ghost(t,0.05+0.05*S);trapRoll(st,t,0.035+0.04*S,bar);
  if(SONG.kit==='rock'&&st===0&&rel%4===0)cymbal(t,0.04);
  if(st===0)pad(t,ch.pad,turn?BAR/2:BAR,0.04+0.08*S,SONG.pad==='gate');
  if(turn&&st===8)pad(t,ch.pad,BAR/2,0.04+0.08*S,SONG.pad==='gate');
  if(SONG.arp&&S>0.25){const tones=ch.pad.map(m=>m+12);arp(t,tones[[0,1,2,1][st%4]]+(st>=8&&S>0.7?12:0),0.045*S);}
  if(S>0.2)bandKeys(st,t,ch,S,bar);
  if(S>0.15){const mel=(k===1&&bar%4===3&&rel===len-1)?MEL_END:MEL[bar%4];for(const[ms,m,l]of mel)if(onStep(ms,st)){const tt=atStep(ms,t),pv=phraseV(mel,ms,bar),g=gateOf(l);lead(tt,m,l*STEP*g,0.2*Math.pow(S,0.7)*pv);if(k===1&&S>0.6)lead(tt,m-12,l*STEP*g,0.08*S*pv);}}
 }else if(type==='break'){
  const S=Math.max(0.35,districtSat[0]);
  if(st===0){pad(t,ch.pad,BAR,0.07);bass(t,ch.root,BAR*0.95,0.2);}
  if(SONG.pad==='none'&&st===0)for(const m of ch.pad)epiano(t,m,BAR,0.05);
  if(q){const tones=[ch.root+12,...ch.pad];lead(t,tones[(st/4)%tones.length],B,0.1*S+0.04);}
  for(const[ms,m,l]of MEL[bar%4])if(onStep(ms,st)&&rel>=2)lead(atStep(ms,t),m,l*STEP,0.14*S);
  if(rel===len-1&&st===12)kick(t,0.6);
 }else if(type==='outro'){if(endingOf()==='hits')outroStep(rel,st,t);else endingStep(rel,st,t);}
}

// ---- how each song begins: four gray bars that already sound like its genre ----
function introStep(rel,st,t,ch){const D=SONG.drums,q=st%4===0,style=SONG.intro;
 if(style==='arp'){// a lone arpeggio, then the beat walks in
  const tones=ch.pad.map(m=>m+12);arp(t,tones[[0,1,2,1][st%4]],0.02+0.012*(rel*16+st)/16);
  if(rel>=2&&q)kick(t,0.8);if(rel===3&&st%2===0)bass(t,ch.root,B*0.4,0.24);}
 else if(style==='piano'){// house piano chords alone, then the four-on-the-floor
  if(st===0||st===6||st===10)for(const m of ch.pad)piano(t,m+12,STEP*3,0.07);
  if(rel>=2&&q)kick(t,0.85);if(rel===3&&st%4===2)hat(t,0.04,true);if(rel===3&&st%4===2)bass(t,ch.root,B*0.4,0.28);}
 else if(style==='swell'){// one long pad rising out of nothing
  if(rel===0&&st===0)pad(t,ch.pad,BAR*4,0.08);
  if(rel===2&&st===0)riser(t,BAR*2,0.12);
  if(rel>=2&&q)kick(t,0.8);if(rel===3&&st>=8&&st%2===0)snare(t,0.1+0.02*(st-8));}
 else if(style==='rain'){// rain on the street and a few electric-piano chords, then a drum fill
  if(st===0||st===10)for(const m of ch.pad)epiano(t,m,STEP*5,0.05);
  if(rel>=2&&drumHit(D.h,st))hat(t,0.025);
  if(rel===3&&st>=8)snare(t,0.08+0.015*(st-8));if(rel===3&&st===0)kick(t,0.7);}
 else if(style==='drums'){// the drummer counts the market in alone
  if(drumHit(D.k,st))kick(t,0.8);if(drumHit(D.s,st))snare(t,0.26);if(drumHit(D.h,st))hat(t,0.03);if(drumHit(D.g,st))ghost(t,0.05);
  if(rel>=2){for(const[bs,o,l]of SONG.bass)if(bs===st)bass(t,ch.root+o,l*STEP*0.9,0.26);}}
 else if(style==='machine'){// machines clanking in the dark, a pulse, then the kick
  if(hash(rel,st,11)<0.28)clank(t,0.12);
  if(rel>=1&&(st===2||st===3||st===10||st===11))bass(t,ch.root,STEP*0.8,0.22);
  if(rel>=2&&q)kick(t,0.85);if(rel===3&&st===0)riser(t,BAR,0.12);}
 else if(style==='walk'){// the bass walks in alone with the hi-hat on 2 and 4, then piano and ride
  walk(st,t,ch,CH[(rel+1)%4],0.26);if(st===4||st===12)ghost(t,0.07);
  if(rel>=2&&(st===2||st===10))for(const m of ch.pad)piano(t,m,STEP*2,0.04);if(rel===3&&drumHit(D.h,st))hat(t,0.03);}
 else if(style==='chip'){// a square-wave arpeggio, then the bouncing octave bass and the kick
  const tones=ch.pad.map(m=>m+12);arp(t,tones[[0,1,2,1][st%4]]+(st%8>=4?12:0),0.035);
  if(rel>=2&&st%2===0)bass(t,ch.root+(st%4===2?12:0),STEP*0.9,0.24);if(rel===3&&q)kick(t,0.8);}
 else if(style==='pump'){// the kick alone, pumping a pad; claps, then the riser
  if(q)kick(t,0.85);if(st===0)pad(t,ch.pad,BAR,0.06);if(rel>=2&&(st===4||st===12))snare(t,0.2);if(rel===3&&st===0)riser(t,BAR,0.14);}
 else if(style==='riff'){// the guitar alone, palm-muted, then a fill brings the drums in
  if(st%2===0)power(t,ch.root+12,STEP*(rel>=2?1.6:0.8),0.12);
  if(rel===1&&st>=12)snare(t,0.12+0.04*(st-12));if(rel>=2){if(drumHit(D.k,st))kick(t,0.8);if(drumHit(D.s,st))snare(t,0.24);if(drumHit(D.h,st))hat(t,0.03);}
  if(rel>=2){for(const[bs,o,l]of SONG.bass)if(bs===st)bass(t,ch.root+o,l*STEP*0.9,0.24);}}
 else if(style==='vinyl'){// an old record: worn keys alone, then the 808 and the drums drop in
  if(st===0||st===6||st===10)for(const m of ch.pad)lofi(t,m,STEP*3,0.05);
  if(rel>=2){if(drumHit(D.k,st))kick(t,0.8);if(drumHit(D.s,st))snare(t,0.22);if(drumHit(D.h,st))hat(t,0.025);}
  if(rel>=2){for(const[bs,o,l]of SONG.bass)if(bs===st)bass(t,ch.root+o,l*STEP*0.9,0.26);}}
 else if(style==='koto'){// a koto alone, then the big drum, then the beat
  if(st===0)kotoGliss(t,ch.pad.map(m=>m+12),0.05);else if(st%4===2)koto(t,ch.pad[(st/4|0)%ch.pad.length]+12,0.045);
  if(rel>=2&&(st===0||st===8))kick(t,0.9);if(rel===3&&q)kick(t,0.8);if(rel===3&&st>=12)snare(t,0.12+0.04*(st-12));}
}
// ---- the last chorus lands ----
// Every ending keeps the band at full strength to the end; they differ in where the song arrives:
// tag = the last line once more over bVI -> bVII, landing on I (major) / intro = the song's opening motif comes back
// in full color and lands home / fade = the band keeps running and fades into the distance / cut = one hit on the
// downbeat and silence. Some genres have their own: turnaround (jazz), stutter (techno pop), build (electro),
// rockout (rock), tapestop (hip hop), taiko (Japanese). A whole-tone key change in the last chorus (keyup) can go with any.
// HOME: the chord a song resolves to when it is not the first chord of its loop (jazz ii-V-I, pop IV-V-iii-vi)
let HOME=null;
const home=()=>HOME||CH[0];
function endKey(){const r=home().root;let L=r;while(L<60)L+=12;while(L>71)L-=12;return {r,L};}
function triad(R){const pc=((R%12)+12)%12,out=[];for(const iv of [0,4,7]){let m=pc+iv;while(m<55)m+=12;out.push(m);}return out.sort((a,b)=>a-b);}
const TAG_MEL=[[[0,3,3],[3,0,3],[6,3,2],[8,8,6],[14,7,2]],[[0,5,3],[3,2,3],[6,5,2],[8,10,4],[12,10,2],[14,11,2]]];
function fullBand(st,t,root,ms,S,next){const D=SONG.drums,ch={root,pad:ms};
 if(drumHit(D.k,st))kick(t,kv(st));if(drumHit(D.s,st))snare(t+LAY,0.32);if(drumHit(D.h,st))hat(t,((SONG.kit==='ind'?0.025:0.035)+0.04*S)*hv(st,0),SONG.kit==='house'&&st%4===2);if(drumHit(D.g,st))ghost(t,0.05+0.05*S);
 trapRoll(st,t,0.035+0.04*S,1);
 if(SONG.walk)walk(st,t,ch,next||ch,0.34);else for(const[bs,o,l]of SONG.bass)if(bs===st)bass(t,root+o,l*STEP*0.9,0.34);
 if(st===0)pad(t,ms,BAR,0.04+0.08*S,SONG.pad==='gate');
 if(SONG.arp)arp(t,ms[[0,1,2,1][st%4]]+12+(st>=8?12:0),0.045*S);
 bandKeys(st,t,ch,S,1);}
function landHit(t,S,ms,root,lt,len){// everyone stops together on the chord; len is how long it rings
 kick(t,1);snare(t,0.34);impact(t,0.6);cymbal(t,len>BAR?0.06:0.035);bass(t,root,Math.min(len,BAR*2),0.34);
 pad(t,[...ms,ms[0]+12],len*1.2,0.06+0.06*S);stabChord(t,ms.map(m=>m+12),Math.min(len,STEP*16),0.08*(0.4+0.6*S));
 if(lt!=null){lead(t,lt,Math.min(len,STEP*16),0.2*Math.pow(S,0.7));lead(t,lt-12,Math.min(len,STEP*16),0.08*S);}
 if(SONG.outro==='powerdown')powerDown(t+Math.min(len,BAR)*0.6,root,BAR*1.4);}
// the opening motif of each song, played over the full band when the song comes home
function introMotif(st,t,ch,S){const style=SONG.intro,v=0.4+0.6*S;
 if(style==='arp'){const tones=ch.pad.map(m=>m+12);arp(t,tones[[0,1,2,1][st%4]]+(st>=8?12:0),0.05*v);}
 else if(style==='piano'){if(st===0||st===6||st===10)for(const m of ch.pad)piano(t,m+12,STEP*3,0.075*v);}
 else if(style==='swell'){if(st%2===0){const tones=ch.pad.map(m=>m+12);pluck(t,tones[(st/2)%tones.length]+(st>=8?12:0),STEP*2,0.05*v);}}
 else if(style==='rain'){if(st===0||st===10)for(const m of ch.pad)epiano(t,m,STEP*5,0.07*v);}
 else if(style==='drums'){if(st===13||st===15)ghost(t,0.08);}
 else if(style==='machine'){if(hash(st,7,11)<0.35)clank(t,0.12);}}
// a sung line breathes: the bar's first note leans in, its last one falls away, and short notes are detached
function phraseV(mel,ms,bar){const i=mel.findIndex(n=>n[0]===ms);return(i===0?1.12:i===mel.length-1?0.86:1)*(0.95+0.1*hash(bar,Math.round(ms*3),5));}
const gateOf=l=>l<=2?0.8:l<=4?0.9:1;
function melLine(bar,st,t,L0,v,S){for(const[ms2,m,l]of bar)if(onStep(ms2,st)){const tt=atStep(ms2,t);lead(tt,L0+m,l*STEP,v);if(S>0.6)lead(tt,L0+m-12,l*STEP,0.08*S);}}
const absMel=b=>b.map(([a,m,l])=>[a,m,l]);
// the home note nearest to where the melody's last phrase ends, so the landing resolves the line
function homeTop(){const last=MEL_END[MEL_END.length-1][1],pc=((home().root%12)+12)%12;let best=last;for(let m=last-6;m<=last+6;m++)if(((m%12)+12)%12===pc){best=m;break;}return best;}
function endingStep(rel,st,t){
 const en=endingOf(),S=avgSat(),{r,L}=endKey(),melV=0.2*Math.pow(S,0.7);
 const fill=()=>{if(st>=12)snare(t,0.16+0.05*(st-12));};
 if(en==='tag'){
  if(rel<=1){const R=rel===0?r-4:r-2;fullBand(st,t,R,triad(R),S);if(rel===1)fill();melLine(TAG_MEL[rel],st,t,L,melV,S);return;}
  if(rel===2&&st===0)landHit(t,S,triad(r),r,L+12,BAR*2);return;}
 if(en==='intro'){// home: the opening motif returns over i -> V, then lands on the home chord
  const c=rel===0?CH[0]:CH[3];
  if(rel<=1){fullBand(st,t,c.root,c.pad,S);introMotif(st,t,c,S);if(rel===1)fill();melLine(absMel(rel===0?MEL[0]:MEL_END),st,t,0,melV,S);return;}
  if(rel===2&&st===0){const top=homeTop();landHit(t,S,CH[0].pad,CH[0].root,top,BAR*2);introMotif(0,t+STEP*2,CH[0],S);}return;}
 if(en==='fade'){// the band keeps running into the distance
  const c=CH[rel%4];fullBand(st,t,c.root,c.pad,S);melLine(absMel(MEL[rel%4]),st,t,0,melV,S);
  if(rel===1&&st===8){master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(0.0001,t,BAR*0.9);}return;}
 if(en==='cut'){// the last line, a fill, and one clean hit on the downbeat
  const c=rel===0?CH[2]:CH[3];
  if(rel<=1){fullBand(st,t,c.root,c.pad,S);if(rel===1)fill();melLine(absMel(rel===0?MEL[2]:MEL_END),st,t,0,melV,S);return;}
  if(rel===2&&st===0){const top=homeTop();landHit(t,S,CH[0].pad,CH[0].root,top,STEP*3);}return;}
 const H=home(),top=homeTop();
 if(en==='turnaround'){// jazz: the ii-V once more, the line climbs, and the band holds the home chord under a brush roll
  const ii=CH[0],V=CH[1];
  if(rel<=1){const c=st<8?ii:V;fullBand(st,t,c.root,c.pad,S,st<8?V:H);melLine(TURN_MEL[rel],st,t,0,melV,S);if(rel===1&&st>=12)snare(t,0.12+0.03*(st-12));return;}
  if(rel===2){if(st===0)landHit(t,S,[...H.pad,H.pad[0]+9],H.root,top,BAR*2);if(st>=1&&st<12)snare(t,0.05+0.012*st);if(st===12)cymbal(t,0.05);}return;}
 if(en==='stutter'){// techno pop: IV -> V, then the home chord glitches like a skipping hologram before it holds
  const c=rel===0?CH[0]:CH[1];
  // the melody stops before its long last notes: the glitching chord is the ending, no held lead over it
  if(rel<=1){fullBand(st,t,c.root,c.pad,S);if(rel===1)fill();melLine(rel===0?absMel(MEL[0]):MEL_END.filter(n=>n[0]<8).map(([a,m,l])=>[a,m,Math.min(l,2)]),st,t,0,melV,S);return;}
  if(rel===2){if(st===0){kick(t,1);snare(t,0.3);impact(t,0.5);bass(t,H.root,STEP*8,0.3);}
   if(st<8&&st%(st<4?1:2)===0)stabChord(t,H.pad.map(m=>m+12),STEP*0.6,0.07*(0.4+0.6*S));
   if(st===8)landHit(t,S,H.pad,H.root,null,BAR*1.5);}return;}
 if(en==='build'){// electro: one more build, and the last drop is a single blast
  const c=rel===0?CH[2]:CH[3];
  if(rel===0){fullBand(st,t,c.root,c.pad,S);melLine(absMel(MEL[2]),st,t,0,melV,S);return;}
  if(rel===1){if(st===0){pad(t,c.pad,BAR,0.08);riser(t,BAR,0.2);}if(st%4===0)kick(t,0.9);const n=st<8?(st%2===0):true;if(n)snare(t,0.12+0.02*st);return;}
  if(rel===2&&st===0){landHit(t,S,H.pad,H.root,top,BAR*1.2);supersaw(t,top-12,STEP*6,0.25*S);}return;}
 if(en==='rockout'){// rock: land on the chord, let it ring while the drummer goes wild, then the last hit
  const c=rel===0?CH[1]:CH[3];
  if(rel<=1){fullBand(st,t,c.root,c.pad,S);if(rel===1)fill();melLine(absMel(rel===0?MEL[1]:MEL_END),st,t,0,melV,S);return;}
  if(rel===2){if(st===0){power(t,H.root+12,BAR*1.1,0.2);bass(t,H.root,BAR,0.3);kick(t,1);cymbal(t,0.06);lead(t,top,BAR,melV);}
   if(st>=2){const tom2=[190,160,130];if(st%2===0)tom(t,tom2[(st/2)%3],0.18+0.012*st);else snare(t,0.1+0.01*st);if(st===8)cymbal(t,0.05);}return;}
  if(rel===3&&st===0){landHit(t,S,H.pad,H.root,top,STEP*4);power(t,H.root+12,STEP*4,0.22);}return;}
 if(en==='tapestop'){// hip hop: the beat lands, then the record is stopped by hand
  const c=rel===0?CH[0]:CH[3];
  if(rel<=1){fullBand(st,t,c.root,c.pad,S);melLine(absMel(rel===0?MEL[0]:MEL_END),st,t,0,melV,S);return;}
  if(rel===2&&st===0){TAPE_T=t;landHit(t,S,H.pad,H.root,top,BAR*1.2);}return;}
 if(en==='taiko'){// the lantern street: a drum roll, the big drum on the landing, and the clapper closes the night
  const c=rel===0?CH[0]:CH[3];
  if(rel<=1){fullBand(st,t,c.root,c.pad,S);melLine(absMel(rel===0?MEL[0]:MEL_END),st,t,0,melV,S);if(rel===1&&st>=8)kick(t,0.35+0.05*(st-8));return;}
  if(rel===2){if(st===0){landHit(t,S,H.pad,H.root,top,BAR*1.2);kick(t,1.1);kotoGliss(t,H.pad.map(m=>m+12),0.06);}if(st===8)clapper(t,0.3);}return;}
}
const TURN_MEL=[[[0,74,2],[2,77,2],[4,81,2],[6,79,2],[8,77,1.33],[9.33,76,1.33],[10.67,74,1.33],[12,71,4]],[[0,74,2],[2,77,2],[4,81,2],[6,79,2],[8,77,1.33],[9.33,79,1.33],[10.67,81,1.33],[12,83,4]]];
// ---- how each song lands: IV -> V, a drum fill, then the band stops together on the hits ----
// (the stop-time ending of 電脳市場 was the one that felt right, so every song ends that way in its own voice)
function stabChord(t,ms,dur,v){const f=SONG.stab==='pluck'?pluck:SONG.stab==='epiano'?epiano:SONG.stab==='saw'?sawLead:SONG.stab==='square'?squareLead:SONG.stab==='supersaw'?supersaw:SONG.stab==='lofi'?lofi:piano;for(const m of ms)f(t,m,dur,v);}
function tom(t,f0,v){const gn=gainTo(SONG.kit==='ind'?distIn:musicBus);const o=osc('sine',f0,t,0.3,gn);o.frequency.exponentialRampToValueAtTime(f0*0.55,t+0.22);env(gn,t,0.003,v,0.26);
 const ng=gainTo(musicBus),nf=filt('bandpass',f0*3,1,ng);noise(t,0.05,nf);env(ng,t,0.002,v*0.25,0.04);}
function cymbal(t,v){const gn=gainTo(musicBus),f=filt('bandpass',2800,0.7,gn);const s=A.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.connect(f);s.start(t);s.stop(t+2.2);env(gn,t,0.004,v,2.0);}
function outroStep(rel,st,t){
 const S=avgSat(),D=SONG.drums;
 const oc=[CH[1],CH[3],CH[0],CH[0]][rel],home=CH[0];
 const melV=0.18*Math.pow(S,0.7),colorV=0.4+0.6*S;
 if(rel===0||(rel===1&&st<8)){// the groove carries on over the cadence
  if(drumHit(D.k,st))kick(t,0.9);if(drumHit(D.s,st))snare(t,0.28);if(drumHit(D.h,st))hat(t,0.035+0.03*S);if(drumHit(D.g,st))ghost(t,0.05);
  for(const[bs,o,l]of SONG.bass)if(bs===st)bass(t,oc.root+o,l*STEP*0.9,0.28);
  if(st===0)pad(t,oc.pad,BAR,0.04+0.07*S,SONG.pad==='gate');
  for(const[ms,m,l]of MEL[rel===0?1:3])if(ms===st&&ms<(rel===1?8:16)&&S>0.1)lead(t,m,l*STEP,melV);
  return;}
 if(rel===1){// second half of the bar: a fill that tells everyone the end is coming
  const fills={clean:[[8,0],[10,0],[12,1],[13,1],[14,2],[15,2]],house:[[8,0],[10,0],[11,0],[12,1],[14,1],[15,1]],break:[[8,0],[9,0],[11,1],[12,1],[13,2],[14,2],[15,2]],funk:[[8,0],[10,1],[11,1],[13,2],[14,2]],ind:[[8,0],[9,0],[10,1],[11,1],[12,2],[13,2],[14,2],[15,2]]};
  for(const[fs,lv]of fills[SONG.kit]||fills.clean)if(fs===st){if(lv===0)snare(t,0.22);else tom(t,[0,190,130][lv],0.32);}
  if(st===8)kick(t,0.8);if(st===8)riser(t,BAR/2,0.1);
  return;}
 if(rel===2){
  const hits=SONG.hits,lastH=hits[hits.length-1];
  if(!hits.includes(st))return;
  const last=st===lastH,ms=home.pad.map(m=>m+12);
  kick(t,1);snare(t,last?0.32:0.24);bass(t,home.root+(last?0:12),last?BAR*1.5:STEP*1.2,0.32);
  stabChord(t,ms,last?STEP*10:STEP*1.2,(last?0.08:0.07)*colorV);
  if(last){impact(t,0.55);cymbal(t,0.05);pad(t,[...home.pad,home.pad[0]+12],BAR*1.5,0.05+0.05*S);
   lead(t,home.pad[home.pad.length-1]+12,STEP*10,melV);if(SONG.outro==='powerdown')powerDown(t,home.root,BAR*1.6);}
 }
}
function clank(t,v){const gn=gainTo(musicBus),f=filt('bandpass',700+Math.random()*900,6,gn);noise(t,0.1,f);env(gn,t,0.002,v,0.09);const g2=gainTo(musicBus);osc('triangle',190+Math.random()*60,t,0.08,g2);env(g2,t,0.002,v*0.5,0.07);}
function powerDown(t,m,dur){const gn=gainTo(distIn),f=filt('lowpass',900,1,gn);const o=osc('sawtooth',mf(m),t,dur,f);o.frequency.exponentialRampToValueAtTime(mf(m)/4,t+dur);f.frequency.exponentialRampToValueAtTime(120,t+dur);env(gn,t,0.003,0.3,dur);}
// rain under the whole of 雨の高架下, muffled while the city is gray
let rainNode=null;
function startAmbience(t){stopAmbience();
 if(SONG.intro==='vinyl'){// crackle of an old record, all through the song
  const len=A.sampleRate*2,b=A.createBuffer(1,len,A.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()<0.0009?(Math.random()*2-1):(Math.random()*2-1)*0.02;
  const s=A.createBufferSource();s.buffer=b;s.loop=true;const f=filt('lowpass',3500,0,musicBus);const g=A.createGain();g.gain.value=0.0001;g.gain.exponentialRampToValueAtTime(0.25,t+1);s.connect(g);g.connect(f);s.start(t);rainNode={s,g};return;}
 if(SONG.intro!=='rain')return;const s=A.createBufferSource();s.buffer=noiseBuf;s.loop=true;const f=filt('bandpass',2800,0.5,musicBus);const g=A.createGain();g.gain.value=0.0001;g.gain.exponentialRampToValueAtTime(0.05,t+2);s.connect(g);g.connect(f);s.start(t);rainNode={s,g};}
function stopAmbience(){if(!rainNode)return;const t=A.currentTime;rainNode.g.gain.setTargetAtTime(0.0001,t,0.8);rainNode.s.stop(t+4);rainNode=null;}
// the hero sheathing the blade after the song's last cut: a dry click of the hilt meeting the scabbard
function sfxSheathe(){const t=A.currentTime;const gn=gainTo(sfxBus),f=filt('bandpass',1800,4,gn);noise(t,0.05,f);env(gn,t,0.001,0.12,0.04);
 thump(t+0.03,110,0.14,0.06);}
function sfxBurst(n){const t=A.currentTime;impact(t,0.55);const tones=CH[curBar()%4].pad.map(m=>m+12);
 for(let i=0;i<n;i++){const tt=t+i*0.028;const gn=gainTo(sfxBus),f=filt('lowpass',3000,0,gn);osc('triangle',mf(tones[i%tones.length]+12*Math.floor(i/tones.length%2)),tt,0.3,f);env(gn,tt,0.002,0.12,0.25);}}
