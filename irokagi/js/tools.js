'use strict';
// Prototype tools (not for release): the BGM preview with a seek bar, and a chart editor.
// The select screen's tool row decides what tapping a song does.
let TOOL='play',fromEditor=false,lsDrag=false;
const SEC_JA={intro:'イントロ',build:'溜め',drop:'サビ',break:'間奏',outro:'締め'};
function buildTools(){const row=$('toolRow');row.innerHTML='';
 for(const[id,label]of[['play','あそぶ'],['listen','BGM試聴'],['edit','譜面エディタ'],['song','曲データ']]){const b=document.createElement('div');b.className='endOpt'+(TOOL===id?' on':'');b.textContent=label;
  b.addEventListener('click',()=>{TOOL=id;buildTools();});row.appendChild(b);}}
function pickSong(sg){if(TOOL==='listen')startListen(sg,0);else if(TOOL==='edit')openEditor(sg);else if(TOOL==='song')openSongIO(sg);else{fromEditor=false;MODE='play';start(sg);}}

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
$('lsBack').addEventListener('click',()=>{stopTools();fromEditor=false;if(fromSongIO)openSongIO(SONG);else openSelect();});
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
 ED.data=loadChart(SONG.id)||fileChart(SONG.id)||chartData(baseChart());$('edName').textContent=SONG.name;$('edSnap').textContent=ED.snap===4?'16分':'3連';
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
$('edReset').addEventListener('click',()=>{if(!confirm('この曲の編集を消して、元の譜面に戻しますか？'))return;try{localStorage.removeItem(chartKey(SONG.id));}catch(e){}ED.data=fileChart(SONG.id)||chartData(baseChart());edDraw();});
$('edExport').addEventListener('click',()=>{const t=$('edText');t.value=fmtChart(ED.data);$('edIO').classList.remove('hide');$('edLoad').classList.add('hide');$('edIOMsg').textContent='この文字をコピーして送ってください。';t.select();
 try{navigator.clipboard.writeText(t.value).then(()=>{$('edIOMsg').textContent='コピーしました。このまま送ってください。';},()=>{});}catch(e){}});
$('edImport').addEventListener('click',()=>{$('edText').value='';$('edIO').classList.remove('hide');$('edLoad').classList.remove('hide');$('edIOMsg').textContent='書き出した文字を貼りつけてください。';});
$('edLoad').addEventListener('click',()=>{try{const d=JSON.parse($('edText').value);if(!Array.isArray(d.notes)||!Array.isArray(d.holds))throw 0;
  if(d.song&&d.song!==SONG.id){const sg=SONGS.find(s=>s.id===d.song);if(sg)applySong(sg);$('edName').textContent=SONG.name;}
  ED.data={song:SONG.id,notes:d.notes,holds:d.holds};edSave();$('edIO').classList.add('hide');edDraw();}catch(e){$('edIOMsg').textContent='読み込めませんでした。';}});
$('edIOClose').addEventListener('click',()=>$('edIO').classList.add('hide'));
$('edClose').addEventListener('click',()=>{$('editor').classList.add('hide');fromEditor=false;openSelect();});

// ---- song data: show a song as text, and try out a song that came back from outside ----
let fromSongIO=false;
function openSongIO(sg){applySong(sg);fromSongIO=true;$('select').classList.add('hide');$('result').classList.add('hide');$('songIO').classList.remove('hide');
 $('sgName').textContent=sg.name;$('sgText').value=fmtSong(sg);$('sgReset').classList.toggle('hide',!localSongs()[sg.id]);
 $('sgMsg').textContent=localSongs()[sg.id]?'貼りつけたデータで鳴らしています。「元に戻す」でファイルの曲に戻ります。':'この曲のデータです。書き出してほかのAIに渡したり、返ってきたデータを貼りつけて試したりできます。';}
function closeSongIO(){$('songIO').classList.add('hide');fromSongIO=false;}
// a quick shape check, so a broken paste says what is wrong instead of breaking the song
function songProblems(p){const bad=[];const nums=a=>Array.isArray(a)&&a.every(x=>typeof x==='number');
 if('bpm'in p&&!(typeof p.bpm==='number'&&p.bpm>=60&&p.bpm<=220))bad.push('bpm は 60〜220 の数');
 if('ch'in p&&!(Array.isArray(p.ch)&&p.ch.length===4&&p.ch.every(c=>Array.isArray(c)&&typeof c[0]==='number'&&nums(c[1]))))bad.push('ch は [ベース音, [和音の音…]] を4小節分');
 if('mel'in p&&!(Array.isArray(p.mel)&&p.mel.length===4&&p.mel.every(b=>Array.isArray(b)&&b.every(n=>Array.isArray(n)&&typeof n[0]==='number'&&n[0]>=0&&n[0]<16&&typeof n[1]==='number'&&typeof n[2]==='number'))))bad.push('mel は [位置0〜15, 音, 長さ] の並びを4小節分');
 if('end'in p&&!(Array.isArray(p.end)&&p.end.every(n=>Array.isArray(n)&&typeof n[1]==='number')))bad.push('end は [位置, 音, 長さ] の並び');
 if('drums'in p&&!(p.drums&&['k','s','h','g'].every(k=>typeof p.drums[k]==='string'&&p.drums[k].length===16)))bad.push('drums は k s h g それぞれ16文字');
 if('bass'in p&&!(Array.isArray(p.bass)&&p.bass.every(nums)))bad.push('bass は [位置, ルートからの差, 長さ] の並び');
 return bad;}
$('sgApply').addEventListener('click',()=>{let p;
 try{p=JSON.parse($('sgText').value);}catch(e){$('sgMsg').textContent='データとして読めませんでした。{ から } まで全部貼りつけてください。';return;}
 if(!p||typeof p!=='object'||Array.isArray(p)){$('sgMsg').textContent='{ } で囲まれた曲のデータを貼りつけてください。';return;}
 if(!p.id)p.id=SONG.id;const bad=songProblems(p);if(bad.length){$('sgMsg').textContent='直してほしいところ：'+bad.join('／');return;}
 const loc=localSongs();loc[p.id]=p;saveLocalSongs(loc);
 const base=FILE_SONGS.find(f=>f.id===p.id)||FILE_SONGS[0],sg=mergeSong(base,p),i=SONGS.findIndex(s=>s.id===p.id);
 if(i>=0)SONGS[i]=sg;else SONGS.push(sg);openSongIO(sg);
 $('sgMsg').textContent='読み込みました。「▶ 試聴」で聴けます。'+(i<0?'新しい曲として一覧の最後に足しました。':'');});
$('sgListen').addEventListener('click',()=>{$('songIO').classList.add('hide');startListen(SONG,0);});
$('sgCopy').addEventListener('click',()=>{const t=$('sgText');t.select();try{navigator.clipboard.writeText(t.value).then(()=>{$('sgMsg').textContent='コピーしました。';},()=>{});}catch(e){}});
$('sgReset').addEventListener('click',()=>{if(!confirm('貼りつけたデータを消して、ファイルの曲に戻しますか？'))return;
 const id=SONG.id,loc=localSongs();delete loc[id];saveLocalSongs(loc);const f=FILE_SONGS.find(s=>s.id===id),i=SONGS.findIndex(s=>s.id===id);
 if(f){SONGS[i]=f;openSongIO(f);}else{SONGS.splice(i,1);closeSongIO();openSelect();}});
$('sgClose').addEventListener('click',()=>{closeSongIO();openSelect();});
