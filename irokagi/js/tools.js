'use strict';
// Prototype tools (not for release): the BGM preview with a seek bar, and a chart editor.
// The select screen's tool row decides what tapping a song does.
let TOOL='play',fromEditor=false,lsDrag=false;
const SEC_JA={intro:'イントロ',build:'溜め',drop:'サビ',break:'間奏',outro:'締め'};
function buildTools(){const row=$('toolRow');row.innerHTML='';
 for(const[id,label]of[['play','あそぶ'],['listen','BGM試聴'],['edit','譜面エディタ']]){const b=document.createElement('div');b.className='endOpt'+(TOOL===id?' on':'');b.textContent=label;
  b.addEventListener('click',()=>{TOOL=id;buildTools();});row.appendChild(b);}}
function pickSong(sg){if(TOOL==='listen')startListen(sg,0);else if(TOOL==='edit')openEditor(sg);else{fromEditor=false;MODE='play';start(sg);}}

// ---------- BGM preview ----------
function startListen(sg,bar){MODE='listen';start(sg);if(bar>0)seekTo(bar);$('listen').classList.remove('hide');$('lsEd').classList.toggle('hide',!fromEditor);
 $('lsSeek').max=TOTAL_BARS-1;$('lsName').textContent=SONG.name;$('lsPause').textContent='一時停止';lsLabel(bar);}
function lsLabel(bar){const si=secAt(bar);$('lsBar').textContent=(bar+1)+' / '+TOTAL_BARS+'小節　'+SEC_JA[SECTIONS[si][0]];if(!lsDrag)$('lsSeek').value=bar;}
function stopTools(){if(A){if(A.state==='suspended')A.resume();resetBuses();}stopAmbience();running=false;ended=true;MODE='play';
 $('listen').classList.add('hide');$('edBack').classList.add('hide');}
function toolsEnded(){if(MODE==='listen')$('lsPause').textContent='はじめから';}
$('lsSeek').addEventListener('input',()=>{lsDrag=true;lsLabel(+$('lsSeek').value);});
$('lsSeek').addEventListener('change',()=>{lsDrag=false;seekTo(+$('lsSeek').value);$('lsPause').textContent='一時停止';});
$('lsPause').addEventListener('click',()=>{if(!running){seekTo(0);$('lsPause').textContent='一時停止';return;}
 if(A.state==='running'){A.suspend();$('lsPause').textContent='再生';}else{A.resume();$('lsPause').textContent='一時停止';}});
$('lsBack').addEventListener('click',()=>{stopTools();fromEditor=false;openSelect();});
$('lsEd').addEventListener('click',()=>{stopTools();openEditor(SONG);});
$('edBack').addEventListener('click',()=>{stopTools();$('result').classList.add('hide');openEditor(SONG);});
$('toEdBtn').addEventListener('click',()=>{stopTools();$('result').classList.add('hide');openEditor(SONG);});
setInterval(()=>{if(MODE==='listen'&&running&&!lsDrag)lsLabel(Math.min(TOTAL_BARS-1,curBar()));},200);

// ---------- chart editor ----------
// Time runs downward, one row per 16th (or per triplet). Columns: 高 (jump), 上段, 中 (between lanes), 下段, 低 (slide).
// Tap an empty spot to place, tap a note to remove. A 中 note is cut by a lane change either way. Tap a bar number to start from there.
const ED={data:null,scroll:0,snap:4,sel:0,cv:null,x:null,w:0,h:0,pd:null};
const COLS=[['high','高'],['b0','上段'],['mid','中'],['b1','下段'],['low','低']];
const GUT=46,HEAD=22,BEAT_H=44;
function openEditor(sg){fromEditor=true;applySong(sg);$('select').classList.add('hide');$('result').classList.add('hide');$('editor').classList.remove('hide');
 ED.data=loadChart(SONG.id)||chartData(baseChart());$('edName').textContent=SONG.name;$('edSnap').textContent=ED.snap===4?'16分':'3連';
 edSize();edDraw();}
function edSize(){const c=$('edCv'),r=c.getBoundingClientRect(),d=devicePixelRatio||1;c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);ED.w=r.width;ED.h=r.height;ED.x=c.getContext('2d');ED.x.setTransform(d,0,0,d,0,0);}
addEventListener('resize',()=>{if(!$('editor').classList.contains('hide')){edSize();edDraw();}});
const edY=beats=>HEAD+beats*BEAT_H-ED.scroll;
const colW=()=>(ED.w-GUT)/COLS.length;
function colOf(n){return n[2]==='high'?0:n[2]==='low'?4:n[2]==='mid'?2:n[3]===0?1:3;}
function noteTime(n){return n[4]?n[0]*BAR+n[1]*B:beatT(n[0],n[1]);}
function edSave(){try{localStorage.setItem(chartKey(SONG.id),JSON.stringify(ED.data));}catch(e){}}
// what a note needs to be playable: room after the previous one, and a lane change in time for jumps, slides and pylons
function edWarnings(){const ns=ED.data.notes.slice().sort((a,b)=>noteTime(a)-noteTime(b));const bad=new Map();let prev=null,ln=1;
 for(const n of ns){const t=noteTime(n);const need=n[2]==='high'?0:n[2]==='low'?1:null;
  if(prev!=null&&t-prev<MIN_GAP-1e-6)bad.set(n,'近すぎ');else if(need!=null&&need!==ln&&prev!=null&&t-prev<0.25)bad.set(n,'段の移動が間に合わない');
  prev=t;ln=n[2]==='high'?0:n[2]==='low'?1:n[2]==='mid'?1-ln:n[3];}
 return bad;}
function edDraw(){const x=ED.x,w=ED.w,h=ED.h,cw=colW();x.fillStyle='#08080b';x.fillRect(0,0,w,h);
 const b0=Math.max(0,Math.floor((ED.scroll)/BEAT_H)-1),b1=Math.ceil((ED.scroll+h)/BEAT_H)+1;
 // section bands and grid
 for(let bt=b0;bt<=b1&&bt<TOTAL_BARS*4;bt++){const y=edY(bt),bar=Math.floor(bt/4),si=secAt(bar),type=SECTIONS[si][0];
  x.fillStyle={intro:'#101016',build:'#14101a',drop:'#1a0e16',break:'#0e1416',outro:'#16140e'}[type];x.fillRect(GUT,y,w-GUT,BEAT_H);
  const div=ED.snap;for(let k=1;k<div;k++){x.fillStyle='#1d1e24';x.fillRect(GUT,Math.round(y+k*BEAT_H/div),w-GUT,1);}
  x.fillStyle=bt%4===0?'#5a5c66':'#2e3038';x.fillRect(bt%4===0?0:GUT,Math.round(y),bt%4===0?w:w-GUT,bt%4===0?2:1);
  if(bt%4===0){x.fillStyle=bar===ED.sel?'#39f0ff':'#cfd0d4';x.font='13px DotGothic16, monospace';x.textAlign='left';x.fillText(String(bar+1),6,y+16);
   x.fillStyle='#8a8c93';x.font='10px DotGothic16, monospace';const rel=bar-secStart[si];if(rel===0)x.fillText(SEC_JA[type],6,y+30);
   if(bar===ED.sel){x.fillStyle='#39f0ff';x.fillRect(0,y,3,BEAT_H*4);}}}
 for(let c=1;c<COLS.length;c++){x.fillStyle='#24252c';x.fillRect(GUT+c*cw,0,1,h);}
 // holds
 for(const[bar,ln]of ED.data.holds){const y=edY(bar*4),cx=GUT+(ln===0?1:3)*cw;x.globalAlpha=0.35;x.fillStyle='#ff3d8b';x.fillRect(cx+4,y,cw-8,BEAT_H*4);x.globalAlpha=1;
  x.fillStyle='#ffffff';x.font='11px DotGothic16, monospace';x.textAlign='center';x.fillText('光の帯',cx+cw/2,y+16);}
 // notes
 const bad=edWarnings();
 for(const n of ED.data.notes){const bt=n[0]*4+n[1];if(bt<b0-1||bt>b1+1)continue;const y=edY(bt),c=colOf(n),cx=GUT+c*cw+cw/2;
  const col=n[2]==='body'?(n[3]===0?'#39f0ff':'#ff3d8b'):n[2]==='mid'?'#ffb54a':'#a6ff5a';x.fillStyle=col;
  if(n[2]==='body'){x.fillRect(cx-cw*0.34,y-4,cw*0.68,8);}
  else if(n[2]==='mid'){x.beginPath();x.moveTo(cx,y-7);x.lineTo(cx+6,y);x.lineTo(cx,y+7);x.lineTo(cx-6,y);x.closePath();x.fill();}
  else{x.beginPath();const up=n[2]==='high';x.moveTo(cx,up?y-7:y+7);x.lineTo(cx-7,up?y+5:y-5);x.lineTo(cx+7,up?y+5:y-5);x.closePath();x.fill();}
  if(bad.has(n)){x.strokeStyle='#ff4040';x.lineWidth=2;x.strokeRect(cx-cw*0.4,y-7,cw*0.8,14);}}
 // header
 x.fillStyle='#000';x.fillRect(0,0,w,HEAD);x.fillStyle='#cfd0d4';x.font='12px DotGothic16, monospace';x.textAlign='center';
 x.fillText('小節',GUT/2,15);COLS.forEach(([,l],i)=>x.fillText(l,GUT+i*cw+cw/2,15));
 $('edInfo').textContent=bad.size?'赤枠：'+[...new Set(bad.values())].join('・'):'';}
function edMaxScroll(){return Math.max(0,TOTAL_BARS*4*BEAT_H+HEAD+40-ED.h);}
$('edCv').addEventListener('pointerdown',e=>{ED.pd={id:e.pointerId,y:e.clientY,x:e.clientX,s:ED.scroll,moved:false};$('edCv').setPointerCapture(e.pointerId);});
$('edCv').addEventListener('pointermove',e=>{const p=ED.pd;if(!p||p.id!==e.pointerId)return;const dy=e.clientY-p.y;if(Math.abs(dy)>6)p.moved=true;
 if(p.moved){ED.scroll=Math.max(0,Math.min(edMaxScroll(),p.s-dy));edDraw();}});
$('edCv').addEventListener('pointerup',e=>{const p=ED.pd;ED.pd=null;if(!p||p.moved)return;const r=$('edCv').getBoundingClientRect();edTap(e.clientX-r.left,e.clientY-r.top);});
$('edCv').addEventListener('wheel',e=>{ED.scroll=Math.max(0,Math.min(edMaxScroll(),ED.scroll+e.deltaY));edDraw();e.preventDefault();},{passive:false});
function edTap(px,py){if(py<HEAD)return;const beats=(py-HEAD+ED.scroll)/BEAT_H;
 if(px<GUT){ED.sel=Math.max(0,Math.min(TOTAL_BARS-1,Math.floor(beats/4)));edDraw();return;}
 const c=Math.min(COLS.length-1,Math.floor((px-GUT)/colW()));
 // an existing note in this column near the tap
 const near=ED.data.notes.filter(n=>colOf(n)===c).map(n=>[n,Math.abs(n[0]*4+n[1]-beats)]).filter(v=>v[1]<0.6/ED.snap).sort((a,b)=>a[1]-b[1])[0];
 if(near)ED.data.notes.splice(ED.data.notes.indexOf(near[0]),1);
 else{const q=Math.round(beats*ED.snap)/ED.snap,bar=Math.floor(q/4+1e-9),b=+(q-bar*4).toFixed(4);if(bar<0||bar>=TOTAL_BARS)return;
  const kind=COLS[c][0];const n=kind==='b0'?[bar,b,'body',0]:kind==='b1'?[bar,b,'body',1]:kind==='mid'?[bar,b,'mid',0]:[bar,b,kind,kind==='high'?0:1];
  ED.data.notes.push(n);ED.data.notes.sort((a,b)=>noteTime(a)-noteTime(b));}
 edSave();edDraw();}
$('edSnap').addEventListener('click',()=>{ED.snap=ED.snap===4?3:4;$('edSnap').textContent=ED.snap===4?'16分':'3連';edDraw();});
$('edListen').addEventListener('click',()=>{edSave();$('editor').classList.add('hide');startListen(SONG,ED.sel);});
$('edPlay').addEventListener('click',()=>{edSave();$('editor').classList.add('hide');MODE='play';start(SONG);if(ED.sel>0)seekTo(ED.sel);$('edBack').classList.remove('hide');});
$('edReset').addEventListener('click',()=>{if(!confirm('この曲の編集を消して、元の譜面に戻しますか？'))return;try{localStorage.removeItem(chartKey(SONG.id));}catch(e){}ED.data=chartData(baseChart());edDraw();});
$('edExport').addEventListener('click',()=>{const t=$('edText');t.value=JSON.stringify(ED.data);$('edIO').classList.remove('hide');$('edLoad').classList.add('hide');$('edIOMsg').textContent='この文字をコピーして送ってください。';t.select();
 try{navigator.clipboard.writeText(t.value).then(()=>{$('edIOMsg').textContent='コピーしました。このまま送ってください。';},()=>{});}catch(e){}});
$('edImport').addEventListener('click',()=>{$('edText').value='';$('edIO').classList.remove('hide');$('edLoad').classList.remove('hide');$('edIOMsg').textContent='書き出した文字を貼りつけてください。';});
$('edLoad').addEventListener('click',()=>{try{const d=JSON.parse($('edText').value);if(!Array.isArray(d.notes)||!Array.isArray(d.holds))throw 0;
  if(d.song&&d.song!==SONG.id){const sg=SONGS.find(s=>s.id===d.song);if(sg)applySong(sg);$('edName').textContent=SONG.name;}
  ED.data={song:SONG.id,notes:d.notes,holds:d.holds};edSave();$('edIO').classList.add('hide');edDraw();}catch(e){$('edIOMsg').textContent='読み込めませんでした。';}});
$('edIOClose').addEventListener('click',()=>$('edIO').classList.add('hide'));
$('edClose').addEventListener('click',()=>{$('editor').classList.add('hide');fromEditor=false;openSelect();});
