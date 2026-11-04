/* Outline drawings of the tools and systems on the site.
   Each shape draws into a 100×100 box with the current stroke style; callers set color and width. */
(function(){
"use strict";
function rr(c,x,y,w,h,r){c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function ln(c,pts){c.moveTo(pts[0],pts[1]);for(var i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);}
function circ(c,x,y,r){c.moveTo(x+r,y);c.arc(x,y,r,0,6.2832);}

var S={
  lidar:{label:'LiDAR scanner',draw:function(c){
    rr(c,36,10,28,42,5);                       // scanner head
    circ(c,50,26,8);circ(c,50,26,3);           // rotating mirror
    ln(c,[40,44,60,44]);
    rr(c,30,52,40,6,2);                        // tribrach plate
    ln(c,[50,58,50,64]);
    ln(c,[50,64,24,96]);ln(c,[50,64,50,98]);ln(c,[50,64,76,96]); // tripod
    ln(c,[37,80,63,80]);
    ln(c,[64,22,90,14]);ln(c,[64,26,92,26]);ln(c,[64,30,90,38]); // scan rays
  }},
  drone:{label:'Drone',draw:function(c){
    rr(c,38,38,24,24,6);circ(c,50,50,4);
    ln(c,[40,40,22,22]);ln(c,[60,40,78,22]);ln(c,[40,60,22,78]);ln(c,[60,60,78,78]);
    [[20,20],[80,20],[20,80],[80,80]].forEach(function(p){circ(c,p[0],p[1],14);circ(c,p[0],p[1],2.5);});
    ln(c,[8,20,32,20]);ln(c,[68,80,92,80]);    // blades
    rr(c,45,62,10,8,2);                        // gimbal
  }},
  irgun:{label:'IR thermometer',draw:function(c){
    c.moveTo(14,30);c.lineTo(70,30);c.lineTo(76,34);c.lineTo(76,48);c.lineTo(70,52);c.lineTo(48,52);
    c.lineTo(44,86);c.lineTo(30,86);c.lineTo(32,52);c.lineTo(14,52);c.closePath();
    rr(c,18,34,18,12,2);                       // display
    c.moveTo(48,52);c.quadraticCurveTo(52,62,44,64); // trigger
    ln(c,[80,41,96,41]);c.moveTo(86,36);c.lineTo(96,41);c.lineTo(86,46);
    circ(c,62,41,4);
  }},
  hardhat:{label:'Hard hat',draw:function(c){
    c.moveTo(18,64);c.bezierCurveTo(18,30,82,30,82,64);c.closePath();
    ln(c,[8,64,92,64]);c.moveTo(8,64);c.quadraticCurveTo(8,72,18,72);c.lineTo(82,72);c.quadraticCurveTo(92,72,92,64);
    c.moveTo(42,34);c.lineTo(42,64);c.moveTo(58,34);c.lineTo(58,64);
    ln(c,[24,56,76,56]);
  }},
  cone:{label:'Safety cone',draw:function(c){
    c.moveTo(44,12);c.lineTo(56,12);c.lineTo(74,82);c.lineTo(26,82);c.closePath();
    ln(c,[38,36,62,36]);ln(c,[33,56,67,56]);
    rr(c,14,82,72,8,2);
  }},
  container:{label:'Shipping container',draw:function(c){
    c.moveTo(8,40);c.lineTo(62,40);c.lineTo(92,28);c.lineTo(38,28);c.closePath();
    c.moveTo(8,40);c.lineTo(8,78);c.lineTo(62,78);c.lineTo(62,40);
    c.moveTo(62,78);c.lineTo(92,66);c.lineTo(92,28);
    for(var x=16;x<60;x+=7.5){c.moveTo(x,44);c.lineTo(x,74);}
    c.moveTo(70,40);c.lineTo(70,72);c.moveTo(84,34);c.lineTo(84,66);
  }},
  cabinet:{label:'File cabinet',draw:function(c){
    rr(c,24,8,52,84,3);
    for(var i=0;i<3;i++){var y=14+i*26;rr(c,30,y,40,22,2);rr(c,42,y+12,16,4,2);rr(c,40,y+4,20,6,1);}
  }},
  foldertree:{label:'Folder tree',draw:function(c){
    function f(x,y,w,h){c.moveTo(x,y+4);c.lineTo(x,y+h);c.lineTo(x+w,y+h);c.lineTo(x+w,y+4);c.lineTo(x+w*.45,y+4);c.lineTo(x+w*.38,y);c.lineTo(x,y);c.closePath();}
    f(10,8,34,24);
    ln(c,[20,32,20,84]);ln(c,[20,48,48,48]);ln(c,[20,66,48,66]);ln(c,[20,84,48,84]);
    f(50,40,30,18);f(50,58,30,18);f(50,76,30,18);
  }},
  controller:{label:'Building controller',draw:function(c){
    rr(c,14,20,72,60,4);
    rr(c,24,30,30,16,2);                       // display
    for(var i=0;i<6;i++){c.moveTo(22+i*11,72);c.arc(19+i*11,72,3,0,6.2832);}
    circ(c,66,34,3);circ(c,76,34,3);circ(c,66,46,3);circ(c,76,46,3);
    ln(c,[24,56,76,56]);
    for(var j=0;j<6;j++){c.moveTo(19+j*11,80);c.lineTo(19+j*11,92);}
  }},
  shield:{label:'Cybersecurity',draw:function(c){
    c.moveTo(50,8);c.lineTo(84,20);c.bezierCurveTo(84,56,70,80,50,92);c.bezierCurveTo(30,80,16,56,16,20);c.closePath();
    rr(c,36,46,28,22,3);
    c.moveTo(42,46);c.lineTo(42,38);c.arc(50,38,8,Math.PI,0);c.lineTo(58,46);
    circ(c,50,55,3);ln(c,[50,58,50,63]);
  }},
  terminal:{label:'Code',draw:function(c){
    rr(c,8,16,84,68,4);ln(c,[8,28,92,28]);
    circ(c,15,22,2);circ(c,22,22,2);circ(c,29,22,2);
    ln(c,[18,42,28,50,18,58]);ln(c,[32,58,46,58]);
    ln(c,[56,40,50,62]);
    ln(c,[18,70,70,70]);
  }}
};

/* Render a shape into a sprite canvas: size px, stroke color, optional glow. */
function sprite(name,size,color,lw,glow){
  var cv=document.createElement('canvas'),pad=Math.ceil(size*.08);
  cv.width=cv.height=size+pad*2;
  var c=cv.getContext('2d'),k=size/100;
  c.translate(pad,pad);c.scale(k,k);
  c.lineJoin='round';c.lineCap='round';c.strokeStyle=color;c.lineWidth=(lw||1.6)/k;
  if(glow){c.shadowColor=color;c.shadowBlur=glow/k;}
  c.beginPath();(S[name]||S.terminal).draw(c);c.stroke();
  return cv;
}

/* Points along the outline (for breaking a shape into digits), in -0.5..0.5 box coords. */
var ptsCache={};
function points(name,n){
  var key=name+':'+n;if(ptsCache[key])return ptsCache[key];
  var size=96,cv=sprite(name,size,'#fff',2),c=cv.getContext('2d'),d=c.getImageData(0,0,cv.width,cv.height).data,all=[];
  for(var y=0;y<cv.height;y+=2)for(var x=0;x<cv.width;x+=2)if(d[(y*cv.width+x)*4+3]>120)all.push([x/cv.width-.5,y/cv.height-.5]);
  var out=[];for(var i=0;i<n&&all.length;i++)out.push(all[Math.floor(i*all.length/n)]);
  return(ptsCache[key]=out);
}

/* Draw a shape on a small canvas element (icons in cards and the field kit). */
function icon(canvas,name,color){
  var r=canvas.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1),w=r.width||96;
  canvas.width=canvas.height=w*d;
  var c=canvas.getContext('2d');c.setTransform(d*w/100,0,0,d*w/100,0,0);
  c.lineJoin='round';c.lineCap='round';c.strokeStyle=color;c.lineWidth=1.6*100/w;
  c.beginPath();(S[name]||S.terminal).draw(c);c.stroke();
}

window.Shapes={defs:S,names:Object.keys(S),sprite:sprite,points:points,icon:icon};
})();
