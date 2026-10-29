'use strict';
// Each song runs through its own district, so each district is built of its own things:
// warehouses and cranes on the bay, rooftops under the tower, a tiled underpass for hip hop, machiya for 和風.
// Everything is drawn gray first and takes its color back with s (0 = gray, 1 = full color),
// so the player sees which part of the city they have colored.
// Readability: the enemies own the brightest, sharpest pixels on screen. Backgrounds keep their vivid
// colors in small details and are dimmed a step behind the lanes (see VEIL), and enemies carry a light rim.

const sr=(id,n)=>hash(id,n,11);
function R(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
// a lit color in the gray city is a gray of the same brightness; s brings its hue back
function gc(c,s,k){k=k==null?1:k;const l=(c[0]*0.3+c[1]*0.59+c[2]*0.11)*0.42;
 return'rgb('+(((l+(c[0]-l)*s)*k)|0)+','+(((l+(c[1]-l)*s)*k)|0)+','+(((l+(c[2]-l)*s)*k)|0)+')';}
const BLD=s=>mix(P.bldG,P.bldC,s),FAR=ws=>mix(P.farG,P.farC,ws);
function shadeOf(s,k){const a=P.bldG,b=P.bldC;return'rgb('+((a[0]+(b[0]-a[0])*s)*k|0)+','+((a[1]+(b[1]-a[1])*s)*k|0)+','+((a[2]+(b[2]-a[2])*s)*k|0)+')';}
const GROUND=()=>LANE_Y[1]+4;

// ---------- shared pieces ----------
function skyGrad(ws){const gr=g.createLinearGradient(0,0,0,LANE_Y[1]);gr.addColorStop(0,mix(P.skyTopG,P.skyTopC,ws));gr.addColorStop(0.6,mix(P.skyBotG,P.skyMidC,ws));gr.addColorStop(1,mix(P.skyBotG,P.skyBotC,ws));
 g.fillStyle=gr;g.fillRect(-4,-4,W+8,ROAD_END+8);}
function streaks(t,ws){if(ws<=0.3)return;g.globalAlpha=(ws-0.3)*0.5;for(let i=0;i<6;i++){const y=14+i*10+((i*37)%7);const len=20+(i*13)%30;const x=W-((t*(160+i*40)+i*97)%(W+len*2));g.fillStyle=i%2?PH.signB:PH.signA;g.fillRect(Math.round(x),y,len,1);}g.globalAlpha=1;}
function stars(t,ws,n,ymax){for(let i=0;i<n;i++){const x=Math.floor(hash(i,1,5)*W),y=Math.floor(hash(i,2,5)*ymax);const tw=0.5+0.5*Math.sin(t*(1+hash(i,3,5)*3)+i);
 g.globalAlpha=(0.25+0.45*ws)*tw;R(x,y,1,1,'#ffffff');}g.globalAlpha=1;}
function disc(cx,cy,r,c){for(let y=-r;y<=r;y++){const w=Math.round(Math.sqrt(r*r-y*y));R(cx-w,cy+y,w*2+1,1,c);}}
function moon(cx,cy,r,ws){g.globalAlpha=0.15+0.15*ws;disc(cx,cy,r+3,gc(hx('#fff2c8'),ws));g.globalAlpha=1;disc(cx,cy,r,mix(hx('#7a7b80'),hx('#fff2c8'),ws));
 R(cx-2,cy-1,2,2,mix(hx('#6a6b70'),hx('#e8d8a8'),ws));R(cx+2,cy+2,1,1,mix(hx('#6a6b70'),hx('#e8d8a8'),ws));}
function farCity(dpx,ws,hmin,hmax,par){const fo=dpx*(par||0.35);g.fillStyle=FAR(ws);
 for(let i=Math.floor(fo/14)-1;i<Math.floor(fo/14)+W/14+2;i++){const h=hmin+hash(i,9,3)*(hmax-hmin);g.fillRect(Math.round(i*14-fo),Math.round(118-h),13,h+80);}}
function windows(b,x,y0,y1,s,on,p,dx,dy,ww,wh,k){dx=dx||6;dy=dy||7;ww=ww||3;wh=wh||4;
 for(let ry=y0,r=0;ry<y1;ry+=dy,r++)for(let cx=x+3,c=0;cx<x+b.w-ww-1;cx+=dx,c++){const lit=hash(b.id,r,c)<p;
  g.fillStyle=lit?mix(P.winOnG,on,s*(k||1)):mix(P.winOffG,P.winOffC,s);g.fillRect(cx,ry,ww,wh);}}
// the posts under the upper lane stand one per beat, right where an on-beat enemy meets the blade; the bar's first beat gets a wider post
function beatPosts(dpx,ws,y0){const bp=B*SPEED,o=dpx-(HERO_X+15);
 for(let i=Math.floor(o/bp)-1;i<=Math.floor((o+W)/bp)+1;i++){if(i<0)continue;const x=Math.round(i*bp-o),bar=i%4===0;
  R(x-(bar?2:1),y0,bar?4:2,LANE_Y[1]-y0,mix(hx(bar?'#5d5f66':'#47494f'),P.railC,ws*(bar?0.5:0.3)));}}
function defRail(dpx,ws){g.fillStyle=mix(P.railG,P.bldC,ws*0.6);g.fillRect(0,LANE_Y[0],W,5);
 beatPosts(dpx,ws,LANE_Y[0]+5);
 g.fillStyle=mix(P.railG,P.railC,ws);g.fillRect(0,LANE_Y[0],W,1);}
function defRoad(dpx,ws){g.fillStyle=mix(P.roadG,P.roadC,ws);g.fillRect(-4,LANE_Y[1],W+8,ROAD_END-LANE_Y[1]);
 g.fillStyle=mix(P.lineG,P.lineC,ws);g.fillRect(0,LANE_Y[1],W,1);
 for(let i=Math.floor(dpx/24)-1;i<Math.floor(dpx/24)+10;i++)g.fillRect(Math.round(i*24-dpx),LANE_Y[1]+11,10,2);}
// repeating far props: f(x) for every period p at parallax par
function every(dpx,par,p,f){const o=dpx*par;for(let i=Math.floor(o/p)-1;i<=Math.floor((o+W)/p)+1;i++)f(Math.round(i*p-o),i);}
function sag(x0,y0,x1,y1,d,c,dots){const n=Math.max(2,Math.abs(x1-x0));for(let i=0;i<=n;i++){const k=i/n;const x=x0+(x1-x0)*k,y=y0+(y1-y0)*k+Math.sin(k*Math.PI)*d;R(x,y,1,1,c);
 if(dots&&i%6===3){const dc=dots[(i/6|0)%dots.length];R(x,y+1,1,2,dc);}}}

// ---------- the districts ----------
const SCENES={
 // ネオン通り: the main avenue, tall towers with vertical neon signs
 neon:{
  make(id){return{w:20+Math.floor(sr(id,1)*22),top:24+Math.floor(sr(id,2)*64),sign:sr(id,3)<0.45,signC:sr(id,4)<0.5,winC:sr(id,5)<0.5};},
  el(b,x,s,t,bp){R(x,b.top,b.w,GROUND()-b.top,BLD(s));windows(b,x,b.top+5,LANE_Y[1]-6,s,b.winC?P.winA:P.winB,0.42);
   if(b.sign){const sc=b.signC?P.signA:P.signB;const pulse=s>0.05?0.75+0.25*(1-bp):1;
    R(x+b.w-6,b.top+10,4,22,mix(P.signG,sc,s*pulse));for(const dy of[13,19,25])R(x+b.w-5,b.top+dy,2,2,BLD(s));}}},

 // 夜明けの湾岸: dawn over the sea, gantry cranes, warehouses and stacked containers
 bay:{
  sky(t,ws,dpx){skyGrad(ws);g.globalAlpha=0.35+0.4*ws;disc(98,97,17,gc(P.winA,ws));g.globalAlpha=1;
   R(0,98,W,14,mix(P.farG,P.skyMidC,ws*0.5));
   for(let i=0;i<7;i++){const y=100+i*2,w=10+((i*7)%5)*4,x=98-w/2+Math.sin(t*2+i)*3;g.globalAlpha=0.3+0.5*ws;R(x,y,w,1,gc(P.winA,ws));}g.globalAlpha=1;},
  far(dpx,ws,t){const c=mix(hx('#17181c'),P.skyTopC,ws*0.9);every(dpx,0.3,92,(x,i)=>{R(x+4,44,2,56,c);R(x+22,44,2,56,c);R(x,42,46,3,c);R(x-14,42,14,2,c);R(x+12,35,8,7,c);
   for(let k=0;k<8;k++)R(x+4+k*2.4,48+k*6,2,1,c);R(x+30,45,1,14+((i*5)%9),c);R(x+28,59+((i*5)%9),5,3,c);
   if(Math.sin(t*3+i)>0.3)R(x+45,41,1,1,gc(P.signA,Math.max(ws,0.4)));});},
  make(id){const ct=sr(id,1)<0.38;return ct?{w:24+Math.floor(sr(id,2)*6),ct:true,n:2+Math.floor(sr(id,3)*4),top:0}:{w:42+Math.floor(sr(id,2)*20),top:84+Math.floor(sr(id,3)*16)};},
  el(b,x,s,t,bp){const G=GROUND();
   if(b.ct){const cols=[P.winA,P.winB,P.signA,P.signB];for(let i=0;i<b.n;i++){const y=G-10-i*10,c=cols[Math.floor(hash(b.id,i,3)*4)],off=Math.floor(hash(b.id,i,4)*4)-2;
     R(x+off,y,b.w-2,10,'#0c0c0e');R(x+off+1,y+1,b.w-4,8,gc(c,s,0.8));for(let k=3;k<b.w-4;k+=3)R(x+off+k,y+2,1,6,gc(c,s,0.58));}return;}
   R(x,b.top,b.w,G-b.top,BLD(s));R(x-1,b.top,b.w+2,2,shadeOf(s,1.35));
   for(let k=x+2;k<x+b.w-1;k+=3)R(k,b.top+2,1,G-b.top-2,shadeOf(s,0.82));
   for(let k=x+4;k<x+b.w-6;k+=9)R(k,b.top+6,5,2,hash(b.id,k,1)<0.6?mix(P.winOnG,P.winA,s):mix(P.winOffG,P.winOffC,s));
   const dw=Math.floor(b.w*0.45),dx=x+Math.floor((b.w-dw)/2);R(dx,140,dw,G-140,shadeOf(s,0.7));for(let y=142;y<G;y+=3)R(dx,y,dw,1,shadeOf(s,0.95));
   R(dx+dw/2-1,136,3,2,mix(P.winOnG,P.winA,s));R(x+3,b.top+12,7,5,gc(P.signB,s,0.8));}},

 // 星屑タワー: on the rooftops, the tower itself always on the horizon
 tower:{
  sky(t,ws,dpx){skyGrad(ws);stars(t,ws,26,80);const c=mix(hx('#2a2b31'),P.farC,ws),cx=94;
   R(cx-1,0,2,12,c);R(cx-3,12,6,22,c);R(cx-7,30,14,6,c);R(cx-5,36,10,80,c);R(cx-9,60,18,4,c);
   for(let y=40;y<110;y+=4)R(cx-1,y,2,2,mix(P.winOnG,P.winB,ws));for(let k=-5;k<6;k+=2)R(cx+k,32,1,2,mix(P.winOnG,P.winA,ws));
   if(bp(t)<0.5)R(cx,0,1,1,gc(P.signA,Math.max(ws,0.4)));},
  far(dpx,ws){farCity(dpx,ws,8,34);},
  make(id){return{w:28+Math.floor(sr(id,1)*22),top:80+Math.floor(sr(id,2)*18),item:Math.floor(sr(id,3)*4)};},
  el(b,x,s,t,bpp){const G=GROUND();R(x,b.top,b.w,G-b.top,BLD(s));R(x,b.top,b.w,2,shadeOf(s,1.4));windows(b,x,b.top+7,LANE_Y[1]-6,s,P.winA,0.3,7,8);
   const c=shadeOf(s,1.15);
   if(b.item===0){R(x+5,b.top-4,1,4,c);R(x+13,b.top-4,1,4,c);R(x+4,b.top-13,11,9,c);R(x+5,b.top-14,9,1,c);R(x+4,b.top-9,11,1,shadeOf(s,0.9));}
   else if(b.item===1){R(x+b.w-6,b.top-22,1,22,c);R(x+b.w-9,b.top-18,7,1,c);R(x+b.w-8,b.top-12,5,1,c);if(bpp<0.5)R(x+b.w-6,b.top-23,1,1,gc(P.signA,Math.max(s,0.4)));}
   else if(b.item===2){for(let k=x+1;k<x+b.w-1;k+=3)R(k,b.top-4,1,4,c);R(x,b.top-4,b.w,1,c);}
   else{R(x+4,b.top-5,8,5,c);R(x+5,b.top-4,2,2,shadeOf(s,0.8));R(x+14,b.top-4,6,4,c);}}},

 // 雨の高架下: under the expressway in the rain
 rain:{
  sky(t,ws,dpx){skyGrad(ws*0.8);},
  far(dpx,ws){farCity(dpx,ws,14,56);},
  make(id){return sr(id,1)<0.4?{w:13,pl:true,top:50}:{w:26+Math.floor(sr(id,2)*16),top:66+Math.floor(sr(id,3)*24)};},
  el(b,x,s,t,bp){const G=GROUND();
   if(b.pl){const c=mix(hx('#3a3c42'),P.bldC,s*0.5);R(x,b.top,b.w,G-b.top,c);R(x+b.w-3,b.top,3,G-b.top,shadeOf(s,0.75));
    for(let k=0;k<4;k++)R(x+2+k*3,b.top+4,1,10+hash(b.id,k,2)*24,shadeOf(s,0.85));R(x+2,b.top+28,8,6,gc(P.signB,s,0.7));R(x+3,b.top+30,6,1,shadeOf(s,1.6));return;}
   R(x,b.top,b.w,G-b.top,BLD(s));windows(b,x,b.top+5,LANE_Y[1]-6,s,P.winA,0.38);
   R(x+2,140,b.w-4,G-140,shadeOf(s,0.75));for(let y=142;y<G;y+=2)R(x+2,y,b.w-4,1,shadeOf(s,0.92));R(x+4,128,b.w-8,6,gc(P.winA,s,0.8));},
  over(dpx,ws,t){const c=mix(hx('#34363c'),P.bldC,ws*0.5);R(0,42,W,10,c);R(0,52,W,2,shadeOf(ws,0.6));R(0,42,W,1,mix(P.railG,P.railC,ws));
   every(dpx,1,40,(x)=>{R(x+18,54,3,1,gc(P.signB,Math.max(ws,0.3)));g.globalAlpha=0.08+0.1*ws;for(let k=0;k<20;k++)R(x+18-k/2,55+k,3+k,1,gc(P.signB,ws));g.globalAlpha=1;});},
  weather(t,ws){g.globalAlpha=0.22+0.1*ws;g.fillStyle=mix(hx('#9a9ca4'),hx('#cfe8ff'),ws);
   for(let i=0;i<46;i++){const sp=260+hash(i,1,9)*120,x=(hash(i,2,9)*(W+60)-((t*sp*0.25)%(W+60))+W+60)%(W+60)-20,y=(hash(i,3,9)*ROAD_END+t*sp)%(ROAD_END+20)-20;
    for(let k=0;k<5;k++)g.fillRect(Math.round(x-k*0.5),Math.round(y+k),1,1);}
   for(let i=0;i<6;i++){const ph=(t*2+hash(i,4,9))%1,x=hash(i,5,9)*W+Math.floor(t*2+hash(i,4,9))*37%W;g.fillRect(Math.round(x%W),LANE_Y[1]+2+(i%3)*5,ph<0.5?3:1,1);}g.globalAlpha=1;}},

 // 電脳市場: stalls under awnings, hanging boards and strings of bulbs
 market:{
  far(dpx,ws,t){farCity(dpx,ws,24,66);every(dpx,0.35,23,(x,i)=>{if(hash(i,7,3)<0.5)R(x+3,52+hash(i,8,3)*30,3,6,gc(hash(i,6,3)<0.5?P.signA:P.signB,ws,0.6));});},
  make(id){return{w:22+Math.floor(sr(id,1)*14),top:46+Math.floor(sr(id,2)*34),aw:sr(id,3)<0.5,board:sr(id,4)<0.6,goods:Math.floor(sr(id,5)*3)};},
  el(b,x,s,t,bp){const G=GROUND();R(x,b.top,b.w,G-b.top,BLD(s));windows(b,x,b.top+5,108,s,P.winB,0.35);
   const ac=b.aw?P.signA:P.signB;for(let k=0;k<b.w+2;k+=2)R(x-1+k,134,2,5,(k/2)%2?gc(ac,s,0.75):mix(P.winOffG,hx('#d8d8d8'),s*0.6));R(x-1,139,b.w+2,1,shadeOf(s,0.6));
   R(x+1,140,b.w-2,G-140,shadeOf(s,0.6));R(x+2,160,b.w-4,3,shadeOf(s,1.3));
   for(let k=0;k<b.w-6;k+=4){const c=[P.winA,P.signA,P.winB][(k/4+b.goods)%3|0];R(x+3+k,156,3,4,gc(c,s,0.65));}
   if(b.board){const bx=x+b.w-8;R(bx+2,b.top+2,1,4,shadeOf(s,1.2));R(bx,b.top+6,6,22,'#0c0c0e');R(bx+1,b.top+7,4,20,gc(b.aw?P.winA:P.signB,s,0.7));
    for(let k=0;k<4;k++)R(bx+2,b.top+9+k*5,2,3,shadeOf(s,0.7));}},
  over(dpx,ws,t){every(dpx,1,62,(x,i)=>{const y0=26+(i*7)%14;sag(x,y0,x+62,26+((i+1)*7)%14,7,shadeOf(ws,1.4),[gc(P.winA,Math.max(ws,0.15)),gc(P.signA,Math.max(ws,0.15)),gc(P.winB,Math.max(ws,0.15))]);});}},

 // 地下ラボ: below the streets, tanks of stolen color, pipes and warning stripes
 lab:{
  sky(t,ws,dpx){const gr=g.createLinearGradient(0,0,0,LANE_Y[1]);gr.addColorStop(0,mix(hx('#0a0a0c'),P.skyTopC,ws));gr.addColorStop(1,mix(hx('#202126'),P.skyMidC,ws));g.fillStyle=gr;g.fillRect(-4,-4,W+8,ROAD_END+8);
   const pc=mix(hx('#34353b'),P.bldC,ws*0.8);R(0,4,W,4,pc);R(0,12,W,3,pc);R(0,4,W,1,shadeOf(ws,1.6));
   every(dpx,1,30,(x,i)=>{R(x,3,3,6,shadeOf(ws,1.5));R(x+14,11,2,5,shadeOf(ws,1.5));if(i%4===0){const on=bp(t)<0.5;R(x+6,16,3,2,gc(P.signA,on?Math.max(ws,0.5):ws*0.3));}});},
  far(dpx,ws,t){const c=FAR(ws);every(dpx,0.4,48,(x,i)=>{R(x+6,38,26,80,c);R(x+8,35,22,3,c);R(x+12,32,14,3,c);
   const lv=50+(i*13)%30;R(x+16,46,6,64,shadeOf(ws,0.6));R(x+16,lv,6,110-lv,gc(P.signB,ws,0.55));
   for(let k=0;k<3;k++){const y=110-((t*14+k*19+i*7)%(110-lv));R(x+18+(k%2)*2,y,1,1,gc(P.winB,ws));}});},
  make(id){const r=sr(id,1);return r<0.38?{w:18,tank:true,top:58+Math.floor(sr(id,2)*12)}:r<0.6?{w:12,pipe:true,top:20}:{w:30+Math.floor(sr(id,2)*12),top:88+Math.floor(sr(id,3)*8)};},
  el(b,x,s,t,bpp){const G=GROUND();
   if(b.tank){R(x+1,b.top-2,b.w-2,2,shadeOf(s,1.3));R(x,b.top,b.w,G-b.top,shadeOf(s,1.15));R(x+b.w-4,b.top,4,G-b.top,shadeOf(s,0.8));
    for(const y of[b.top+8,G-24])R(x,y,b.w,2,shadeOf(s,0.75));R(x+6,b.top+14,6,40,'#0c0c0e');
    const lv=b.top+22+Math.floor(hash(b.id,1,1)*12);R(x+7,lv,4,b.top+53-lv,gc(P.winA,s,0.6));
    for(let k=0;k<2;k++)R(x+8+k*2,b.top+53-((t*12+k*9+b.id)%(b.top+53-lv)),1,1,gc(P.winA,s));return;}
   if(b.pipe){for(let k=0;k<3;k++)R(x+1+k*4,b.top,3,G-b.top,shadeOf(s,1.2-k*0.12));for(let k=0;k<3;k++)R(x+k*4,b.top+30+k*22,5,3,shadeOf(s,1.5));
    R(x+3,b.top+46,6,6,gc(P.signA,s,0.7));R(x+5,b.top+48,2,2,'#0c0c0e');return;}
   R(x,b.top,b.w,G-b.top,BLD(s));R(x,b.top,b.w,2,shadeOf(s,1.4));R(x+3,b.top+4,b.w-6,10,'#0c0c0e');
   for(let k=0;k<b.w-8;k+=2){const h=1+Math.floor(hash(b.id,k,Math.floor(t/B))*7);R(x+4+k,b.top+13-h,1,h,gc(P.winB,s,0.8));}
   for(let k=0;k<b.w-8;k+=5)R(x+4+k,b.top+18,3,2,gc(hash(b.id,k,2)<0.5?P.signA:P.winA,s,0.7));},
  rail(dpx,ws){const c=mix(hx('#3a3b40'),P.bldC,ws*0.6);R(0,LANE_Y[0],W,4,c);for(let x=-((dpx|0)%3);x<W;x+=3)R(x,LANE_Y[0]+1,1,2,shadeOf(ws,0.5));
   every(dpx,1,16,(x)=>{R(x,LANE_Y[0]-7,1,7,c);});R(0,LANE_Y[0]-7,W,1,c);
   beatPosts(dpx,ws,LANE_Y[0]+4);R(0,LANE_Y[0],W,1,mix(P.railG,P.railC,ws));},
  road(dpx,ws){g.fillStyle=mix(P.roadG,P.roadC,ws);g.fillRect(-4,LANE_Y[1],W+8,ROAD_END-LANE_Y[1]);
   for(let x=-((dpx|0)%4);x<W;x+=4)R(x,LANE_Y[1]+5,1,ROAD_END-LANE_Y[1]-5,shadeOf(ws,0.55));
   for(let x=-((dpx|0)%8)-8;x<W;x+=8){R(x,LANE_Y[1],4,3,gc(hx('#ffd23d'),ws,0.75));R(x+4,LANE_Y[1],4,3,'#101012');}}},

 // ホログラム交差点: a big crossing under giant holographic billboards
 pop:{
  sky(t,ws,dpx){skyGrad(ws);streaks(t,ws);if(ws>0.1){g.globalAlpha=0.25*ws;for(let i=0;i<3;i++){const x=((i*53-t*6)%(W+20)+W+20)%(W+20)-10,y=18+i*11+Math.sin(t+i)*3;icon(i,x,y,i%2?P.winA:P.winB,1);}g.globalAlpha=1;}},
  far(dpx,ws){farCity(dpx,ws,20,62);},
  make(id){return{w:32+Math.floor(sr(id,1)*14),top:28+Math.floor(sr(id,2)*36),scr:sr(id,3)<0.65,ic:Math.floor(sr(id,4)*3)};},
  el(b,x,s,t,bp){const G=GROUND();R(x,b.top,b.w,G-b.top,BLD(s));
   if(b.scr){const sw=b.w-8,sy=b.top+6;R(x+3,sy-1,sw+2,24,'#0a0a0c');R(x+4,sy,sw,22,mix(hx('#1e1f24'),P.skyMidC,s*0.6));
    const bar=Math.max(0,Math.floor(t/BAR)),ph=(b.ic+bar)%3;const c=ph===1?P.winA:P.winB;g.globalAlpha=0.5+0.5*s;icon(ph,x+4+sw/2-3,sy+7,c,s);g.globalAlpha=1;
    for(let y=sy;y<sy+22;y+=2)R(x+4,y,sw,1,'rgba(0,0,0,.25)');windows(b,x,sy+28,LANE_Y[1]-6,s,P.winB,0.3);}
   else windows(b,x,b.top+5,LANE_Y[1]-6,s,P.winA,0.4);},
  road(dpx,ws){defRoad(dpx,ws);every(dpx,1,300,(x)=>{for(let k=0;k<9;k++)R(x+k*6,LANE_Y[1]+3,4,ROAD_END-LANE_Y[1]-5,mix(hx('#5a5b60'),hx('#e8eef4'),ws*0.8));});}},

 // 巨大ビジョン広場: giant LED walls and lasers; the screens show the color the player brought back
 edm:{
  sky(t,ws,dpx){skyGrad(ws);if(ws>0.05){const ph=(t/B)%4;g.globalAlpha=0.16*ws;
   for(const [ox,c] of[[18,PH.signA],[118,PH.signB]])for(let k=0;k<4;k++){const a=-Math.PI/2+Math.sin(ph*Math.PI/2+k)*0.7;g.fillStyle=c;for(let r=0;r<120;r+=1)g.fillRect(Math.round(ox+Math.cos(a)*r),Math.round(112+Math.sin(a)*r),1,1);}g.globalAlpha=1;}},
  far(dpx,ws,t){farCity(dpx,ws,14,44);const bpp=bp(t);every(dpx,0.15,150,(x,i)=>{R(x,14,74,46,'#0a0a0c');R(x+2,16,70,42,mix(hx('#202126'),hx('#0c0614'),ws));
   for(let k=0;k<14;k++){const lv=ws<0.05?hash(k,Math.floor(t*12),i)*10:(4+hash(k,Math.floor(t/B*2),i)*24)*(0.6+0.4*(1-bpp));
    for(let y=0;y<lv;y+=2)R(x+4+k*5,56-y,4,1,ws<0.05?'#3a3b40':gc(y>18?P.signA:y>10?P.winA:P.winB,ws,0.85));}
   R(x+34,60,6,52,FAR(ws));});},
  make(id){const r=sr(id,1);return r<0.3?{w:11,truss:true,top:26+Math.floor(sr(id,2)*20)}:r<0.55?{w:22,spk:true,top:120}:{w:26+Math.floor(sr(id,2)*16),top:66+Math.floor(sr(id,3)*24)};},
  el(b,x,s,t,bpp){const G=GROUND();
   if(b.truss){const c=shadeOf(s,1.5);R(x,b.top,1,G-b.top,c);R(x+b.w-1,b.top,1,G-b.top,c);for(let y=b.top;y<G-6;y+=10){sag(x,y,x+b.w-1,y+10,0,c);sag(x+b.w-1,y,x,y+10,0,c);}
    R(x-1,b.top-3,b.w+2,3,c);if(s>0.05){g.globalAlpha=0.6*s*(1-bpp);R(x+2,b.top,b.w-4,2,PH.signB);g.globalAlpha=1;}return;}
   if(b.spk){for(let i=0;i<3;i++){const y=G-(i+1)*19;R(x,y,b.w,18,'#141418');R(x+1,y+1,b.w-2,16,shadeOf(s,0.9));const rr=i===0&&bpp<0.2?5:4;disc(x+b.w/2,y+9,rr,'#0c0c0e');disc(x+b.w/2,y+9,1,gc(P.signA,s,0.7));}return;}
   R(x,b.top,b.w,G-b.top,BLD(s));windows(b,x,b.top+5,LANE_Y[1]-6,s,P.winB,0.36);}},

 // 坂の上のライブハウス: a sloped street of houses, utility poles and wires, a live house marquee
 rock:{
  far(dpx,ws){const c=FAR(ws),o=dpx*0.3;for(let x=-2;x<W+2;x+=2){const X=x+o,h=72-Math.sin(X*0.012)*14-Math.sin(X*0.031)*5;R(x,h,2,118-h,c);}
   every(dpx,0.3,17,(x,i)=>{const X=x+o,h=72-Math.sin(X*0.012)*14-Math.sin(X*0.031)*5;if(hash(i,3,8)<0.7){R(x,h-5,6,5,shadeOf(ws,1.1));R(x-1,h-6,8,1,shadeOf(ws,1.25));if(hash(i,4,8)<0.6)R(x+2,h-3,2,2,mix(P.winOnG,P.winA,ws));}});},
  make(id){const r=sr(id,1);return r<0.3?{w:7,pole:true,top:30}:r<0.45?{w:50,live:true,top:58}:{w:26+Math.floor(sr(id,2)*14),top:70+Math.floor(sr(id,3)*20),sg:sr(id,4)<0.5};},
  el(b,x,s,t,bpp){const G=GROUND();
   if(b.pole){const c=mix(hx('#45464c'),P.bldC,s*0.4);R(x+3,b.top,2,G-b.top,c);R(x,b.top+4,8,1,c);R(x,b.top+3,1,1,c);R(x+7,b.top+3,1,1,c);R(x+4,b.top+12,4,6,shadeOf(s,1.3));b.wy=b.top+4;return;}
   R(x,b.top,b.w,G-b.top,BLD(s));R(x-1,b.top,b.w+2,2,shadeOf(s,1.3));
   if(b.live){const my=b.top+10;R(x+4,my,b.w-8,14,'#0c0c0e');R(x+5,my+1,b.w-10,12,gc(P.signA,s,0.55));
    for(let k=0;k<5;k++)R(x+8+k*7,my+4,5,6,shadeOf(s,0.5));
    for(let k=0;k<b.w-8;k+=2){const on=(k/2+Math.floor(t/B*2))%2===0;R(x+4+k,my-1,1,1,on?gc(P.winA,Math.max(s,0.3)):shadeOf(s,0.7));R(x+4+k,my+14,1,1,on?shadeOf(s,0.7):gc(P.winA,Math.max(s,0.3)));}
    windows(b,x,my+20,108,s,P.winA,0.5);R(x+b.w/2-6,148,12,G-148,'#0e0e10');
    for(let k=0;k<3;k++)R(x+5+k*5+(k>1?b.w-28:0),150,4,6,gc([P.winB,P.signB,P.winA][k],s,0.6));return;}
   windows(b,x,b.top+5,108,s,P.winA,0.4);
   if(b.sg){R(x+2,128,b.w-4,7,'#0c0c0e');R(x+3,129,b.w-6,5,gc(P.winB,s,0.6));}R(x+3,140,b.w-6,G-140,shadeOf(s,0.72));},
  over(dpx,ws,t,list){let prev=null;const c=shadeOf(ws,0.6);
   for(const b of list){if(!b.pole)continue;const x=Math.round(b.x-dpx)+3;
    if(prev){for(let k=0;k<2;k++)sag(prev[0],prev[1]+k*3,x,b.top+4+k*3,5+k,c);}prev=[x,b.top+4];}}},

 // 落書きの地下道: a tiled underpass covered in tags; the tags are where the color shows first
 trap:{
  sky(t,ws,dpx){const wc=mix(hx('#26272c'),P.bldC,ws);R(-4,-4,W+8,ROAD_END+8,wc);
   const off=dpx%8;for(let y=28;y<LANE_Y[1];y+=6)R(0,y,W,1,shadeOf(ws,0.82));for(let r=0,y=28;y<LANE_Y[1];y+=6,r++)for(let x=-off+(r%2)*4;x<W;x+=8)R(x,y,1,6,shadeOf(ws,0.82));
   R(0,0,W,22,mix(hx('#1a1b1f'),P.skyTopC,ws));R(0,22,W,2,shadeOf(ws,0.6));
   every(dpx,1,44,(x,i)=>{const fl=i%5===2&&Math.sin(t*37+i)>0.6;R(x+10,24,14,2,fl?'#3a3b40':mix(hx('#9a9ba3'),hx('#eaf6ff'),ws));if(!fl){g.globalAlpha=0.08;for(let k=0;k<10;k++)R(x+10-k,26+k,14+k*2,1,'#ffffff');g.globalAlpha=1;}});},
  far(){},
  make(id){const r=sr(id,1);return r<0.25?{w:9,col:true,top:24}:{w:30+Math.floor(sr(id,2)*26),top:36+Math.floor(sr(id,3)*40),n:3+Math.floor(sr(id,4)*3),lo:sr(id,5)<0.5};},
  el(b,x,s,t,bp){const G=GROUND();
   if(b.col){R(x,b.top,b.w,G-b.top,shadeOf(s,1.25));R(x+b.w-2,b.top,2,G-b.top,shadeOf(s,0.9));return;}
   const tag=(y0,h,k)=>{const cols=[P.signA,P.winA,P.signB,P.winB];
    for(let i=0;i<b.n;i++){const w=Math.floor((b.w-6)/b.n)+3,xx=x+2+i*(w-3),yy=y0+Math.floor(hash(b.id,i,5)*5),c=cols[(i+Math.floor(hash(b.id,9,9)*4))%4];
     R(xx,yy+1,w,h-2,'#0a0a0c');R(xx+1,yy,w-2,h,'#0a0a0c');R(xx+1,yy+1,w-2,h-2,gc(c,s,k));R(xx+2,yy+2,1,2,gc(hx('#ffffff'),s,k));
     if(hash(b.id,i,6)<0.5)R(xx+3,yy+h,1,3+hash(b.id,i,7)*4,gc(c,s,k));}};
   tag(b.top,16,0.72);if(b.lo)tag(130,12,0.5);},
  rail(dpx,ws){const c=mix(hx('#3a3b40'),P.bldC,ws*0.6);R(0,LANE_Y[0],W,5,c);R(0,LANE_Y[0]+5,W,1,shadeOf(ws,0.5));beatPosts(dpx,ws,LANE_Y[0]+6);R(0,LANE_Y[0],W,1,mix(P.railG,P.railC,ws));}},

 // 真夜中の喫茶街: low brick cafés, warm windows, street lamps and the moon
 jazz:{
  sky(t,ws,dpx){skyGrad(ws);stars(t,ws,20,60);moon(104,24,6,ws);},
  far(dpx,ws){farCity(dpx,ws,10,36);every(dpx,0.35,210,(x)=>{const c=FAR(ws);R(x,40,10,80,c);R(x+2,34,6,6,c);R(x+4,28,2,6,c);disc(x+5,48,2,mix(P.winOnG,P.winA,ws));});},
  make(id){return sr(id,1)<0.28?{w:6,lamp:true,top:126}:{w:34+Math.floor(sr(id,2)*14),top:64+Math.floor(sr(id,3)*20),aw:sr(id,4)<0.6};},
  el(b,x,s,t,bp){const G=GROUND();
   if(b.lamp){const c=shadeOf(s,1.4);R(x+2,b.top+4,2,G-b.top-4,c);R(x+1,G-3,4,3,c);g.globalAlpha=0.12+0.12*s;disc(x+3,b.top+1,6,gc(P.winA,s));g.globalAlpha=1;disc(x+3,b.top+1,2,mix(P.winOnG,P.winA,s));return;}
   R(x,b.top,b.w,G-b.top,BLD(s));for(let y=b.top+3,r=0;y<G;y+=3,r++){R(x,y,b.w,1,shadeOf(s,0.85));for(let k=(r%2)*3;k<b.w;k+=6)R(x+k,y-2,1,2,shadeOf(s,0.85));}
   R(x-1,b.top,b.w+2,2,shadeOf(s,1.35));
   for(let k=x+3;k<x+b.w-4;k+=7){const lit=hash(b.id,k,2)<0.55;R(k,b.top+8,4,7,lit?mix(P.winOnG,P.winA,s*0.85):mix(P.winOffG,P.winOffC,s));R(k-1,b.top+15,6,1,shadeOf(s,1.3));}
   R(x+3,142,b.w-6,22,'#0c0c0e');R(x+4,143,b.w-8,20,mix(P.winOnG,P.winA,s*0.7));R(x+4,143,b.w-8,2,shadeOf(s,0.8));
   for(let k=x+10;k<x+b.w-6;k+=9)R(k,152,3,11,shadeOf(s,0.55));
   if(b.aw)for(let k=0;k<b.w-2;k+=2)R(x+1+k,136,2,5,(k/2)%2?gc(P.signA,s,0.6):mix(P.winOffG,hx('#e8e0d0'),s*0.6));}},

 // 提灯小路: machiya with tiled roofs and lattice, lanterns, a pagoda and the hills beyond
 wa:{
  sky(t,ws,dpx){skyGrad(ws);moon(30,22,5,ws);const c=mix(hx('#17181c'),P.farC,ws*0.7),o=dpx*0.12;for(let x=-2;x<W+2;x+=2){const X=x+o,h=78-Math.sin(X*0.02)*12-Math.sin(X*0.053)*5;R(x,h,2,118-h,c);}},
  far(dpx,ws){const c=FAR(ws);farCity(dpx,ws,8,22);every(dpx,0.35,190,(x)=>{for(let i=0;i<5;i++){const y=44+i*12,w=24-i*3;R(x-w/2,y,w,2,c);R(x-w/2-1,y-1,2,1,c);R(x+w/2-1,y-1,2,1,c);R(x-w/2+3,y+2,w-6,10,c);}R(x,30,1,14,c);});},
  make(id){return{w:36+Math.floor(sr(id,1)*16),top:80+Math.floor(sr(id,2)*12),ln:2+Math.floor(sr(id,3)*2),nr:sr(id,4)<0.6};},
  el(b,x,s,t,bpp){const G=GROUND(),wood=mix(hx('#2c2a28'),P.bldC,s),dark=shadeOf(s,0.6);
   R(x,b.top+6,b.w,G-b.top-6,wood);
   const roof=(y,ov)=>{const rc=mix(hx('#3a3b40'),hx('#2a3038'),s);R(x-ov,y,b.w+ov*2,5,rc);R(x-ov-1,y-1,2,1,rc);R(x+b.w+ov-1,y-1,2,1,rc);R(x-ov,y,b.w+ov*2,1,shadeOf(s,1.5));for(let k=x-ov;k<x+b.w+ov;k+=2)R(k,y+1,1,4,'rgba(0,0,0,.3)');};
   roof(b.top,3);
   for(let k=x+5;k<x+b.w-5;k+=1)if((k-x)%2===0)R(k,b.top+10,1,8,dark);R(x+4,b.top+10,b.w-8,1,dark);
   g.globalAlpha=0.5+0.4*s;R(x+5,b.top+11,b.w-10,6,mix(P.winOffG,P.winA,s*0.5));g.globalAlpha=1;for(let k=x+5;k<x+b.w-5;k+=2)R(k,b.top+11,1,6,dark);
   roof(130,2);
   R(x+3,140,b.w-6,G-140,mix(P.winOffG,P.winA,s*0.45));for(let k=x+3;k<x+b.w-3;k+=2)R(k,140,1,G-140,dark);
   if(b.nr){const nx=x+Math.floor(b.w/2)-5;R(nx,140,10,9,gc(P.signA,s,0.6));R(nx+4,140,1,9,shadeOf(s,0.5));R(nx+2,143,1,1,gc(hx('#ffffff'),s,0.8));}
   for(let i=0;i<b.ln;i++){const lx=x+4+i*Math.floor((b.w-10)/Math.max(1,b.ln-1)),ly=137;g.globalAlpha=0.12+0.14*s;disc(lx+2,ly+4,6,gc(P.signA,s));g.globalAlpha=1;
    R(lx+2,ly-2,1,2,dark);R(lx,ly,5,1,'#141414');R(lx,ly+1,5,6,mix(hx('#6a6b70'),P.signA,s));R(lx+1,ly+2,3,4,mix(hx('#8a8b90'),P.winA,s));R(lx,ly+7,5,1,'#141414');}},
  rail(dpx,ws){const c=mix(hx('#3a3836'),hx('#4a3020'),ws),red=gc(P.signA,ws,0.7);R(0,LANE_Y[0],W,5,c);R(0,LANE_Y[0]-6,W,2,red);
   every(dpx,1,14,(x)=>{R(x,LANE_Y[0]-6,2,6,red);});every(dpx,1,56,(x)=>{R(x,LANE_Y[0]-8,2,2,mix(hx('#5a5b60'),hx('#d8b860'),ws));});beatPosts(dpx,ws,LANE_Y[0]+5);R(0,LANE_Y[0],W,1,shadeOf(ws,1.4));},
  road(dpx,ws){g.fillStyle=mix(P.roadG,P.roadC,ws);g.fillRect(-4,LANE_Y[1],W+8,ROAD_END-LANE_Y[1]);
   for(let r=0,y=LANE_Y[1]+2;y<ROAD_END;y+=5,r++){R(0,y,W,1,shadeOf(ws,0.45));for(let x=-((dpx|0)%10)+(r%2)*5;x<W;x+=10)R(x,y,1,5,shadeOf(ws,0.45));}
   g.fillStyle=mix(P.lineG,P.lineC,ws*0.6);g.fillRect(0,LANE_Y[1],W,1);}},
};
function bp(t){return((t/B)%1+1)%1;}
// small pictograms the billboards cycle through: heart, star, note
const ICONS=[['.xx.xx.','xxxxxxx','xxxxxxx','.xxxxx.','..xxx..','...x...'],['...x...','..xxx..','xxxxxxx','.xxxxx.','.xx.xx.','x.....x'],['..xxxx','..x..x','..x..x','..x..x','xxx.xx','xxx.xx']];
function icon(i,x,y,c,s){g.fillStyle=gc(c,s);ICONS[i].forEach((row,r)=>{for(let k=0;k<row.length;k++)if(row[k]==='x')g.fillRect(Math.round(x+k),Math.round(y+r),1,1);});}

let SCN=SCENES.neon;
function sceneFor(sg){SCN=SCENES[sg.scene||sg.id]||SCENES.neon;}

// The whole backdrop for one frame, back to front. Near elements come from the buildings list in game.js.
function drawBackdrop(t,ws,dpx,bpp,dt,list){
 (SCN.sky||((t,ws)=>{skyGrad(ws);streaks(t,ws);}))(t,ws,dpx);
 (SCN.far||((dpx,ws)=>farCity(dpx,ws,20,68)))(dpx,ws,t);
 for(const b of list){b.s+=(bTarget(b,t)-b.s)*Math.min(1,dt*4);SCN.el(b,Math.round(b.x-dpx),b.s,t,bpp);}
 if(SCN.over)SCN.over(dpx,ws,t,list);
 // VEIL: the colored city steps back a little so the enemies stay the sharpest thing on screen
 if(ws>0){g.fillStyle='rgba(6,6,12,'+(0.16*ws)+')';g.fillRect(-4,-4,W+8,LANE_Y[1]+4);}
 (SCN.rail||defRail)(dpx,ws);
 (SCN.road||defRoad)(dpx,ws);
 if(SCN.weather)SCN.weather(t,ws);
}
