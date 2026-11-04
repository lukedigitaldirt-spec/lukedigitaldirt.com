/* Zero-gravity field of outlined tech objects.
   Objects drift, spin, and bounce off each other and the edges. Hovering one breaks it
   into 1s and 0s, which drift apart and then fly back to rebuild it.
   Hero mode: starts black, lifts to reveal the objects, and dims them as you scroll. */
(function(){
"use strict";
function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#ccc';}
function rnd(a,b){return a+Math.random()*(b-a);}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function rgba(hex,a){var h=hex.replace('#','');if(h.length===3)h=h.split('').map(function(c){return c+c;}).join('');
  var n=parseInt(h.slice(0,6),16);if(isNaN(n))return 'rgba(200,210,220,'+a+')';return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')';}
function ease(t){return t<0?0:t>1?1:1-Math.pow(1-t,3);}

function start(canvas,cfg,opts){
  opts=opts||{};cfg=cfg||{};
  var ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W=0,H=0,dpr=Math.min(2,window.devicePixelRatio||1),objs=[],parts=[],glints=[],dust=[],raf=0,alive=true,t=0,last=0;
  var names=(cfg.objects&&cfg.objects.length?cfg.objects:Shapes.names).filter(function(n){return Shapes.defs[n];});
  var speed=(cfg.speed==null?1:+cfg.speed),scale=(cfg.size==null?1:+cfg.size),dim=(cfg.pageOpacity==null?.22:+cfg.pageOpacity);
  var dissolveOn=cfg.dissolve!==false&&!reduced,hero=!!opts.hero;
  var lineC,accC,digits={};
  var ptr={x:-1e4,y:-1e4,on:false};

  function colors(){
    lineC=css('--line');accC=css('--accent');
    ['0','1'].forEach(function(ch){[['l',lineC],['a',accC]].forEach(function(p){
      var c=document.createElement('canvas'),s=Math.round(13*dpr);c.width=s;c.height=Math.round(s*1.3);
      var x=c.getContext('2d');x.font='500 '+(11*dpr)+'px "JetBrains Mono",monospace';x.fillStyle=p[1];x.textBaseline='top';x.fillText(ch,0,1);
      digits[ch+p[0]]=c;});});
    objs.forEach(function(o){o.spr=Shapes.sprite(o.name,o.size*dpr,lineC,1.5*dpr,6*dpr);});
  }
  function resize(){
    var r=canvas.getBoundingClientRect();W=r.width||innerWidth;H=r.height||innerHeight;
    canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    objs.forEach(function(o){o.x=clamp(o.x,o.r,W-o.r);o.y=clamp(o.y,o.r,H-o.r);});
  }
  function build(){
    var n=W<700?(cfg.mobileCount||8):(cfg.count||14),base=clamp(Math.min(W,H)*.14,64,150)*scale;
    objs=[];
    for(var i=0;i<n;i++){
      var size=base*rnd(.75,1.25),r=size*.46,a=rnd(0,6.283),v=rnd(8,20)*speed;
      var o={name:names[i%names.length],size:size,r:r,x:rnd(r,Math.max(r+1,W-r)),y:rnd(r,Math.max(r+1,H-r)),vx:Math.cos(a)*v,vy:Math.sin(a)*v,
        rot:rnd(-.6,.6),vr:rnd(-.12,.12),ph:rnd(0,6.283),delay:i*.09,state:'solid',fade:1,timer:0,bits:null};
      // avoid starting on top of each other
      for(var k=0;k<20&&objs.some(function(p){return Math.hypot(p.x-o.x,p.y-o.y)<p.r+o.r;});k++){o.x=rnd(r,W-r);o.y=rnd(r,H-r);}
      objs.push(o);
    }
    dust=[];for(var d=0;d<(W<700?30:60);d++)dust.push({x:rnd(0,W),y:rnd(0,H),vx:rnd(-3,3),vy:rnd(-3,3),ph:rnd(0,6.283),s:rnd(.6,1.4)});
    colors();
  }

  function local(o,p){var c=Math.cos(o.rot),s=Math.sin(o.rot),x=p[0]*o.size,y=p[1]*o.size;return[o.x+x*c-y*s,o.y+x*s+y*c];}
  function dissolve(o){
    o.state='gone';o.timer=0;o.bits=[];
    var pts=Shapes.points(o.name,Math.round(clamp(o.size*.75,40,110)));
    pts.forEach(function(p){
      var w=local(o,p),dx=w[0]-o.x,dy=w[1]-o.y,m=Math.hypot(dx,dy)||1,sp=rnd(18,70);
      var b={p:p,x:w[0],y:w[1],vx:dx/m*sp+o.vx+rnd(-12,12),vy:dy/m*sp+o.vy+rnd(-12,12),ch:Math.random()<.5?'0':'1',acc:Math.random()<.15,a:1};
      o.bits.push(b);parts.push(b);
    });
  }

  function step(dt){
    t+=dt;
    // move + walls
    objs.forEach(function(o){
      o.x+=o.vx*dt;o.y+=o.vy*dt;o.rot+=o.vr*dt;
      if(o.x<o.r){o.x=o.r;o.vx=Math.abs(o.vx);}if(o.x>W-o.r){o.x=W-o.r;o.vx=-Math.abs(o.vx);}
      if(o.y<o.r){o.y=o.r;o.vy=Math.abs(o.vy);}if(o.y>H-o.r){o.y=H-o.r;o.vy=-Math.abs(o.vy);}
      var v=Math.hypot(o.vx,o.vy),lo=6*speed,hi=26*speed;
      if(v<lo&&v>0){o.vx*=lo/v;o.vy*=lo/v;}else if(v>hi){o.vx*=hi/v;o.vy*=hi/v;}
      o.vr=clamp(o.vr,-.3,.3);
    });
    // collisions (only solid objects collide)
    for(var i=0;i<objs.length;i++)for(var j=i+1;j<objs.length;j++){
      var a=objs[i],b=objs[j];if(a.state!=='solid'||b.state!=='solid')continue;
      var dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;
      if(d>0&&d<min){
        var nx=dx/d,ny=dy/d,ov=(min-d)/2;a.x-=nx*ov;a.y-=ny*ov;b.x+=nx*ov;b.y+=ny*ov;
        var rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
        if(rv<0){var ma=a.r*a.r,mb=b.r*b.r,imp=-2*rv/(ma+mb);
          a.vx-=imp*mb*nx;a.vy-=imp*mb*ny;b.vx+=imp*ma*nx;b.vy+=imp*ma*ny;
          a.vr+=rnd(-.08,.08);b.vr+=rnd(-.08,.08);
          if(Math.random()<.6)glint(a.x+nx*a.r,a.y+ny*a.r);}
      }
    }
    // hover → break into digits; later rebuild
    objs.forEach(function(o){
      if(o.state==='solid'){
        o.fade=Math.min(1,o.fade+dt*2.5);
        if(dissolveOn&&ptr.on&&Math.hypot(ptr.x-o.x,ptr.y-o.y)<o.r*.8&&o.fade>.9)dissolve(o);
      }else if(o.state==='gone'){
        o.timer+=dt;o.fade=Math.max(0,o.fade-dt*4);
        o.bits.forEach(function(b){var k=Math.exp(-dt*1.4);b.vx*=k;b.vy*=k;b.x+=b.vx*dt;b.y+=b.vy*dt;});
        if(o.timer>2.4&&!(ptr.on&&Math.hypot(ptr.x-o.x,ptr.y-o.y)<o.r*1.3)){o.state='reform';o.timer=0;}
      }else if(o.state==='reform'){
        o.timer+=dt;var k2=1-Math.exp(-dt*(3+o.timer*4));
        o.bits.forEach(function(b){var h=local(o,b.p);b.x+=(h[0]-b.x)*k2;b.y+=(h[1]-b.y)*k2;});
        if(o.timer>1.2){o.state='solid';o.fade=0;o.bits.forEach(function(b){b.dead=true;});o.bits=null;}
      }
    });
    parts=parts.filter(function(b){return!b.dead;});
    dust.forEach(function(p){p.x=(p.x+p.vx*dt+W)%W;p.y=(p.y+p.vy*dt+H)%H;});
    if(Math.random()<dt*3&&objs.length){var o=objs[Math.floor(Math.random()*objs.length)];if(o.state==='solid'){var pp=Shapes.points(o.name,60),q=local(o,pp[Math.floor(Math.random()*pp.length)]);glint(q[0],q[1]);}}
    glints=glints.filter(function(g){g.life-=dt*1.6;return g.life>0;});
  }
  function glint(x,y){glints.push({x:x,y:y,life:1,s:rnd(4,9)});}

  function master(){
    var reveal=hero?ease((t-.4)/2.4):1;
    var scroll=hero?clamp(window.scrollY/(H*.9),0,1):1;
    return {reveal:reveal,amp:hero?(1-scroll)+scroll*dim:dim};
  }
  function draw(){
    var m=master();ctx.clearRect(0,0,W,H);
    // soft lift behind the field, grows as the hero reveals
    if(hero){var g=ctx.createRadialGradient(W*.5,H*.42,0,W*.5,H*.42,Math.max(W,H)*.7);
      g.addColorStop(0,rgba(lineC,.07*m.reveal*m.amp));g.addColorStop(1,rgba(lineC,0));
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
    ctx.fillStyle=lineC;
    dust.forEach(function(p){ctx.globalAlpha=(.18+.18*Math.sin(t*1.3+p.ph))*m.amp*m.reveal;ctx.fillRect(p.x,p.y,p.s,p.s);});
    objs.forEach(function(o){
      var a=hero?ease((t-.4-o.delay)/1.6):1;
      var shimmer=.8+.2*Math.sin(t*.9+o.ph);
      var alpha=a*o.fade*shimmer*m.amp;if(alpha<=.01)return;
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(o.x,o.y);ctx.rotate(o.rot);
      var s=o.spr.width/dpr;ctx.drawImage(o.spr,-s/2,-s/2,s,s);ctx.restore();
    });
    var amp=Math.max(m.amp,.5);
    parts.forEach(function(b){var sp=digits[b.ch+(b.acc?'a':'l')];ctx.globalAlpha=.9*amp;ctx.drawImage(sp,b.x-sp.width/dpr/2,b.y-sp.height/dpr/2,sp.width/dpr,sp.height/dpr);});
    glints.forEach(function(g){
      ctx.globalAlpha=Math.sin(g.life*Math.PI)*.9*m.amp*m.reveal;ctx.strokeStyle=lineC;ctx.lineWidth=1;
      var s=g.s*g.life;ctx.beginPath();ctx.moveTo(g.x-s,g.y);ctx.lineTo(g.x+s,g.y);ctx.moveTo(g.x,g.y-s);ctx.lineTo(g.x,g.y+s);ctx.stroke();
    });
    ctx.globalAlpha=1;
  }
  function loop(now){
    if(!alive)return;
    var dt=Math.min(.05,(now-last)/1000||0);last=now;
    if(!document.hidden){step(dt);draw();}
    raf=requestAnimationFrame(loop);
  }

  function onMove(e){
    var r=canvas.getBoundingClientRect();
    ptr.x=e.clientX-r.left;ptr.y=e.clientY-r.top;ptr.on=(e.target===canvas||e.target===document.body||e.target===document.documentElement);
  }
  function onLeave(){ptr.on=false;}
  window.addEventListener('pointermove',onMove,{passive:true});
  window.addEventListener('pointerdown',onMove,{passive:true});
  document.addEventListener('pointerleave',onLeave);
  window.addEventListener('resize',resize);

  resize();build();
  if(reduced){t=10;draw();}
  else{last=performance.now();raf=requestAnimationFrame(loop);}

  return{
    stop:function(){alive=false;cancelAnimationFrame(raf);window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerdown',onMove);
      document.removeEventListener('pointerleave',onLeave);window.removeEventListener('resize',resize);},
    recolor:function(){colors();if(reduced)draw();}
  };
}
window.Drift={start:start};
})();
