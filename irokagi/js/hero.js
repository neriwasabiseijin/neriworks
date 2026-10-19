'use strict';
// The hero is a small pixel puppet: limbs are posed by angle every frame, then outlined,
// so running, cutting, jumping and sliding all get as many in-between frames as they need.
// Angles are measured from straight down; positive swings forward (to the right).
const HERO_DESIGNS={
 // A: listens for the city's stolen music; the headphones light up with the color she carries
 phones:{hair:'#2b2d34',hairHi:'#4a4d57',skin:'#d9b9a2',jacket:'#2f3139',jacketHi:'#4b4e58',pants:'#1c1d22',shoe:'#e8e8ec',accent:'#39f0ff'},
 // B: hides from the corporation's cameras under a hood; only the eyes glow
 hood:{hair:'#2f3139',hairHi:'#4b4e58',skin:'#15161a',jacket:'#2f3139',jacketHi:'#4b4e58',pants:'#1c1d22',shoe:'#e8e8ec',accent:'#39f0ff'},
 // C: goggles to see the color data in the air; the long ponytail shows the speed
 tail:{hair:'#2b2d34',hairHi:'#4a4d57',skin:'#d9b9a2',jacket:'#3a3c45',jacketHi:'#5a5d68',pants:'#1c1d22',shoe:'#e8e8ec',accent:'#ff3d8b'},
};
const HC_W=44,HC_H=36,HC_X=20,HC_Y=31;// canvas size and where the feet stand
function heroCanvas(){const c=document.createElement('canvas');c.width=HC_W;c.height=HC_H;return c;}
function px(x,y,col){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=HC_W||y>=HC_H)return;PZ.fillStyle=col;PZ.fillRect(x,y,1,1);}
let PZ=null;
function seg(x0,y0,x1,y1,w,col){const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*2));
 for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n;PZ.fillStyle=col;PZ.fillRect(Math.round(x-(w-1)/2),Math.round(y-(w-1)/2),w,w);}}
const dir=(a,l)=>[Math.sin(a)*l,Math.cos(a)*l];
function outline(cv,col){const x=cv.getContext('2d'),d=x.getImageData(0,0,HC_W,HC_H),a=d.data,o=new Uint8ClampedArray(a);
 const [r,gg,b]=[parseInt(col.slice(1,3),16),parseInt(col.slice(3,5),16),parseInt(col.slice(5,7),16)];
 for(let y=0;y<HC_H;y++)for(let i=0;i<HC_W;i++){const k=(y*HC_W+i)*4;if(a[k+3])continue;
  if((i>0&&a[k-1])||(i<HC_W-1&&a[k+7])||(y>0&&a[k-HC_W*4+3])||(y<HC_H-1&&a[k+HC_W*4+3])){o[k]=r;o[k+1]=gg;o[k+2]=b;o[k+3]=255;}}
 d.data.set(o);x.putImageData(d,0,0);}

// pose: {bob, lean, legs:[[hip,knee],[hip,knee]] (near leg first), arms:[[sh,el],[sh,el]] (near arm holds the sword),
//        blade: angle of the blade from the near hand or null, bladeLen, head: tilt, flow: hair/coat flutter phase, glow: 0-1}
function drawHero(cv,design,pose){
 const D=HERO_DESIGNS[design];PZ=cv.getContext('2d');PZ.clearRect(0,0,HC_W,HC_H);
 const crouch=pose.crouch||0;
 const hip=[HC_X,HC_Y-7.5+(pose.bob||0)+crouch];
 const lean=pose.lean||0;
 const [tx,ty]=dir(Math.PI-lean,6-crouch*0.3);const neck=[hip[0]+tx,hip[1]+ty];
 const head=[neck[0]+Math.sin(lean)*1.5+(pose.headX||0),neck[1]-3];
 const leg=(l,col,colS)=>{const k=dir(l[0],4);const kn=[hip[0]+k[0],hip[1]+k[1]];const f=dir(l[0]-l[1],4);const ft=[kn[0]+f[0],kn[1]+f[1]];
  seg(hip[0],hip[1],kn[0],kn[1],2,col);seg(kn[0],kn[1],ft[0],ft[1],2,col);
  const fwd=dir(l[0]-l[1]+Math.PI/2,2);seg(ft[0],ft[1],ft[0]+fwd[0],ft[1]+fwd[1],2,colS);};
 const arm=(a,col)=>{const sh=[neck[0]-0.5,neck[1]+1];const e=dir(a[0],3);const el=[sh[0]+e[0],sh[1]+e[1]];const h=dir(a[0]+a[1],3);const hd=[el[0]+h[0],el[1]+h[1]];
  seg(sh[0],sh[1],el[0],el[1],2,col);seg(el[0],el[1],hd[0],hd[1],2,col);return hd;};
 const far=c=>c==='#e8e8ec'?'#9a9ba3':shade(c);
 // far side: back leg, back arm, coat/hair behind
 if(design==='hood'){// coat tail trailing behind the hips
  const fl=pose.flow||0;for(let i=0;i<6;i++){const y=hip[1]-1+i*0.5;seg(hip[0]-1,y,hip[0]-4-i*0.6+Math.sin(fl+i*0.7)*0.6,y+2.5+Math.sin(fl+i)*0.5,1,D.jacket);}}
 if(design==='tail'){const fl=pose.flow||0;let x=head[0]-2,y=head[1]-2;for(let i=0;i<8;i++){x-=1.2;y+=0.55+Math.sin(fl-i*0.8)*0.45;seg(x+1,y-0.5,x,y,i<5?2:1,i===3?D.accent:D.hair);}}
 leg(pose.legs[1],far(D.pants),far(D.shoe));
 arm(pose.arms[1],far(D.jacket));
 // body
 seg(hip[0],hip[1],neck[0],neck[1],4,D.jacket);
 seg(hip[0]+1,hip[1]-1,neck[0]+1,neck[1]+1,1,D.jacketHi);
 leg(pose.legs[0],D.pants,D.shoe);
 // head
 const hx0=Math.round(head[0]-2),hy0=Math.round(head[1]-2);
 PZ.fillStyle=D.skin;PZ.fillRect(hx0,hy0,5,5);
 if(design==='phones'){PZ.fillStyle=D.hair;PZ.fillRect(hx0-1,hy0-1,6,2);PZ.fillRect(hx0-1,hy0,2,4);px(hx0-2,hy0,D.hair);px(hx0-2,hy0+1,D.hairHi);px(hx0+2,hy0-2,D.hair);px(hx0,hy0-2,D.hairHi);
  px(hx0+4,hy0+2,'#15161a');// eye
  PZ.fillStyle='#15161a';PZ.fillRect(hx0+1,hy0+1,2,3);px(hx0+1,hy0+2,D.accent);px(hx0+2,hy0+2,mixc(D.accent,pose.glow||0));// headphone cup
  seg(hx0+2,hy0-1,hx0+2,hy0,1,'#15161a');}
 if(design==='hood'){PZ.fillStyle=D.jacket;PZ.fillRect(hx0-1,hy0-1,6,7);px(hx0+5,hy0,D.jacket);px(hx0-2,hy0+1,D.jacket);px(hx0-2,hy0+2,D.jacketHi);PZ.fillStyle='#15161a';PZ.fillRect(hx0+2,hy0+1,3,3);
  // the eyes brighten as the hero carries more color
  px(hx0+4,hy0+2,mixc(D.accent,0.5+0.5*(pose.glow||0)));px(hx0+3,hy0+2,mixc(D.accent,0.2+0.6*(pose.glow||0)));px(hx0+1,hy0-1,D.jacketHi);}
 if(design==='tail'){PZ.fillStyle=D.hair;PZ.fillRect(hx0-1,hy0-1,6,2);PZ.fillRect(hx0-1,hy0,2,3);px(hx0+5,hy0,D.hair);px(hx0+1,hy0-2,D.hairHi);
  PZ.fillStyle=D.accent;PZ.fillRect(hx0,hy0,5,1);px(hx0+3,hy0,'#ffffff');// goggles on the forehead
  px(hx0+4,hy0+2,'#15161a');}
 // scarf knot at the neck: where the color tail comes from
 // a band across the collar, not two dots that could read as eyes under the hood
 seg(neck[0]-2,neck[1]+1.5,neck[0]+1,neck[1]+1,1,pose.scarf||'#8a8c93');
 // near arm and the blade
 const hand=arm(pose.arms[0],D.jacketHi);
 outline(cv,'#0a0a0c');
 if(pose.blade!=null){const L=pose.bladeLen||9;const b=dir(pose.blade,L);
  seg(hand[0],hand[1],hand[0]+b[0],hand[1]+b[1],1,'#f4f6ff');const e=dir(pose.blade,L*0.6);px(hand[0]+e[0]+1,hand[1]+e[1],pose.edge||D.accent);
  const gd=dir(pose.blade+Math.PI/2,1);px(hand[0]+gd[0],hand[1]+gd[1],'#8a8c93');px(hand[0]-gd[0],hand[1]-gd[1],'#8a8c93');}
 return [hand[0]-HC_X,hand[1]-HC_Y];
}
function shade(c){const n=parseInt(c.slice(1),16);const f=v=>Math.round(v*0.62).toString(16).padStart(2,'0');return '#'+f(n>>16&255)+f(n>>8&255)+f(n&255);}
function mixc(c,t){const n=parseInt(c.slice(1),16);const f=v=>Math.round(v*(0.5+0.5*t)).toString(16).padStart(2,'0');return '#'+f(n>>16&255)+f(n>>8&255)+f(n&255);}

// ---- poses ----
const TAU=Math.PI*2;
function runPose(ph){// ph 0..1 is one full stride (two steps)
 const a=ph*TAU;
 const legAt=a=>{const s=Math.sin(a);return [s*0.95,0.25+1.5*Math.max(0,Math.sin(a+1.2))*(s<0.3?1:0.5)];};
 return {bob:-Math.abs(Math.sin(a))*1+0.5,lean:0.32,legs:[legAt(a),legAt(a+Math.PI)],
  arms:[[-0.9+Math.sin(a+Math.PI)*0.25,1.0],[Math.sin(a)*0.9-0.2,1.3]],blade:-1.75+Math.sin(a+Math.PI)*0.1,flow:a*1.5};
}
function jumpPose(e){// e 0..1 over the jump
 const up=e<0.5;return {bob:0,crouch:up?0:0,lean:0.15,legs:[[0.9,1.6],[0.2,1.9]],arms:[[up?-2.4:-0.6,up?0.4:1.2],[1.2,1.0]],blade:up?-2.9:-1.4,flow:e*8};}
function slidePose(e){return {crouch:3,lean:-0.55,legs:[[1.45,0.1],[0.6,1.3]],arms:[[-1.5,0.5],[2.0,0.4]],blade:-1.65,flow:e*12,headX:-1};}
// a cut: wind-up -> swing -> follow-through; from/to are blade angles
function armTo(p,ang,k){// near arm reaches along the blade; k is how far into the cut
 p.arms=[[ang-0.35,0.35],p.arms[1]];p.blade=ang;p.bladeLen=10;p.lean=(p.lean||0)+0.18*Math.sin(Math.min(1,k)*Math.PI);return p;}
function cutPose(from,to,e,base){const k=Math.min(1,e);const ease=1-Math.pow(1-k,3);return armTo(Object.assign({},base||runPose(0.1)),from+(to-from)*ease,k);}
function kimePose(e){return {lean:0.05,crouch:1,legs:[[0.55,0.5],[-0.45,0.2]],arms:[[-1.0,-0.3],[0.6,1.6]],blade:e<1?-2.2:null,bladeLen:10,flow:e*3};}
