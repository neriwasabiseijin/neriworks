// Songs and charts live as text files under data/ (format: data/README.md), so they can be passed back and forth and edited outside the game.
// This loads them, then starts the game scripts. A file that does not arrive is retried (the last tries skip the cache);
// if it still fails, the page says so and offers a reload instead of starting with a song missing.
const GAME_SCRIPTS=['js/audio.js','js/hero.js','js/scenes.js','js/game.js','js/tools.js'];
const LOCAL_SONGS='iro-songs-local';// songs pasted in through the song data tool: {id: song}

// the same layout the files use: one field per line, a chart one note per line, a melody one bar per line
function fmtSong(sg){const J=v=>JSON.stringify(v);
 const lines=Object.keys(sg).map(k=>{const v=sg[k];
  if(k==='mel')return ' "mel": [\n'+v.map(bar=>'  '+J(bar)).join(',\n')+'\n ]';
  return ' '+J(k)+': '+J(v);});
 return '{\n'+lines.join(',\n')+'\n}\n';}
function fmtChart(d){const J=v=>JSON.stringify(v);
 return '{\n "song": '+J(d.song)+',\n "notes": [\n'+d.notes.map(n=>'  '+J(n)).join(',\n')+'\n ],\n "holds": '+J(d.holds)+'\n}\n';}

function localSongs(){try{return JSON.parse(localStorage.getItem(LOCAL_SONGS)||'{}');}catch(e){return {};}}
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

async function boot(){const msg=document.getElementById('loadMsg');
 try{
  const idx=await getJSON('data/songs.json');
  const files=await Promise.all(idx.songs.map(id=>getJSON('data/songs/'+id+'.json')));
  const charts=await Promise.all(idx.songs.map(id=>getJSON('data/charts/'+id+'.json')));
  window.FILE_SONGS=files;window.CHARTS={};idx.songs.forEach((id,i)=>CHARTS[id]=charts[i]);
  const loc=localSongs();
  window.SONGS=files.map(sg=>loc[sg.id]?mergeSong(sg,loc[sg.id]):sg);
  for(const id in loc)if(!files.some(f=>f.id===id))SONGS.push(mergeSong(files[0],loc[id]));
  for(const s of GAME_SCRIPTS)await loadScriptRetry(s);
  document.getElementById('loading').remove();
 }catch(e){msg.textContent='読み込めませんでした。通信のよい場所で読み込み直してください。';document.getElementById('reloadBtn').classList.remove('hide');}}
document.getElementById('reloadBtn').addEventListener('click',()=>location.reload());
boot();
