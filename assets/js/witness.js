/* Witness gate: agent-to-agent transactions queue at a human gate.
   Witness → the item passes into the record. Reject → it is struck and drops out. */
(function(){
"use strict";
function rgb(name){var h=getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace('#','');
  if(h.length===3)h=h.split('').map(function(c){return c+c;}).join('');var n=parseInt(h.slice(0,6),16)||0;return (n>>16&255)+','+(n>>8&255)+','+(n&255);}
var ITEMS=['RFI-014','SUB 08 71 00','CO #07','T&M 2231','PAY APP 09','DAILY 10/28','BID LVL — MEP','LOOK-AHEAD','PERMIT REV B','INSP. HOLD L2'];
var AGENTS=[['estimating-agent','pm-agent'],['field-agent','pm-agent'],['minutes-agent','owner-rep'],['precon-agent','estimating-agent'],['closeout-agent','owner-rep']];

function init(root){
  var cv=root.querySelector('canvas'),head=root.querySelector('.wg-head'),ledger=root.querySelector('.ledger');
  var ctx=cv.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W=0,H=0,dpr=Math.min(2,window.devicePixelRatio||1),queue=[],moving=[],n=0,spawnT=0;
  var INK=rgb('--ink'),ACC=rgb('--accent'),LINE=rgb('--line'),MUT=rgb('--muted');

  function size(){var r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
  size();window.addEventListener('resize',size);
  function newTx(){var a=AGENTS[n%AGENTS.length];return{id:ITEMS[n++%ITEMS.length],from:a[0],to:a[1],x:40,y:H/2};}
  function render(){head.textContent=queue.length?queue[0].id+'  ·  '+queue[0].from+' → '+queue[0].to:'Queue empty';}
  function log(tx,ok){
    var t=new Date(),ts=[t.getHours(),t.getMinutes(),t.getSeconds()].map(function(v){return('0'+v).slice(-2);}).join(':');
    var d=document.createElement('div');d.className=ok?'ok':'no';
    d.textContent=ts+'  '+tx.id+'  '+(ok?'WITNESSED → RECORD':'REJECTED AT GATE');
    ledger.prepend(d);while(ledger.children.length>30)ledger.lastChild.remove();
  }
  function decide(ok){var tx=queue.shift();if(!tx)return;tx.state=ok?'pass':'die';tx.life=1;moving.push(tx);log(tx,ok);render();}
  root.querySelector('[data-ok]').addEventListener('click',function(){decide(true);});
  root.querySelector('[data-no]').addEventListener('click',function(){decide(false);});
  for(var i=0;i<3;i++)queue.push(newTx());
  render();

  function draw(dt){
    spawnT+=dt;
    if(spawnT>2.4&&queue.length<6){spawnT=0;queue.push(newTx());render();}
    ctx.clearRect(0,0,W,H);
    var gx=W*.5,cy=H/2;
    ctx.strokeStyle='rgba('+LINE+',.22)';ctx.setLineDash([3,7]);ctx.beginPath();ctx.moveTo(24,cy);ctx.lineTo(W-24,cy);ctx.stroke();ctx.setLineDash([]);
    box(24,cy,'AGENT',false);box(W-24-88,cy,'RECORD',true);
    ctx.strokeStyle='rgba('+ACC+',.85)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(gx,cy-60);ctx.lineTo(gx,cy-16);ctx.moveTo(gx,cy+16);ctx.lineTo(gx,cy+60);ctx.stroke();ctx.lineWidth=1;
    ctx.fillStyle='rgba('+ACC+',.95)';ctx.font='500 11px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText('HUMAN WITNESS',gx,cy-72);ctx.textAlign='left';
    queue.forEach(function(tx,i){var to=gx-26-i*30;tx.x+=(to-tx.x)*Math.min(1,dt*4);doc(tx.x,cy,INK,.9-i*.12);});
    for(var k=moving.length-1;k>=0;k--){
      var m=moving[k];
      if(m.state==='pass'){m.x+=dt*240;doc(m.x,cy,INK,1);seal(m.x,cy);if(m.x>W-110)moving.splice(k,1);}
      else{m.life-=dt*1.3;var a=Math.max(0,m.life),y=cy+(1-a)*34;doc(m.x,y,MUT,a);
        ctx.strokeStyle='rgba('+MUT+','+a+')';ctx.beginPath();ctx.moveTo(m.x-7,y-7);ctx.lineTo(m.x+7,y+7);ctx.moveTo(m.x+7,y-7);ctx.lineTo(m.x-7,y+7);ctx.stroke();
        if(m.life<=0)moving.splice(k,1);}
    }
  }
  function box(x,y,t,rec){ctx.strokeStyle='rgba('+(rec?INK:LINE)+','+(rec?.7:.4)+')';ctx.strokeRect(x,y-20,88,40);
    ctx.fillStyle='rgba('+INK+',.8)';ctx.font='500 11px "JetBrains Mono",monospace';ctx.fillText(t,x+12,y+4);}
  function doc(x,y,c,a){ctx.strokeStyle='rgba('+c+','+a+')';ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(x-6,y-8);ctx.lineTo(x+3,y-8);ctx.lineTo(x+6,y-5);ctx.lineTo(x+6,y+8);ctx.lineTo(x-6,y+8);ctx.closePath();ctx.stroke();ctx.lineWidth=1;}
  function seal(x,y){ctx.strokeStyle='rgba('+ACC+',.9)';ctx.beginPath();ctx.arc(x+8,y+7,4,0,6.283);ctx.stroke();}

  if(reduced){draw(0);return;}
  var last=performance.now();
  (function loop(now){
    if(!cv.isConnected){window.removeEventListener('resize',size);return;}
    var dt=Math.min(.05,(now-last)/1000);last=now;draw(dt);requestAnimationFrame(loop);
  })(last);
}
window.Witness={init:init};
})();
