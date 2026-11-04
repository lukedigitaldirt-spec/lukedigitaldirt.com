/* Builds every page from content/site.json.
   Each HTML file is a thin shell with <body data-page="key">; this script draws the banner, ticker,
   nav, sections, footer and download modal, applies the theme, and starts the animations.
   With ?preview the page waits for draft content from the admin editor instead of fetching. */
(function(){
"use strict";
var PAGE=document.body.dataset.page||'home';
var PREVIEW=/[?&]preview\b/.test(location.search)&&window.parent!==window;
var qp=location.search.match(/[?&]page=([\w-]+)/);if(PREVIEW&&qp)PAGE=qp[1];
var app=document.getElementById('app'),bg=document.getElementById('bg');
var uploads={},drift=null,driftKey='',firstRender=true,io=null;

/* ── helpers ── */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function href(u){u=String(u||'#').trim();return /^\s*javascript:/i.test(u)?'#':esc(u);}
function src(p){return esc(uploads[p]||p||'');}
function ext(u){return /^https?:/i.test(u||'')&&u.indexOf(location.host)<0;}
// light inline markup: **bold**, [text](url), line breaks
function md(s){
  return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,function(m,t,u){return'<a href="'+href(u.replace(/&amp;/g,'&'))+'"'+(ext(u)?' target="_blank" rel="noopener"':'')+'>'+t+'</a>';})
    .replace(/\n/g,'<br>');
}
function btns(list,cls){
  if(!list||!list.length)return'';
  return'<div class="cta-row '+(cls||'')+'">'+list.map(function(b){
    return'<a class="btn'+(b.style==='ghost'?' ghost':'')+'" href="'+href(b.href)+'"'+(ext(b.href)?' target="_blank" rel="noopener"':'')+'>'+esc(b.label)+'</a>';
  }).join('')+'</div>';
}
function head(s){
  if(!s.eyebrow&&!s.title&&!s.lead)return'';
  return'<div class="sec-head rev"><div>'+(s.eyebrow?'<div class="eyebrow">'+esc(s.eyebrow)+'</div>':'')+
    (s.title?'<h2 class="display">'+md(s.title)+'</h2>':'')+'</div>'+(s.lead?'<p class="lead">'+md(s.lead)+'</p>':'')+'</div>';
}
function cols(s,n){return'c'+Math.min(4,Math.max(1,+s.columns||Math.min(3,n||3)));}
function slug(s){return String(s||'').toLowerCase().trim();}

/* ── section renderers ── */
var R={
  hero:function(s){
    var text=(s.eyebrow?'<div class="eyebrow">'+esc(s.eyebrow)+'</div>':'')+'<h1 class="display">'+md(s.title)+'</h1>'+
      (s.lead?'<p class="lead">'+md(s.lead)+'</p>':'')+
      (s.tags&&s.tags.length?'<div class="tags">'+s.tags.map(function(t){return'<span>'+esc(t)+'</span>';}).join('')+'</div>':'')+btns(s.buttons);
    if(s.full)return'<section class="hero-full"><div class="wrap">'+text+'</div>'+(s.hint?'<div class="hero-hint">'+esc(s.hint)+'</div>':'')+'</section>';
    if(s.figure&&s.figure.src)return'<section class="hero"><div class="wrap hero-split"><div>'+text+'</div><figure class="rev"><img src="'+src(s.figure.src)+'" alt="'+esc(s.figure.alt)+'">'+
      (s.figure.caption?'<figcaption>'+esc(s.figure.caption)+'</figcaption>':'')+'</figure></div></section>';
    return'<section class="hero"><div class="wrap">'+text+'</div></section>';
  },
  stats:function(s){
    return'<section class="tight"><div class="wrap"><div class="stats rev">'+(s.items||[]).map(function(i){
      return'<div class="stat"><b>'+esc(i.value)+'</b><span>'+esc(i.label)+'</span></div>';}).join('')+'</div></div></section>';
  },
  cards:function(s){
    var items=s.items||[],body;
    if(s.flip){
      body=items.map(function(i,k){
        return'<div class="flip rev" tabindex="0" aria-label="'+esc(i.title)+': hover or tap to see it work"><div class="flip-inner">'+
          '<div class="face card"><div class="kicker">'+('0'+(k+1)).slice(-2)+' / '+esc(i.kicker)+'</div><h3 class="display">'+esc(i.title)+'</h3><p>'+md(i.text)+'</p><span class="hint">HOVER ↻</span></div>'+
          '<div class="face card back"><canvas data-anim="'+esc(i.anim)+'" aria-hidden="true"></canvas><span class="cap">'+esc(i.caption)+'</span></div></div></div>';
      }).join('');
    }else{
      body=items.map(function(i){
        return'<div class="card rev">'+(i.status?'<span class="status'+(/ran|live|used/i.test(i.status)?' live':'')+'">'+esc(i.status)+'</span>':'')+
          (i.shape?'<canvas class="icon" data-shape="'+esc(i.shape)+'" aria-hidden="true"></canvas>':'')+
          (i.kicker?'<div class="kicker">'+esc(i.kicker)+'</div>':'')+'<h3 class="display">'+esc(i.title)+'</h3>'+(i.text?'<p>'+md(i.text)+'</p>':'')+
          (i.href?'<a class="link" href="'+href(i.href)+'"'+(ext(i.href)?' target="_blank" rel="noopener"':'')+'>'+esc(i.linkLabel||'Open →')+'</a>':'')+'</div>';
      }).join('');
    }
    return'<section><div class="wrap">'+head(s)+'<div class="grid '+cols(s,items.length)+'">'+body+'</div>'+btns(s.buttons,'rev')+'</div></section>';
  },
  kit:function(s){
    return'<section><div class="wrap">'+head(s)+'<div class="kit">'+(s.items||[]).map(function(i){
      return'<div class="kit-item rev"><canvas data-shape="'+esc(i.shape)+'" aria-hidden="true"></canvas><div><h3 class="display">'+esc(i.label)+'</h3>'+(i.text?'<p>'+md(i.text)+'</p>':'')+'</div></div>';
    }).join('')+'</div></div></section>';
  },
  witness:function(s){
    return'<section><div class="wrap">'+head(s)+'<div class="witness rev" data-witness><div class="wg-stage"><canvas aria-label="Agent-to-agent transactions waiting at a human witness gate"></canvas></div>'+
      '<div class="wg-side"><div><div class="eyebrow" style="margin-bottom:8px;">At the gate</div><div class="wg-head">—</div></div>'+
      '<div class="wg-btns"><button class="btn small" data-ok>Witness</button><button class="btn small ghost" data-no>Reject</button></div><div class="ledger" aria-live="polite"></div></div></div></div></section>';
  },
  vault:function(s){
    var h=Object.assign({},s);
    if(s.requestHref)h.lead=(s.lead||'')+' ['+(s.requestLabel||'Request it.')+']('+s.requestHref+')';
    return'<section><div class="wrap">'+head(h)+'<div class="grid c4">'+(s.items||[]).map(function(i){
      return'<div class="card dl rev"><div><div class="kicker">'+esc(i.kind)+'</div><h3 class="display">'+esc(i.title)+'</h3></div><div><div class="meta">LOCKED · '+esc(i.meta)+'</div>'+
        '<button class="btn small" style="margin-top:12px;" data-vault="'+esc(i.src)+'" data-file="'+esc(i.file)+'" data-name="'+esc(i.kind+' — '+i.title)+'">Download</button></div></div>';
    }).join('')+'</div></div></section>';
  },
  video:function(s){
    return'<section class="tight"><div class="wrap">'+head(s)+'<div class="vid-frame rev"><video src="'+src(s.src)+'"'+(s.poster?' poster="'+src(s.poster)+'"':'')+
      ' autoplay muted loop playsinline preload="metadata" aria-label="'+esc(s.label)+'"></video>'+(s.badge?'<div class="badge">'+esc(s.badge)+'</div>':'')+'</div></div></section>';
  },
  roadmap:function(s){
    var L={done:'✓ Done',now:'● Now',next:'○ Next'};
    return'<section><div class="wrap">'+head(s)+'<div class="roadmap rev">'+(s.items||[]).map(function(i){
      return'<div class="rm '+esc(i.status)+'"><b>'+(L[i.status]||esc(i.status))+'</b><h3 class="display">'+esc(i.label)+'</h3></div>';}).join('')+'</div>'+btns(s.buttons,'rev')+'</div></section>';
  },
  skills:function(s){
    var f=['All'].concat(s.filters||[]);
    return'<section class="tight"><div class="wrap">'+head(s)+'<div class="chips" role="group" aria-label="Filter">'+f.map(function(x,k){
      return'<button class="chip" aria-pressed="'+(k?'false':'true')+'" data-f="'+esc(k?slug(x):'all')+'">'+esc(x)+'</button>';}).join('')+'</div>'+
      '<div class="grid c3">'+(s.items||[]).map(function(i){var tags=i.tags||[];
        return'<div class="card skill rev" data-tags="'+esc(tags.map(slug).join(' '))+'"><div><div class="kicker">'+esc(tags.join(' · '))+'</div><h3 class="display" style="margin-top:12px;">'+esc(i.name)+'</h3><p>'+md(i.text)+'</p></div>'+
          '<a class="btn small" href="'+href(i.file)+'" download>'+esc(i.button||'Download .zip')+'</a></div>';}).join('')+'</div></div></section>';
  },
  steps:function(s){
    var items=s.items||[];
    return'<section><div class="wrap">'+head(s)+'<div class="grid steps '+cols(s,items.length)+'">'+items.map(function(i,k){
      return'<div class="card rev"><b>'+(k+1)+'</b><h3 class="display">'+esc(i.title)+'</h3><p>'+md(i.text)+'</p></div>';}).join('')+'</div>'+
      (s.note?'<p class="note rev">'+md(s.note)+'</p>':'')+'</div></section>';
  },
  issues:function(s){
    var items=(s.items||[]).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date));});
    var list=items.length?items.map(function(i){
      var d=i.date?new Date(i.date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
      return'<a class="issue rev" href="'+href(i.url)+'" target="_blank" rel="noopener"><div class="no">Issue '+esc(i.no)+'</div><div><h3 class="display">'+esc(i.title)+'</h3><div class="meta">'+esc([i.track,d].filter(Boolean).join(' · '))+'</div></div><div class="go">Read →</div></a>';
    }).join(''):'<div class="empty">'+md(s.empty||'Nothing here yet.')+'</div>';
    return'<section class="tight"><div class="wrap">'+head(s)+list+btns(s.buttons)+'</div></section>';
  },
  text:function(s){
    var paras=String(s.body||'').split(/\n\s*\n/).filter(Boolean).map(function(p){return'<p>'+md(p)+'</p>';}).join('');
    return'<section><div class="wrap">'+head(s)+'<div class="text-body rev">'+paras+'</div>'+btns(s.buttons,'rev')+'</div></section>';
  },
  gallery:function(s){
    return'<section><div class="wrap">'+head(s)+'<div class="gallery">'+(s.items||[]).map(function(i){
      return'<figure class="rev"><img src="'+src(i.src)+'" alt="'+esc(i.alt)+'" loading="lazy">'+(i.caption?'<figcaption>'+esc(i.caption)+'</figcaption>':'')+'</figure>';}).join('')+'</div></div></section>';
  },
  buttons:function(s){return'<section class="tight"><div class="wrap">'+head(s)+btns(s.items,'rev')+'</div></section>';}
};

/* ── page shell ── */
function shell(data,page){
  var site=data.site||{},t=site.ticker||{},f=site.footer||{},out='';
  if(page.banner)out+='<div class="banner" role="note"><span class="pulse-dot"></span>'+esc(page.banner)+'</div>';
  if(t.show!==false&&(t.items||[]).length){
    var run='<span class="k">'+esc(t.label)+'</span>'+t.items.map(function(x){return'<span>'+esc(x)+'</span>';}).join('');
    out+='<a class="ticker" href="'+href(t.href||'#')+'" aria-label="'+esc(t.label)+'"><div class="ticker-track" aria-hidden="true">'+run+run+'</div></a>';
  }
  out+='<header class="nav"><a class="brand" href="index.html"><span class="brand-mark">'+esc(site.mark)+'</span><span class="brand-name">'+esc(site.brand)+'</span></a>'+
    '<button class="nav-toggle" aria-expanded="false" aria-controls="nav-links">Menu</button><ul class="nav-links" id="nav-links">'+
    (site.nav||[]).map(function(n){return'<li><a href="'+href(n.href)+'"'+(n.href===page.file?' aria-current="page"':'')+'>'+esc(n.label)+'</a></li>';}).join('')+'</ul></header>';
  out+='<main>'+(page.sections||[]).map(function(s,i){
    if(s.hidden||!R[s.type])return'';
    var html=R[s.type](s);
    return html.replace(/^<section/,'<section data-si="'+i+'"'+(s.id?' id="'+esc(s.id)+'"':''));
  }).join('')+'</main>';
  out+='<footer class="foot"><div class="wrap foot-grid"><div>'+(site.tagline?'<div class="tagline">'+esc(site.tagline)+'</div>':'')+
    '<div class="brand-name" style="margin-bottom:10px;">'+esc(site.brand)+'</div><small class="cred">'+md(f.cred)+'</small>'+
    ((f.links||[]).length?'<div class="foot-links">'+f.links.map(function(l){return'<a href="'+href(l.href)+'"'+(ext(l.href)?' target="_blank" rel="noopener"':'')+'>'+esc(l.label)+'</a>';}).join('')+'</div>':'')+
    '</div><small class="no-copy">'+md(String(f.legal||'').replace('{year}',new Date().getFullYear()))+'</small></div></footer>';
  out+='<div class="modal" id="vault" role="dialog" aria-modal="true" aria-labelledby="vault-title"><form class="modal-box"><div class="eyebrow" style="margin-bottom:10px;">Password required</div>'+
    '<h3 class="display" id="vault-title" data-title>Download</h3><label for="vault-pw">Password</label><input id="vault-pw" type="password" autocomplete="off" spellcheck="false">'+
    '<div class="modal-msg" role="status"></div><div class="modal-actions"><button class="btn" type="submit">Unlock &amp; download</button><button class="btn ghost" type="button" data-close>Cancel</button></div></form></div>';
  return out;
}

/* ── theme ── */
function lum(hex){var h=String(hex||'').replace('#','');if(h.length===3)h=h.split('').map(function(c){return c+c;}).join('');var n=parseInt(h,16);
  if(isNaN(n))return .5;var c=[n>>16&255,n>>8&255,n&255].map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*c[0]+.7152*c[1]+.0722*c[2];}
function theme(site){
  var c=(site.theme||{}).colors||{},root=document.documentElement.style;
  ['bg','surface','ink','muted','line','accent'].forEach(function(k){if(c[k])root.setProperty('--'+k,c[k]);});
  root.setProperty('--on-accent',lum(c.accent)>.45?'#111111':'#ffffff');
  var m=document.querySelector('meta[name="theme-color"]');if(m&&c.bg)m.content=c.bg;
}

/* ── mount ── */
function mount(data){
  var page=(data.pages||{})[PAGE];
  if(!page){app.innerHTML='<main><section><div class="wrap"><h1 class="display">Page not found.</h1><p class="lead"><a href="index.html">Home</a></p></div></section></main>';return;}
  var site=data.site||{};
  theme(site);
  if(!PREVIEW){document.title=page.title||site.brand||'';var d=document.querySelector('meta[name="description"]');if(d)d.content=page.description||'';}
  app.innerHTML=shell(data,page);

  // icons + card/witness animations
  var line=getComputedStyle(document.documentElement).getPropertyValue('--line').trim();
  app.querySelectorAll('canvas[data-shape]').forEach(function(c){Shapes.icon(c,c.dataset.shape,line);});
  if(window.CardAnims)CardAnims.init(app);
  if(window.Witness)app.querySelectorAll('[data-witness]').forEach(Witness.init);

  // reveal on scroll
  if(io)io.disconnect();
  if(PREVIEW||matchMedia('(prefers-reduced-motion: reduce)').matches)app.querySelectorAll('.rev').forEach(function(el){el.classList.add('vis');});
  else{io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('vis');io.unobserve(e.target);}});},{threshold:.08});
    app.querySelectorAll('.rev').forEach(function(el){io.observe(el);});}

  // floating objects: restart only when the background settings or hero mode change
  var first=(page.sections||[]).filter(function(s){return!s.hidden;})[0],hero=!!(first&&first.type==='hero'&&first.full);
  var key=JSON.stringify(site.background||{})+hero;
  if(key!==driftKey){if(drift)drift.stop();driftKey=key;drift=Drift.start(bg,site.background,{hero:hero});}
  else if(drift)drift.recolor();

  // dark-to-light intro on the landing hero
  if(hero&&firstRender&&!PREVIEW&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    var v=document.createElement('div');v.className='intro-veil';document.body.appendChild(v);
    requestAnimationFrame(function(){requestAnimationFrame(function(){v.classList.add('gone');});});
    setTimeout(function(){v.remove();},3000);
  }
  firstRender=false;
  if(location.hash&&!PREVIEW){var el=document.getElementById(location.hash.slice(1));if(el)setTimeout(function(){el.scrollIntoView();},50);}
}

/* ── interactions (delegated, survive re-renders) ── */
document.addEventListener('click',function(e){
  var t=e.target;
  var tog=t.closest('.nav-toggle');
  if(tog){var l=document.getElementById('nav-links'),o=l.classList.toggle('open');tog.setAttribute('aria-expanded',o);return;}
  var chip=t.closest('.chip');
  if(chip){var wrap=chip.closest('section'),f=chip.dataset.f;
    wrap.querySelectorAll('.chip').forEach(function(c){c.setAttribute('aria-pressed',c===chip);});
    wrap.querySelectorAll('.skill').forEach(function(k){k.hidden=f!=='all'&&(' '+k.dataset.tags+' ').indexOf(' '+f+' ')<0;});return;}
  var vb=t.closest('[data-vault]');if(vb){openVault(vb);return;}
  if(t.closest('[data-close]')||t.id==='vault'){closeVault();return;}
  if(PREVIEW){
    var a=t.closest('a');if(a){e.preventDefault();var h=a.getAttribute('href')||'';if(/^[\w-]+\.html/.test(h))parent.postMessage({type:'sh-nav',file:h.split('#')[0]},location.origin);}
    var sec=t.closest('section[data-si]');if(sec)parent.postMessage({type:'sh-select',index:+sec.dataset.si},location.origin);
  }
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeVault();});

/* Password-protected downloads.
   Each PDF is stored AES-256-GCM encrypted (salt16 | iv12 | ciphertext). The key is derived from the
   password in the browser, so the password is never in the source. */
var current=null,lastFocus=null,cachedPw=null;
function openVault(btn){
  var m=document.getElementById('vault');if(!m)return;
  current=btn;lastFocus=btn;m.querySelector('[data-title]').textContent=btn.dataset.name;
  var msg=m.querySelector('.modal-msg');msg.textContent='';msg.className='modal-msg';
  var inp=m.querySelector('input');inp.value=cachedPw||'';m.classList.add('open');setTimeout(function(){inp.focus();},30);
}
function closeVault(){var m=document.getElementById('vault');if(m&&m.classList.contains('open')){m.classList.remove('open');if(lastFocus)lastFocus.focus();}}
document.addEventListener('submit',function(e){
  if(!e.target.closest('#vault'))return;
  e.preventDefault();
  var m=document.getElementById('vault'),inp=m.querySelector('input'),msg=m.querySelector('.modal-msg'),pw=inp.value.trim();if(!pw||!current)return;
  msg.textContent='Unlocking…';msg.className='modal-msg';
  decrypt(current.dataset.vault,pw).then(function(buf){
    cachedPw=pw;
    var url=URL.createObjectURL(new Blob([buf],{type:'application/pdf'})),a=document.createElement('a');
    a.href=url;a.download=current.dataset.file;document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},4000);
    msg.textContent='Downloaded. Thanks for looking.';setTimeout(closeVault,1200);
  }).catch(function(err){
    msg.textContent=err&&err.name==='OperationError'?'Wrong password.':'Could not load the file. Try again.';msg.className='modal-msg bad';inp.select();
  });
});
function decrypt(path,pw){
  return fetch(path).then(function(r){if(!r.ok)throw new Error('fetch');return r.arrayBuffer();}).then(function(buf){
    var salt=buf.slice(0,16),iv=buf.slice(16,28),ct=buf.slice(28),enc=new TextEncoder();
    return crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']).then(function(base){
      return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt,iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
    }).then(function(key){return crypto.subtle.decrypt({name:'AES-GCM',iv:iv},key,ct);});
  });
}

/* ── load ── */
if(PREVIEW){
  document.body.classList.add('preview');
  window.addEventListener('message',function(e){
    if(e.origin!==location.origin||!e.data||e.data.type!=='sh-preview')return;
    uploads=e.data.uploads||{};
    var y=window.scrollY;mount(e.data.data);window.scrollTo(0,y);
    if(e.data.focus!=null){var s=app.querySelector('section[data-si="'+e.data.focus+'"]');if(s)s.scrollIntoView({block:'center'});}
  });
  parent.postMessage({type:'sh-ready',page:PAGE},location.origin);
}else{
  fetch('content/site.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();}).then(mount)
    .catch(function(){app.innerHTML='<main><section><div class="wrap"><h1 class="display">Could not load this page.</h1><p class="lead">Refresh to try again.</p></div></section></main>';});
}
})();
