// Songs and charts live as text files under data/ (format: data/README.md), so they can be passed back and forth and edited outside the game.
// This loads them, then starts the game scripts. A file that does not arrive is retried (the last tries skip the cache);
// if it still fails, the page says so and offers a reload instead of starting with a song missing.
const GAME_SCRIPTS=['js/audio.js','js/hero.js','js/scenes.js','js/game.js','js/tools.js'];
const DEV=!!window.IRO_DEV;// the prototype's tools (BGM preview, chart editor, song data, ending switches); the public page has none
const LOCAL_SONGS='iro-songs-local';// songs pasted in through the song data tool: {id: song}

// the same layout the files use: one field per line, a chart one note per line, a melody one bar per line
function fmtSong(sg){const J=v=>JSON.stringify(v);
 const lines=Object.keys(sg).map(k=>{const v=sg[k];
  if(k==='mel')return ' "mel": [\n'+v.map(bar=>'  '+J(bar)).join(',\n')+'\n ]';
  return ' '+J(k)+': '+J(v);});
 return '{\n'+lines.join(',\n')+'\n}\n';}
function fmtChart(d){const J=v=>JSON.stringify(v);
 return '{\n "song": '+J(d.song)+',\n "notes": [\n'+d.notes.map(n=>'  '+J(n)).join(',\n')+'\n ],\n "holds": '+J(d.holds)+'\n}\n';}

function localSongs(){if(!DEV)return {};try{return JSON.parse(localStorage.getItem(LOCAL_SONGS)||'{}');}catch(e){return {};}}
function saveLocalSongs(o){try{localStorage.setItem(LOCAL_SONGS,JSON.stringify(o));}catch(e){}}
// a pasted song only needs the fields it changes: the rest comes from the file version (or, for a new id, from the first song)
function mergeSong(base,patch){return Object.assign(JSON.parse(JSON.stringify(base)),patch);}

async function getJSON(url){
 for(let i=0;i<4;i++){
  try{const r=await fetch(i<2?url:url+'?r='+Date.now(),{cache:i<2?'default':'reload'});if(r.ok)return await r.json();}catch(e){}
  await new Promise(res=>setTimeout(res,300*(i+1)));}
 throw new Error(url);}
function loadScript(src){return new Promise((ok,ng)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>ng(new Error(src));document.body.appendChild(s);});}
async function loadScriptRetry(src){for(let i=0;i<3;i++){try{return await loadScript(i?src+'?r='+Date.now():src);}catch(e){await new Promise(r=>setTimeout(r,300*(i+1)));}}throw new Error(src);}

// the web font: if it does not come, the font CSS is fetched again (skipping the cache) before waiting once more
const FONT='16px DotGothic16',FONT_SAMPLE='彩鍵いろかぎ街区をえらぶ色を斬るジャストナイスミス0123456789';
const wait=ms=>new Promise(r=>setTimeout(r,ms)),withTimeout=(p,ms)=>Promise.race([p,wait(ms).then(()=>null)]);
async function loadFontRetry(){if(!document.fonts)return true;
 for(let i=0;i<3;i++){
  if(i){const old=document.getElementById('webfonts');if(old){const l=old.cloneNode();l.href=old.href.replace(/[?&]retry=\d+/,'')+'&retry='+i;old.replaceWith(l);await withTimeout(new Promise(r=>{l.onload=l.onerror=r;}),8000);}await wait(600*i);}
  await withTimeout(document.fonts.load(FONT,FONT_SAMPLE),8000).catch(()=>null);
  if(document.fonts.check(FONT,FONT_SAMPLE))return true;}
 return false;}
async function boot(){const msg=document.getElementById('loadMsg');let n=0;const total=1+3*12+GAME_SCRIPTS.length+1;const step=()=>MG.loading.progress(++n,total);
 try{
  const font=loadFontRetry();
  const idx=await getJSON('data/songs.json');step();
  const files=await Promise.all(idx.songs.map(id=>getJSON('data/songs/'+id+'.json').then(v=>(step(),v))));
  const charts=await Promise.all(idx.songs.map(id=>getJSON('data/charts/'+id+'.json').then(v=>(step(),v))));
  const chartsN=await Promise.all(idx.songs.map(id=>getJSON('data/charts-normal/'+id+'.json').then(v=>(step(),v))));
  window.FILE_SONGS=files;window.CHARTS={};window.CHARTS_N={};idx.songs.forEach((id,i)=>{CHARTS[id]=charts[i];CHARTS_N[id]=chartsN[i];});
  const loc=localSongs();
  window.SONGS=files.map(sg=>loc[sg.id]?mergeSong(sg,loc[sg.id]):sg);
  for(const id in loc)if(!files.some(f=>f.id===id))SONGS.push(mergeSong(files[0],loc[id]));
  for(const s of GAME_SCRIPTS){await loadScriptRetry(s);step();}
  if(!await font)throw new Error('font');step();
  if(!DEV)for(const id of['endBox','toolBox','listen','edBack','songIO','editor'])document.getElementById(id).classList.add('hide');
  document.getElementById('loading').remove();MG.loading.done();
 }catch(e){msg.textContent='読み込めませんでした。通信のよい場所で読み込み直してください。';document.getElementById('reloadBtn').classList.remove('hide');MG.loading.done();}}
document.getElementById('reloadBtn').addEventListener('click',()=>location.reload());
boot();
