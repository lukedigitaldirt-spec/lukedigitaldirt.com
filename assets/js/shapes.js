/* 3D wireframe models of the tools and systems on the site.
   Each model is a list of line segments in model space (x right, y up, z toward the viewer),
   scaled to fit a unit sphere. render() projects one with perspective and depth shading. */
(function(){
"use strict";
var TAU=Math.PI*2;

/* ---- model builder ---- */
function G(){this.s=[];}
G.prototype={
  seg:function(a,b){this.s.push([a[0],a[1],a[2],b[0],b[1],b[2]]);return this;},
  poly:function(p,closed){for(var i=0;i<p.length-1;i++)this.seg(p[i],p[i+1]);if(closed)this.seg(p[p.length-1],p[0]);return this;},
  box:function(cx,cy,cz,w,h,d){
    var x=w/2,y=h/2,z=d/2,v=[];
    for(var i=0;i<8;i++)v.push([cx+(i&1?x:-x),cy+(i&2?y:-y),cz+(i&4?z:-z)]);
    [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]].forEach(function(e){this.seg(v[e[0]],v[e[1]]);},this);
    return this;},
  /* circle of radius r (or rx/rz ellipse) around an axis through (cx,cy,cz) */
  ring:function(cx,cy,cz,r,axis,n,r2,a0,a1){
    n=n||24;r2=r2==null?r:r2;a0=a0||0;a1=a1==null?TAU:a1;var p=[];
    for(var i=0;i<=n;i++){var a=a0+(a1-a0)*i/n,u=Math.cos(a)*r,w=Math.sin(a)*r2;
      p.push(axis==='x'?[cx,cy+u,cz+w]:axis==='z'?[cx+u,cy+w,cz]:[cx+u,cy,cz+w]);}
    return this.poly(p);},
  /* cylinder or frustum along an axis: rings at both ends plus side lines */
  cyl:function(cx,cy,cz,r,len,axis,sides,r2,n){
    r2=r2==null?r:r2;sides=sides||6;var h=len/2,o=function(t){return axis==='x'?[cx+t,cy,cz]:axis==='z'?[cx,cy,cz+t]:[cx,cy+t,cz];};
    var A=o(-h),B=o(h);this.ring(A[0],A[1],A[2],r,axis,n);this.ring(B[0],B[1],B[2],r2,axis,n);
    for(var i=0;i<sides;i++){var a=i/sides*TAU,u=Math.cos(a),w=Math.sin(a);
      var pa=axis==='x'?[A[0],A[1]+u*r,A[2]+w*r]:axis==='z'?[A[0]+u*r,A[1]+w*r,A[2]]:[A[0]+u*r,A[1],A[2]+w*r];
      var pb=axis==='x'?[B[0],B[1]+u*r2,B[2]+w*r2]:axis==='z'?[B[0]+u*r2,B[1]+w*r2,B[2]]:[B[0]+u*r2,B[1],B[2]+w*r2];
      this.seg(pa,pb);}
    return this;},
  mark:function(){return this.s.length;},
  /* rotate everything added since mark m around axis through pivot */
  turn:function(m,axis,ang,pv){
    var c=Math.cos(ang),s=Math.sin(ang);
    function r(x,y,z){x-=pv[0];y-=pv[1];z-=pv[2];var a,b;
      if(axis==='z'){a=x*c-y*s;b=x*s+y*c;x=a;y=b;}else if(axis==='y'){a=x*c+z*s;b=-x*s+z*c;x=a;z=b;}else{a=y*c-z*s;b=y*s+z*c;y=a;z=b;}
      return[x+pv[0],y+pv[1],z+pv[2]];}
    for(var i=m;i<this.s.length;i++){var q=this.s[i],A=r(q[0],q[1],q[2]),B=r(q[3],q[4],q[5]);this.s[i]=A.concat(B);}
    return this;}
};

var M={
  lidar:{label:'LiDAR scanner',build:function(g){
    g.box(0,.36,0,.46,.6,.42);                              // scanner head
    g.cyl(0,.44,.24,.13,.06,'z',8);g.ring(0,.44,.27,.06,'z',16); // rotating mirror
    g.poly([[-.14,.66,0],[-.14,.76,0],[.14,.76,0],[.14,.66,0]]);  // handle
    g.cyl(0,.03,0,.28,.06,'y',8,null,28);                  // tribrach
    g.seg([0,0,0],[0,-.12,0]);
    var hub=[0,-.12,0];
    [90,210,330].forEach(function(d){var a=d*Math.PI/180,f=[Math.cos(a)*.58,-1,Math.sin(a)*.58];
      g.seg(hub,f);g.seg([f[0]*.55,-.6,f[2]*.55],[0,-.6,0]);});
    g.seg([.02,.44,.3],[.85,.62,.62]);g.seg([.02,.44,.3],[.92,.42,.62]);g.seg([.02,.44,.3],[.85,.22,.62]); // scan rays
  }},
  drone:{label:'Drone',build:function(g){
    g.box(0,0,0,.42,.16,.62);g.box(0,.11,-.04,.26,.06,.36);
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(function(k){
      var ex=.7*k[0],ez=.7*k[1];
      g.seg([.16*k[0],.02,.22*k[1]],[ex,.02,ez]);g.seg([.16*k[0],-.03,.22*k[1]],[ex,-.03,ez]);
      g.cyl(ex,.04,ez,.07,.1,'y',6,null,14);
      g.ring(ex,.12,ez,.3,'y',30);
      var a=k[0]*k[1]*.6;g.seg([ex-Math.cos(a)*.28,.12,ez-Math.sin(a)*.28],[ex+Math.cos(a)*.28,.12,ez+Math.sin(a)*.28]);
    });
    g.box(0,-.15,.26,.13,.1,.12);g.cyl(0,-.15,.34,.04,.04,'z',4,null,12); // gimbal camera
    [-1,1].forEach(function(s){g.seg([.12*s,-.08,.16],[.22*s,-.34,.2]);g.seg([.12*s,-.08,-.16],[.22*s,-.34,-.2]);g.seg([.22*s,-.34,-.32],[.22*s,-.34,.32]);});
  }},
  irgun:{label:'IR thermometer',build:function(g){
    g.box(-.05,.28,0,1.15,.36,.32);                        // body
    g.cyl(.6,.28,0,.15,.12,'x',8,null,20);g.ring(.67,.28,0,.08,'x',16); // lens
    g.poly([[-.55,.18,.161],[-.25,.18,.161],[-.25,.38,.161],[-.55,.38,.161]],true); // display
    var m=g.mark();g.box(-.12,-.22,0,.26,.68,.28);g.turn(m,'z',-.28,[-.12,.1,0]); // grip
    g.poly([[.12,.1,0],[.2,-.06,0],[.1,-.12,0]]);          // trigger
    g.seg([.75,.28,0],[1.05,.28,0]);g.seg([.97,.33,0],[1.05,.28,0]);g.seg([.97,.23,0],[1.05,.28,0]); // beam
  }},
  hardhat:{label:'Hard hat',build:function(g){
    var R=.7,H=.8,y0=-.32;
    [0,.42,.82,1.18].forEach(function(f){g.ring(0,y0+Math.sin(f)*H,0,Math.cos(f)*R,'y',32);});
    for(var i=0;i<8;i++){var a=i/8*TAU,p=[];for(var j=0;j<=10;j++){var f=j/10*Math.PI/2;p.push([Math.cos(a)*Math.cos(f)*R,y0+Math.sin(f)*H,Math.sin(a)*Math.cos(f)*R]);}g.poly(p);}
    [-.07,.07].forEach(function(dx){var p=[];for(var j=0;j<=12;j++){var f=j/12*Math.PI;p.push([dx,y0+Math.sin(f)*H*1.07,Math.cos(f)*R*1.05]);}g.poly(p);}); // ridge
    var p=[];for(var k=0;k<=36;k++){var a=k/36*TAU;p.push([Math.cos(a)*.98,y0,Math.sin(a)*(Math.sin(a)>0?1.08:.86)]);}g.poly(p); // brim, longer at front
    p=[];for(k=0;k<=36;k++){a=k/36*TAU;p.push([Math.cos(a)*.98,y0-.05,Math.sin(a)*(Math.sin(a)>0?1.08:.86)]);}g.poly(p);
  }},
  cone:{label:'Safety cone',build:function(g){
    g.cyl(0,.05,0,.42,1.5,'y',10,.08,28);
    [.25,.12,-.18,-.31].forEach(function(y){g.ring(0,y,0,.08+(.42-.08)*(.8-y)/1.5,'y',28);}); // reflective bands
    g.box(0,-.76,0,1.12,.1,1.12);
  }},
  container:{label:'Shipping container',build:function(g){
    var L=1.9,Hh=.78,D=.78;g.box(0,0,0,L,Hh,D);
    for(var x=-L/2+.12;x<L/2-.05;x+=.13)g.seg([x,-Hh/2+.05,D/2],[x,Hh/2-.05,D/2]); // corrugation
    g.seg([L/2,-Hh/2,0],[L/2,Hh/2,0]);                     // doors
    [-.22,-.08,.08,.22].forEach(function(z){g.seg([L/2+.02,-Hh/2+.06,z],[L/2+.02,Hh/2-.06,z]);});
    g.seg([-L/2,Hh/2-.08,D/2],[L/2,Hh/2-.08,D/2]);g.seg([-L/2,-Hh/2+.08,D/2],[L/2,-Hh/2+.08,D/2]);
  }},
  cabinet:{label:'File cabinet',build:function(g){
    var W=.78,H=1.7,D=.72,f=D/2;g.box(0,0,0,W,H,D);
    for(var i=0;i<4;i++){var y=H/2-.24-i*.4;
      if(i===1){g.box(0,y,f+.2,W-.08,.34,.4);g.box(0,y+.02,f+.2,W-.16,.26,.36);g.poly([[-.1,y-.02,f+.41],[.1,y-.02,f+.41]]);} // drawer pulled out
      else{g.poly([[-W/2+.05,y-.17,f],[W/2-.05,y-.17,f],[W/2-.05,y+.17,f],[-W/2+.05,y+.17,f]],true);
        g.poly([[-.1,y-.05,f+.02],[.1,y-.05,f+.02]]);g.poly([[-.08,y+.06,f],[.08,y+.06,f],[.08,y+.12,f],[-.08,y+.12,f]],true);}
    }
  }},
  foldertree:{label:'Folder tree',build:function(g){
    function folder(x,y,z,w,h){g.box(x,y,z,w,h,.08);g.poly([[x-w/2,y+h/2,z+.04],[x-w/2,y+h/2+.08,z+.04],[x-w/2+w*.4,y+h/2+.08,z+.04],[x-w/2+w*.48,y+h/2,z+.04]]);}
    folder(-.42,.6,0,.62,.4);
    var kids=[.06,-.38,-.82];
    g.seg([-.6,.4,0],[-.6,kids[2],0]);
    kids.forEach(function(y,i){g.seg([-.6,y,0],[-.08,y,0]);folder(.28,y,-.12*i,.66,.32);});
  }},
  controller:{label:'Building controller',build:function(g){
    g.box(0,.12,0,1.3,.95,.28);g.box(0,.12,-.2,1.55,.1,.12); // controller on DIN rail
    g.poly([[-.5,.3,.14],[.05,.3,.14],[.05,.5,.14],[-.5,.5,.14]],true); // display
    [[.3,.45],[.47,.45],[.3,.28],[.47,.28]].forEach(function(p){g.ring(p[0],p[1],.15,.05,'z',12);});
    g.seg([-.55,.06,.14],[.55,.06,.14]);
    for(var i=0;i<7;i++){var x=-.48+i*.16;g.ring(x,-.18,.15,.04,'z',10);g.seg([x,-.35,.1],[x+(i-3)*.03,-.95,.25-.06*(i%3)]);} // terminals + wires
  }},
  shield:{label:'Cybersecurity',build:function(g){
    var outline=[],i,t;
    for(i=0;i<=12;i++){t=i/12;outline.push([-.7+1.4*t,.7+.12*(1-Math.abs(2*t-1))]);}      // top edge, peaked
    for(i=1;i<=14;i++){t=i/14;outline.push([.7*(1-t*t),.7-1.7*t]);}                      // right side to the point
    for(i=13;i>=1;i--){t=i/14;outline.push([-.7*(1-t*t),.7-1.7*t]);}                     // left side back up
    [-.08,.08].forEach(function(z){g.poly(outline.map(function(p){return[p[0],p[1],z];}),true);});
    for(i=0;i<outline.length;i+=5)g.seg([outline[i][0],outline[i][1],-.08],[outline[i][0],outline[i][1],.08]);
    g.box(0,-.08,.14,.42,.34,.1);                           // padlock
    g.ring(0,.12,.14,.14,'z',16,null,0,Math.PI);g.seg([.14,.12,.14],[.14,.09,.14]);g.seg([-.14,.12,.14],[-.14,.09,.14]);
    g.ring(0,-.04,.2,.04,'z',10);g.seg([0,-.08,.2],[0,-.16,.2]);
  }},
  terminal:{label:'Code',build:function(g){
    g.box(.22,.28,-.35,1.3,.9,.06);                         // window behind
    g.box(0,0,0,1.6,1.1,.08);var f=.04;
    g.seg([-.8,.4,f],[.8,.4,f]);
    [-.7,-.6,-.5].forEach(function(x){g.ring(x,.47,f,.025,'z',8);});
    g.poly([[-.6,.18,f],[-.42,.04,f],[-.6,-.1,f]]);g.seg([-.34,-.1,f],[-.1,-.1,f]);
    g.seg([.12,.2,f],[0,-.16,f]);
    g.seg([-.6,-.3,f],[.45,-.3,f]);g.seg([-.6,-.42,f],[.2,-.42,f]);
  }}
};

/* build each model once and scale it into a unit sphere */
var models={};
function model(name){
  if(models[name])return models[name];
  var g=new G();(M[name]||M.terminal).build(g);
  var r=0;g.s.forEach(function(q){r=Math.max(r,Math.hypot(q[0],q[1],q[2]),Math.hypot(q[3],q[4],q[5]));});
  var f=new Float32Array(g.s.length*6);g.s.forEach(function(q,i){for(var k=0;k<6;k++)f[i*6+k]=q[k]/r;});
  return(models[name]=f);
}

/* rotation matrix from three angles */
function mat(a,b,c){
  var ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b),cc=Math.cos(c),sc=Math.sin(c);
  return[cb*cc,-cb*sc,sb, sa*sb*cc+ca*sc,-sa*sb*sc+ca*cc,-sa*cb, -ca*sb*cc+sa*sc,ca*sb*sc+sa*cc,ca*cb];
}

/* Draw a model centred at (cx,cy) with screen radius R.
   o: {color, hot (highlight color), alpha, lw, sweep (-1..1 position of a moving highlight, or null)} */
var BANDS=5,bx=[];for(var b=0;b<=BANDS;b++)bx.push([]);
function render(ctx,name,cx,cy,R,m,o){
  var s=model(name),D=4.2,alpha=o.alpha==null?1:o.alpha,lw=o.lw||1.4,sw=o.sweep;
  for(var k=0;k<=BANDS;k++)bx[k].length=0;
  for(var i=0;i<s.length;i+=6){
    var x1=s[i],y1=s[i+1],z1=s[i+2],x2=s[i+3],y2=s[i+4],z2=s[i+5];
    var X1=m[0]*x1+m[1]*y1+m[2]*z1,Y1=m[3]*x1+m[4]*y1+m[5]*z1,Z1=m[6]*x1+m[7]*y1+m[8]*z1;
    var X2=m[0]*x2+m[1]*y2+m[2]*z2,Y2=m[3]*x2+m[4]*y2+m[5]*z2,Z2=m[6]*x2+m[7]*y2+m[8]*z2;
    var p1=D/(D-Z1)*R*.86,p2=D/(D-Z2)*R*.86;
    var z=(Z1+Z2)/2,band=Math.max(0,Math.min(BANDS-1,Math.floor((z+1)/2*BANDS)));
    if(sw!=null&&Math.abs((X1+X2)*.35-(Y1+Y2)*.35-sw)<.09)band=BANDS;
    bx[band].push(cx+X1*p1,cy-Y1*p1,cx+X2*p2,cy-Y2*p2);
  }
  ctx.lineCap='round';ctx.lineJoin='round';
  for(var bi=0;bi<=BANDS;bi++){
    var L=bx[bi];if(!L.length)continue;
    var hot=bi===BANDS,d=hot?1:bi/(BANDS-1);
    ctx.beginPath();for(var j=0;j<L.length;j+=4){ctx.moveTo(L[j],L[j+1]);ctx.lineTo(L[j+2],L[j+3]);}
    if(d>.7||hot){ctx.globalAlpha=alpha*(hot?.22:.1);ctx.strokeStyle=hot?(o.hot||o.color):o.color;ctx.lineWidth=lw*(hot?4:3.2);ctx.stroke();} // glow on near edges
    ctx.globalAlpha=alpha*(hot?1:.28+.72*d*d);ctx.strokeStyle=hot?(o.hot||o.color):o.color;ctx.lineWidth=lw*(hot?1.25:.55+.75*d);ctx.stroke();
  }
  ctx.globalAlpha=1;
}

/* Points along the model's edges in model space (for breaking it into digits). */
var ptsCache={};
function points(name,n){
  var key=name+':'+n;if(ptsCache[key])return ptsCache[key];
  var s=model(name),len=[],tot=0,out=[];
  for(var i=0;i<s.length;i+=6){var l=Math.hypot(s[i+3]-s[i],s[i+4]-s[i+1],s[i+5]-s[i+2]);len.push(l);tot+=l;}
  var step=tot/n,acc=step/2,si=0,run=0;
  for(var c=0;c<n;c++){var target=acc+c*step;
    while(si<len.length-1&&run+len[si]<target){run+=len[si];si++;}
    var t=len[si]?(target-run)/len[si]:0,q=si*6;
    out.push([s[q]+(s[q+3]-s[q])*t,s[q+1]+(s[q+4]-s[q+1])*t,s[q+2]+(s[q+5]-s[q+2])*t]);}
  return(ptsCache[key]=out);
}
function project(p,m,cx,cy,R){
  var X=m[0]*p[0]+m[1]*p[1]+m[2]*p[2],Y=m[3]*p[0]+m[4]*p[1]+m[5]*p[2],Z=m[6]*p[0]+m[7]*p[1]+m[8]*p[2],k=4.2/(4.2-Z)*R*.86;
  return[cx+X*k,cy-Y*k,Z];
}

/* Icons on the page: a slow turntable, faster while hovered. Admin previews pass {still:true}. */
var spinning=[],spinRaf=0,lastT=0,reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function paint(it){
  var c=it.cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,it.cv.width,it.cv.height);
  c.setTransform(it.d,0,0,it.d,0,0);
  render(c,it.name,it.w/2,it.w/2,it.w*.47,mat(-.42,it.yaw,0),{color:it.color,lw:Math.max(1,it.w/80),alpha:1});
}
function tick(now){
  var dt=Math.min(.05,(now-lastT)/1000||0);lastT=now;
  spinning=spinning.filter(function(it){return it.cv.isConnected;});
  spinning.forEach(function(it){var r=it.cv.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
    it.yaw+=dt*(it.cv.matches(':hover')||(it.cv.parentElement&&it.cv.parentElement.matches(':hover'))?1.6:.35);paint(it);});
  spinRaf=spinning.length?requestAnimationFrame(tick):0;
}
function icon(canvas,name,color,opt){
  opt=opt||{};
  var r=canvas.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1),w=r.width||96;
  canvas.width=canvas.height=Math.round(w*d);
  spinning=spinning.filter(function(it){return it.cv!==canvas;});
  var it={cv:canvas,name:name,color:color,w:w,d:d,yaw:.7+Math.random()*.4};
  paint(it);
  if(!opt.still&&!reduced){spinning.push(it);if(!spinRaf){lastT=performance.now();spinRaf=requestAnimationFrame(tick);}}
}

var defs={};Object.keys(M).forEach(function(k){defs[k]={label:M[k].label};});
window.Shapes={defs:defs,names:Object.keys(M),render:render,points:points,project:project,mat:mat,icon:icon};
})();
