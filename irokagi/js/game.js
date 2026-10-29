'use strict';
// The screen is tall: the city and both lanes sit in the upper part, and the wet street below
// mirrors it. That lower band is where the thumb rests, so it never hides incoming enemies.
const W=135,H=300;
const cv=document.getElementById('cv'),g=cv.getContext('2d');
cv.width=W;cv.height=H;
const refl=document.createElement('canvas');refl.width=W;refl.height=H;const rg=refl.getContext('2d');
function fit(){const wr=document.getElementById('wrap'),s=Math.min(wr.clientWidth/W,wr.clientHeight/H);cv.style.width=Math.floor(W*s)+'px';cv.style.height=Math.floor(H*s)+'px';}
addEventListener('resize',fit);fit();

// ---------- song structure ----------
let SONG=SONGS[0];
let BPM=128,B=60/BPM,BAR=B*4,STEP=B/4;
const SECTIONS=[['intro',4],['build',8],['drop',8],['break',4],['build',8],['drop',8],['outro',4]];
const secStart=[];{let acc=0;for(const s of SECTIONS){secStart.push(acc);acc+=s[1];}}
const TOTAL_BARS=secStart[secStart.length-1]+SECTIONS[SECTIONS.length-1][1];let SONG_LEN=TOTAL_BARS*BAR;
const KOF=[null,0,0,null,1,1,null];
function secAt(bar){for(let i=SECTIONS.length-1;i>=0;i--)if(bar>=secStart[i])return i;return 0;}
let CH=[],MEL=[],MEL_END=[];
// how the last chorus lands (being compared): hits / tag / tame / rit / keyup
// auto = each song's own ending (songs.js). The comparison menu can force one.
let ENDING='auto',KEYUP='auto',FROM_LAST=false;
if(DEV)try{ENDING=localStorage.getItem('iro-ending2')||'auto';KEYUP=localStorage.getItem('iro-keyup')||'auto';}catch(e){}
// prototype tools: 'play' is the game, 'listen' is the BGM preview (the hero plays by itself, no cut sounds)
let MODE='play';
const VERSION='1.0.0';
// past this much output delay (Bluetooth) a cut sound arrives too late to feel like the cut, so cuts stay silent
const CUT_LAG_MAX=0.1;
const cutSounds=()=>(MODE==='play'||MODE==='demo')&&lat<=CUT_LAG_MAX;
const endingOf=()=>ENDING==='auto'?SONG.ending:ENDING;
const keyupOn=()=>KEYUP==='auto'?!!SONG.keyup:KEYUP==='on';
function stepT(s){return s*STEP;}

// ---------- rng ----------
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
let rnd=Math.random;
const pick=a=>a[Math.floor(rnd()*a.length)];
function hash(a,b,c){let h=(a*374761393+b*668265263+c*2147483647)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;}

// ---------- colors ----------
const hx=h=>{const n=parseInt(h.slice(1),16);return[n>>16&255,n>>8&255,n&255];};
function mix(a,b,t){return'rgb('+((a[0]+(b[0]-a[0])*t)|0)+','+((a[1]+(b[1]-a[1])*t)|0)+','+((a[2]+(b[2]-a[2])*t)|0)+')';}
const P={skyTopG:hx('#0d0e10'),skyBotG:hx('#2a2c31'),farG:hx('#1b1c20'),bldG:hx('#25262a'),winOffG:hx('#1c1d20'),winOnG:hx('#5d5f65'),signG:hx('#4a4b50'),railG:hx('#3a3b40'),roadG:hx('#141518'),lineG:hx('#3a3b40')};
const CORES=['#39f0ff','#ff3d8b','#ffb54a','#a6ff5a'];
let PH={};
function lerpHex(a,b,t){const x=hx(a),y=hx(b);return[x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t];}
let SPEED=105;
function applySong(sg){
 SONG=sg;BPM=sg.bpm;B=60/BPM;BAR=B*4;STEP=B/4;SONG_LEN=stepT(TOTAL_BARS*16);
 CH=sg.ch.map(([root,pad])=>({root,pad}));MEL=sg.mel;MEL_END=sg.end;HOME=sg.home?{root:sg.home[0],pad:sg.home[1]}:null;
 const p=sg.pal;PH=p;sceneFor(sg);
 P.skyTopC=hx(p.top);P.skyMidC=hx(p.mid);P.skyBotC=hx(p.bot);
 P.farC=lerpHex(p.top,p.mid,0.55);P.bldC=lerpHex(p.top,p.mid,0.3);P.winOffC=lerpHex(p.top,p.mid,0.65);P.roadC=lerpHex('#000000',p.top,0.8);
 P.winA=hx(p.winA);P.winB=hx(p.winB);P.signA=hx(p.signA);P.signB=hx(p.signB);P.railC=hx(p.rail);P.lineC=hx(p.line);
}

// ---------- sprites ----------
function sprite(rows,pal){const h=rows.length,w=Math.max(...rows.map(r=>r.length)),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
 rows.forEach((r,y)=>{[...r].forEach((ch,i)=>{if(ch!=='.'&&pal[ch]){x.fillStyle=pal[ch];x.fillRect(i,y,1,1);}});});return c;}
const HPAL={k:'#0a0a0c',h:'#3b3d44',H:'#62656e',v:'#39f0ff',V:'#c8fcff',p:'#202127',b:'#121216'};
const HERO=[sprite([
 '....kkkk....','...khhhhk...','..khHHhhhk..','..kvVvvvhk..','..kvvvvvhk..','...khhhhk...','..khhhhhhk..','.khHhhhhhhk.',
 '.khhhhhhhk..','..kkhhhhk...','...kppppk...','..kppkkppk..','..kpk..kpk..','.kbk....kbk.','.kbbk...kbbk','............'],HPAL),sprite([
 '............','....kkkk....','...khhhhk...','..khHHhhhk..','..kvVvvvhk..','..kvvvvvhk..','...khhhhk...','..khhhhhhk..',
 '.khHhhhhhhk.','.khhhhhhhk..','..kkhhhhk...','...kppppk...','...kpppk....','...kpkpk....','..kbkkbbk...','..kbbkkbbk..'],HPAL)];
const HERO_JUMP=sprite([
 '....kkkk....','...khhhhk...','..khHHhhhk..','..kvVvvvhk..','..kvvvvvhk..','...khhhhk...','.kkhhhhhhkk.','khHhhhhhhhhk',
 '.khhhhhhhk..','..kkhhhhk...','..kppppppk..','.kppkkkppk..','.kbk...kbk..','.kbbk..kbbk.','............','............'],HPAL);
const HERO_SLIDE=sprite([
 '................','........kkkk....','.......khhhhk...','......kvVvvhhk..','..kkkkkvvvvhk...','.khhhhhhhhhhhkk.',
 'kbbpppphHhhhhhhk','kbbkkkkkkkkkkkk.','.kk.............'],HPAL);
const MPAL=c=>({k:'#0a0a0c',m:'#44464d',M:'#6b6e77',c,C:'#ffffff',t:'#2a2b30'});
// body-height drone: tap, or reach it by changing lanes
const DRONES=CORES.map(c=>sprite(['.kkk.....kkk.','...k.....k...','...kkkkkkk...','..kmmmmmmmk..','.kmMccccmmmk.','.kmcCCCccmmk.','.kmcCCCccmmk.','.kmmccccmmmk.','..kmmmmmmmk..','...kk...kk...'],MPAL(c)));
// high flyer above the rail: only a jump from the upper lane reaches it
const FLYERS=CORES.map(c=>sprite(['k.............k','kk..kkkkkkk..kk','.kkkmmmmmmmkkk.','..kkmccccmmkk..','...kcCCCccmk...','...kmccccmmk...','....kmmmmmk....','.....k...k.....','.....k...k.....'],MPAL(c)));
// ground crawler on the street: only a slide along the lower lane reaches it
const CRAWLERS=CORES.map(c=>sprite(['.....kkkkk.....','....kmcCcmk....','..kkkmmmmmkkk..','.kmmmmmmmmmmmk.','kmMmmmmmmmmmmmk','kkkkkkkkkkkkkkk','ktktktktktktktk','.kkkkkkkkkkkkk.'],MPAL(c)));
// pylon floating between the lanes: only the move from one lane to the other cuts through it
const PYLONS=CORES.map(c=>sprite(['.....k.....','....kmk....','...kmmmk...','..kmmcmmk..','.kmmcCcmmk.','kmmcCCCcmmk','.kmmcCcmmk.','..kmmcmmk..','...kmmmk...','....kmk....','.....k.....'],MPAL(c)));
const KEY=sprite(['..kkkkk..','.kwwwwwk.','kwwkkkwwk','kwk...kwk','kwwkkkwwk','.kwwwwwk.','..kkwkk..','...kwk...','...kwwk..','...kwk...','...kwwk..','...kwk...','...kkk...'],{k:'#0a0a0c',w:'#ffffff'});

// ---------- game state ----------
let notes=[],holds=[],ni=0,running=false,ended=false,songStart=0,nextStep=0;
let buildStock=[0,0],buildMax=[1,1],districtSat=[0,0],released=[false,false];
let score=0,combo=0,maxCombo=0,nPerf=0,nGood=0,nMiss=0;
let kickT=-1e9,lane=1,laneFrom=1,laneT=-9,holding=null,shakeT=-1e9,swingT=-9,fx=[],dashUntil=-9,jumpT=-9,slideT=-9,jumpReach=false,slideReach=false;// one move cuts one enemy: its reach ends at the first hit; kick/shake start far in the past, since now() is -9 until audio starts
let userLat=null;try{const v=localStorage.getItem('iro-lat');if(v!=null)userLat=parseFloat(v);}catch(e){}
let quietT=null,buildings=[],bEnd=0,parts=[],rings=[],worldSat=0,held=[],kime=null;
const HERO_X=26,LANE_Y=[112,178],ROAD_END=196,MID_Y=(LANE_Y[0]+LANE_Y[1])/2-8,WIN_P=0.07,WIN_G=0.14,MOVE=0.3;
let pausedAt=null;// while paused the song's clock stands still
const now=()=>pausedAt!==null?pausedAt:A?A.currentTime-songStart-lat:-9;
const curBar=()=>Math.max(0,Math.floor(now()/BAR));
const ratio=k=>Math.min(1,buildStock[k]/buildMax[k]);
const noteY=n=>n.kind==='high'?LANE_Y[0]-42:n.kind==='low'?LANE_Y[1]-8:n.kind==='mid'?MID_Y-5:LANE_Y[n.lane]-18;

// where a beat of a bar falls in time, with the song's swing (16th swing, or swung eighths for jazz)
function beatT(bar,b){const step=b*4;let t=bar*BAR+b*B;if(Math.abs(step-Math.round(step))<1e-6){const s=Math.round(step);if(s%2===1)t+=SONG.swing*STEP;if(SONG.swing8&&s%4===2)t+=SONG.swing8*STEP;}return t;}
const MASH_N=8,HOLD_W=4;// taps that force a lock; a key or a lock carries as much color as four drones
const MIN_GAP=0.12;// two cuts closer than this are not playable; the second one is left to the music
// which steps of the last bars get a cut, per ending (a line of the melody, or plain steps)
function outroLine(en,rel){const on=a=>a&&a.map(x=>Array.isArray(x)?x[0]:x);
 const T={tag:[TAG_MEL[0],TAG_MEL[1],[0]],intro:[MEL[0],MEL_END,[0]],cut:[MEL[2],MEL_END,[0]],fade:[MEL[0],MEL[1]],
  turnaround:[TURN_MEL[0],TURN_MEL[1],[0]],stutter:[MEL[0],MEL_END,[0,8]],build:[MEL[2],[0,4,8,10,12,14],[0]],
  rockout:[MEL[1],MEL_END,[0,4,8,12],[0]],tapestop:[MEL[0],MEL_END,[0]],taiko:[MEL[0],MEL_END,[0]]}[en]||[];
 return on(T[rel]);}
function genChart(){
 const out=[];let ln=1,last=-9,lastSpecial=-9,runLen=0,target=3;const d=SONG.diff;
 // phrases: a run of cuts, then a breath. Run lengths are what pick the sword combos below.
 const TARGETS={intro:[1,2,3],break:[2,3,4,5],outro:[4,5,6,8],build:[[2,3,3,4,4,5,6],[3,3,4,4,5,5,6,7,8],[3,4,4,5,5,6,7,8,10]],drop:[[4,5,6,6,8,8,10],[5,6,8,8,10,12],[6,8,10,12,12,16]]};
 const pickTarget=type=>{const v=TARGETS[type];return pick(Array.isArray(v[0])?v[d-1]:v);};
 for(let bar=0;bar<TOTAL_BARS;bar++){
  const si=secAt(bar),type=SECTIONS[si][0],rel=bar-secStart[si],len=SECTIONS[si][1],k=KOF[si];
  let pats=null;
  if(type==='intro'){if(rel>=1)pats=[[0,2],[0,1,2]];}
  else if(type==='build'){
   if(rel===len-1){out.push({t:bar*BAR,tEnd:(bar+1)*BAR,hold:true,k,sec:type,lane:ln});last=-9;continue;}
   pats=d===1?(rel<3?[[0,1,2],[0,2,3]]:[[0,1,2,3],[0,1,2,3],[0,1,2,2.5,3]])
    :d===3?(rel<3?[[0,1,2,3],[0,1,2,2.5,3]]:[[0,1,2,2.5,3],[0,0.5,1,2,3],[0,1,1.5,2,3],[0,0.5,1,2,2.5,3]])
    :(rel<3?[[0,1,2,3],[0,2,3]]:[[0,1,2,3],[0,1,2,2.5,3],[0,0.5,1,2,3]]);
   if(rel===len-2)pats=[[0,1,2]];
  }
  else if(type==='drop'&&SONG.chartMel){// the cuts follow the melody
   const mel=(k===1&&bar%4===3&&rel===len-1)?MEL_END:MEL[bar%4];pats=[mel.map(x=>x[0]/4)];pats.zig=new Set(mel.filter(x=>x[3]==='z').map(x=>x[0]/4));
  }
  else if(type==='drop'){
   pats=d===1?[[0,1,2,2.5,3],[0,1,1.5,2,3],[0,0.5,1,2,3],[0,1,2,3,3.5]]
    :d===3?[[0,0.5,1,1.5,2,2.5,3],[0,1,1.5,2,2.5,3,3.5],[0,0.5,1,1.5,2,3,3.5],[0,0.5,1,1.5,2,2.5,3,3.5]]
    :[[0,0.5,1,2,2.5,3],[0,1,1.5,2,3,3.5],[0,0.5,1,1.5,2,3],[0,1,2,2.5,3,3.5]];
   if(B<0.4)pats=pats.map(p=>p.filter(b=>b%1===0||rnd()<0.5));// very fast songs: fewer 8ths
  }
  else if(type==='break'){pats=[[0,1,2,3],[0,2,3],[0,1,3]];}
  else if(type==='outro'&&endingOf()!=='hits'){// the cuts follow the last line of the melody, and the landing is the last cut
    const line=outroLine(endingOf(),rel);
    if(line)for(const st of line){const t=beatT(bar,st/4);if(t-last<MIN_GAP)continue;out.push({t,kind:'body',lane:ln,k,sec:type,c:Math.floor(rnd()*4)});last=t;}
    continue;}
  else if(type==='outro'){if(rel===2){// the stop-time hits: one cut per hit, in place
    for(const h of SONG.hits)out.push({t:bar*BAR+h*STEP,kind:'body',lane:ln,k,sec:type,c:Math.floor(rnd()*4)});last=bar*BAR+SONG.hits[SONG.hits.length-1]*STEP;continue;}
   pats=rel===0?[[0,1,2,3],[0,1,2,2.5,3]]:rel===1?[[0,1],[0,1,1.5]]:null;}
  if(!pats)continue;
  let pat=pick(pats);const zig=pats.zig||new Set(),melDrop=type==='drop'&&SONG.chartMel;
  if(type==='drop'&&rel===0)pat=pat.filter(b=>b>=1);
  const pSpecial=type==='intro'?(rel>=2?0.35:0):type==='build'?0.22:type==='drop'?0.28:type==='break'?0.4:rel===2?0:0.15;
  for(let i=0;i<pat.length;i++){const b=pat[i];const t=beatT(bar,b);const gap=t-last;
   if(gap<MIN_GAP)continue;
   if(gap>B*1.01){runLen=0;target=melDrop?99:pickTarget(type);}
   if(runLen>=target)continue;runLen++;
   if(zig.has(b)){ln=1-ln;out.push({t,kind:'body',lane:ln,k,sec:type,c:Math.floor(rnd()*4)});last=t;continue;}// a trill: every cut on the other lane
   const nextGap=i+1<pat.length?(pat[i+1]-b)*B:B;
   // special enemies need room before and after for the jump or slide
   if(gap>=B*0.99&&nextGap>=B*0.99&&t-lastSpecial>=B*1.9&&!zig.has(pat[i+1])&&rnd()<pSpecial){
    const kind=pick(ln===0?['high','mid']:['low','mid']);
    if(kind==='mid'){out.push({t,kind,from:ln,lane:1-ln,k,sec:type,c:Math.floor(rnd()*4)});ln=1-ln;}
    else out.push({t,kind,lane:ln,k,sec:type,c:Math.floor(rnd()*4)});
    last=t;lastSpecial=t;continue;}
   if(gap>=B*0.99&&rnd()<(type==='drop'?[0,0.3,0.4,0.5][d]:0.3))ln=1-ln;
   out.push({t,kind:'body',lane:ln,k,sec:type,c:Math.floor(rnd()*4)});last=t;}
 }
 assignCombos(out);
 return out;
}
function assignCombos(out){
 // sword combos by run length: 1-2 plain cuts, 3/4/5 have their own combos with a finisher,
 // the song's last cut is the closing pose
 const taps=out.filter(n=>!n.hold);const runs=[];let cur=[];
 for(const n of taps){if(cur.length&&n.t-cur[cur.length-1].t>B*1.01){runs.push(cur);cur=[];}cur.push(n);}
 if(cur.length)runs.push(cur);
 // the blade's register climbs through a combo and tops out on the finisher (三連撃: 中・低・高)
 const REG={1:['mid'],2:['mid','low'],3:['mid','low','high'],4:['mid','low','mid','high'],5:['mid','low','mid','low','high']};
 const COMBO={1:['cutDown'],2:['cutDown','cutUp'],3:['cutDown','cutUp','sweep'],4:['cutDown','cutUp','thrust','spin'],5:['cutUp','cutDown','thrust','rise','cross']};
 // a run longer than five is played as two or three of those combos back to back
 const split=L=>{if(L<=5)return[L];let c=Math.ceil(L/5);const out=[];for(let i=0;i<c;i++)out.push(Math.floor(L/c)+(i<L%c?1:0));return out;};
 for(const run of runs){let i0=0;
  for(const L of split(run.length)){const seq=COMBO[L];
   run.slice(i0,i0+L).forEach((n,i)=>{n.mo=n.kind==='high'?'jumpCut':n.kind==='low'?'slideCut':n.kind==='mid'?'pierce':seq[i];n.fin=L>=3&&i===L-1;n.reg=REG[L][i];});
   i0+=L;}}
 // the song's very last cut is always the closing pose, landing on the final chord
 const lastN=taps[taps.length-1];if(lastN){lastN.fin=true;lastN.pose=endingOf()!=='fade';}// fading out, the hero just keeps running
}

// ---------- edited charts ----------
// A chart can be edited by hand (tools.js) and is then played instead of a generated one.
// Stored per song as {song, notes:[[bar, beat in bar, kind, lane, raw?]], holds:[[bar, lane]]}.
// raw = a time not on the swing grid (the stop-time hits), kept exactly.
// two difficulties, each with its own charts, records and unlocks (the select screen's tab picks one and is remembered)
let DIFF='normal';try{if(localStorage.getItem('iro-diff')==='hard')DIFF='hard';}catch(e){}
const DIFF_JA={normal:'ノーマル',hard:'ハード'};
const dkey=id=>(DIFF==='normal'?'n-':'')+id;
const starOf=sg=>sg[DIFF];
const chartKey=id=>'iro-chart-'+dkey(id);
function loadChart(id){if(!DEV)return null;try{const v=localStorage.getItem(chartKey(id));return v?JSON.parse(v):null;}catch(e){return null;}}
function noteBeat(n){const bar=Math.floor((n.t+1e-6)/BAR);for(let i=0;i<48;i++){const b=i/12;if(Math.abs(beatT(bar,b)-n.t)<1e-5)return[bar,b,0];}
 return[bar,+((n.t-bar*BAR)/B).toFixed(4),1];}
function chartData(all){return{song:SONG.id,notes:all.filter(n=>!n.hold).map(n=>{const[bar,b,raw]=noteBeat(n);return raw?[bar,b,n.kind,n.lane,1]:[bar,b,n.kind,n.lane];}),
 holds:all.filter(n=>n.hold).map(h=>h.mash?[Math.round(h.t/BAR),h.lane,'mash']:[Math.round(h.t/BAR),h.lane])};}
function chartFrom(d){const out=[];
 for(const[bar,b,kind,ln,raw]of d.notes){const si=secAt(bar),t=raw?bar*BAR+b*B:beatT(bar,b);
  const n={t,kind,lane:ln,k:KOF[si],sec:SECTIONS[si][0],c:Math.floor(hash(bar,Math.round(b*12),5)*4)};if(kind==='mid')n.from=1-ln;out.push(n);}
 for(const[bar,ln,kind]of d.holds){const si=secAt(bar);out.push({t:bar*BAR,tEnd:(bar+1)*BAR,hold:true,mash:kind==='mash',taps:0,k:KOF[si],sec:SECTIONS[si][0],lane:ln});}
 out.sort((a,b)=>a.t-b.t);assignCombos(out);return out;}
// the chart from data/charts; a song pasted in with a new id has none yet, so it starts from a generated one
function fileChart(id){const c=DIFF==='normal'?window.CHARTS_N:window.CHARTS;return c&&c[id]||null;}
function baseChart(){rnd=mulberry(hash(SONG.bpm,SONG.name.length,7)*4294967296>>>0);return genChart();}// the song's own chart, the same every time

function newGame(){
 // every song has one fixed chart: the one the editor shows, or the player's edit of it
 const ed=loadChart(SONG.id)||fileChart(SONG.id);const all=ed?chartFrom(ed):baseChart();notes=all.filter(n=>!n.hold);holds=all.filter(n=>n.hold);ni=0;
 buildMax=[0,1].map(k=>Math.max(1,notes.filter(n=>n.sec==='build'&&n.k===k).length));
 buildStock=[0,0];districtSat=[0,0];released=[false,false];
 score=0;combo=0;maxCombo=0;nPerf=0;nGood=0;nMiss=0;
 lane=1;laneFrom=1;laneT=-9;holding=null;shakeT=-1e9;swingT=-9;fx=[];dashUntil=-9;jumpT=-9;slideT=-9;
 quietT=null;buildings=[];bEnd=-30;parts=[];rings=[];worldSat=0;held=[];kime=null;
 lat=userLat!=null?userLat:(A.outputLatency||0)+(A.baseLatency||0);
 songStart=A.currentTime+1.2;nextStep=0;TAPE_T=null;
 if(FROM_LAST){const fb=TOTAL_BARS-12;songStart-=fb*BAR;nextStep=fb*16;notes=notes.filter(n=>n.t>=fb*BAR+0.01);holds=holds.filter(h=>h.t>=fb*BAR);buildStock=buildMax.slice();released=[true,true];districtSat=[1,0.85];}running=true;ended=false;startAmbience(Math.max(A.currentTime+0.05,songStart));master.gain.cancelScheduledValues(A.currentTime);master.gain.setValueAtTime(0.72*(SONG.vol||1),A.currentTime);// vol evens out how loud each genre's band is
 lp.frequency.cancelScheduledValues(A.currentTime);lp.frequency.setValueAtTime(450,A.currentTime);
}

// jump to the start of a bar (BGM preview, playing from a bar in the editor). Everything before it counts as played perfectly.
function seekTo(bar){
 bar=Math.max(0,Math.min(TOTAL_BARS-1,bar|0));const t0=bar*BAR;
 if(A.state==='suspended')A.resume();resetBuses();
 songStart=A.currentTime+(MODE==='play'?1.2:0.3)-t0;nextStep=bar*16;// a player gets a moment to get ready
 TAPE_T=null;kime=null;quietT=null;holding=null;fx=[];parts=[];rings=[];
 for(const n of notes){n.done=n.t<t0-0.001;n.hitAt=null;n.missAt=null;}
 for(const h of holds){h.done=h.tEnd<=t0;h.started=false;h.taps=0;h.at=null;h.rang=false;h.mult=h.done?1:undefined;if(h.snd){h.snd(false);h.snd=null;}}
 ni=0;while(ni<notes.length&&notes[ni].done)ni++;
 for(const k of[0,1]){buildStock[k]=notes.filter(n=>n.sec==='build'&&n.k===k&&n.t<t0).length;const h=holds.find(h=>h.k===k);released[k]=!!h&&h.tEnd<=t0;districtSat[k]=released[k]?ratio(k):0;}
 combo=0;lane=1;laneFrom=1;laneT=-9;jumpT=-9;slideT=-9;dashUntil=-9;
 buildings=[];bEnd=t0*SPEED-30;worldSat=targetSat(t0);
 running=true;ended=false;startAmbience(A.currentTime+0.05);applyTrim(secAt(bar),A.currentTime,0.01);
 master.gain.cancelScheduledValues(A.currentTime);master.gain.setValueAtTime(0.72*(SONG.vol||1),A.currentTime);
}
// the BGM preview plays itself: every cut on time, every key released on the downbeat
function autoPlay(t){
 for(let i=ni;i<notes.length;i++){const n=notes[i];if(n.t>t)break;if(n.done)continue;
  const to=n.kind==='high'?0:n.kind==='low'?1:n.kind==='mid'?1-lane:n.lane;if(n.kind==='mid')n.lane=to;
  if(MODE==='demo')thumb(n.kind==='high'?'up':n.kind==='low'?'down':to<lane?'up':to>lane?'down':'tap');
  laneFrom=lane;if(lane!==to){lane=to;laneT=t;}
  if(n.kind==='high')jumpT=t;if(n.kind==='low')slideT=t;
  hit(n,Math.abs(t-n.t));}
 for(const h of holds){if(h.mash){if(!h.done&&t>=h.t&&t<h.tEnd&&t-(h.at||-9)>=B/2){h.at=t;mashTap(h,t);if(MODE==='demo')thumb('tap');}continue;}
  if(!h.done&&!h.started&&t>=h.t){h.started=true;holding=h;if(MODE==='demo'){thumb('press');if(cutSounds())h.snd=sfxCharge(A.currentTime,A.currentTime+(h.tEnd-t));}}
  if(holding===h&&t>=h.tEnd){release(h,t-h.tEnd);if(MODE==='demo')thumb('lift');}}
}

// ---------- scheduler hooks ----------
function dropSat(k){if(released[k])return districtSat[k];return ratio(k)*(holding&&holding.k===k?1:0.4);}
function avgSat(){return(districtSat[0]+districtSat[1])/2;}
function schedule(){if(!running||!A)return;while(songStart+stepT(nextStep)<A.currentTime+0.15&&nextStep<TOTAL_BARS*16){playStep(nextStep,songStart+stepT(nextStep));nextStep++;}}
setInterval(schedule,25);

// ---------- phases ----------
function phaseAt(t){const bar=Math.floor(t/BAR);if(t<0)return{type:'pre',k:null};if(bar>=TOTAL_BARS)return{type:'end',k:null};const si=secAt(bar);return{type:SECTIONS[si][0],k:KOF[si]};}
function targetSat(t){const p=phaseAt(t);
 if(p.type==='build')return 0.05*ratio(p.k);
 if(p.type==='drop')return released[p.k]?districtSat[p.k]:0;
 if(p.type==='break')return districtSat[0]*0.45;
 if(p.type==='outro'||p.type==='end')return avgSat();
 return 0;}

// ---------- judging ----------
function findNote(t,ok){let best=null,bd=9;
 for(let i=ni;i<notes.length;i++){const n=notes[i];if(n.t-t>WIN_G)break;if(n.done||!ok(n))continue;const d=Math.abs(n.t-t);if(d<WIN_G&&d<bd){best=n;bd=d;}}
 return best?[best,bd]:null;}
const isBody=ln=>n=>n.kind==='body'&&n.lane===ln;
function hit(n,d){
 const perfect=d<WIN_P;n.done=true;n.hitAt=now();n.perfect=perfect;
 score+=perfect?100:60;if(n.kind!=='body')score+=20;combo++;maxCombo=Math.max(maxCombo,combo);if(perfect)nPerf++;else nGood++;
 if(n.sec==='build')buildStock[n.k]+=perfect?1:0.7;
 if(n.sec==='drop'&&released[n.k])districtSat[n.k]=Math.min(1,districtSat[n.k]+(perfect?0.006:0.002));
 swingT=-9;fx.push({mo:n.mo||'cutDown',t:now(),y:LANE_Y[n.lane],perfect,fin:n.fin});
 burstParts(n,HERO_X+14,noteY(n)+5,perfect);
 if(cutSounds())sfxCut(n.mo,perfect,n.fin,n.reg);kickT=now();n.cut=CUT_DIR[n.mo]||0;
 if(n.pose){startKime();if(endingOf()!=='hits'){rings.push({y:heroY()-10,t:now(),good:true});shakeT=now();}}// the landing bursts the last color over the whole city
 if(n.fin){shakeT=now()-0.08;for(let i=0;i<10;i++){const a=i/10*Math.PI*2;parts.push({x:HERO_X+12,y:noteY(n)+5,vx:Math.cos(a)*90,vy:Math.sin(a)*90,life:0,max:0.45,col:i%2?PH.signB:PH.signA});}}
}
function burstParts(n,x,y,perfect){const col=CORES[n.c];const toHero=n.sec==='build'||n.sec==='intro';
 for(let i=0;i<(perfect?12:6);i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*60;parts.push({x,y,vx:Math.cos(a)*s+20,vy:Math.sin(a)*s,life:0,max:toHero?0.9:0.7,col,home:toHero});}}
function startKime(){// 静: the hero stops, the city dims and the music holds its breath
 const t=now();let nt=Infinity;for(let i=ni;i<notes.length;i++)if(!notes[i].done&&notes[i].t>t){nt=notes[i].t;break;}
 let at=Math.ceil((t+0.22)/B)*B;at=Math.max(t+0.16,Math.min(at,nt-0.06));
 if(endingOf()==='taiko')at=t+2*B;// sheathed on the clapper
 kime={t,at,burst:false};// the band is ringing out its last chord, so the sound stays full
}
function burstHeld(){if(kime)kime.burst=true;}
function miss(n){
 n.done=true;n.missAt=now();combo=0;nMiss++;
 if(n.sec==='build'){const lost=buildStock[n.k]*0.25;buildStock[n.k]-=lost;
  for(let i=0;i<Math.min(14,2+lost*2);i++)parts.push({x:HERO_X-4-Math.random()*20,y:heroY()-10+Math.random()*6,vx:-20-Math.random()*30,vy:-20+Math.random()*10,life:0,max:0.8,col:'#6d6f75',grav:true});}
 if(n.sec==='drop'&&released[n.k])districtSat[n.k]=Math.max(0,districtSat[n.k]-0.03);
 shakeT=now();if(cutSounds())sfxMiss();
}
function release(h,d){const ad=Math.abs(d);burst(h,ad<0.08?1:ad<0.16?0.85:d<0?0.4:0.7);}
// a forced lock opens by itself on the drop's downbeat; it lets out as much color as the taps broke through
function mashMult(h){return h.taps>=MASH_N?1:0.4+0.45*h.taps/MASH_N;}
function mashTap(h,t){h.started=true;h.taps++;kickT=t;
 fx.push({mo:h.taps%2?'cutDown':'cutUp',t:now(),y:LANE_Y[h.lane],perfect:true,fin:h.taps===MASH_N});
 if(h.taps<=MASH_N){for(let i=0;i<5;i++){const a=Math.random()*Math.PI*2;parts.push({x:HERO_X+16,y:LANE_Y[h.lane]-12,vx:Math.cos(a)*50,vy:Math.sin(a)*50,life:0,max:0.4,col:h.taps>=MASH_N?'#ffffff':'#ffb54a'});}
  if(cutSounds())sfxMash(h.taps/MASH_N);}}
function burst(h,mult){
 h.done=true;h.mult=mult;if(holding===h)holding=null;if(h.snd){h.snd(mult>=0.85);h.snd=null;}
 const k=h.k;released[k]=true;districtSat[k]=Math.min(1,ratio(k)*mult);
 rings.push({y:heroY()-10,t:now(),good:mult>=0.85});
 const dpx=now()*SPEED;
 for(const b of buildings)if(b.x+b.w>dpx){b.k=k;b.colorAt=now()+Math.max(0,b.x-dpx-HERO_X)/320;}
 if(!h.rang)sfxRelease(mult>=0.85,mult>=0.85?songStart+h.tEnd:0);// a clean early release still rings on the downbeat
}
function onPress(){
 if(!running)return;const t=now();
 // a tap meant for a drone on the downbeat right after a lock is not swallowed by the lock
 for(const h of holds){if(h.mash&&!h.done&&t>h.t-0.12&&t<h.tEnd&&!(t>h.tEnd-WIN_G&&findNote(t,isBody(lane)))){mashTap(h,t);return;}}
 for(const h of holds){if(!h.mash&&!h.done&&!h.started&&t>h.t-0.25&&t<h.tEnd-0.15&&!(t<h.t-WIN_G&&findNote(t,isBody(lane)))){h.started=true;holding=h;if(cutSounds())h.snd=sfxCharge(A.currentTime,A.currentTime+(h.tEnd-t));return;}}
 const r=findNote(t,isBody(lane));if(r)hit(r[0],r[1]);else{swingT=t;if(cutSounds())sfxSwing();}
}
function bestOf(a,b){return a&&b?(a[1]<=b[1]?a:b):(a||b);}
function onFlick(dir,t){
 if(!running||holding)return;const n0=now();
 if(dir<0&&lane===0){// jump from the upper lane
  jumpT=n0;jumpReach=true;if(cutSounds())sfxWhoosh(true);const r=bestOf(findNote(t,n=>n.kind==='high'),findNote(n0,n=>n.kind==='high'));if(r){jumpReach=false;hit(r[0],r[1]);}return;}
 if(dir>0&&lane===1){// slide along the street
  slideT=n0;slideReach=true;if(cutSounds())sfxWhoosh(false);const r=bestOf(findNote(t,n=>n.kind==='low'),findNote(n0,n=>n.kind==='low'));if(r){slideReach=false;hit(r[0],r[1]);}return;}
 const target=dir<0?0:1;
 laneFrom=lane;lane=target;laneT=n0;dashUntil=n0+0.13;
 // a pylon between the lanes is cut by the move itself, up or down
 const ok=n=>(n.kind==='body'&&n.lane===target)||n.kind==='mid';
 const r=bestOf(findNote(t,ok),findNote(n0,ok));if(r){dashUntil=-9;if(r[0].kind==='mid')r[0].lane=target;hit(r[0],r[1]);}
}
function onRelease(){if(holding)release(holding,now()-holding.tEnd);}

// ---------- input ----------
let pd=null;
addEventListener('pointerdown',e=>{if(!running||MODE!=='play'||e.target.closest('.ov,.tool'))return;e.preventDefault();const t=now();pd={id:e.pointerId,y:e.clientY,t,fl:false};onPress();},{passive:false});
// a flick is judged at the touch; turning back without lifting the finger is the next flick (up-down chains in one stroke)
const FLICK_PX=12;
addEventListener('pointermove',e=>{if(!pd||pd.id!==e.pointerId)return;const y=e.clientY;
 if(!pd.fl){const dy=y-pd.y;if(Math.abs(dy)>FLICK_PX&&now()-pd.t<0.35){pd.fl=Math.sign(dy);pd.ext=y;onFlick(pd.fl,pd.t);}return;}
 if((y-pd.ext)*pd.fl>0){pd.ext=y;return;}// still going the same way
 if(Math.abs(y-pd.ext)>FLICK_PX){pd.fl=-pd.fl;pd.ext=y;onFlick(pd.fl,now());}});
addEventListener('pointerup',e=>{if(!pd||pd.id!==e.pointerId)return;pd=null;onRelease();});
// the finger was taken by the system (iOS: the swipe up from the bottom edge): the song stops where it is, and a touch goes on
addEventListener('pointercancel',e=>{const mine=pd&&pd.id===e.pointerId;pd=null;
 if(mine&&running&&MODE==='play'){pauseSong();$('freeze').classList.remove('hide');}else onRelease();});
const keyDown={};
addEventListener('keydown',e=>{if(e.repeat||!running)return;const t=now();
 if(e.code==='Space'||e.code==='KeyJ'||e.code==='KeyF'){keyDown[e.code]=1;onPress();e.preventDefault();}
 else if(e.code==='ArrowUp'||e.code==='KeyW'){onFlick(-1,t);e.preventDefault();}
 else if(e.code==='ArrowDown'||e.code==='KeyS'){onFlick(1,t);e.preventDefault();}});
addEventListener('keyup',e=>{if(keyDown[e.code]){delete keyDown[e.code];onRelease();}});

// ---------- pause ----------
// The song stops where it is and every sound already queued is dropped. Going on starts again from the top of that bar
// after a short breath, so the beat is heard again before the next drone; the cuts already made stay as they were.
function pauseSong(){if(!running||pausedAt!==null||!A)return;pausedAt=now();running=false;pd=null;for(const k in keyDown)delete keyDown[k];
 for(const h of holds)if(!h.done){h.rang=false;}
 for(const h of holds)if(!h.done&&h.started){h.started=false;h.taps=0;h.at=null;if(h.snd){h.snd(false);h.snd=null;}}
 holding=null;resetBuses();stopAmbience();}
function resumeSong(){if(pausedAt===null)return;const p=pausedAt;
 let r=Math.max(0,Math.floor(p/BAR))*BAR;for(const h of holds)if(!h.done&&h.t<=p&&p<h.tEnd)r=Math.min(r,h.t);// a key or a lock is played again from its start
 const bar=Math.round(r/BAR);
 if(A.state==='suspended')A.resume();
 pausedAt=null;songStart=A.currentTime+1.2-r;nextStep=bar*16;TAPE_T=null;quietT=null;
 fx=[];parts=[];rings=[];laneT=-9;jumpT=-9;slideT=-9;dashUntil=-9;jumpReach=slideReach=false;
 buildings=[];bEnd=(r-1.2-lat)*SPEED-40;worldSat=targetSat(Math.max(0,r));
 running=true;startAmbience(A.currentTime+0.05);applyTrim(secAt(bar),A.currentTime,0.01);
 master.gain.cancelScheduledValues(A.currentTime);master.gain.setValueAtTime(0.72*(SONG.vol||1),A.currentTime);}
// stopping the song for good (again from the top, or back to the list)
function quitSong(){$('pauseBtn').classList.add('hide');pausedAt=null;running=false;ended=true;holding=null;if(A){if(A.state==='suspended')A.resume();resetBuses();}stopAmbience();}
// the volume button and leaving the page (common/sound.js) pause the song too
addEventListener('mg:pause',()=>{if(MODE==='play')pauseSong();});
addEventListener('mg:resume',()=>{if(!$('pauseMenu').classList.contains('hide'))return;$('freeze').classList.add('hide');resumeSong();});
// a drag never scrolls or closes the page (LINE's in-app browser closes on a downward drag); lists and sliders keep theirs
document.addEventListener('touchmove',e=>{if(!e.target.closest('#select,#editor,#songIO,textarea,input,.mg-vol'))e.preventDefault();},{passive:false});

// ---------- world ----------
function heroY(){const t=now();const k=Math.min(1,Math.max(0,(t-laneT)/0.11));let y=LANE_Y[laneFrom]+(LANE_Y[lane]-LANE_Y[laneFrom])*k-Math.sin(k*Math.PI)*10;
 const j=(t-jumpT)/MOVE;if(j>=0&&j<1)y-=Math.sin(j*Math.PI)*30;return y;}
function spawnBuildings(dpx){
 while(bEnd<dpx+W+20){const id=bEnd|0,m=SCN.make(id);
  const p=phaseAt((bEnd-HERO_X)/SPEED);
  let k=-1;if(p.type==='drop'&&released[p.k])k=p.k;else if(p.type==='break')k=-2;else if(p.type==='outro'||p.type==='end')k=-3;
  buildings.push(Object.assign({x:bEnd,k,colorAt:0,s:0,id},m));
  bEnd+=m.w+1+Math.floor(hash(id,6,7)*3);}
 while(buildings.length&&buildings[0].x+buildings[0].w<dpx-10)buildings.shift();
}
function bTarget(b,t){if(b.k>=0)return t>=b.colorAt?districtSat[b.k]:0;if(b.k===-2)return districtSat[0]*0.4;if(b.k===-3)return avgSat();return 0;}

// ---------- attack motions ----------
function arcTrail(cx,cy,r,a0,a1,e,cA,cB,w,hold){
 const T=hold?Math.max(0,e-0.1):e;// a finisher holds its full arc for a beat of stillness
 const prog=Math.min(1,e/0.07),fade=T<0.07?1:Math.max(0,1-(T-0.07)/0.15);const aEnd=a0+(a1-a0)*prog,n=14;
 for(let i=0;i<=n;i++){const k=i/n,a=a0+(aEnd-a0)*k;g.globalAlpha=fade*(0.25+0.75*k);
  g.fillStyle=k>0.8?'#ffffff':(i%2?cA:cB);const ww=Math.max(1,Math.round(w*k));
  g.fillRect(Math.round(cx+Math.cos(aEnd-(aEnd-a0)*(1-k))*r),Math.round(cy+Math.sin(aEnd-(aEnd-a0)*(1-k))*r),ww,ww);}
 g.globalAlpha=1;}
function line(x0,y0,x1,y1,c,w){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));g.fillStyle=c;for(let i=0;i<=n;i++){const k=i/n;g.fillRect(Math.round(x0+(x1-x0)*k),Math.round(y0+(y1-y0)*k),w,w);}}
function drawMotion(f,e,hy){
 const cx=HERO_X+3,cy=hy-9,A1=PH.signA||'#ff3d8b',A2=PH.signB||'#39f0ff',H=f.fin;
 if(f.mo==='cutDown')arcTrail(cx,cy,13,-1.4,1.1,e,A2,'#ffffff',3,H);
 else if(f.mo==='cutUp')arcTrail(cx,cy,13,1.2,-1.3,e,A1,'#ffffff',3,H);
 else if(f.mo==='sweep'){arcTrail(cx-4,cy,22,-0.75,0.75,e,A2,A1,3,H);}
 else if(f.mo==='rise'){arcTrail(cx,cy+2,18,1.7,-1.7,e,'#ffb54a','#ffffff',3,H);}
 else if(f.mo==='thrust'){const fade=Math.max(0,1-e/0.18),len=Math.min(1,e/0.05)*26;g.globalAlpha=fade;
  g.fillStyle=A2;g.fillRect(cx+4,cy-1,Math.round(len),3);g.fillStyle='#ffffff';g.fillRect(cx+4,cy,Math.round(len),1);g.fillRect(cx+4+Math.round(len),cy-3,1,7);g.globalAlpha=1;}
 else if(f.mo==='cross'){const T=Math.max(0,e-0.1),fade=T<0.05?1:Math.max(0,1-(T-0.05)/0.15);g.globalAlpha=fade;
  const p1=Math.min(1,e/0.04),p2=Math.min(1,Math.max(0,(e-0.04)/0.04));
  line(cx+6,cy-11,cx+6+18*p1,cy-11+20*p1,'#ffffff',2);if(p2>0)line(cx+6,cy+9,cx+6+18*p2,cy+9-20*p2,A1,2);g.globalAlpha=1;}
 else if(f.mo==='pierce'){const up=f.y<LANE_Y[1];arcTrail(cx,cy,19,up?2.3:-2.3,up?-0.6:0.6,e,'#a6ff5a',A2,3,H);
  const fade=Math.max(0,1-e/0.2);g.globalAlpha=fade*0.6;g.fillStyle='#ffffff';for(let i=0;i<4;i++)g.fillRect(cx-14-i*5,cy-4+i*3,8,1);g.globalAlpha=1;}
 else if(f.mo==='jumpCut'){arcTrail(cx,cy-8,17,1.9,-1.2,e,'#ffb54a','#ffffff',3,H);}
 else if(f.mo==='slideCut'){const fade=Math.max(0,1-e/0.22),len=Math.min(1,e/0.06)*34;g.globalAlpha=fade;
  g.fillStyle=A1;g.fillRect(cx-6,LANE_Y[1]-4,Math.round(len),2);g.fillStyle='#ffffff';g.fillRect(cx-6,LANE_Y[1]-3,Math.round(len),1);g.globalAlpha=1;}
 else if(f.mo==='spin'){arcTrail(cx,cy,16,-Math.PI,Math.PI,e*0.8,A1,A2,3,H);arcTrail(cx,cy,11,0,Math.PI*2,e*0.8,'#ffb54a','#ffffff',2,H);}
}

// ---------- cut drones ----------
const CUT_DIR={cutDown:1,cross:1,spin:1,cutUp:-1,rise:-1,jumpCut:-1,sweep:0,thrust:0,slideCut:0,pierce:0.5};
const whiteCache=new Map();
function whiteOf(im){let w=whiteCache.get(im);if(!w){w=document.createElement('canvas');w.width=im.width;w.height=im.height;const x=w.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#ffffff';x.fillRect(0,0,w.width,w.height);whiteCache.set(im,w);}return w;}
// the drones' warning-light edge: a 1px light rim around the sprite
const rimCache=new Map();
function rimOf(im){let r=rimCache.get(im);if(r)return r;r=document.createElement('canvas');r.width=im.width+2;r.height=im.height+2;const x=r.getContext('2d');
 for(const[dx,dy]of[[0,1],[2,1],[1,0],[1,2]])x.drawImage(im,dx,dy);x.globalCompositeOperation='source-in';x.fillStyle='#e9edf7';x.fillRect(0,0,r.width,r.height);
 x.globalCompositeOperation='destination-out';x.drawImage(im,1,1);rimCache.set(im,r);return r;}
function drawPiece(im,sy,sh,x,y,rot){g.save();g.translate(Math.round(x+im.width/2),Math.round(y+sh/2));g.rotate(rot);g.drawImage(im,0,sy,im.width,sh,-Math.round(im.width/2),-Math.round(sh/2),im.width,sh);g.restore();}

// ---------- the hero ----------
let HERO_DESIGN='hood';
const heroCv=heroCanvas();
// where each cut's arc runs (canvas angles), so the hero's arm and blade follow the same path as the trail
const CUT_ARC={cutDown:[-1.4,1.1],cutUp:[1.2,-1.3],sweep:[-0.75,0.75],rise:[1.7,-1.7],jumpCut:[1.9,-1.2],thrust:[0,0],slideCut:[0.1,0.1],spin:[-Math.PI,Math.PI],cross:[-0.9,0.9]};
function drawHeroNow(t,hy,sliding,jumping){
 let p;const ph=t<0?0:(t/B)%1;
 if(sliding)p=slidePose((t-slideT)/MOVE);else if(jumping)p=jumpPose((t-jumpT)/MOVE);else p=runPose(ph);
 if(kime&&t>=kime.t&&t<kime.at+0.35)p=kimePose(t<kime.at?0.5:1);
 else{const f=fx.length?fx[fx.length-1]:null;const e=f?t-f.t:9;
  if(f&&e>=0&&e<(f.fin?0.3:0.18)){let arc=CUT_ARC[f.mo];if(f.mo==='pierce')arc=f.y<LANE_Y[1]?[2.3,-0.6]:[-2.3,0.6];if(!arc)arc=CUT_ARC.cutDown;
   const k=Math.min(1,e/(f.mo==='spin'?0.09:0.07));const th=arc[0]+(arc[1]-arc[0])*(1-Math.pow(1-k,3));
   armTo(p,Math.PI/2-th,k);if(f.mo==='thrust'||f.mo==='slideCut')p.arms[0]=[Math.PI/2-0.1,0.05];}}
 const st=phaseAt(t);p.glow=st.type==='build'?ratio(st.k):avgSat();p.scarf='#ff3d8b';
 drawHero(heroCv,HERO_DESIGN,p);
 g.drawImage(heroCv,HERO_X-HC_X,Math.round(hy)-HC_Y+1);
}

// ---------- draw ----------
function drawEnemy(n,x,y,t,beatPh){
 const spr=n.kind==='high'?FLYERS:n.kind==='low'?CRAWLERS:n.kind==='mid'?PYLONS:DRONES;const im=spr[n.c];
 // a dark pocket around each enemy, then a light rim: it reads against any district, gray or colored
 g.globalAlpha=0.5;g.fillStyle='#050508';g.beginPath();g.arc(x+im.width/2,y+im.height/2,10,0,7);g.fill();g.globalAlpha=1;
 if(n.kind==='mid'){// the beam it holds between the two rails
  const cx=Math.round(x+5);g.globalAlpha=0.55+0.25*(1-beatPh);g.fillStyle=CORES[n.c];
  g.fillRect(cx,LANE_Y[0]+6,1,y-LANE_Y[0]-6);g.fillRect(cx,y+11,1,LANE_Y[1]-6-(y+11));g.globalAlpha=1;}
 if(n.kind==='low'){g.globalAlpha=0.6;g.fillStyle=CORES[n.c];g.fillRect(Math.round(x)+2,LANE_Y[1]+1,11,1);g.globalAlpha=1;}
 g.globalAlpha=0.75+0.25*(1-beatPh);g.drawImage(rimOf(im),Math.round(x)-1,Math.round(y)-1);g.globalAlpha=1;
 g.drawImage(im,Math.round(x),Math.round(y));
}
function draw(dt){
 const t=now();const dpx=Math.max(0,t)*SPEED;
 const ts=targetSat(t);worldSat+=(ts-worldSat)*Math.min(1,dt*(worldSat<ts?2.2:1.2));
 const ws=worldSat;const beatPh=((t/B)%1+1)%1;
 let sx=0,sy=0;if(t-shakeT<0.18){sx=Math.round((Math.random()-0.5)*3);sy=Math.round((Math.random()-0.5)*2);}else if(t-kickT<0.05){sx=1;sy=t-kickT<0.025?1:0;}
 g.setTransform(1,0,0,1,sx,sy);
 spawnBuildings(dpx);
 drawBackdrop(t,ws,dpx,beatPh,dt,buildings);

 // key notes (holds): a solid beam in the lane, key at the head, lock at the tail
 for(const h of holds){
  const x0=HERO_X+10+(h.t-t)*SPEED,x1=HERO_X+10+(h.tEnd-t)*SPEED;
  if(x1<-20||x0>W+20)continue;if(h.done&&t-h.tEnd>0.05)continue;
  if(h.mash){const ly=LANE_Y[h.lane]-12,a0=h.started?HERO_X+4:x0,pulse=0.5+0.5*Math.sin(t*14);
   // a lock to force: a chain of bolts, one per tap; each tap breaks the nearest one
   for(let i=0;i<MASH_N;i++){const bx=x0+(x1-x0)*(i+0.5)/MASH_N;if(i<h.taps||bx<a0)continue;
    g.globalAlpha=0.85;g.fillStyle='#0a0a0c';g.fillRect(Math.round(bx)-3,ly-4,7,9);g.fillStyle='#ffb54a';g.fillRect(Math.round(bx)-2,ly-3,5,7);g.fillStyle='#ffffff';g.fillRect(Math.round(bx)-1,ly-2,1,5);g.globalAlpha=1;}
   if(x1>a0){g.globalAlpha=0.35+0.15*pulse;g.fillStyle='#ffb54a';g.fillRect(Math.round(a0),ly,Math.round(x1-a0),1);g.globalAlpha=1;}
   const lx=Math.round(x1),open=h.taps>=MASH_N;g.fillStyle='#0a0a0c';g.fillRect(lx-5,ly-8,11,15);g.fillStyle=open?'#ffffff':'#ffb54a';g.fillRect(lx-4,ly-7,9,13);
   g.fillStyle='#0a0a0c';g.fillRect(lx-1,ly-3,3,5);g.strokeStyle=open?'#ffffff':'#ffb54a';g.lineWidth=2;g.beginPath();g.arc(lx+0.5+(open?3:0),ly-8-(open?2:0),3.5,Math.PI,0);g.stroke();
   if(!h.started&&x0<W){g.strokeStyle='rgba(255,181,74,'+(0.35+0.4*pulse)+')';g.lineWidth=1;g.beginPath();g.arc(x0+0.5,ly,9+pulse*2,0,7);g.stroke();}
   continue;}
  const ly=LANE_Y[h.lane]-12,a0=h.started?HERO_X+4:x0,pulse=0.5+0.5*Math.sin(t*14);
  if(x1>a0){g.globalAlpha=h.started?0.9:0.55;
   g.fillStyle='#ff3d8b';g.fillRect(Math.round(a0),ly-3,Math.round(x1-a0),7);g.fillStyle='#39f0ff';g.fillRect(Math.round(a0),ly-1,Math.round(x1-a0),3);
   g.fillStyle='#ffffff';g.fillRect(Math.round(a0),ly,Math.round(x1-a0),1);
   g.globalAlpha=0.25+0.15*pulse;g.fillStyle='#ff3d8b';g.fillRect(Math.round(a0),ly-6,Math.round(x1-a0),13);g.globalAlpha=1;}
  g.fillStyle='#0a0a0c';g.fillRect(Math.round(x1)-5,ly-8,11,15);g.fillStyle='#ffffff';g.fillRect(Math.round(x1)-4,ly-7,9,13);
  g.fillStyle='#0a0a0c';g.fillRect(Math.round(x1)-1,ly-3,3,5);
  g.strokeStyle='#ffffff';g.lineWidth=2;g.beginPath();g.arc(Math.round(x1)+0.5,ly-8,3.5,Math.PI,0);g.stroke();
  const kx=h.started?HERO_X+2:x0;g.globalAlpha=h.started?1:0.8+0.2*pulse;g.drawImage(KEY,Math.round(kx-4),Math.round(ly-6));g.globalAlpha=1;
  if(!h.started&&x0<W){g.strokeStyle='rgba(255,255,255,'+(0.35+0.4*pulse)+')';g.lineWidth=1;g.beginPath();g.arc(x0+0.5,ly,9+pulse*2,0,7);g.stroke();}
 }

 // enemies
 let i0=ni;while(i0>0&&notes[i0-1].t>t-0.7)i0--;// cut drones stay drawn while their halves fly
 for(let i=i0;i<notes.length;i++){const n=notes[i];if(n.t-t>1.4)break;
  const bob=n.kind==='low'?0:(beatPh<0.5?0:1);const y=noteY(n)+bob;
  if(!n.done){drawEnemy(n,HERO_X+10+(n.t-t)*SPEED,y,t,beatPh);}
  else if(n.hitAt!=null){const e0=t-n.hitAt;if(e0<0.5){const im=(n.kind==='high'?FLYERS:n.kind==='low'?CRAWLERS:n.kind==='mid'?PYLONS:DRONES)[n.c];
    const x=HERO_X+12,y0=Math.round(y),hold=n.fin?0.09:0.035;
    if(e0<hold){// the instant of the cut: the drone goes white and a short sharp line runs through it
     g.drawImage(whiteOf(im),x,y0);const cx=x+im.width/2,cy=y0+im.height/2,d=n.cut;g.fillStyle='#ffffff';
     for(let i=-9;i<=9;i++)g.fillRect(Math.round(cx+i),Math.round(cy+i*d*0.55),1,1);
     g.fillStyle=CORES[n.c];for(let i=-6;i<=6;i+=3)g.fillRect(Math.round(cx+i),Math.round(cy+i*d*0.55)-1,1,1);}
    else{const e=e0-hold,hh=Math.floor(im.height/2),d=n.cut;g.globalAlpha=Math.max(0,1-e/0.4);
     // the halves slide apart along the cut, then fall
     const sp=n.fin?1.6:1;
     drawPiece(im,0,hh,x+e*(34+d*20)*sp,y0-e*48*sp+e*e*160,-e*(3+d*2)*sp);
     drawPiece(im,hh,im.height-hh,x+e*(22-d*14)*sp,y0+hh+e*20*sp+e*e*260,e*(4-d)*sp);g.globalAlpha=1;}}}
  else if(n.missAt!=null){const e=t-n.missAt;if(e<0.5){const im=(n.kind==='high'?FLYERS:n.kind==='low'?CRAWLERS:n.kind==='mid'?PYLONS:DRONES)[n.c];g.globalAlpha=1-e/0.5;g.drawImage(im,Math.round(HERO_X+4-e*60),Math.round(y+e*e*120));g.globalAlpha=1;}}
 }

 // 静: while the hero holds the closing pose the city dims
 const still=kime&&!kime.burst&&t>=kime.t;
 if(still&&endingOf()==='hits'){const k=Math.min(1,(t-kime.t)/0.08);g.fillStyle='rgba(0,0,0,'+(0.38*k)+')';g.fillRect(-4,-4,W+8,ROAD_END+8);}
 // hero tail (stored color)
 const hy=heroY();const p=phaseAt(t);
 let tl=6;if(p.type==='build')tl=4+34*ratio(p.k);else if(p.type==='drop'&&released[p.k])tl=8+30*districtSat[p.k];else if(p.type==='outro'||p.type==='end'||p.type==='break')tl=8+20*avgSat();
 if(holding)tl+=6+Math.sin(t*30)*2;
 const sliding=t-slideT>=0&&t-slideT<MOVE,jumping=t-jumpT>=0&&t-jumpT<MOVE;
 const nx=HERO_X,ny=sliding?hy-6:hy-13;
 for(let i=0;i<tl;i++){const f=i/Math.max(1,tl);const wy=Math.sin(t*9-i*0.45)*Math.min(i,6)*0.45;
  g.globalAlpha=1-f*0.85;g.fillStyle=mix(hx('#ff3d8b'),hx('#39f0ff'),f);g.fillRect(Math.round(nx-i*1.6),Math.round(ny+wy+i*0.15),2,2);}
 g.globalAlpha=1;
 // hero
 g.globalAlpha=0.35;g.fillStyle='#39f0ff';g.beginPath();g.arc(HERO_X,sliding?hy-5:hy-11,11,0,7);g.fill();g.globalAlpha=1;
 drawHeroNow(t,hy,sliding,jumping);
 if(sliding){g.globalAlpha=0.5;g.fillStyle='#8a8c93';for(let i=0;i<3;i++)g.fillRect(HERO_X-10-i*4-Math.round((t-slideT)*40),Math.round(hy-1-i),2,1);g.globalAlpha=1;}
 if(holding){const pr=Math.min(1,Math.max(0,(t-holding.t)/(holding.tEnd-holding.t)));
  g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=2;g.beginPath();g.arc(HERO_X,hy-9,14,0,7);g.stroke();
  g.strokeStyle=pr>0.94?'#ffffff':'#ff3d8b';g.beginPath();g.arc(HERO_X,hy-9,14,-Math.PI/2,-Math.PI/2+pr*Math.PI*2);g.stroke();}
 {const mh=holds.find(h=>h.mash&&h.started&&!h.done);if(mh){const pr=Math.min(1,mh.taps/MASH_N);
  g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=2;g.beginPath();g.arc(HERO_X,hy-9,14,0,7);g.stroke();
  g.strokeStyle=pr>=1?'#ffffff':'#ffb54a';g.beginPath();g.arc(HERO_X,hy-9,14,-Math.PI/2,-Math.PI/2+pr*Math.PI*2);g.stroke();}}
 // empty swing
 const se=t-swingT;if(se>=0&&se<0.1){g.globalAlpha=0.5*(1-se/0.1);g.fillStyle='#c8fcff';
  for(let a=-0.9;a<=0.9;a+=0.15)g.fillRect(Math.round(HERO_X+4+Math.cos(a)*12),Math.round(hy-9+Math.sin(a)*12),1,1);g.globalAlpha=1;}
 for(const f of fx){const e=t-f.t;if(e<0||e>(f.fin?0.34:0.22))continue;drawMotion(f,e,hy);}
 fx=fx.filter(f=>t-f.t<0.4);
 // particles
 for(const q of parts){q.life+=dt;
  if(q.home){const tx=HERO_X-6,ty=hy-10;const k2=Math.min(1,q.life/q.max);q.vx+=((tx-q.x)*18-q.vx*3)*dt*k2*2;q.vy+=((ty-q.y)*18-q.vy*3)*dt*k2*2;}
  if(q.grav)q.vy+=200*dt;
  q.x+=q.vx*dt;q.y+=q.vy*dt;g.globalAlpha=Math.max(0,1-q.life/q.max);g.fillStyle=q.col;g.fillRect(Math.round(q.x),Math.round(q.y),2,2);}
 g.globalAlpha=1;parts=parts.filter(q=>q.life<q.max);
 // release rings
 for(const r of rings){const e=t-r.t;if(e>(r.small?0.5:1.4))continue;if(r.small){const rad=10+e*120;g.globalAlpha=Math.max(0,1-e/0.5);g.strokeStyle='#ffffff';g.lineWidth=1;g.beginPath();g.arc(HERO_X+16,r.y,rad,0,7);g.stroke();g.globalAlpha=1;continue;}const rad=e*300;g.globalAlpha=Math.max(0,1-e/1.4)*(r.good?1:0.5);
  g.strokeStyle=r.good?'#ffffff':'#8a8c93';g.lineWidth=3;g.beginPath();g.arc(HERO_X,r.y,rad,0,Math.PI*2);g.stroke();
  if(r.good){g.strokeStyle=PH.signA;g.lineWidth=1;g.beginPath();g.arc(HERO_X,r.y,rad*0.86,0,Math.PI*2);g.stroke();g.strokeStyle=PH.signB;g.beginPath();g.arc(HERO_X,r.y,rad*0.74,0,Math.PI*2);g.stroke();}
  g.globalAlpha=1;}
 // wet street: the city upside down, rippling, darker
 g.setTransform(1,0,0,1,0,0);
 rg.clearRect(0,0,W,H);rg.drawImage(cv,0,0);
 g.fillStyle=mix(P.roadG,P.roadC,ws);g.fillRect(0,ROAD_END,W,H-ROAD_END);
 g.save();g.globalAlpha=0.32;
 for(let y=ROAD_END;y<H;y+=2){const src=2*ROAD_END-y;if(src<0)break;const off=Math.round(Math.sin(y*0.35+t*3)*(y-ROAD_END)*0.02);g.drawImage(refl,0,src,W,2,off,y,W,2);}
 g.restore();
 const fade=g.createLinearGradient(0,ROAD_END,0,H);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,.75)');g.fillStyle=fade;g.fillRect(0,ROAD_END,W,H-ROAD_END);
 g.fillStyle=mix(P.lineG,P.lineC,ws*0.7);g.fillRect(0,ROAD_END,W,1);
 // combo
 if(combo>=5&&running){g.font='10px DotGothic16, monospace';g.textAlign='center';g.fillStyle='rgba(255,255,255,.55)';g.fillText(String(combo),W/2,30);}
 // scanlines
 g.fillStyle='rgba(0,0,0,.12)';for(let y=0;y<H;y+=2)g.fillRect(0,y,W,1);
}

// ---------- loop ----------
let lastT=performance.now();
function update(){
 // a tutorial scene starts over: the rest of this frame would judge the fresh drones against the old time and miss them all
 if(MODE==='demo'&&tut&&now()>tut.sc.to*BAR){demoLoop();return;}
 const t=now();
 while(ni<notes.length&&notes[ni].done)ni++;
 if(MODE==='listen'||MODE==='demo')autoPlay(t);
 // the moves themselves have reach: dashing between lanes, jumping and sliding cut what they meet
 if(t<dashUntil){const r=findNote(t,n=>(n.kind==='body'&&n.lane===lane)||n.kind==='mid');if(r){dashUntil=-9;if(r[0].kind==='mid')r[0].lane=lane;hit(r[0],r[1]);}}
 if(jumpReach&&t-jumpT<MOVE*0.6){const r=findNote(t,n=>n.kind==='high');if(r){jumpReach=false;hit(r[0],r[1]);}}
 if(slideReach&&t-slideT<MOVE*0.6){const r=findNote(t,n=>n.kind==='low');if(r){slideReach=false;hit(r[0],r[1]);}}
 for(let i=ni;i<notes.length;i++){const n=notes[i];if(n.t>t-WIN_G)break;if(!n.done)miss(n);}
 // the opening sound lands on the downbeat itself, scheduled a moment ahead on the audio clock: judging it when the
 // player hears the downbeat would put it a beat of output delay behind the music (the score still waits for the judgment)
 {const at=A.currentTime+0.05;
  for(const h of holds){if(h.done||h.rang||songStart+h.tEnd>at)continue;
   if(h.mash?h.taps>=MASH_N:holding===h){h.rang=true;const tt=songStart+h.tEnd;if(h.snd){h.snd(true,tt);h.snd=null;}sfxRelease(true,tt);}}}
 for(const h of holds)if(h.mash&&!h.done&&t>=h.tEnd)burst(h,mashMult(h));
 for(const h of holds)if(!h.mash&&!h.done&&t>h.tEnd+0.16)release(h,holding===h?0.3:-1);
 if(kime&&!kime.burst&&t>=kime.at){sfxSheathe();burstHeld();}
 if(A){const p=phaseAt(t);let f=450;
  if(p.type==='build')f=450+1600*ratio(p.k);else if(p.type==='drop')f=650+17000*Math.pow(dropSat(p.k),1.6);
  else if(p.type==='break')f=2200+6000*districtSat[0];else if(p.type==='outro'||p.type==='end')f=700+17000*Math.pow(avgSat(),1.6);
  if(t-shakeT>0.15)lp.frequency.setTargetAtTime(f,A.currentTime,0.08);}
 // the result comes once the landing has rung out (a short cut ends sooner than a long chord); never later than before
 if(!ended){const land=kime?kime.t:SONG_LEN-2*BAR;
  if(t>land+0.6&&bandLevel()<0.004){if(quietT===null)quietT=t;}else quietT=null;
  if((quietT!==null&&t-quietT>0.6)||t>SONG_LEN+2.5)finish();}
}
function frame(ts){const dt=Math.min(0.05,(ts-lastT)/1000);lastT=ts;if(running){schedule();update();}draw(dt);requestAnimationFrame(frame);}

// ---------- screens ----------
const $=id=>document.getElementById(id);
function colorShare(){let tot=0,got=0;
 for(const n of notes){tot++;if(n.done&&n.missAt==null)got++;}
 for(const h of holds){tot+=HOLD_W;if(h.done)got+=HOLD_W*(h.mult>=0.85?1:(h.mult||0));}
 // 100% only when no color was lost
 return got>=tot?100:Math.min(99,Math.floor(100*got/tot));}
function finish(){
 ended=true;running=false;stopAmbience();$('pauseBtn').classList.add('hide');
 if(MODE==='listen'||fromEditor){toolsEnded();if(MODE==='listen')return;}
 $('toEdBtn').classList.toggle('hide',!fromEditor);$('edBack').classList.add('hide');
 // the score leads; a full combo (no color lost: every drone cut, every key and lock opened clean) is celebrated under it
 const sat=colorShare(),total=score+Math.round(avgSat()*10000);
 // CLEAR: 8 in 10 cut (drones, keys and locks alike) opens the next district; PERFECT: nothing missed
 const all=notes.length+holds.length,cut=notes.filter(n=>n.done&&n.missAt==null).length+holds.filter(h=>h.done&&(h.mult||0)>0).length;
 const perfect=cut>=all,clear=cut>=all*0.8;
 const i=SONGS.indexOf(SONG),next=SONGS[i+1],opens=clear&&next&&!isOpen(i+1);
 $('rSat').textContent=total.toLocaleString();
 $('rCombo').innerHTML=(perfect?'<span class="fc">PERFECT</span>':clear?'<span class="fc clr">CLEAR</span>':'<span class="nclr">8割斬ると CLEAR　いま '+Math.floor(100*cut/all)+'%</span>')+'最大コンボ <b>'+maxCombo+'</b>'+(opens?'<span class="unl"></span>':'');
 if(opens)$('rCombo').querySelector('.unl').textContent='新しい街区「'+next.name+'」がひらいた';
 $('rDet').textContent='ジャスト '+nPerf+'　ナイス '+nGood+'　ミス '+nMiss;
 $('rCmt').textContent=sat>=95?'街じゅうが、きみの色になった。':sat>=75?'ネオンが街に戻ってきた。':sat>=50?'まだ灰色の路地が残っている。':'色は、まだ眠っている。';
 saveBest(SONG.id,total,clear,perfect);$('rLbl').textContent=SONG.name+'　'+DIFF_JA[DIFF];
 try{prepareShare(total,clear,perfect);}catch(e){}
 $('result').classList.remove('hide');
}
// ---------- timing ----------
// One value: how late the sound reaches the ears (Bluetooth earphones can be 0.2s or more). A metronome keeps ticking
// on this screen: each tap shows how far it was from the beat as the game would judge it, so −/+ can be checked on the spot.
// 「測る」 takes it from eight taps; 「リセット」 goes back to what the device itself reports.
const autoLat=()=>A?(A.outputLatency||0)+(A.baseLatency||0):0;
const effLat=()=>userLat!=null?userLat:autoLat();
const LAT_MIN=-0.1,LAT_MAX=0.6,CAL_B=0.75;// slow enough that a long delay can't be mistaken for an early tap on the next beat
const ms=v=>(v>0.0005?'+':v<-0.0005?'−':'')+Math.abs(Math.round(v*1000))+'ms';
function saveLat(v){userLat=v==null?null:Math.round(Math.max(LAT_MIN,Math.min(LAT_MAX,v))*1000)/1000;
 try{if(userLat==null)localStorage.removeItem('iro-lat');else localStorage.setItem('iro-lat',String(userLat));}catch(e){}showLat();}
function showLat(){$('latInfo').textContent=userLat!=null?'タイミング調整：'+ms(userLat):'音を出して遊んでください';
 if(!$('cal').classList.contains('hide')){$('calVal').textContent=ms(effLat());$('calSub').textContent=userLat!=null?'':'調整なし（端末の値のまま）';
  $('calReset').classList.toggle('hide',userLat==null);}}
showLat();
let calTut=false;
let cal=null;// {next: the next beat to schedule, beats: [times], mode: 'check'|'measure', taps}
function calTick(){if(!cal)return;while(cal.next<A.currentTime+0.2){const bt=cal.next,i=cal.beats.length;cal.beats.push(bt);if(cal.beats.length>32)cal.beats.shift();
  kick(bt,0.9,sfxBus);piano(bt,cal.n%4===0?69:64,0.2,0.12,sfxBus);cal.n++;cal.next+=CAL_B;}
 if(cal.mode==='measure'&&A.currentTime>cal.until){calCheck('うまく測れませんでした。もう一度どうぞ。');}}
function calCheck(msg){cal.mode='check';cal.taps=[];cal.offs=[];
 $('calMsg').innerHTML=msg||(calTut&&userLat==null?'音は少し遅れて耳に届きます（ワイヤレスイヤホンは特に）。<br>「測る」で、いまの遅れに合わせます。':'音に合わせてタップすると、ずれが出ます。<br>0に近くなるよう −／＋ で合わせてください。');$('calHit').textContent='';$('calGo').classList.remove('hide');showLat();}
function openCal(mode){initAudio();calTut=mode==='tutorial';$('calLbl').textContent=calTut?'はじめに、タイミング調整':'タイミング調整';$('calBack').textContent=calTut?'つぎへ':'もどる';$('calBack').classList.toggle('sub',!calTut);if(A.state==='suspended')A.resume();
 $('title').classList.add('hide');$('cal').classList.remove('hide');
 cal={next:A.currentTime+0.4,beats:[],n:0,mode:'check',taps:[],offs:[],timer:setInterval(calTick,40)};calTick();calCheck();}
function closeCal(){if(cal)clearInterval(cal.timer);cal=null;$('cal').classList.add('hide');if(calTut){calTut=false;startTutorial('select');}else $('title').classList.remove('hide');}
$('calBtn').addEventListener('click',()=>openCal());
$('calBack').addEventListener('click',closeCal);
$('calGo').addEventListener('click',e=>{e.stopPropagation();if(!cal)return;cal.mode='measure';cal.taps=[];cal.from=A.currentTime+CAL_B*0.5;cal.until=A.currentTime+CAL_B*16;
 $('calGo').classList.add('hide');$('calMsg').innerHTML='画面は見ずに、聞こえた音に合わせて<br>8回タップしてください。';$('calHit').textContent='0 / 8';});
$('calMinus').addEventListener('click',e=>{e.stopPropagation();saveLat(effLat()-0.01);});
$('calPlus').addEventListener('click',e=>{e.stopPropagation();saveLat(effLat()+0.01);});
$('calReset').addEventListener('click',e=>{e.stopPropagation();saveLat(null);if(cal)calCheck();});
$('cal').addEventListener('pointerdown',e=>{if(!cal||e.target.closest('button'))return;const tt=A.currentTime;
 if(cal.mode==='measure'){if(tt<cal.from)return;
  // a tap belongs to the latest beat already played (a little early is allowed): sound reaches the ears late, never early
  let best=null;for(const b of cal.beats){const d=tt-b;if(d>-0.15&&d<LAT_MAX&&(best==null||d<best))best=d;}
  if(best!=null)cal.taps.push(best);$('calHit').textContent=cal.taps.length+' / 8';
  if(cal.taps.length>=8){const v=cal.taps.slice().sort((a,b)=>a-b);saveLat(Math.max(0,(v[3]+v[4])/2));
   calCheck(effLat()>CUT_LAG_MAX?'測りました。遅れが大きいので、斬る音は鳴らさずに遊びます。<br>タップして、ずれが0に近いか確かめてください。':'測りました。<br>タップして、ずれが0に近いか確かめてください。');}
  return;}
 // checking: the tap against the nearest beat as the game hears it (the beat plus the delay)
 const L=effLat();let d=null;for(const b of cal.beats){const x=tt-(b+L);if(d==null||Math.abs(x)<Math.abs(d))d=x;}
 if(d==null||Math.abs(d)>CAL_B/2)return;if(L<=CUT_LAG_MAX)sfxSwing();
 cal.offs.push(d);if(cal.offs.length>6)cal.offs.shift();const avg=cal.offs.reduce((a,b)=>a+b,0)/cal.offs.length;
 $('calHit').innerHTML=(Math.abs(d)<0.025?'ぴったり':d<0?'はやい '+ms(d):'おそい '+ms(d))+'<small>この'+cal.offs.length+'回の平均 '+ms(avg)+'</small>';});

function loadBest(id){try{const v=localStorage.getItem('iro-best-'+dkey(id));return v?JSON.parse(v):null;}catch(e){return null;}}
function saveBest(id,total,clear,perfect){const b=loadBest(id)||{total:0};const v={total:Math.max(b.total||0,total),clear:!!(clear||b.clear),perfect:!!(perfect||b.perfect)};try{localStorage.setItem('iro-best-'+dkey(id),JSON.stringify(v));}catch(e){}}
// at first only the first district is open; clearing one in either difficulty opens the next in both
function isOpen(i){if(i<=0)return true;const id=SONGS[i-1].id;
 return['','n-'].some(k=>{try{const v=JSON.parse(localStorage.getItem('iro-best-'+k+id)||'null');return !!(v&&v.clear);}catch(e){return false;}});}
function swatch(sg){const c=document.createElement('canvas');c.width=10;c.height=13;c.className='sw';const x=c.getContext('2d');const p=sg.pal;
 const gr=x.createLinearGradient(0,0,0,13);gr.addColorStop(0,p.top);gr.addColorStop(0.6,p.mid);gr.addColorStop(1,p.bot);x.fillStyle=gr;x.fillRect(0,0,10,13);
 x.fillStyle='rgba(0,0,0,.55)';x.fillRect(1,5,3,8);x.fillRect(5,3,4,10);x.fillStyle=p.winA;x.fillRect(2,7,1,1);x.fillRect(6,5,1,1);x.fillRect(7,8,1,1);x.fillStyle=p.winB;x.fillRect(2,10,1,1);x.fillRect(6,10,1,1);x.fillStyle=p.signA;x.fillRect(8,4,1,3);return c;}
function buildList(){const L=$('songList');L.innerHTML='';
 for(const t of document.querySelectorAll('#diffTabs button'))t.classList.toggle('on',t.dataset.d===DIFF);
 SONGS.forEach((sg,i)=>{const el=document.createElement('div');const b=loadBest(sg.id),open=isOpen(i);el.className='song'+(open?'':' locked');
  el.appendChild(swatch(sg));
  const info=document.createElement('div');info.className='sinfo';info.innerHTML='<div class="sname"></div><div class="ssub"></div>';info.children[0].textContent=sg.name;info.children[1].textContent=open?sg.sub:'ひとつ前の街区を CLEAR するとひらく';el.appendChild(info);
  const st=starOf(sg),badge=b&&b.perfect?'<span class="perf">PERFECT</span>':b&&b.clear?'<span class="clr">CLEAR</span>':'';
  const meta=document.createElement('div');meta.className='smeta';meta.innerHTML='BPM '+sg.bpm+'<br><span class="'+DIFF+'">'+DIFF_JA[DIFF]+(st?' ★'+st:'')+'</span><br>'+(!open?'LOCK':b?badge+' <b>'+(b.total||0).toLocaleString()+'</b>':'—');el.appendChild(meta);
  if(loadChart(sg.id))meta.innerHTML+='<br><span style="color:var(--cyan)">譜面 編集済み</span>';
  if(localSongs()[sg.id])meta.innerHTML+='<br><span style="color:var(--cyan)">曲 変更あり</span>';
  el.addEventListener('click',()=>{if(open||(DEV&&TOOL!=='play'))pickSong(sg);});L.appendChild(el);});}
for(const t of document.querySelectorAll('#diffTabs button'))t.addEventListener('click',()=>{DIFF=t.dataset.d;try{localStorage.setItem('iro-diff',DIFF);}catch(e){}buildList();});
const ENDINGS=[['auto','曲ごとのおすすめ'],['tag','A 最後の一行をくり返して着地'],['intro','E イントロに戻って締める'],['fade','F 走り去ってフェードアウト'],['cut','G 一撃で切って締める'],['hits','いまの締め（止め打ち）']];
const KEYUPS=[['auto','転調：曲ごと'],['on','転調：あり'],['off','転調：なし']];
function buildEndings(){const box=$('endList');box.innerHTML='';
 const opt=(label,on,fn,parent)=>{const b=document.createElement('div');b.className='endOpt'+(on?' on':'');b.textContent=label;b.addEventListener('click',fn);(parent||box).appendChild(b);};
 for(const[id,label]of ENDINGS)opt(label,ENDING===id,()=>{ENDING=id;try{localStorage.setItem('iro-ending2',id);}catch(e){}buildEndings();});
 const row=document.createElement('div');row.className='endRow';box.appendChild(row);
 for(const[id,label]of KEYUPS)opt(label,KEYUP===id,()=>{KEYUP=id;try{localStorage.setItem('iro-keyup',id);}catch(e){}buildEndings();},row);
 $('fromLast').classList.toggle('on',FROM_LAST);}
function openSelect(){buildList();if(DEV){buildEndings();buildTools();}$('title').classList.add('hide');$('result').classList.add('hide');$('select').classList.remove('hide');}
function start(sg){initAudio();if(A.state==='suspended')A.resume();applySong(sg||SONG);$('title').classList.add('hide');$('result').classList.add('hide');$('select').classList.add('hide');newGame();$('pauseBtn').classList.toggle('hide',MODE!=='play');}
$('startBtn').addEventListener('click',()=>{if(tutSeen())openSelect();else openCal('tutorial');});
$('pauseBtn').addEventListener('click',()=>{if(!running||MODE!=='play')return;pauseSong();$('pauseMenu').classList.remove('hide');});
$('psGo').addEventListener('click',()=>{$('pauseMenu').classList.add('hide');resumeSong();});
$('psAgain').addEventListener('click',()=>{$('pauseMenu').classList.add('hide');quitSong();start(SONG);});
$('psSel').addEventListener('click',()=>{$('pauseMenu').classList.add('hide');quitSong();openSelect();});
$('freeze').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();$('freeze').classList.add('hide');resumeSong();});
if(DEV)$('fromLast').addEventListener('click',()=>{FROM_LAST=!FROM_LAST;buildEndings();});
$('againBtn').addEventListener('click',()=>start(SONG));
$('toSelBtn').addEventListener('click',openSelect);
$('selBack').addEventListener('click',()=>{$('select').classList.add('hide');$('title').classList.remove('hide');});
// ---------- share ----------
// A square card: the district as the song ended (its colors back), the logo, the song and its stars, the score,
// then the closing line and the counts, in the result's order.
function prepareShare(total,clear,perfect){if(!window.MG||!MG.share)return;
 const S=1080,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d'),F="'DotGothic16',monospace";
 x.fillStyle='#050507';x.fillRect(0,0,S,S);x.imageSmoothingEnabled=false;
 const sy=60,side=W;x.drawImage(cv,0,sy,side,side,0,0,S,S);// the lanes and the skyline, 8 pixels to a dot
 const veil=x.createLinearGradient(0,0,0,S);veil.addColorStop(0,'rgba(5,5,7,.55)');veil.addColorStop(.45,'rgba(5,5,7,.35)');veil.addColorStop(1,'rgba(5,5,7,.92)');
 x.fillStyle=veil;x.fillRect(0,0,S,S);x.textAlign='center';
 const fit=(t,y,size,col,maxW=S-140)=>{x.font=size+'px '+F;const w=x.measureText(t).width;if(w>maxW)x.font=(size*maxW/w)+'px '+F;x.fillStyle=col;x.fillText(t,S/2,y);};
 // the logo as on the title: white with a pink and a cyan edge
 x.font='120px '+F;for(const[dx,col]of[[6,'#ff3d8b'],[-6,'#39f0ff'],[0,'#f2f2f4']]){x.fillStyle=col;x.fillText('彩鍵',S/2+dx,160);}
 fit('いろかぎ',214,30,'#8a8c93');
 fit(SONG.name+'　'+DIFF_JA[DIFF]+(starOf(SONG)?' ★'+starOf(SONG):''),600,46,'#e6e6ea');
 fit(total.toLocaleString(),760,150,'#ffffff');
 fit(perfect?'PERFECT':clear?'CLEAR':'最大コンボ '+maxCombo,850,clear?56:40,clear?'#ffffff':'#e9e9ee');
 fit($('rCmt').textContent,935,36,'#e9e9ee');
 fit('ジャスト '+nPerf+'　ナイス '+nGood+'　ミス '+nMiss,1000,30,'#8a8c93');
 const page=/^https?:/.test(location.href)&&!/claude\.ai|claudeusercontent/.test(location.href)?'\n'+location.href.split('#')[0].split('?')[0]:'';
 const text='彩鍵\n'+SONG.name+' '+DIFF_JA[DIFF]+(starOf(SONG)?'★'+starOf(SONG):'')+'\n'+total.toLocaleString()+'点'+(perfect?' PERFECT':clear?' CLEAR':'')+'\n#彩鍵'+page;
 MG.share.prepare(c,{text,name:'irokagi-'+SONG.id+'.png'});}
$('shareBtn').addEventListener('click',()=>MG.share.open());

// ---------- tutorial ----------
// First the timing (the clicks must meet the ears), then one scene per move: a short heading, one line,
// and the real game playing that move by itself on a loop, with a thumb showing the touch.
const TUT_KEY='iro-tut',TUT_SONG='neon';
const tutSeen=()=>{try{return !!localStorage.getItem(TUT_KEY);}catch(e){return true;}};
const rep4=(bars,beats)=>bars.flatMap(b=>beats.map(([bt,k,l])=>[b,bt,k,l]));
const TUT_SCENES=[
 {h:'街の色を取り返せ',p:'あなたは地下のハッカー。敵が抱えた色を斬って、灰色の街に戻そう。',from:12,to:14,color:1,
  notes:rep4([12,13],[[0,'body',1],[1,'body',1],[2,'body',0],[3,'body',0]])},
 {h:'タップで斬る',p:'同じ高さに来た敵は、タップで斬る。',from:4,to:6,notes:rep4([4,5],[[0,'body',1],[1,'body',1],[2,'body',1],[3,'body',1]])},
 {h:'上下にはらって段を替える',p:'もう一方の段の敵は、上下にはらって飛び移りながら斬る。',from:4,to:6,notes:rep4([4,5],[[0,'body',0],[1,'body',1],[2,'body',0],[3,'body',1]])},
 {h:'ジャンプ斬りとスライディング',p:'上の段でさらに上へはらうと跳び、下の段でさらに下へはらうと滑る。',from:4,to:6,notes:rep4([4,5],[[0,'body',0],[1,'high',0],[2,'body',1],[3,'low',1]])},
 {h:'段のあいだの敵',p:'段のあいだに浮かぶ敵は、段を替える動きで斬れる。',from:4,to:6,notes:rep4([4,5],[[0,'mid',0],[1,'mid',1],[2,'mid',0],[3,'mid',1]])},
 {h:'光の帯は、サビの頭で離す',p:'溜めで集めた色は光の帯になる。押したまま、サビの頭で離して解き放つ。',from:10,to:13,
  notes:[...rep4([10],[[0,'body',1],[1,'body',1],[2,'body',1],[3,'body',1]]),...rep4([12],[[1,'body',1],[2,'body',0],[3,'body',0]])],holds:[[11,1]]},
 {h:'錠は、連打で破る',p:'錠が来たら連打。サビの頭で開いて、色があふれ出す。',from:10,to:13,
  notes:[...rep4([10],[[0,'body',1],[1,'body',1],[2,'body',1],[3,'body',1]]),...rep4([12],[[1,'body',1],[2,'body',0],[3,'body',0]])],holds:[[11,1,'mash']]},
];
let tut=null;// {i, sc, after: what the last button does}
// the thumb drawn under the demo makes the same touch: one short move per cut (each starts over, even the same move twice), pressed down through a key
const THUMB_MOVE={tap:[{transform:'none'},{transform:'scale(.86) translateY(4px)',offset:.4},{transform:'none'}],
 up:[{transform:'none'},{transform:'translateY(-26px)',offset:.45},{transform:'none'}],down:[{transform:'none'},{transform:'translateY(26px)',offset:.45},{transform:'none'}]};
function thumb(a){const el=$('thumb');
 if(a==='press'){el.classList.add('press');return;}if(a==='lift'){el.classList.remove('press');return;}
 if(el.classList.contains('press'))return;el.animate(THUMB_MOVE[a],{duration:a==='tap'?220:280,easing:'ease-out'});}
function demoScene(i){const sc=TUT_SCENES[i];tut.i=i;tut.sc=sc;
 const all=chartFrom({notes:sc.notes,holds:sc.holds||[]});notes=all.filter(n=>!n.hold);holds=all.filter(n=>n.hold);
 buildMax=[0,1].map(k=>Math.max(1,notes.filter(n=>n.sec==='build'&&n.k===k).length));lane=1;
 $('tutDots').innerHTML=TUT_SCENES.map((_,j)=>'<i'+(j===i?' class="on"':'')+'></i>').join('');
 $('tutH').textContent=sc.h;$('tutP').textContent=sc.p;$('tutNext').textContent=i<TUT_SCENES.length-1?'つぎへ':tut.after==='select'?'街区をえらぶ':'おわる';
 $('tutPrev').classList.toggle('hide',i===0);demoLoop();}
function demoLoop(){const sc=tut.sc;seekTo(sc.from);$('thumb').classList.remove('press');lane=1;laneFrom=1;
 if(sc.color){buildStock=buildMax.slice();released=[true,true];districtSat=[1,1];worldSat=targetSat(sc.from*BAR);}}
function startTutorial(after){tut={i:0,after};MODE='demo';start(SONGS.find(s=>s.id===TUT_SONG)||SONGS[0]);$('tut').classList.remove('hide');demoScene(0);}
function endTutorial(){if(!tut)return;const after=tut.after;tut=null;$('tut').classList.add('hide');quitSong();MODE='play';
 try{localStorage.setItem(TUT_KEY,'1');}catch(e){}
 if(after==='select')openSelect();else $('title').classList.remove('hide');}
$('tutNext').addEventListener('click',()=>{if(!tut)return;if(tut.i<TUT_SCENES.length-1)demoScene(tut.i+1);else endTutorial();});
$('tutPrev').addEventListener('click',()=>{if(tut&&tut.i>0)demoScene(tut.i-1);});
$('tutSkip').addEventListener('click',endTutorial);
$('howBtn').addEventListener('click',()=>startTutorial('title'));
applySong(SONGS[0]);
requestAnimationFrame(frame);
document.querySelector('#title .tag').textContent=(DEV?'試作 ':'')+'ver'+VERSION;
if(DEV||window.IRO_TEST)window.__dbg={SONGS,start,get kime(){return kime},get songLen(){return SONG_LEN},get bar(){return BAR},get notes(){return notes},get holds(){return holds},now,get districtSat(){return districtSat},onPress,onRelease,onFlick,get lane(){return lane},set ending(e){ENDING=e},set keyup(v){KEYUP=v},set fromLast(v){FROM_LAST=v},set design(d){HERO_DESIGN=d},seekTo,set mode(m){MODE=m},get mode(){return MODE}};
