/* Flip-side animations for the Radars / Agents / Records cards. */
(function(){
"use strict";
var reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// colors come from the theme: ink for normal flow, accent for the person, muted for bad input
var OK,FAIL,HUM,LINE,SURF;
function rgb(name){var h=getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace('#','');
  if(h.length===3)h=h.split('').map(function(c){return c+c;}).join('');var n=parseInt(h.slice(0,6),16)||0;return (n>>16&255)+','+(n>>8&255)+','+(n&255);}
function themeColors(){OK=rgb('--ink');FAIL=rgb('--muted');HUM=rgb('--accent');LINE='rgba('+rgb('--line')+',';SURF='rgba('+rgb('--surface')+',.95)';}
themeColors();
var MONO='500 10px "JetBrains Mono",monospace';

function init(root){
themeColors();
// tap to flip on touch screens
root.querySelectorAll('.flip').forEach(function(f){
  f.addEventListener('click',function(){if(window.matchMedia('(hover: none)').matches)f.classList.toggle('flipped');});
  f.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();f.classList.toggle('flipped');}});
});
run(root);
}

/* Stylized Connecticut outline, north up, 0..1 */
var CT=[[0,.02],[.18,.03],[.2,0],[1,.02],[.99,.7],[.93,.74],[.84,.76],[.74,.77],[.64,.8],[.55,.81],[.47,.85],[.38,.87],[.3,.9],[.22,.93],[.14,.96],[.06,.99],[.02,1],[.05,.86],[.01,.84]];
var TOWNS=[[.5,.3,1],[.42,.78,.9],[.26,.88,.9],[.1,.95,.8],[.3,.52,.8],[.8,.58,.6],[.82,.74,.6],[.12,.66,.7],[.53,.56,.6],[.27,.22,.5],[.73,.38,.5],[.55,.07,.5],[.39,.39,.6],[.62,.2,.4],[.45,.18,.4],[.2,.4,.4],[.66,.66,.4],[.35,.7,.4],[.9,.2,.3],[.86,.42,.3],[.15,.18,.3],[.6,.44,.3],[.47,.62,.4],[.72,.8,.3],[.18,.8,.4],[.33,.95,.3],[.7,.06,.3],[.08,.3,.3]];
TOWNS.forEach(function(t){t.push(Math.random()*6,1.6+Math.random()*2.4);});

function radar(ctx,W,H,t){
  var pad=26,w=W-pad*2,h=Math.min(H-pad*2-20,w*.62),ox=pad,oy=(H-h)/2-6;
  ctx.strokeStyle=LINE+'.45)';ctx.fillStyle=LINE+'.04)';ctx.lineWidth=1.2;
  ctx.beginPath();CT.forEach(function(p,i){var x=ox+p[0]*w,y=oy+p[1]*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();ctx.stroke();
  // sweep
  var cx=ox+.5*w,cy=oy+.5*h,a=t*.9,R=w*.62;
  var g=ctx.createRadialGradient(cx,cy,0,cx,cy,R);g.addColorStop(0,'rgba('+OK+',.10)');g.addColorStop(1,'rgba('+OK+',0)');
  ctx.save();ctx.beginPath();CT.forEach(function(p,i){var x=ox+p[0]*w,y=oy+p[1]*h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.clip();
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,a,a+.5);ctx.closePath();ctx.fill();ctx.restore();
  // beacons: size = town size, each on its own period
  TOWNS.forEach(function(tw){
    var x=ox+tw[0]*w,y=oy+tw[1]*h,s=tw[2],ph=((t+tw[3])%tw[4])/tw[4];
    var c=s>.75?HUM:OK;
    ctx.strokeStyle='rgba('+c+','+(1-ph)*.8+')';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(x,y,2+ph*16*s,0,6.283);ctx.stroke();
    ctx.fillStyle='rgba('+c+',.9)';ctx.beginPath();ctx.arc(x,y,1.2+s*1.8,0,6.283);ctx.fill();
  });
}

/* Lead agent teaches a skill to two agents, then shows when they should call a person. */
function agents(ctx,W,H,t){
  var cy=H*.46,L={x:W*.5,y:cy-56},A={x:W*.26,y:cy+40},B={x:W*.74,y:cy+40},P={x:W*.5,y:H-36};
  var cyc=t%8;
  link(L,A);link(L,B);
  ctx.setLineDash([2,6]);link(A,P);link(B,P);ctx.setLineDash([]);
  // phase 0-3: teach; 3-5: practice; 5-8: call
  var teach=cyc<3,practice=cyc>=3&&cyc<5,call=cyc>=5;
  if(teach){var u=(cyc%1.5)/1.5,to=cyc<1.5?A:B;packet(L,to,u,OK,'RFI SKILL');}
  node(L,'LEAD',OK,1);
  node(A,'AGENT A',OK,teach&&cyc<1.5?.6:1);
  node(B,'AGENT B',OK,teach&&cyc>=1.5?.6:1);
  if(practice){ring(A,(cyc-3)/2,OK);ring(B,((cyc-3)/2+.5)%1,OK);label('drafting…',W*.5,cy+90,OK);}
  if(call){var v=Math.min(1,(cyc-5)/1.2);packet(A,P,v,HUM,'');
    label('CALL WHEN: no reply 9 days · $ over limit · safety',W*.5,cy+92,HUM);}
  // person
  ctx.strokeStyle='rgba('+HUM+','+(call?.95:.4)+')';ctx.lineWidth=1.4;
  ctx.beginPath();ctx.arc(P.x,P.y-10,6,0,6.283);ctx.stroke();ctx.beginPath();ctx.arc(P.x,P.y+8,11,Math.PI,0);ctx.stroke();
  function link(a,b){ctx.strokeStyle=LINE+'.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  function node(p,s,c,a){ctx.strokeStyle='rgba('+c+','+a*.8+')';ctx.fillStyle=SURF;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.arc(p.x,p.y,15,0,6.283);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba('+c+','+a+')';ctx.beginPath();ctx.arc(p.x,p.y,4,0,6.283);ctx.fill();
    ctx.font=MONO;ctx.textAlign='center';ctx.fillStyle='rgba('+OK+',.75)';ctx.fillText(s,p.x,p.y-22);ctx.textAlign='left';}
  function packet(a,b,u,c,s){var x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u;ctx.fillStyle='rgba('+c+',.25)';ctx.beginPath();ctx.arc(x,y,9,0,6.283);ctx.fill();
    ctx.fillStyle='rgba('+c+',1)';ctx.fillRect(x-4,y-5,8,10);if(s){ctx.font=MONO;ctx.fillText(s,x+10,y-6);}}
  function ring(p,u,c){ctx.strokeStyle='rgba('+c+','+(1-u)*.8+')';ctx.beginPath();ctx.arc(p.x,p.y,15+u*14,0,6.283);ctx.stroke();}
  function label(s,x,y,c){ctx.font=MONO;ctx.textAlign='center';ctx.fillStyle='rgba('+c+',.9)';ctx.fillText(s,x,y);ctx.textAlign='left';}
}

/* A badly named scan gets renamed to the standard and filed. */
var BAD='scan0042_FINAL_v3 (2).pdf',GOOD='08 71 00-003-PD-Door Hardware-Rev0';
function records(ctx,W,H,t){
  var cyc=t%7,dw=Math.min(150,W*.42),dh=dw*1.25,x=W*.5-dw/2,y=H*.5-dh/2-14;
  // drawer
  var dx=W*.5-dw*.7,dy=H-46;
  ctx.strokeStyle=LINE+'.35)';ctx.lineWidth=1;ctx.strokeRect(dx,dy,dw*1.4,30);ctx.strokeRect(W*.5-14,dy+12,28,5);
  ctx.font=MONO;ctx.fillStyle=LINE+'.5)';ctx.fillText('08 71 00 · DOOR HARDWARE',dx+6,dy-6);
  // doc motion: wobble (0-2), rename (2-4.5), drop into drawer (4.5-6), gone (6-7)
  var wob=cyc<2?Math.sin(t*6)*.05:0,drop=cyc>4.5?Math.min(1,(cyc-4.5)/1.3):0;
  var alpha=cyc>6?0:1;
  if(alpha){
    ctx.save();ctx.translate(x+dw/2,y+dh/2+drop*(dy-y-dh/2+10));ctx.rotate(wob);ctx.scale(1-drop*.6,1-drop*.6);ctx.globalAlpha=1-drop*.8;
    var good=cyc>=2;
    ctx.fillStyle=SURF;ctx.strokeStyle=good&&cyc>=4.5?'rgba('+OK+',.8)':cyc>=2?LINE+'.5)':'rgba('+FAIL+',.7)';ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(-dw/2,-dh/2);ctx.lineTo(dw/2-18,-dh/2);ctx.lineTo(dw/2,-dh/2+18);ctx.lineTo(dw/2,dh/2);ctx.lineTo(-dw/2,dh/2);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=LINE+'.18)';for(var i=0;i<7;i++){ctx.beginPath();ctx.moveTo(-dw/2+12,-dh/2+40+i*12);ctx.lineTo(dw/2-12-(i%3)*14,-dh/2+40+i*12);ctx.stroke();}
    // filename
    var name;
    if(cyc<2)name=BAD;
    else if(cyc<4.5){var k=Math.min(GOOD.length,Math.floor((cyc-2)/2*GOOD.length*1.1));name=GOOD.slice(0,k)+(k<GOOD.length?'▌':'');}
    else name=GOOD;
    ctx.font='500 9px "JetBrains Mono",monospace';ctx.fillStyle=cyc<2?'rgba('+FAIL+',.95)':'rgba('+OK+',.95)';
    wrap(name,-dw/2+10,-dh/2+16,dw-30);
    if(cyc<2){ctx.fillStyle='rgba('+FAIL+',.9)';ctx.fillText('? which spec  ? which rev',-dw/2+10,dh/2-12);}
    ctx.restore();
  }
  function wrap(s,x0,y0,max){var line='',yy=y0;for(var i=0;i<s.length;i++){var tst=line+s[i];if(ctx.measureText(tst).width>max){ctx.fillText(line,x0,yy);line=s[i];yy+=11;}else line=tst;}ctx.fillText(line,x0,yy);}
}

var ANIMS={radar:radar,agents:agents,records:records};
function run(root){
var list=[];
root.querySelectorAll('canvas[data-anim]').forEach(function(c){if(ANIMS[c.dataset.anim])list.push({c:c,ctx:c.getContext('2d'),fn:ANIMS[c.dataset.anim],card:c.closest('.flip')});});
if(!list.length)return;
function size(){var d=Math.min(2,window.devicePixelRatio||1);list.forEach(function(o){var r=o.c.getBoundingClientRect();o.W=r.width;o.H=r.height;o.c.width=r.width*d;o.c.height=r.height*d;o.ctx.setTransform(d,0,0,d,0,0);});}
size();window.addEventListener('resize',size);
if(reduced){list.forEach(function(o){if(o.W)o.fn(o.ctx,o.W,o.H,4);});return;}
var t0=performance.now();
(function loop(now){
  // stop when the cards are removed (re-render in the editor preview)
  if(!list[0].c.isConnected){window.removeEventListener('resize',size);return;}
  var t=(now-t0)/1000;
  // only animate the card being looked at
  list.forEach(function(o){
    var on=o.card&&(o.card.matches(':hover')||o.card.matches(':focus-within')||o.card.classList.contains('flipped'));
    if(on||!o.drawn){if(!o.W){var r=o.c.getBoundingClientRect();if(r.width)size();}if(o.W){o.ctx.clearRect(0,0,o.W,o.H);o.fn(o.ctx,o.W,o.H,t);o.drawn=true;}}
  });
  requestAnimationFrame(loop);
})(t0);
}
window.CardAnims={init:init};
})();
