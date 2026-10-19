// Songs: each one is a district of the city, with its own genre, harmony and neon colors.
// What the district is built of (warehouses, rooftops, machiya...) is drawn by its scene in scenes.js, keyed by id.
// ch: four bars of [bass root, pad tones]; home: the chord it resolves to when that is not the first one.
// mel: four bars of [step, midi, length in steps, 'z' = trill note]. Steps can be fractional (triplets).
// chartMel: in the drops the cuts follow the melody, so its rhythm (triplets, pushes, trills) is what you play.
// ending/keyup: how the last chorus lands (see endingStep in audio.js) and whether it steps up a whole tone.
// hits: the old stop-time ending, 16th steps in the last bar (the final one rings). stab: the chord voice of those hits.
// intro/outro: how the song starts in the gray city and how it lands at the end.
// lv: loudness trim in dB per section (intro, build, drop, break, build, drop, outro), measured so every part of a song sits at about
// the same level: the drop only a little louder than the intro (the cutoff opening already makes it feel bigger).
// drums: 16-step strings (x = hit). bass: [step, offset from root, length in steps].
window.SONGS = [
 {id:'neon', lv:[3.9,0.2,-1.3,2.8,0.1,-1.4,-0.7], ending:'tag', keyup:false, hits:[0,4,8], stab:'saw', intro:'arp', outro:'ring', name:'ネオン通り', sub:'はじまりの大通り', genre:'シンセウェーブ', bpm:128, diff:1, swing:0,
  kit:'clean', lead:'piano', pad:'saw', arp:true, keys:null, bassWave:'saw',
  drums:{k:'x...x...x...x...', s:'....x.......x...', h:'..x...x...x...x.', g:'................'},
  bass:[[0,0,1],[2,12,2],[4,0,1],[6,12,2],[8,0,1],[10,12,2],[12,0,1],[14,12,2]],
  ch:[[45,[57,60,64]],[41,[53,57,60]],[48,[55,60,64]],[43,[55,59,62]]],
  mel:[[[0,76,6],[6,72,2],[8,74,4],[12,76,4]],[[0,72,6],[6,69,2],[8,72,4],[12,74,4]],[[0,76,4],[4,79,4],[8,76,4],[12,74,4]],[[0,74,6],[6,71,2],[8,74,8]]],
  end:[[0,74,4],[4,76,4],[8,79,8]],
  pal:{top:'#080418',mid:'#2d0d4a',bot:'#d0446e',winA:'#ffb54a',winB:'#5ff2ff',signA:'#ff3d8b',signB:'#39f0ff',rail:'#39f0ff',line:'#ff3d8b'}},

 {id:'bay', lv:[3.3,-0.8,-2.8,0.6,-0.8,-2.9,-2.5], ending:'intro', keyup:false, hits:[0,3,6,8], stab:'piano', intro:'piano', outro:'pianoSolo', name:'夜明けの湾岸', sub:'朝焼けの倉庫街', genre:'ピアノハウス', bpm:128, diff:2, swing:0,
  kit:'house', lead:'piano', pad:'warm', arp:false, keys:'stab', bassWave:'organ',
  drums:{k:'x...x...x...x...', s:'....x.......x...', h:'..x...x...x...x.', g:'.x.x.x.x.x.x.x.x'},
  bass:[[2,0,2],[6,0,2],[10,0,2],[14,12,2]],
  ch:[[41,[57,60,64,65]],[45,[57,60,64,67]],[50,[57,60,62,65]],[46,[57,58,62,65]]],
  mel:[[[0,72,4],[4,74,2],[6,76,2],[8,77,6],[14,76,2]],[[0,76,4],[4,72,4],[8,69,8]],[[0,74,4],[4,76,2],[6,77,2],[8,81,6],[14,79,2]],[[0,77,4],[4,74,4],[8,74,4],[12,72,4]]],
  end:[[0,74,4],[4,76,4],[8,77,8]],
  pal:{top:'#1a0c33',mid:'#7a2e6a',bot:'#ff9a5a',winA:'#ffd27a',winB:'#ff8fb0',signA:'#ff6f91',signB:'#ffd27a',rail:'#ffd27a',line:'#ff6f91'}},

 {id:'tower', lv:[1.0,-0.3,-1.0,3.3,-0.4,-1.2,0.0], ending:'tag', keyup:true, hits:[0,2,4,8], stab:'pluck', intro:'swell', outro:'swellEnd', name:'星屑タワー', sub:'空にいちばん近い屋上', genre:'トランス', bpm:138, diff:2, swing:0,
  kit:'clean', lead:'pluck', pad:'gate', arp:true, keys:null, bassWave:'roll',
  drums:{k:'x...x...x...x...', s:'....x.......x...', h:'..x...x...x...x.', g:'................'},
  bass:[[1,0,1],[2,0,1],[3,0,1],[5,0,1],[6,0,1],[7,0,1],[9,0,1],[10,0,1],[11,0,1],[13,0,1],[14,0,1],[15,0,1]],
  ch:[[43,[55,59,62]],[40,[55,59,64]],[48,[55,60,64]],[50,[54,57,62]]],
  mel:[[[0,74,6],[6,71,2],[8,74,4],[12,79,4]],[[0,78,6],[6,76,2],[8,74,8]],[[0,76,4],[4,72,4],[8,76,4],[12,79,4]],[[0,78,6],[6,76,2],[8,74,8]]],
  end:[[0,78,4],[4,81,4],[8,79,8]],
  pal:{top:'#060418',mid:'#2b1a5e',bot:'#8a4fd8',winA:'#ffd66b',winB:'#8fe9ff',signA:'#c58bff',signB:'#8fe9ff',rail:'#8fe9ff',line:'#c58bff'}},

 {id:'rain', lv:[6,-4.1,-5.2,-3.3,-3.9,-5.1,-2.1], ending:'fade', keyup:false, hits:[0,6,10], stab:'epiano', intro:'rain', outro:'fade', name:'雨の高架下', sub:'しずくの落ちる路地裏', genre:'ドラムンベース', bpm:172, diff:2, swing:0,
  kit:'break', lead:'piano', pad:'warm', arp:false, keys:'comp', bassWave:'reese',
  drums:{k:'x.........x.....', s:'....x.......x...', h:'x.x.x.x.x.x.x.x.', g:'.......x.x....x.'},
  bass:[[0,0,10],[10,0,6]],
  ch:[[38,[53,57,60,64]],[43,[53,55,58,62]],[48,[52,55,60,64]],[41,[52,57,60,64]]],
  mel:[[[0,69,4],[4,72,4],[8,74,6],[14,72,2]],[[0,70,6],[6,69,2],[8,67,8]],[[0,67,4],[4,69,4],[8,72,4],[12,76,4]],[[0,74,8],[8,72,4],[12,69,4]]],
  end:[[0,74,4],[4,72,4],[8,74,8]],
  pal:{top:'#04101e',mid:'#0d3350',bot:'#3fa0b8',winA:'#ffc46b',winB:'#7fd6ff',signA:'#4ad6ff',signB:'#ffb54a',rail:'#7fd6ff',line:'#4ad6ff'}},

 {id:'market', lv:[0.6,0.7,-0.2,3.1,0.7,-0.4,2.0], ending:'cut', keyup:false, hits:[0,3,6,8], stab:'pluck', intro:'drums', outro:'hits', name:'電脳市場', sub:'眠らない屋台通り', genre:'ファンク', bpm:132, diff:3, swing:0.18,
  kit:'funk', lead:'epiano', pad:'none', arp:false, keys:'clav', bassWave:'slap',
  drums:{k:'x.....x...x..x..', s:'....x.......x...', h:'x.xxx.xxx.xxx.x.', g:'.......x.x....x.'},
  bass:[[0,0,2],[3,12,1],[6,0,1],[7,0,1],[10,10,2],[13,12,1],[14,7,2]],
  ch:[[40,[55,59,62,64]],[45,[55,57,60,64]],[50,[54,57,60,62]],[47,[54,57,59,63]]],
  mel:[[[0,76,2],[2,79,2],[4,83,4],[8,81,2],[10,79,2],[12,76,4]],[[0,76,2],[2,79,2],[4,84,4],[8,83,4],[12,79,4]],[[0,78,2],[2,81,2],[4,86,4],[8,84,2],[10,83,2],[12,81,4]],[[0,78,4],[4,75,4],[8,78,4],[12,83,4]]].map(b=>b.map(([s,m,l])=>[s,m-12,l])),
  end:[[0,71,4],[4,75,4],[8,76,8]],
  pal:{top:'#0a0414',mid:'#2a0d3a',bot:'#6b1f6e',winA:'#a6ff5a',winB:'#ff4fd8',signA:'#a6ff5a',signB:'#ff4fd8',rail:'#a6ff5a',line:'#ff4fd8'}},

 {id:'lab', lv:[-0.8,-3.3,-3.5,-1.1,-3.3,-3.9,-3.3], ending:'intro', keyup:true, hits:[0,3,6,9,12], stab:'saw', intro:'machine', outro:'powerdown', name:'地下ラボ', sub:'色を買い占めた会社の真下', genre:'インダストリアル', bpm:140, diff:3, swing:0,
  kit:'ind', lead:'saw', pad:'saw', arp:false, keys:null, bassWave:'dist',
  drums:{k:'x...x...x...x...', s:'........x.......', h:'xxxxxxxxxxxxxxxx', g:'...x.......x..x.'},
  bass:[[2,0,1],[3,0,1],[6,0,1],[7,0,1],[10,0,1],[11,0,1],[14,0,1],[15,12,1]],
  ch:[[36,[55,60,63]],[36,[55,60,63]],[32,[56,60,63]],[34,[55,58,62]]],
  mel:[[[0,72,2],[3,72,1],[6,75,2],[10,74,2],[14,70,2]],[[0,72,2],[3,72,1],[6,75,2],[10,77,4]],[[0,75,2],[3,75,1],[6,79,2],[10,77,2],[14,75,2]],[[0,74,4],[6,70,2],[8,74,8]]],
  end:[[0,74,4],[4,75,4],[8,72,8]],
  pal:{top:'#0c0208',mid:'#3a0a24',bot:'#b0203c',winA:'#ff4a4a',winB:'#b77bff',signA:'#ff3355',signB:'#b77bff',rail:'#ff3355',line:'#b77bff'}},
 // ---- more districts: each genre also brings its own technique and its own way to end ----
 {id:'pop', lv:[6,0.2,-2.2,0.2,0.3,-2.3,-1.8], vol:0.85, ending:'stutter', keyup:false, hits:[0,3,6,8], stab:'square', intro:'chip', outro:'ring', name:'ホログラム交差点', sub:'広告が歌う大交差点', genre:'テクノポップ', bpm:130, diff:1, swing:0,
  kit:'pop', lead:'square', pad:'vocoder', arp:true, keys:null, bassWave:'octave', chartMel:true,
  drums:{k:'x...x...x...x...', s:'....x.......x...', h:'..x...x...x...x.', g:'................'},
  bass:[[0,0,1],[2,12,1],[4,0,1],[6,12,1],[8,0,1],[10,12,1],[12,0,1],[14,12,1]],
  // IV - V - iii - vi, resolving home to I
  ch:[[41,[57,60,65]],[43,[59,62,67]],[40,[59,64,67]],[45,[57,60,64]]], home:[48,[55,60,64]],
  // syncopated: notes pushed off the beat
  mel:[[[0,72,2],[3,74,2],[6,76,2],[8,77,3],[11,76,1],[12,74,2],[14,72,2]],[[0,74,2],[3,76,2],[6,79,4],[10,77,2],[12,76,2],[14,74,2]],[[0,76,2],[3,79,2],[6,83,2],[8,81,3],[11,79,1],[12,76,4]],[[0,72,3],[3,74,3],[6,76,2],[8,79,6],[14,81,2]]],
  end:[[0,79,4],[4,81,4],[8,84,8]],
  pal:{top:'#060a14',mid:'#13284a',bot:'#2fd1c5',winA:'#ff7ae0',winB:'#7affea',signA:'#ff5ac8',signB:'#5affea',rail:'#7affea',line:'#ff5ac8'}},

 {id:'edm', lv:[0.2,0.3,-1.0,2.2,0.4,-1.2,0.4], ending:'build', keyup:false, hits:[0,4,8], stab:'supersaw', intro:'pump', outro:'ring', name:'巨大ビジョン広場', sub:'街じゅうの画面が集まる場所', genre:'エレクトロ', bpm:128, diff:2, swing:0,
  kit:'edm', lead:'supersaw', pad:'saw', arp:false, keys:null, bassWave:'wobble', chartMel:true,
  drums:{k:'x...x...x...x...', s:'....x.......x...', h:'..x...x...x...x.', g:'..............x.'},
  bass:[[2,0,2],[6,0,2],[10,0,2],[14,0,2]],
  ch:[[41,[56,60,65]],[37,[56,61,65]],[44,[56,60,63]],[39,[55,58,63]]],
  // 3-3-2: the bar split into dotted eighths
  mel:[[[0,72,3],[3,72,3],[6,75,2],[8,77,3],[11,75,3],[14,72,2]],[[0,73,3],[3,73,3],[6,77,2],[8,80,3],[11,77,3],[14,73,2]],[[0,72,3],[3,75,3],[6,80,2],[8,79,3],[11,77,3],[14,75,2]],[[0,75,3],[3,75,3],[6,79,2],[8,82,4],[12,80,4]]],
  end:[[0,75,4],[4,79,4],[8,80,8]],
  pal:{top:'#0a0410',mid:'#3a0a52',bot:'#ff2e88',winA:'#ffe14a',winB:'#4ad8ff',signA:'#ff2e88',signB:'#ffe14a',rail:'#4ad8ff',line:'#ff2e88'}},

 {id:'rock', lv:[4.3,6.2,-4.8,-6.1,5.9,-4.9,-3.7], vol:0.7, ending:'rockout', keyup:true, hits:[0,3,6,8], stab:'saw', intro:'riff', outro:'ring', name:'坂の上のライブハウス', sub:'閉ざされたステージの灯り', genre:'ロック', bpm:150, diff:2, swing:0,
  kit:'rock', lead:'gtr', pad:'none', arp:false, keys:'power', bassWave:'pick', chartMel:true,
  drums:{k:'x.....x.x.......', s:'....x.......x...', h:'x.x.x.x.x.x.x.x.', g:'................'},
  bass:[[0,0,1],[2,0,1],[4,0,1],[6,0,1],[8,0,1],[10,0,1],[12,0,1],[14,0,1]],
  ch:[[40,[52,59,64]],[36,[48,55,60]],[43,[55,62,67]],[38,[50,57,62]]],
  // pushes: the line jumps in on the "and" before the beat
  mel:[[[0,76,2],[2,79,2],[4,81,4],[8,79,2],[10,76,2],[12,74,2],[14,76,2]],[[0,76,4],[4,72,2],[6,74,2],[8,76,4],[12,79,2],[14,83,2]],[[0,83,4],[4,81,2],[6,79,2],[8,81,4],[12,79,2],[14,78,2]],[[0,78,4],[4,74,2],[6,76,2],[8,78,4],[12,81,2],[14,83,2]]],
  end:[[0,74,4],[4,78,4],[8,76,8]],
  pal:{top:'#0c0606',mid:'#3a1010',bot:'#c2381c',winA:'#ffb03a',winB:'#ff5a3a',signA:'#ff3a2a',signB:'#ffcf4a',rail:'#ffcf4a',line:'#ff3a2a'}},

 {id:'trap', lv:[2.6,-1.1,-2.3,-0.7,-1.1,-2.6,-1.3], vol:0.78, ending:'tapestop', keyup:false, hits:[0,4,8], stab:'lofi', intro:'vinyl', outro:'ring', name:'落書きの地下道', sub:'壁の絵が色を待っている', genre:'ヒップホップ', bpm:140, diff:2, swing:0,
  kit:'trap', lead:'lofi', pad:'warm', arp:false, keys:null, bassWave:'808', chartMel:true,
  drums:{k:'x......x..x.....', s:'........x.......', h:'x.x.x.x.x.x...x.', g:'...............x'},
  bass:[[0,0,6],[7,0,2],[10,-2,3],[14,3,2]],
  ch:[[36,[55,60,63]],[44,[56,60,63]],[41,[56,60,65]],[43,[55,59,62]]],
  // triplet flow: three notes where the beat expects two
  mel:[[[0,72,2.67],[2.67,75,2.67],[5.33,79,2.67],[8,77,4],[12,75,4]],[[0,75,2],[2,77,2],[4,80,4],[8,79,1.33],[9.33,77,1.33],[10.67,75,1.33],[12,77,4]],[[0,77,2.67],[2.67,80,2.67],[5.33,84,2.67],[8,82,4],[12,80,4]],[[0,79,2],[2,77,2],[4,75,4],[8,74,1.33],[9.33,75,1.33],[10.67,77,1.33],[12,79,4]]],
  end:[[0,74,4],[4,75,4],[8,72,8]],
  pal:{top:'#08080c',mid:'#26203a',bot:'#5a3f8a',winA:'#ff8a3d',winB:'#3dffb0',signA:'#ff3d6e',signB:'#3dffb0',rail:'#ffd23d',line:'#ff3d6e'}},

 {id:'jazz', lv:[1.0,1.2,-0.1,5.5,1.2,0.0,2.0], vol:1.15, ending:'turnaround', keyup:false, hits:[0,3,6,8], stab:'piano', intro:'walk', outro:'ring', name:'真夜中の喫茶街', sub:'看板の消えたジャズ横丁', genre:'ジャズ', bpm:152, diff:3, swing:0, swing8:0.67,
  kit:'jazz', lead:'sax', pad:'none', arp:false, keys:'jcomp', bassWave:'upright', walk:true, chartMel:true,
  drums:{k:'x.......x.......', s:'....x.......x...', h:'x...x.x.x...x.x.', g:'....x.......x...'},
  bass:[],
  // ii - V - I - VI in C
  ch:[[38,[53,57,60,64]],[43,[53,57,59,64]],[48,[52,55,59,62]],[45,[55,58,61,64]]], home:[48,[52,55,57,62]],
  // swung eighths and bebop triplet turns
  mel:[[[0,74,2],[2,77,2],[4,81,2],[6,79,2],[8,77,1.33],[9.33,76,1.33],[10.67,74,1.33],[12,72,4]],[[0,71,2],[2,74,2],[4,77,2],[6,76,2],[8,74,4],[12,71,2],[14,67,2]],[[0,76,3],[4,79,2],[6,83,2],[8,81,1.33],[9.33,79,1.33],[10.67,76,1.33],[12,72,4]],[[0,73,2],[2,76,2],[4,79,2],[6,82,2],[8,81,4],[12,79,2],[14,76,2]]],
  end:[[0,73,4],[4,76,4],[8,74,8]],
  pal:{top:'#05060f',mid:'#1a1f3d',bot:'#3d4a7a',winA:'#ffcf7a',winB:'#7aa7ff',signA:'#ffb347',signB:'#5f8dff',rail:'#ffcf7a',line:'#5f8dff'}},

 {id:'wa', lv:[1.0,-0.6,-2.9,-0.2,-0.6,-3.3,-2.9], vol:0.8, ending:'taiko', keyup:false, hits:[0,4,8], stab:'pluck', intro:'koto', outro:'ring', name:'提灯小路', sub:'赤い灯がゆれる花街', genre:'和風ダンス', bpm:150, diff:3, swing:0,
  kit:'taiko', lead:'shaku', pad:'warm', arp:false, keys:'koto', bassWave:'saw', chartMel:true,
  drums:{k:'x...x...x...x...', s:'....x.......x...', h:'..x...x...x...x.', g:'.......x.......x'},
  bass:[[0,0,2],[3,0,1],[6,0,2],[8,0,2],[11,7,1],[14,0,2]],
  ch:[[38,[57,62,65]],[46,[58,62,65]],[43,[58,62,67]],[45,[57,62,64]]],
  // trills (z): the flute shakes between two notes and the cuts zigzag between the lanes
  mel:[[[0,74,4],[4,75,1,'z'],[5,74,1,'z'],[6,75,1,'z'],[7,74,1,'z'],[8,79,4],[12,77,2],[14,74,2]],[[0,77,3],[3,79,1],[4,81,4],[8,79,1,'z'],[9,81,1,'z'],[10,79,1,'z'],[11,81,1,'z'],[12,82,4]],[[0,81,4],[4,79,2],[6,77,2],[8,75,1,'z'],[9,74,1,'z'],[10,75,1,'z'],[11,74,1,'z'],[12,70,4]],[[0,69,2],[2,70,2],[4,74,4],[8,75,2],[10,77,2],[12,74,4]]],
  end:[[0,75,4],[4,77,4],[8,74,8]],
  pal:{top:'#0e0406',mid:'#3a0c14',bot:'#b8282e',winA:'#ffb84a',winB:'#ff6a4a',signA:'#ff3a3a',signB:'#ffd27a',rail:'#ffd27a',line:'#ff3a3a'}},
];
