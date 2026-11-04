/* Site editor.
   Edits content/site.json (every word, button, section, color and background object on the site),
   shows changes live in a preview, and publishes by committing to the GitHub repository.
   Sign-in is a GitHub fine-grained token with Contents read/write on the site repo. */
(function(){
"use strict";
var $=function(s,r){return(r||document).querySelector(s);};
var API='https://api.github.com';
var DRAFT_KEY='sh-editor-draft',AUTH_KEY='sh-editor-auth';

var state={
  auth:null,          // {repo,branch,token,user}
  data:null,          // the working site.json
  baseSha:null,       // sha of content/site.json when loaded
  baseJSON:'',        // published version, to detect unpublished changes
  sel:{kind:'theme'}, // what the form shows
  page:'home',
  uploads:{},         // path -> data URL, published as files
  newFiles:{},        // path -> text (new page shells)
  deleted:{},         // path -> true
  shell:'',           // index.html, used as the template for new pages
  history:[],future:[],mobile:false
};

/* ── field schemas ── */
var BTN={label:'text',href:'url',style:{sel:['primary','ghost']}};
var HEAD={eyebrow:'text',title:'textarea',lead:'textarea'};
function withHead(f){return Object.assign({},HEAD,f);}
var TYPES={
  hero:{name:'Hero',fields:{full:'bool',eyebrow:'text',title:'textarea',lead:'textarea',buttons:{list:BTN},tags:{list:'text'},hint:'text',figure:{src:'image',alt:'text',caption:'text'}}},
  stats:{name:'Stats bar',fields:{items:{list:{value:'text',label:'text'}}}},
  cards:{name:'Cards',fields:withHead({flip:'bool',columns:'number',items:{list:{status:'text',shape:'shape',kicker:'text',title:'text',text:'textarea',href:'url',linkLabel:'text',anim:{sel:['','radar','agents','records']},caption:'text'}},buttons:{list:BTN}})},
  kit:{name:'Tool illustrations',fields:withHead({items:{list:{shape:'shape',label:'text',text:'textarea'}}})},
  witness:{name:'Witness gate',fields:withHead({})},
  vault:{name:'Password downloads',fields:withHead({requestLabel:'text',requestHref:'url',items:{list:{kind:'text',title:'text',meta:'text',src:'text',file:'text'}}})},
  video:{name:'Video',fields:withHead({src:'text',poster:'image',badge:'text',label:'text'})},
  roadmap:{name:'Roadmap',fields:withHead({items:{list:{status:{sel:['done','now','next']},label:'text'}},buttons:{list:BTN}})},
  skills:{name:'Downloads with filters',fields:withHead({filters:{list:'text'},items:{list:{name:'text',tags:{list:'text'},text:'textarea',file:'text',button:'text'}}})},
  steps:{name:'Numbered steps',fields:withHead({items:{list:{title:'text',text:'textarea'}},note:'textarea'})},
  issues:{name:'Article issues',fields:withHead({empty:'text',items:{list:{no:'text',date:'date',title:'text',track:'text',url:'url'}},buttons:{list:BTN}})},
  text:{name:'Text',fields:withHead({body:'textarea',buttons:{list:BTN}})},
  gallery:{name:'Gallery',fields:withHead({items:{list:{src:'image',alt:'text',caption:'text'}}})},
  buttons:{name:'Buttons',fields:withHead({items:{list:BTN}})}
};
var COMMON={id:'text',hidden:'bool'};
var STARTERS={
  hero:{eyebrow:'Eyebrow',title:'New page.',lead:'One line on what this page is for.'},
  stats:{items:[{value:'00',label:'Label'}]},
  cards:{title:'Section title.',items:[{kicker:'Kicker',title:'Card title',text:'One line.'}]},
  kit:{title:'Tools.',items:[{shape:'lidar',label:'LiDAR scanner',text:''}]},
  witness:{eyebrow:'Sign off',title:'Human in the loop.'},
  text:{title:'Section title.',body:'First paragraph.\n\nSecond paragraph.'},
  gallery:{title:'Gallery.',items:[]},
  buttons:{items:[{label:'Button',href:'index.html',style:'primary'}]},
  steps:{title:'Steps.',items:[{title:'Step',text:''}]},
  roadmap:{title:'Status.',items:[{status:'now',label:'Milestone'}]},
  video:{src:'',badge:''},
  vault:{title:'Downloads.',items:[]},
  skills:{filters:[],items:[]},
  issues:{items:[],empty:'Nothing here yet.'}
};
var PRESETS={
  graphite:{bg:'#0a0c0f',surface:'#12161b',ink:'#e8ecf0',muted:'#97a2ae',line:'#c9d3de',accent:'#ffc861'},
  blueprint:{bg:'#071423',surface:'#0d1f33',ink:'#e6f0fa',muted:'#8fa8c2',line:'#9cc9ff',accent:'#ffd166'},
  paper:{bg:'#f2f0eb',surface:'#ffffff',ink:'#15181c',muted:'#5b636c',line:'#2a3038',accent:'#c2410c'},
  signal:{bg:'#050505',surface:'#101010',ink:'#f5f5f5',muted:'#a0a0a0',line:'#ffffff',accent:'#3dff8b'},
  concrete:{bg:'#1b1d1f',surface:'#25282b',ink:'#eeeeea',muted:'#a4a6a2',line:'#d6d6cf',accent:'#ff7a1a'}
};
var GLOBAL={
  theme:{name:'Theme & colors'},
  brand:{name:'Brand & navigation',fields:{brand:'text',mark:'text',tagline:'text',nav:{list:{label:'text',href:'url'}}},path:['site']},
  ticker:{name:'Top ticker',fields:{show:'bool',label:'text',href:'url',items:{list:'text'}},path:['site','ticker']},
  footer:{name:'Footer',fields:{cred:'textarea',legal:'textarea',links:{list:{label:'text',href:'url'}}},path:['site','footer']},
  background:{name:'Floating objects',path:['site','background']}
};

/* ── utils ── */
function el(tag,attrs,kids){var e=document.createElement(tag);if(attrs)for(var k in attrs){if(k==='text')e.textContent=attrs[k];else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),attrs[k]);else if(attrs[k]!=null&&attrs[k]!==false)e.setAttribute(k,attrs[k]);}
  (kids||[]).forEach(function(c){if(c)e.appendChild(typeof c==='string'?document.createTextNode(c):c);});return e;}
function clone(o){return JSON.parse(JSON.stringify(o));}
function toast(msg,bad){var t=$('#toast');t.textContent=msg;t.className='toast show'+(bad?' bad':'');clearTimeout(t._h);t._h=setTimeout(function(){t.className='toast';},bad?6000:3200);}
function humanize(k){return k.replace(/([A-Z])/g,' $1').replace(/^./,function(c){return c.toUpperCase();});}
function defaultFor(spec){
  if(spec&&spec.list)return[];
  if(spec&&spec.sel)return spec.sel[0];
  if(typeof spec==='object'){var o={};for(var k in spec)o[k]=defaultFor(spec[k]);return o;}
  return spec==='bool'?false:spec==='number'?0:'';
}
function pages(){return state.data.pages||(state.data.pages={});}
function curPage(){return pages()[state.page];}
function getPath(path){var o=state.data;path.forEach(function(k){if(o[k]==null)o[k]={};o=o[k];});return o;}
function b64utf8(s){return btoa(unescape(encodeURIComponent(s)));}
function utf8b64(b){var bin=atob(b.replace(/\s/g,'')),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new TextDecoder().decode(u);}

/* ── GitHub ── */
function gh(path,opts){
  opts=opts||{};
  return fetch(API+path,{method:opts.method||'GET',headers:{'Authorization':'Bearer '+state.auth.token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
    body:opts.body?JSON.stringify(opts.body):undefined,cache:'no-store'}).then(function(r){
    if(r.status===404&&opts.allow404)return null;
    return r.json().catch(function(){return{};}).then(function(j){if(!r.ok){var e=new Error(j.message||('GitHub error '+r.status));e.status=r.status;throw e;}return j;});
  });
}
function remoteContent(){
  var a=state.auth;
  return gh('/repos/'+a.repo+'/contents/content/site.json?ref='+encodeURIComponent(a.branch),{allow404:true});
}

/* ── sign in ── */
function showLogin(cfg){
  $('#login').hidden=false;$('#editor').hidden=true;
  var saved=JSON.parse(sessionStorage.getItem(AUTH_KEY)||localStorage.getItem(AUTH_KEY)||'null');
  $('#l-repo').value=(saved&&saved.repo)||(cfg&&cfg.repo)||'';
  $('#l-branch').value=(saved&&saved.branch)||(cfg&&cfg.branch)||'main';
  if(saved&&saved.token){state.auth=saved;signIn(true);}
}
$('#login-form').addEventListener('submit',function(e){
  e.preventDefault();
  state.auth={repo:$('#l-repo').value.trim().replace(/^https?:\/\/github\.com\//,'').replace(/\.git$/,''),branch:$('#l-branch').value.trim()||'main',token:$('#l-token').value.trim()};
  if(!state.auth.repo||!state.auth.token){$('#login-msg').textContent='Repository and token are required.';return;}
  signIn(false);
});
function signIn(silent){
  var msg=$('#login-msg');msg.textContent='Checking access…';msg.className='msg';
  Promise.all([gh('/repos/'+state.auth.repo),gh('/user').catch(function(){return{};})]).then(function(r){
    var repo=r[0];
    if(!repo.permissions||!repo.permissions.push)throw new Error('This token can read the repo but cannot write to it. Give it Contents: Read and write.');
    state.auth.user=r[1].login||'';
    var store=$('#l-remember').checked||(silent&&localStorage.getItem(AUTH_KEY))?localStorage:sessionStorage;
    store.setItem(AUTH_KEY,JSON.stringify(state.auth));
    return remoteContent();
  }).then(function(file){
    if(file&&file.content){state.baseSha=file.sha;return JSON.parse(utf8b64(file.content));}
    state.baseSha=null;return fetchLocal();   // not published yet: start from this copy
  }).then(start).catch(function(err){
    msg.textContent=err.status===401?'That token was rejected. Check it and try again.':err.status===404?'Repository not found, or the token has no access to it.':err.message;
    msg.className='msg bad';state.auth=null;sessionStorage.removeItem(AUTH_KEY);localStorage.removeItem(AUTH_KEY);
    $('#login').hidden=false;$('#editor').hidden=true;
  });
}
$('#offline').addEventListener('click',function(){state.auth=null;fetchLocal().then(start);});
$('#signout').addEventListener('click',function(){sessionStorage.removeItem(AUTH_KEY);localStorage.removeItem(AUTH_KEY);location.reload();});
function fetchLocal(){return fetch('content/site.json',{cache:'no-cache'}).then(function(r){return r.json();});}

/* ── start editing ── */
function start(data){
  state.baseJSON=JSON.stringify(data);
  var draft=localStorage.getItem(DRAFT_KEY);
  if(draft){
    try{var d=JSON.parse(draft);
      if(JSON.stringify(d.data)!==state.baseJSON&&confirm('You have unpublished changes from '+new Date(d.at).toLocaleString()+'. Keep working on them?')){
        data=d.data;state.uploads=d.uploads||{};state.newFiles=d.newFiles||{};state.deleted=d.deleted||{};
      }else localStorage.removeItem(DRAFT_KEY);
    }catch(e){localStorage.removeItem(DRAFT_KEY);}
  }
  state.data=data;state.history=[JSON.stringify(data)];state.future=[];
  $('#login').hidden=true;$('#editor').hidden=false;
  fetch('index.html').then(function(r){return r.text();}).then(function(t){state.shell=t;});
  status();drawTree();drawForm();loadFrame();
}
function status(){
  var a=state.auth,dirty=isDirty();
  $('#status').textContent=(a?(a.user?a.user+' · ':'')+a.repo+'@'+a.branch:'Offline · export only')+(dirty?' · unpublished changes':' · up to date');
  $('#status').className='status'+(dirty?' dirty':'');
  $('#publish').disabled=!a;
}
function isDirty(){return JSON.stringify(state.data)!==state.baseJSON||Object.keys(state.uploads).length||Object.keys(state.newFiles).length||Object.keys(state.deleted).length;}

/* ── change tracking, undo, preview ── */
var hT=0,pT=0;
function changed(opts){
  opts=opts||{};
  localStorage.setItem(DRAFT_KEY,JSON.stringify({at:Date.now(),data:state.data,uploads:state.uploads,newFiles:state.newFiles,deleted:state.deleted}));
  clearTimeout(hT);hT=setTimeout(function(){var s=JSON.stringify(state.data);if(s!==state.history[state.history.length-1]){state.history.push(s);if(state.history.length>100)state.history.shift();state.future=[];}},500);
  clearTimeout(pT);pT=setTimeout(function(){sendPreview(opts.focus);},opts.now?0:220);
  if(opts.tree)drawTree();
  status();
}
function undo(){var cur=JSON.stringify(state.data);if(state.history.length<2&&state.history[0]===cur)return;
  if(state.history[state.history.length-1]===cur)state.future.push(state.history.pop());else state.future.push(cur);
  state.data=JSON.parse(state.history[state.history.length-1]);fixSel();drawTree();drawForm();changed({now:true});}
function redo(){if(!state.future.length)return;var s=state.future.pop();state.history.push(s);state.data=JSON.parse(s);fixSel();drawTree();drawForm();changed({now:true});}
function fixSel(){if(!pages()[state.page])state.page='home';var s=state.sel;if(s.kind==='section'&&!(curPage().sections||[])[s.index])state.sel={kind:'page'};}
$('#undo').addEventListener('click',undo);$('#redo').addEventListener('click',redo);
document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();e.shiftKey?redo():undo();}});

var frameReady=false;
function loadFrame(){frameReady=false;$('#frame').src='index.html?preview&page='+encodeURIComponent(state.page)+'&t='+Date.now();}
function sendPreview(focus){if(!frameReady)return;$('#frame').contentWindow.postMessage({type:'sh-preview',data:state.data,uploads:state.uploads,focus:focus},location.origin);}
window.addEventListener('message',function(e){
  if(e.origin!==location.origin||!e.data)return;
  if(e.data.type==='sh-ready'){frameReady=true;sendPreview(state.sel.kind==='section'?state.sel.index:null);}
  if(e.data.type==='sh-select'){state.sel={kind:'section',index:e.data.index};drawTree();drawForm();}
  if(e.data.type==='sh-nav'){var k=Object.keys(pages()).filter(function(k){return pages()[k].file===e.data.file;})[0];if(k)selectPage(k);}
});
$('#view-toggle').addEventListener('click',function(){state.mobile=!state.mobile;$('#frame-wrap').classList.toggle('mobile',state.mobile);this.textContent=state.mobile?'Desktop view':'Mobile view';});

/* ── tree ── */
function selectPage(k){state.page=k;state.sel={kind:'page'};drawTree();drawForm();loadFrame();}
function drawTree(){
  var t=$('#tree');t.innerHTML='';
  t.appendChild(el('div',{class:'t-head',text:'Site'}));
  Object.keys(GLOBAL).forEach(function(k){
    t.appendChild(el('button',{class:'t-item'+(state.sel.kind===k?' on':''),text:GLOBAL[k].name,onclick:function(){state.sel={kind:k};drawTree();drawForm();}}));
  });
  t.appendChild(el('div',{class:'t-head'},['Pages',el('button',{class:'mini',title:'Add a page',text:'+ Page',onclick:addPage})]));
  Object.keys(pages()).forEach(function(k){
    var p=pages()[k],open=k===state.page;
    t.appendChild(el('button',{class:'t-page'+(open&&state.sel.kind==='page'?' on':'')+(open?' open':''),onclick:function(){selectPage(k);}},[el('span',{text:(navLabel(p.file)||k)}),el('small',{text:p.file})]));
    if(!open)return;
    (p.sections||[]).forEach(function(s,i){
      var name=(TYPES[s.type]||{name:s.type}).name,sum=s.title||s.eyebrow||(s.items&&s.items[0]&&(s.items[0].title||s.items[0].label||s.items[0].value))||'';
      var row=el('div',{class:'t-sec'+(state.sel.kind==='section'&&state.sel.index===i?' on':'')+(s.hidden?' off':'')},[
        el('button',{class:'t-sec-main',onclick:function(){state.sel={kind:'section',index:i};drawTree();drawForm();sendPreview(i);}},[el('b',{text:name}),el('span',{text:String(sum).replace(/\n/g,' ')})]),
        el('div',{class:'t-tools'},[
          el('button',{title:s.hidden?'Show':'Hide','aria-label':s.hidden?'Show section':'Hide section',text:s.hidden?'◌':'●',onclick:function(){s.hidden=!s.hidden;changed({tree:true,now:true});if(state.sel.index===i)drawForm();}}),
          el('button',{title:'Move up','aria-label':'Move up',text:'↑',disabled:i===0?'':null,onclick:function(){move(p.sections,i,-1);}}),
          el('button',{title:'Move down','aria-label':'Move down',text:'↓',disabled:i===p.sections.length-1?'':null,onclick:function(){move(p.sections,i,1);}}),
          el('button',{title:'Duplicate','aria-label':'Duplicate',text:'⧉',onclick:function(){p.sections.splice(i+1,0,clone(s));state.sel={kind:'section',index:i+1};changed({tree:true,now:true});drawForm();}}),
          el('button',{title:'Delete','aria-label':'Delete section',text:'✕',onclick:function(){if(confirm('Delete the "'+name+'" section?')){p.sections.splice(i,1);state.sel={kind:'page'};changed({tree:true,now:true});drawForm();}}})
        ])]);
      t.appendChild(row);
    });
    var sel=el('select',{'aria-label':'Section type'},[el('option',{value:'',text:'+ Add section…'})].concat(Object.keys(TYPES).map(function(k){return el('option',{value:k,text:TYPES[k].name});})));
    sel.addEventListener('change',function(){if(!sel.value)return;addSection(sel.value);});
    t.appendChild(el('div',{class:'t-add'},[sel]));
  });
}
function navLabel(file){var n=(state.data.site.nav||[]).filter(function(n){return n.href===file;})[0];return n&&n.label;}
function move(arr,i,d){var j=i+d;if(j<0||j>=arr.length)return;var x=arr[i];arr[i]=arr[j];arr[j]=x;if(state.sel.index===i)state.sel.index=j;changed({tree:true,now:true,focus:j});drawForm();}
function addSection(type){
  var p=curPage(),s=Object.assign({type:type},defaultFor(TYPES[type].fields),clone(STARTERS[type]||{}));
  var at=state.sel.kind==='section'?state.sel.index+1:(p.sections||[]).length;
  (p.sections=p.sections||[]).splice(at,0,s);state.sel={kind:'section',index:at};changed({tree:true,now:true,focus:at});drawForm();
}
function addPage(){
  var name=prompt('Name of the new page (shown in the menu):');if(!name)return;
  var key=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'page';
  while(pages()[key])key+='-2';
  var file=key+'.html';
  pages()[key]={file:file,title:name+' — '+state.data.site.brand,description:'',banner:'',sections:[Object.assign({type:'hero'},clone(STARTERS.hero),{title:name+'.'})]};
  state.data.site.nav.push({label:name,href:file});
  delete state.deleted[file];
  state.newFiles[file]=shellFor(key,name);
  selectPage(key);changed({tree:true,now:true});
}
function shellFor(key,name){
  var s=state.shell||'';
  return s.replace(/data-page="[^"]*"/,'data-page="'+key+'"').replace(/<title>[^<]*<\/title>/,'<title>'+name.replace(/[<&]/g,'')+' — '+state.data.site.brand+'</title>');
}
function deletePage(key){
  if(key==='home'){toast('The home page cannot be deleted.',true);return;}
  var p=pages()[key];if(!confirm('Delete the page "'+key+'" ('+p.file+')? It is removed from the site when you publish.'))return;
  delete pages()[key];state.data.site.nav=state.data.site.nav.filter(function(n){return n.href!==p.file;});
  if(state.newFiles[p.file])delete state.newFiles[p.file];else state.deleted[p.file]=true;
  selectPage('home');changed({tree:true,now:true});
}

/* ── forms ── */
function drawForm(){
  var f=$('#form');f.innerHTML='';var s=state.sel;
  if(s.kind==='theme')return themeForm(f);
  if(s.kind==='background')return bgForm(f);
  if(GLOBAL[s.kind]){var g=GLOBAL[s.kind];f.appendChild(el('h2',{text:g.name}));fields(f,getPath(g.path),g.fields);raw(f,g.path);return;}
  var p=curPage();
  if(s.kind==='page'){
    f.appendChild(el('h2',{text:'Page · '+(navLabel(p.file)||state.page)}));
    f.appendChild(el('p',{class:'hint',text:'File: '+p.file+'. Title and description show in search results and browser tabs. A banner shows as a striped strip above the menu.'}));
    fields(f,p,{title:'text',description:'textarea',banner:'text'});
    f.appendChild(el('div',{class:'row-actions'},[el('a',{class:'b',href:p.file,target:'_blank',rel:'noopener',text:'Open live page ↗'}),
      state.page!=='home'?el('button',{class:'b danger',text:'Delete page',onclick:function(){deletePage(state.page);}}):null]));
    return;
  }
  var sec=p.sections[s.index];if(!sec){state.sel={kind:'page'};return drawForm();}
  var T=TYPES[sec.type]||{name:sec.type,fields:{}};
  f.appendChild(el('h2',{text:T.name}));
  f.appendChild(el('p',{class:'hint',text:'Changes show in the preview as you type. **bold** and [link text](url) work in longer text fields.'}));
  fields(f,sec,Object.assign({},T.fields,COMMON));
  raw(f,['pages',state.page,'sections',s.index]);
}
function fields(box,obj,spec){
  Object.keys(spec).forEach(function(k){box.appendChild(field(obj,k,spec[k],humanize(k==='id'?'anchor id':k)));});
}
function field(obj,key,spec,label){
  var wrap=el('div',{class:'f'}),id='f'+Math.random().toString(36).slice(2,8);
  function set(v){obj[key]=v;changed();}
  if(spec&&spec.list)return listField(obj,key,spec.list,label);
  if(spec&&typeof spec==='object'&&!spec.sel){
    if(!obj[key]||typeof obj[key]!=='object')obj[key]=defaultFor(spec);
    var g=el('fieldset',{class:'group'},[el('legend',{text:label})]);fields(g,obj[key],spec);return g;
  }
  wrap.appendChild(el('label',{for:id,text:label}));
  var v=obj[key]==null?'':obj[key],inp;
  if(spec==='bool'){inp=el('input',{type:'checkbox',id:id});inp.checked=!!obj[key];inp.addEventListener('change',function(){set(inp.checked);});wrap.className='f check';wrap.insertBefore(inp,wrap.firstChild);return wrap;}
  if(spec&&spec.sel){inp=el('select',{id:id},spec.sel.map(function(o){return el('option',{value:o,text:o||'(none)'});}));inp.value=v;inp.addEventListener('change',function(){set(inp.value);});}
  else if(spec==='shape'){inp=el('select',{id:id},[el('option',{value:'',text:'(none)'})].concat(Shapes.names.map(function(n){return el('option',{value:n,text:Shapes.defs[n].label});})));inp.value=v;
    var ic=el('canvas',{class:'shape-prev','aria-hidden':'true'});
    inp.addEventListener('change',function(){set(inp.value);drawIc();});
    function drawIc(){ic.getContext('2d').clearRect(0,0,ic.width,ic.height);if(inp.value)Shapes.icon(ic,inp.value,'#c9d3de',{still:true});}
    wrap.appendChild(el('div',{class:'inline'},[inp,ic]));setTimeout(drawIc);return wrap;}
  else if(spec==='textarea'){inp=el('textarea',{id:id,rows:String(Math.min(8,Math.max(2,String(v).split('\n').length+1)))});inp.value=v;inp.addEventListener('input',function(){set(inp.value);});}
  else if(spec==='number'){inp=el('input',{type:'number',id:id,step:'any'});inp.value=v;inp.addEventListener('input',function(){set(inp.value===''?'':+inp.value);});}
  else if(spec==='image'){
    inp=el('input',{id:id,type:'text',spellcheck:'false',placeholder:'assets/…'});inp.value=v;inp.addEventListener('input',function(){set(inp.value);});
    var file=el('input',{type:'file',accept:'image/*',hidden:''});
    file.addEventListener('change',function(){var fl=file.files[0];if(!fl)return;if(fl.size>4e6){toast('Image is over 4 MB. Resize it first.',true);return;}
      var r=new FileReader();r.onload=function(){var path='assets/uploads/'+Date.now().toString(36)+'-'+fl.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-');
        state.uploads[path]=r.result;inp.value=path;set(path);toast('Image added. It uploads when you publish.');};r.readAsDataURL(fl);});
    wrap.appendChild(el('div',{class:'inline'},[inp,el('button',{class:'b',type:'button',text:'Upload',onclick:function(){file.click();}}),file]));return wrap;
  }
  else{inp=el('input',{id:id,type:spec==='date'?'date':'text',spellcheck:spec==='url'?'false':null});inp.value=v;inp.addEventListener('input',function(){set(inp.value);});}
  wrap.appendChild(inp);return wrap;
}
function listField(obj,key,item,label){
  if(!Array.isArray(obj[key]))obj[key]=[];
  var arr=obj[key],box=el('fieldset',{class:'list'},[el('legend',{text:label+' ('+arr.length+')'})]);
  function redraw(){var n=listField(obj,key,item,label);box.replaceWith(n);changed({tree:true});}
  arr.forEach(function(v,i){
    var simple=typeof item==='string',row=el('div',{class:'li'+(simple?' simple':'')});
    var tools=el('div',{class:'li-tools'},[
      el('span',{class:'li-n',text:String(i+1)}),
      el('button',{type:'button',title:'Move up','aria-label':'Move up',text:'↑',onclick:function(){if(i){arr.splice(i-1,0,arr.splice(i,1)[0]);redraw();}}}),
      el('button',{type:'button',title:'Move down','aria-label':'Move down',text:'↓',onclick:function(){if(i<arr.length-1){arr.splice(i+1,0,arr.splice(i,1)[0]);redraw();}}}),
      el('button',{type:'button',title:'Duplicate','aria-label':'Duplicate',text:'⧉',onclick:function(){arr.splice(i+1,0,clone(arr[i]));redraw();}}),
      el('button',{type:'button',title:'Remove','aria-label':'Remove',text:'✕',onclick:function(){arr.splice(i,1);redraw();}})]);
    row.appendChild(tools);
    if(simple){var f=field({get v(){return arr[i];},set v(x){arr[i]=x;}},'v',item,'Value');f.classList.add('nolabel');row.appendChild(f);}
    else{if(typeof arr[i]!=='object'||!arr[i])arr[i]=defaultFor(item);fields(row,arr[i],item);}
    box.appendChild(row);
  });
  box.appendChild(el('button',{type:'button',class:'b add',text:'+ Add '+label.toLowerCase().replace(/s$/,''),onclick:function(){arr.push(defaultFor(item));redraw();}}));
  return box;
}
function raw(f,path){
  var d=el('details',{class:'raw'},[el('summary',{text:'Advanced: edit as JSON'})]);
  var ta=el('textarea',{rows:'14',spellcheck:'false'});ta.value=JSON.stringify(getPath(path),null,2);
  d.appendChild(ta);
  d.appendChild(el('button',{class:'b',type:'button',text:'Apply JSON',onclick:function(){
    try{var v=JSON.parse(ta.value),parent=getPath(path.slice(0,-1));parent[path[path.length-1]]=v;changed({tree:true,now:true});drawForm();toast('Applied.');}
    catch(e){toast('That JSON has an error: '+e.message,true);}}}));
  f.appendChild(d);
}
function themeForm(f){
  var th=state.data.site.theme=state.data.site.theme||{preset:'graphite',colors:clone(PRESETS.graphite)};
  f.appendChild(el('h2',{text:'Theme & colors'}));
  f.appendChild(el('p',{class:'hint',text:'Keep one accent. It marks buttons and the human sign-off. Lines color the floating objects and illustrations.'}));
  var grid=el('div',{class:'presets'});
  Object.keys(PRESETS).forEach(function(k){var c=PRESETS[k];
    grid.appendChild(el('button',{type:'button',class:'preset'+(th.preset===k?' on':''),onclick:function(){th.preset=k;th.colors=clone(c);changed({now:true});drawForm();}},[
      el('span',{class:'sw',style:'background:'+c.bg+';border-color:'+c.line},[el('i',{style:'background:'+c.ink}),el('i',{style:'background:'+c.accent})]),el('b',{text:humanize(k)})]));});
  f.appendChild(grid);
  var names={bg:'Background',surface:'Panels',ink:'Text',muted:'Secondary text',line:'Lines & objects',accent:'Accent'};
  Object.keys(names).forEach(function(k){
    var w=el('div',{class:'f color'}),id='c-'+k,pick=el('input',{type:'color',id:id}),hex=el('input',{type:'text',spellcheck:'false','aria-label':names[k]+' hex'});
    pick.value=th.colors[k]||'#000000';hex.value=th.colors[k]||'';
    pick.addEventListener('input',function(){th.colors[k]=pick.value;hex.value=pick.value;th.preset='custom';changed();});
    hex.addEventListener('input',function(){if(/^#[0-9a-f]{6}$/i.test(hex.value)){th.colors[k]=hex.value;pick.value=hex.value;th.preset='custom';changed();}});
    w.appendChild(el('label',{for:id,text:names[k]}));w.appendChild(el('div',{class:'inline'},[pick,hex]));f.appendChild(w);
  });
  var c=th.colors,ratio=contrast(c.ink,c.bg),r2=contrast(c.muted,c.bg);
  f.appendChild(el('p',{class:'hint'+(ratio<4.5||r2<4.5?' warn':''),text:'Contrast: text '+ratio.toFixed(1)+':1, secondary '+r2.toFixed(1)+':1. Aim for 4.5:1 or higher.'}));
}
function contrast(a,b){function L(h){var n=parseInt(String(h||'#000').replace('#',''),16)||0;return[n>>16&255,n>>8&255,n&255].map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}).reduce(function(s,v,i){return s+v*[.2126,.7152,.0722][i];},0);}
  var x=L(a),y=L(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function bgForm(f){
  var b=state.data.site.background=state.data.site.background||{};
  f.appendChild(el('h2',{text:'Floating objects'}));
  f.appendChild(el('p',{class:'hint',text:'Pick which outlines drift behind every page. Hovering one breaks it into 1s and 0s.'}));
  var grid=el('div',{class:'objs'});b.objects=b.objects||Shapes.names.slice();
  Shapes.names.forEach(function(n){
    var on=b.objects.indexOf(n)>=0,cv=el('canvas',{'aria-hidden':'true'});
    var btn=el('button',{type:'button',class:'obj'+(on?' on':''),'aria-pressed':String(on),onclick:function(){
      var i=b.objects.indexOf(n);if(i>=0)b.objects.splice(i,1);else b.objects.push(n);changed({now:true});drawForm();}},[cv,el('span',{text:Shapes.defs[n].label})]);
    grid.appendChild(btn);setTimeout(function(){Shapes.icon(cv,n,'#c9d3de',{still:true});});
  });
  f.appendChild(grid);
  fields(f,b,{count:'number',mobileCount:'number',speed:'number',size:'number',pageOpacity:'number',dissolve:'bool'});
  f.appendChild(el('p',{class:'hint',text:'Count: objects on desktop. Speed and size: 1 is normal. Page opacity: how bright they are behind content (0 to 1).'}));
}

/* ── export / import / discard ── */
$('#export').addEventListener('click',function(){
  var a=el('a',{href:URL.createObjectURL(new Blob([JSON.stringify(state.data,null,2)+'\n'],{type:'application/json'})),download:'site.json'});document.body.appendChild(a);a.click();a.remove();
});
$('#import').addEventListener('change',function(){var fl=this.files[0];if(!fl)return;fl.text().then(function(t){
  try{var d=JSON.parse(t);if(!d.pages||!d.site)throw new Error('Not a site.json file.');state.data=d;fixSel();drawTree();drawForm();changed({now:true});toast('Imported. Publish to make it live.');}
  catch(e){toast(e.message,true);}});this.value='';});
$('#discard').addEventListener('click',function(){
  if(!isDirty()){toast('Nothing to discard.');return;}
  if(!confirm('Throw away all unpublished changes?'))return;
  localStorage.removeItem(DRAFT_KEY);state.data=JSON.parse(state.baseJSON);state.uploads={};state.newFiles={};state.deleted={};
  state.history=[state.baseJSON];state.future=[];fixSel();drawTree();drawForm();changed({now:true});
});

/* ── publish: one commit with every changed file ── */
$('#publish').addEventListener('click',function(){
  if(!state.auth)return;
  if(!isDirty()){toast('Nothing to publish.');return;}
  var a=state.auth,n=1+Object.keys(state.uploads).length+Object.keys(state.newFiles).length+Object.keys(state.deleted).length;
  if(!confirm('Publish to '+a.repo+' on '+a.branch+'?\n\nThis commits '+n+' file change(s) and updates the live site in about a minute.'))return;
  var btn=this;btn.disabled=true;btn.textContent='Publishing…';
  var R='/repos/'+a.repo,headSha,baseTree;
  remoteContent().then(function(file){
    if((file&&file.sha)!==state.baseSha&&!confirm('The site was changed somewhere else since you opened the editor. Publishing will overwrite those content changes. Continue?'))throw new Error('cancelled');
    return gh(R+'/git/ref/heads/'+encodeURIComponent(a.branch));
  }).then(function(ref){headSha=ref.object.sha;return gh(R+'/git/commits/'+headSha);})
  .then(function(c){baseTree=c.tree.sha;
    var files=[{path:'content/site.json',content:JSON.stringify(state.data,null,2)+'\n',enc:'utf-8'}];
    Object.keys(state.uploads).forEach(function(p){if(JSON.stringify(state.data).indexOf(p)>=0)files.push({path:p,content:state.uploads[p].split(',')[1],enc:'base64'});});
    Object.keys(state.newFiles).forEach(function(p){files.push({path:p,content:state.newFiles[p],enc:'utf-8'});});
    return Promise.all(files.map(function(f){return gh(R+'/git/blobs',{method:'POST',body:{content:f.content,encoding:f.enc}}).then(function(b){return{path:f.path,mode:'100644',type:'blob',sha:b.sha};});}));
  }).then(function(tree){
    Object.keys(state.deleted).forEach(function(p){tree.push({path:p,mode:'100644',type:'blob',sha:null});});
    return gh(R+'/git/trees',{method:'POST',body:{base_tree:baseTree,tree:tree}});
  }).then(function(t){
    return gh(R+'/git/commits',{method:'POST',body:{message:'Update site content from the site editor',tree:t.sha,parents:[headSha]}});
  }).then(function(c){return gh(R+'/git/refs/heads/'+encodeURIComponent(a.branch),{method:'PATCH',body:{sha:c.sha}});})
  .then(function(){return remoteContent();}).then(function(file){
    state.baseSha=file&&file.sha;state.baseJSON=JSON.stringify(state.data);state.uploads={};state.newFiles={};state.deleted={};
    localStorage.removeItem(DRAFT_KEY);status();toast('Published. The live site updates in about a minute.');
  }).catch(function(e){if(e.message!=='cancelled')toast('Publish failed: '+e.message,true);})
  .then(function(){btn.disabled=false;btn.textContent='Publish';});
});

/* ── boot ── */
window.addEventListener('beforeunload',function(e){if(state.data&&isDirty()&&state.auth){e.preventDefault();e.returnValue='';}});
fetchLocal().then(function(d){showLogin(d.admin);}).catch(function(){showLogin(null);});
})();
