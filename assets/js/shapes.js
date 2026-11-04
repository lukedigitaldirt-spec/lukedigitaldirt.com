/* 3D wireframe models of the tools and systems on the site.
   Each model is a list of line segments in model space (x right, y up, z toward the viewer),
   scaled to fit a unit sphere. render() projects one with perspective and depth shading. */
(function(){
"use strict";
var TAU=Math.PI*2;

/* ---- model builder ---- */
function G(){this.s=[];this.paths=[];this.spots={};}
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
  /* any six-faced solid from 8 corners, ordered like box(): bit 1 = +x, bit 2 = +y, bit 4 = +z */
  hexa:function(v){[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]].forEach(function(e){this.seg(v[e[0]],v[e[1]]);},this);return this;},
  /* square tube between two points: reads as a solid member instead of a single line */
  tube:function(a,b,r){
    var d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(d[0],d[1],d[2]);d=[d[0]/L,d[1]/L,d[2]/L];
    var up=Math.abs(d[1])<.9?[0,1,0]:[1,0,0],u=[d[1]*up[2]-d[2]*up[1],d[2]*up[0]-d[0]*up[2],d[0]*up[1]-d[1]*up[0]],ul=Math.hypot(u[0],u[1],u[2]);
    u=[u[0]/ul,u[1]/ul,u[2]/ul];var v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]],A=[],B=[];
    [[1,1],[1,-1],[-1,-1],[-1,1]].forEach(function(k){var o=[(u[0]*k[0]+v[0]*k[1])*r,(u[1]*k[0]+v[1]*k[1])*r,(u[2]*k[0]+v[2]*k[1])*r];
      A.push([a[0]+o[0],a[1]+o[1],a[2]+o[2]]);B.push([b[0]+o[0],b[1]+o[1],b[2]+o[2]]);});
    for(var i=0;i<4;i++)this.seg(A[i],B[i]);this.poly(A,true);this.poly(B,true);return this;},
  /* a circuit trace: drawn, and kept so signal pulses can run along it */
  trace:function(p){this.poly(p);this.paths.push(p);return this;},
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
    g.box(0,.42,0,.44,.3,.38);                              // instrument body
    g.box(-.18,.69,0,.08,.26,.32);g.box(.18,.69,0,.08,.26,.32); // yokes
    g.cyl(0,.69,0,.12,.28,'x',10,null,22);                  // spinning mirror drum
    g.seg([-.14,.6,-.06],[-.14,.78,.06]);g.seg([.14,.6,-.06],[.14,.78,.06]);g.seg([-.14,.78,.06],[.14,.78,.06]);g.seg([-.14,.6,-.06],[.14,.6,-.06]); // mirror face
    g.tube([-.18,.82,0],[-.18,.93,0],.022);g.tube([.18,.82,0],[.18,.93,0],.022);g.tube([-.18,.93,0],[.18,.93,0],.022); // handle
    g.poly([[-.15,.33,-.191],[.15,.33,-.191],[.15,.5,-.191],[-.15,.5,-.191]],true); // touch screen
    g.ring(.14,.47,.191,.025,'z',10);g.ring(.14,.39,.191,.025,'z',10);
    g.cyl(0,.24,0,.2,.06,'y',8,null,24);                    // rotation base
    g.cyl(0,.17,0,.25,.06,'y',6,null,24);                   // tribrach
    [0,2.09,4.19].forEach(function(a){g.cyl(Math.cos(a)*.27,.13,Math.sin(a)*.27,.035,.06,'y',4,null,10);}); // levelling screws
    g.cyl(0,.09,0,.12,.08,'y',6,null,18);                   // tripod head
    g.tube([0,.05,0],[0,-.55,0],.025);                      // centre column
    [90,210,330].forEach(function(d){var a=d*Math.PI/180,top=[Math.cos(a)*.11,.05,Math.sin(a)*.11],foot=[Math.cos(a)*.62,-1,Math.sin(a)*.62];
      g.tube(top,foot,.028);
      var k=.62,mid=[top[0]+(foot[0]-top[0])*k,top[1]+(foot[1]-top[1])*k,top[2]+(foot[2]-top[2])*k];
      g.tube(mid,[0,-.55,0],.014);
      g.seg(foot,[foot[0]*1.08,-1.04,foot[2]*1.08]);});
    g.spots.head=[0,.69,0];
  },fx:function(c,P,o,sp){
    var h=sp.head,t=o.t,n,i,k,p,q;
    // scanning waves: rings spreading out level with the mirror
    for(k=0;k<3;k++){var f=((t*.35)+k/3)%1,r=.25+f*1.5;c.globalAlpha=o.alpha*(1-f)*.55;c.strokeStyle=o.color;c.lineWidth=o.lw*.8;c.beginPath();
      for(i=0;i<=48;i++){var a=i/48*TAU;p=P(h[0]+Math.cos(a)*r,h[1]+(1-f)*.02,h[2]+Math.sin(a)*r);i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]);}c.stroke();}
    // laser fan sweeping round as the head turns and the mirror spins
    var head=t*.7;c.strokeStyle=o.hot;
    for(n=0;n<7;n++){var ph=(t*4+n*.42)%TAU-Math.PI/2,L=1.25,dx=Math.cos(head)*Math.cos(ph),dy=Math.sin(ph),dz=Math.sin(head)*Math.cos(ph);
      p=P(h[0],h[1],h[2]);q=P(h[0]+dx*L,h[1]+dy*L,h[2]+dz*L);
      c.globalAlpha=o.alpha*(.12+.25*(n/6));c.lineWidth=o.lw*.7;c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);c.stroke();
      c.globalAlpha=o.alpha*.9;c.fillStyle=o.hot;c.fillRect(q[0]-1,q[1]-1,2,2);}
    // point cloud the beam has already captured
    c.fillStyle=o.color;
    for(i=0;i<60;i++){var a2=head-i*.05,e=Math.sin(i*12.9898)*1.2;p=P(h[0]+Math.cos(a2)*1.25*Math.cos(e),h[1]+Math.sin(e)*1.25,h[2]+Math.sin(a2)*1.25*Math.cos(e));
      c.globalAlpha=o.alpha*(1-i/60)*.7;c.fillRect(p[0]-.75,p[1]-.75,1.5,1.5);}
  }},
  drone:{label:'Drone',build:function(g){
    // tapered body: narrow nose (+z), wider back
    g.hexa([[-.13,-.08,-.34],[.13,-.08,-.34],[-.1,.07,-.3],[.1,.07,-.3],[-.1,-.08,.32],[.1,-.08,.32],[-.08,.05,.28],[.08,.05,.28]]);
    g.hexa([[-.08,.07,-.22],[.08,.07,-.22],[-.06,.11,-.18],[.06,.11,-.18],[-.07,.07,.18],[.07,.07,.18],[-.05,.1,.14],[.05,.1,.14]]); // top shell
    g.poly([[-.08,-.02,.321],[-.03,-.02,.321],[-.03,.02,.31],[-.08,.02,.31]],true);g.poly([[.03,-.02,.321],[.08,-.02,.321],[.08,.02,.31],[.03,.02,.31]],true); // vision sensors
    var motors=[[.5,.05,.42],[-.5,.05,.42],[.5,-.03,-.44],[-.5,-.03,-.44]];
    [[.1,.0,.2],[-.1,.0,.2],[.12,-.03,-.22],[-.12,-.03,-.22]].forEach(function(a,i){var m=motors[i];
      g.tube(a,[m[0],m[1]-.02,m[2]],.026);
      g.cyl(m[0],m[1],m[2],.055,.08,'y',8,null,16);g.cyl(m[0],m[1]+.055,m[2],.02,.03,'y',4,null,8);
      g.seg([m[0],m[1]-.04,m[2]],[m[0],m[1]-.16,m[2]]);});      // landing feet
    g.cyl(0,-.12,.3,.035,.06,'y',4,null,10);                 // gimbal mount
    g.box(0,-.17,.33,.12,.08,.1);g.cyl(0,-.17,.39,.04,.03,'z',6,null,14);g.ring(0,-.17,.405,.02,'z',10); // camera
    g.box(0,.0,-.38,.16,.1,.06);                             // battery release
    g.spots.motors=motors.map(function(m){return[m[0],m[1]+.075,m[2]];});
  },fx:function(c,P,o,sp){
    // two-blade props spinning on every motor
    c.strokeStyle=o.color;
    sp.motors.forEach(function(m,i){
      var a=o.t*8*(i%2?1:-1)+i,L=.3,w=.035;
      c.globalAlpha=o.alpha*.16;c.lineWidth=o.lw*.6;c.beginPath();
      for(var j=0;j<=28;j++){var b=j/28*TAU,p=P(m[0]+Math.cos(b)*L,m[1],m[2]+Math.sin(b)*L);j?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]);}c.stroke();
      c.globalAlpha=o.alpha*.85;c.lineWidth=o.lw;c.beginPath();
      [0,Math.PI].forEach(function(off){var ca=Math.cos(a+off),sa=Math.sin(a+off),
        q=[[0,-w*.4],[L*.45,-w],[L,-w*.3],[L,w*.3],[L*.45,w*.6],[0,w*.4]].map(function(v){return P(m[0]+ca*v[0]-sa*v[1],m[1],m[2]+sa*v[0]+ca*v[1]);});
        c.moveTo(q[0][0],q[0][1]);for(var k=1;k<q.length;k++)c.lineTo(q[k][0],q[k][1]);c.closePath();});
      c.stroke();});
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
  controller:{label:'Logic control board',build:function(g){
    var T=.03;
    g.box(0,0,0,1.7,.06,1.2);                                 // PCB
    [[-.78,-.53],[.78,-.53],[-.78,.53],[.78,.53]].forEach(function(p){g.ring(p[0],T,p[1],.035,'y',12);}); // mounting holes
    // processor with gull-wing pins on all four sides
    g.box(-.2,.065,-.02,.42,.07,.42);g.ring(-.34,.101,-.16,.025,'y',8);
    for(var i=0;i<9;i++){var u=-.39+i*.0475;
      g.seg([u,.04,-.23],[u,T,-.27]);g.seg([u,.04,.19],[u,T,.23]);
      g.seg([-.41,.04,u+.17],[-.45,T,u+.17]);g.seg([.01,.04,u+.17],[.05,T,u+.17]);}
    // memory and driver chips
    [[.42,-.28],[.42,.12]].forEach(function(c){g.box(c[0],.055,c[1],.3,.05,.16);
      for(var j=0;j<6;j++){var x=c[0]-.12+j*.048;g.seg([x,.04,c[1]-.08],[x,T,c[1]-.11]);g.seg([x,.04,c[1]+.08],[x,T,c[1]+.11]);}});
    // relays and capacitors
    g.box(-.62,.1,-.12,.2,.14,.24);g.box(-.62,.1,.2,.2,.14,.24);
    [[.05,.38],[.17,.38],[.72,.4],[-.62,-.42]].forEach(function(p){g.cyl(p[0],.1,p[1],.045,.14,'y',6,null,14);g.ring(p[0],.17,p[1],.02,'y',8);});
    // screw terminal block along the back edge
    g.box(0,.1,-.5,1.1,.14,.14);
    for(var k=0;k<8;k++){var x=-.48+k*.137;g.ring(x,.171,-.5,.035,'y',10);g.seg([x-.025,.171,-.5],[x+.025,.171,-.5]);
      g.poly([[x-.03,.06,-.431],[x+.03,.06,-.431],[x+.03,.12,-.431],[x-.03,.12,-.431]],true);}
    // pin header
    g.box(-.15,.055,.5,.5,.05,.06);for(k=0;k<10;k++){x=-.38+k*.05;g.seg([x,.08,.5],[x,.17,.5]);}
    // copper traces
    var y=T+.002;
    g.trace([[-.45,y,.0],[-.55,y,.0],[-.55,y,-.12]]);
    g.trace([[-.45,y,.14],[-.52,y,.14],[-.52,y,.2]]);
    g.trace([[.05,y,-.1],[.27,y,-.1],[.27,y,-.28]]);
    g.trace([[.05,y,.1],[.2,y,.1],[.2,y,.12],[.27,y,.12]]);
    g.trace([[-.3,y,.23],[-.3,y,.36],[.05,y,.36]]);
    g.trace([[-.1,y,.23],[-.1,y,.3],[.17,y,.3],[.17,y,.33]]);
    g.trace([[-.25,y,-.27],[-.25,y,-.36],[-.2,y,-.43]]);
    g.trace([[-.05,y,-.27],[-.05,y,-.33],[.2,y,-.33],[.2,y,-.43]]);
    g.trace([[.57,y,-.28],[.66,y,-.28],[.66,y,-.43]]);
    g.trace([[.57,y,.12],[.72,y,.12],[.72,y,.35]]);
    g.trace([[-.2,y,.23],[-.2,y,.42],[-.3,y,.47]]);
    g.spots.leds=[[.7,.05,-.15],[.76,.05,-.15],[.82,.05,-.15]];
    g.spots.leds.forEach(function(p){g.box(p[0],p[1],p[2],.035,.03,.05);});
  },fx:function(c,P,o,sp,paths){
    // signal pulses running along the traces
    c.fillStyle=o.hot;
    paths.forEach(function(path,i){
      var L=[],tot=0;for(var j=1;j<path.length;j++){var l=Math.hypot(path[j][0]-path[j-1][0],path[j][2]-path[j-1][2]);L.push(l);tot+=l;}
      for(var tail=0;tail<4;tail++){
        var d=(((o.t*.35+i*.29)%1.4)-tail*.02)*tot;if(d<0||d>tot)continue;
        for(j=0;j<L.length&&d>L[j];j++)d-=L[j];if(j>=L.length)continue;
        var a=path[j],b=path[j+1],f=d/L[j],p=P(a[0]+(b[0]-a[0])*f,a[1],a[2]+(b[2]-a[2])*f),s=tail?1.2:2.2;
        c.globalAlpha=o.alpha*(1-tail*.25);c.fillRect(p[0]-s/2,p[1]-s/2,s,s);}
    });
    // status LEDs blinking in sequence
    sp.leds.forEach(function(q,i){var on=Math.sin(o.t*3-i*1.3)>.3,p=P(q[0],q[1]+.02,q[2]);
      c.globalAlpha=o.alpha*(on?.95:.15);c.fillRect(p[0]-1.5,p[1]-1.5,3,3);});
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
    g.box(.24,.3,-.38,1.3,.92,.06);                           // window behind
    g.seg([-.41,.62,-.35],[.89,.62,-.35]);
    g.box(0,0,0,1.6,1.1,.08);var f=.04;
    g.seg([-.8,.42,f],[.8,.42,f]);g.seg([-.62,.42,f],[-.62,-.55,f]);  // title bar, line-number gutter
    [-.74,-.67,-.6].forEach(function(x){g.ring(x,.485,f,.022,'z',8);});
    g.poly([[.4,.46,f],[.7,.46,f],[.7,.5,f],[.4,.5,f]],true);   // tab
    g.spots.face=[[-.6,.36,f+.002],[.74,.36,f+.002],[-.6,-.46,f+.002]];
  },fx:function(c,P,o,sp){
    var F=sp.face,O=P(F[0][0],F[0][1],F[0][2]),X=P(F[1][0],F[1][1],F[1][2]),Y=P(F[2][0],F[2][1],F[2][2]);
    var W=150,Hh=96,a=(X[0]-O[0])/W,b=(X[1]-O[1])/W,cc=(Y[0]-O[0])/Hh,d=(Y[1]-O[1])/Hh;
    if(a*d-b*cc<=0)return;                                    // facing away: no text
    c.save();c.transform(a,b,cc,d,O[0],O[1]);
    c.beginPath();c.rect(0,0,W,Hh);c.clip();
    c.font='500 6.4px "JetBrains Mono",ui-monospace,monospace';c.textBaseline='top';
    var lh=8.6,n=CODE.length,scroll=(o.t*5)%(n*lh);
    for(var i=0;i<n*2;i++){var y=i*lh-scroll+3;if(y<-lh||y>Hh)continue;var ln=CODE[i%n],cm=/^\s*#/.test(ln);
      c.globalAlpha=o.alpha*.45;c.fillStyle=o.color;c.fillText(String(i%n+1),2-(i%n+1>9?3:0),y);
      c.globalAlpha=o.alpha*(cm?.5:.95);c.fillStyle=cm?o.color:o.hot;c.fillText(ln,16,y);}
    var cy=Math.floor((scroll+Hh*.6)/lh),ly=cy*lh-scroll+3;
    if(Math.sin(o.t*6)>0){c.globalAlpha=o.alpha;c.fillStyle=o.hot;c.fillRect(16+CODE[cy%n].length*3.85,ly,3.4,6.6);}
    c.restore();
  }}
};

var CODE=[
  "def file_record(doc):",
  "    name = standard_name(doc)",
  "    if not name.valid:",
  "        return flag(doc, 'rename')",
  "    # human in the loop",
  "    ok = await review(doc, name)",
  "    if ok:",
  "        ledger.add(name, src=doc.path)",
  "    return ok",
  "",
  "async def watch_bids(feed):",
  "    for bid in feed.new():",
  "        score = rank(bid, trades=MEP)",
  "        if score > 0.8:",
  "            notify('precon', bid)",
  "",
  "def scan_to_model(cloud):",
  "    pts = cloud.filter(noise=0.02)",
  "    walls = fit_planes(pts)",
  "    return compare(walls, model)"
];

/* build each model once and scale it into a unit sphere */
var models={};
function model(name){
  if(models[name])return models[name];
  var g=new G();(M[name]||M.terminal).build(g);
  var r=0;g.s.forEach(function(q){r=Math.max(r,Math.hypot(q[0],q[1],q[2]),Math.hypot(q[3],q[4],q[5]));});
  var f=new Float32Array(g.s.length*6);g.s.forEach(function(q,i){for(var k=0;k<6;k++)f[i*6+k]=q[k]/r;});
  f.k=1/r;f.spots=g.spots;f.paths=g.paths;
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
  if(o.aura){                                               // soft neon glow behind the whole object
    ctx.beginPath();for(var g2=0;g2<=BANDS;g2++){var A=bx[g2];for(var j2=0;j2<A.length;j2+=4){ctx.moveTo(A[j2],A[j2+1]);ctx.lineTo(A[j2+2],A[j2+3]);}}
    ctx.save();ctx.strokeStyle=o.aura;ctx.shadowColor=o.aura;ctx.shadowBlur=R*.18;
    ctx.globalAlpha=Math.min(1,alpha*.45);ctx.lineWidth=lw*1.8;ctx.stroke();ctx.restore();
  }
  for(var bi=0;bi<=BANDS;bi++){
    var L=bx[bi];if(!L.length)continue;
    var hot=bi===BANDS,d=hot?1:bi/(BANDS-1);
    ctx.beginPath();for(var j=0;j<L.length;j+=4){ctx.moveTo(L[j],L[j+1]);ctx.lineTo(L[j+2],L[j+3]);}
    if(d>.7||hot){ctx.globalAlpha=alpha*(hot?.22:.1);ctx.strokeStyle=hot?(o.hot||o.color):o.color;ctx.lineWidth=lw*(hot?4:3.2);ctx.stroke();} // glow on near edges
    ctx.globalAlpha=alpha*(hot?1:.28+.72*d*d);ctx.strokeStyle=hot?(o.hot||o.color):o.color;ctx.lineWidth=lw*(hot?1.25:.55+.75*d);ctx.stroke();
  }
  var def=M[name];
  if(def&&def.fx&&o.t!=null){
    var k=s.k,P=function(x,y,z){x*=k;y*=k;z*=k;var X=m[0]*x+m[1]*y+m[2]*z,Y=m[3]*x+m[4]*y+m[5]*z,Z=m[6]*x+m[7]*y+m[8]*z,q=D/(D-Z)*R*.86;return[cx+X*q,cy-Y*q,Z];};
    ctx.save();def.fx(ctx,P,{t:o.t*.3,alpha:alpha,color:o.color,hot:o.hot||o.color,lw:lw},s.spots,s.paths);ctx.restore();
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
  render(c,it.name,it.w/2,it.w/2,it.w*.47,mat(-.42,it.yaw,0),{color:it.color,lw:Math.max(1,it.w/80),alpha:1,t:it.still?1.3:performance.now()/1000});
}
function tick(now){
  var dt=Math.min(.05,(now-lastT)/1000||0);lastT=now;
  spinning=spinning.filter(function(it){return it.cv.isConnected;});
  spinning.forEach(function(it){var r=it.cv.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return;
    it.yaw+=dt*(it.cv.matches(':hover')||(it.cv.parentElement&&it.cv.parentElement.matches(':hover'))?.5:.12);paint(it);});
  spinRaf=spinning.length?requestAnimationFrame(tick):0;
}
function icon(canvas,name,color,opt){
  opt=opt||{};
  var r=canvas.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1),w=r.width||96;
  canvas.width=canvas.height=Math.round(w*d);
  spinning=spinning.filter(function(it){return it.cv!==canvas;});
  var it={cv:canvas,name:name,color:color,w:w,d:d,yaw:.7+Math.random()*.4,still:!!opt.still||reduced};
  paint(it);
  if(!opt.still&&!reduced){spinning.push(it);if(!spinRaf){lastT=performance.now();spinRaf=requestAnimationFrame(tick);}}
}

var defs={};Object.keys(M).forEach(function(k){defs[k]={label:M[k].label};});
window.Shapes={defs:defs,names:Object.keys(M),render:render,points:points,project:project,mat:mat,icon:icon};
})();
