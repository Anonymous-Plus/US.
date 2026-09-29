'use strict';
const KEY='us.v1',$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt=n=>Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad=n=>String(n).padStart(3,'0');

/* Camada de dados: para migrar para Supabase/Firebase/API, substituir só load() e save(). */
const Store={
  load(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}},
  save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}if(Sync.link)Sync.push(s)}
};
const MILESTONES=[
  {xp:5000,name:'Primeira chama',reward:'Um jantar escolhido por quem está a perder.'},
  {xp:10000,name:'Dez mil',reward:'Uma carta escrita à mão.'},
  {xp:20000,name:'Vinte mil',reward:'Escolher o próximo encontro.'},
  {xp:50000,name:'Meio caminho',reward:'Um fim-de-semana fora.'},
  {xp:100000,name:'Cem mil',reward:'Uma viagem que ainda não existe.'}];
const TH='M0 30C100 6 200 54 300 30S500 6 600 30';
let S=Store.load(),cur='home',lastPct=0,fresh=0;
const total=()=>S.users[0].xp+S.users[1].xp;
const nextMs=(t=total())=>MILESTONES.find(m=>t<m.xp)||MILESTONES[MILESTONES.length-1];
const who=m=>m.who==='both'?'Ambos':S.users[+m.who].name;
const ago=t=>{const m=(Date.now()-t)/6e4,d=new Date(t),n=new Date();if(m<1)return'Agora';if(m<60)return`Há ${~~m} min`;if(d.toDateString()===n.toDateString())return`Há ${~~(m/60)} h`;if(d.toDateString()===new Date(n-864e5).toDateString())return'Ontem';return d.toLocaleDateString('pt-PT',{day:'numeric',month:'short'})};

function countUp(el,a,b,ms=900){if(!el)return;if(reduce){el.textContent=fmt(b);return}const t0=performance.now();(function f(t){const p=Math.min(1,(t-t0)/ms);el.textContent=fmt(a+(b-a)*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(t0)}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2400)}
const chips=(name,opts,c)=>`<div class="chips">${opts.map(o=>{const[v,t=v]=Array.isArray(o)?o:[o];return`<label class="chip"><input type="radio" name="${name}" value="${esc(v)}"${String(v)===String(c)?' checked':''}><span>${esc(t)}</span></label>`}).join('')}</div>`;

/* Render */
const pTpl=(u,i)=>`<div class="p"><p class="lab">Pessoa 0${i+1}</p><p class="pname serif">${esc(u.name)}</p><p class="pxp" data-u="${i}">${fmt(u.xp)}</p><p class="lab">XP, ${S.history.filter(h=>h.uid===i&&h.kind==='mission').length} missões</p></div>`;
const tl=l=>l.length?`<ol class="tl">${l.map(h=>`<li class="rv"><time>${ago(h.t)}</time><div><b class="serif">${h.amt<0?'-':'+'}${fmt(Math.abs(h.amt))} XP</b><p>${esc(S.users[h.uid].name)} ${h.kind==='mission'?'concluiu':h.kind==='loss'?'perdeu':'recebeu'}: “${esc(h.reason)}”</p></div></li>`).join('')}</ol>`:'<p class="serif it mute" style="font-size:1.4rem;margin-top:24px">Ainda nada. O primeiro XP é vosso.</p>';
function rHome(){const t=total(),nx=nextMs(t);
  $('#v-home').innerHTML=`<div class="home"><div class="hero"><p class="lab">Nosso XP</p><h1 class="big serif" id="bigxp"><span id="tot">${fmt(t)}</span></h1>
  <svg class="thread" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true"><path class="track" d="${TH}"/><path class="prog" pathLength="1" d="${TH}"/><line class="tk" x1="600" x2="600" y1="14" y2="46"/></svg>
  <p class="sub"><span>${fmt(t)} / ${fmt(nx.xp)} XP</span><span>${t>=nx.xp?'Tudo conquistado':'Faltam '+fmt(nx.xp-t)}</span></p>
  <p class="lab" style="margin-top:28px">Nosso próximo marco</p><p class="serif it next">${esc(nx.name)}</p></div>
  <div class="side"><div class="duo">${S.users.map(pTpl).join('')}</div><div class="row"><button class="btn" data-a="give">DAR XP</button><button class="ghost" data-a="take">TIRAR XP</button><button class="ghost" data-a="new">+ NOVA MISSÃO</button></div>${tl(S.history.slice(0,3))}</div></div>`}
function mTpl(m){
  const c=['mission','rv'];if(m.done)c.push('done');if(m.id===fresh)c.push('new');if(m.reveal)c.push('reveal');
  if(m.secret&&m.locked)return`<article class="mission secret rv" data-cur="lock"><div><p class="lab">Missão secreta #${pad(m.n)}</p><h3 class="redact" aria-label="Conteúdo oculto">██████████</h3><p class="mute">Abre aos ${fmt(m.unlockAt)} XP</p></div><div class="s2"><p class="mxp">??? XP</p><p class="lab">Bloqueada</p></div></article>`;
  return`<article class="${c.join(' ')}"><div><p class="lab">Missão #${pad(m.n)}${m.secret?' secreta':''}</p><h3>${esc(m.title)}</h3>${m.desc?`<p class="d">“${esc(m.desc)}”</p>`:''}<p class="meta">${who(m)}, ${m.dif}${m.due?', até '+new Date(m.due+'T00:00').toLocaleDateString('pt-PT',{day:'numeric',month:'short'}):''}</p></div><div class="s2"><p class="mxp">+${fmt(m.xp)} XP</p>${m.done?'<p class="lab">Concluída</p>':`<button class="btn" data-a="done" data-id="${m.id}">CONCLUIR</button>`}</div></article>`}
function rMis(){const o=S.missions.filter(m=>!m.done),d=S.missions.filter(m=>m.done);
  $('#v-missoes').innerHTML=`<div class="phead"><h2 class="serif h2">Missões</h2><button class="btn" data-a="new">+ NOVA MISSÃO</button></div>${o.map(mTpl).join('')||'<p class="serif it mute" style="font-size:1.4rem">Sem missões abertas. Inventem uma.</p>'}${d.length?'<h3 class="lab sec">Concluídas</h3>'+d.map(mTpl).join(''):''}`;
  S.missions.forEach(m=>delete m.reveal);fresh=0}
function rXp(){$('#v-xp').innerHTML=`<div class="phead"><h2 class="serif h2">XP</h2><div class="row"><button class="btn" data-a="give">DAR XP</button><button class="ghost" data-a="take">TIRAR XP</button></div></div><div class="duo">${S.users.map(pTpl).join('')}</div><h3 class="lab sec">Histórico</h3>${tl(S.history.slice(0,60))}`}
function rMs(){const t=total(),c=nextMs(t);
  $('#v-marcos').innerHTML=`<div class="phead"><h2 class="serif h2">Marcos</h2></div><ol class="ms">${MILESTONES.map(m=>{const s=t>=m.xp?'done':m===c?'cur':'lock';return`<li class="${s} rv"${s==='done'?` data-a="replay" data-xp="${m.xp}" role="button" tabindex="0" aria-label="Rever ${m.name}"`:''}><span class="node"></span><p class="mx serif">${fmt(m.xp)}</p><p class="mn">${m.name}</p><p class="mute">${s==='lock'?'<span class="redact">██████████████</span>':esc(m.reward)}</p><p class="lab" style="margin-top:6px">${{done:'Concluído',cur:'Actual',lock:'Bloqueado'}[s]}</p></li>`}).join('')}</ol>`}
function rSp(){const t=total(),sn=S.couple.since,d=sn?Math.floor((Date.now()-new Date(sn+'T00:00'))/864e5)+1:'0',
  f=[['Começaram',sn?new Date(sn+'T00:00').toLocaleDateString('pt-PT',{day:'numeric',month:'long',year:'numeric'}):'Ainda não definido'],['Dias juntos',d],['XP acumulado',fmt(t)],['Missões concluídas',S.missions.filter(m=>m.done).length],['Marcos desbloqueados',MILESTONES.filter(m=>t>=m.xp).length+' de '+MILESTONES.length]];
  $('#v-espaco').innerHTML=`<div class="space"><div><p class="lab">Este espaço pertence a</p><h2 class="serif spname">${esc(S.couple.name)}</h2><p class="serif it quote">Pequenas coisas.<br>Uma história inteira.</p><dl class="facts">${f.map(([k,v])=>`<div><dt>${k}</dt><dd class="serif">${v}</dd></div>`).join('')}</dl></div><div><button class="photo" data-a="photo" data-cur="1" aria-label="Escolher fotografia">${S.photo?`<img src="${S.photo}" alt="Fotografia de ${esc(S.couple.name)}">`:'<span class="serif it">Uma fotografia vossa.</span>'}</button><button class="ghost quiet" data-a="reset">Sair deste espaço</button>${Sync.link?`<p class="lab" style="margin-top:28px">Código do espaço</p><p class="serif" style="font-size:1.8rem;letter-spacing:.04em">${Sync.show(Sync.link.code)}</p><button class="ghost quiet" data-a="share">PARTILHAR CONVITE</button>`:''}</div></div>`}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1});
function render(){$('#sp').textContent=S.couple.name;rHome();rMis();rXp();rMs();rSp();$$('.rv').forEach(e=>io.observe(e))}
function setThread(){const p=$('.prog');if(!p)return;const pct=Math.min(1,total()/nextMs().xp);p.style.strokeDashoffset=1-lastPct;requestAnimationFrame(()=>requestAnimationFrame(()=>{p.style.strokeDashoffset=1-pct}));lastPct=pct}
function go(v,keep){cur=v;if(v==='home'&&!keep)lastPct=0;
  $$('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));$$('.nav button').forEach(b=>b.toggleAttribute('aria-current',b.dataset.v===v)||b.removeAttribute('aria-current'));
  $$('.nav button').forEach(b=>{if(b.dataset.v===v)b.setAttribute('aria-current','page')});
  scrollTo(0,0);if(v==='home'){setThread();if(!keep)countUp($('#tot'),0,total(),1200)}}

/* Sheets (modais) */
const dlg=$('#dlg'),sheet=$('#sheet');
function openSheet(h,init){sheet.innerHTML=h;dlg.showModal();requestAnimationFrame(()=>dlg.classList.add('open'));init(sheet)}
function closeSheet(){dlg.classList.remove('open');setTimeout(()=>dlg.open&&dlg.close(),reduce?0:320)}
dlg.addEventListener('cancel',e=>{e.preventDefault();closeSheet()});
dlg.addEventListener('click',e=>{if(e.target===dlg)closeSheet()});
function bad(f,n,msg){$('.err',f).textContent=msg;const i=$(`[name=${n}]`,f);i.classList.remove('bad');void i.offsetWidth;i.classList.add('bad');i.focus()}
function missionSheet(){const n=S.users.map(u=>u.name);
  openSheet(`<h2 class="serif h2" id="sh">Nova missão</h2><form novalidate>
  <label>Nome da missão<input name="title" maxlength="40" autocomplete="off"></label>
  <label>Descrição<input name="desc" maxlength="80" autocomplete="off" placeholder="Durante 30 segundos."></label>
  <label>XP<input name="xp" type="number" min="10" step="10" value="1000" inputmode="numeric"></label>
  <fieldset><legend>Quem deve cumprir</legend>${chips('who',[['0',n[0]],['1',n[1]],['both','Ambos']],'both')}</fieldset>
  <fieldset><legend>Dificuldade</legend>${chips('dif',['Fácil','Normal','Difícil','Insana'],'Normal')}</fieldset>
  <label>Data limite (opcional)<input name="due" type="date"></label><p class="err" role="alert"></p>
  <div class="row"><button type="button" class="ghost" data-a="x">CANCELAR</button><button class="btn">CRIAR MISSÃO</button></div></form>`,f=>{
    $('form',f).onsubmit=e=>{e.preventDefault();const d=new FormData(e.target),t=d.get('title').trim(),xp=+d.get('xp');
      if(!t)return bad(f,'title','Dá um nome à missão.');if(!(xp>0))return bad(f,'xp','O XP tem de ser maior que zero.');
      const m={id:Date.now(),n:S.next++,title:t,desc:d.get('desc').trim(),xp,who:d.get('who'),dif:d.get('dif'),due:d.get('due'),done:false};
      S.missions.unshift(m);fresh=m.id;Store.save(S);closeSheet();render();go('missoes');toast('Missão criada.')}})}
function giveSheet(){const n=S.users.map(u=>u.name);
  openSheet(`<h2 class="serif h2" id="sh">Dar XP</h2><form novalidate>
  <fieldset><legend>Quem recebe?</legend>${chips('who',[['0',n[0]],['1',n[1]]],'0')}</fieldset>
  <fieldset><legend>Quantidade</legend>${chips('q',[100,500,1000,2500,5000].map(v=>[v,'+'+fmt(v)]),1000)}</fieldset>
  <label>Ou valor personalizado<input name="c" type="number" min="1" inputmode="numeric"></label>
  <label>Por quê?<input name="r" maxlength="60" autocomplete="off" placeholder="Porque me fez rir hoje."></label><p class="err" role="alert"></p>
  <div class="row"><button type="button" class="ghost" data-a="x">CANCELAR</button><button class="btn">ATRIBUIR XP</button></div></form>`,f=>{
    $('form',f).onsubmit=e=>{e.preventDefault();const d=new FormData(e.target),amt=+d.get('c')||+d.get('q'),r=d.get('r').trim();
      if(r.length<2)return bad(f,'r','Escreve o motivo.');if(!(amt>0))return bad(f,'c','Escolhe uma quantidade.');
      closeSheet();award([{uid:+d.get('who'),amt}],r,'gift')}})}
function loseSheet(){const n=S.users.map(u=>u.name);
  openSheet(`<h2 class="serif h2" id="sh">Tirar XP</h2><form novalidate>
  <fieldset><legend>De quem?</legend>${chips('who',[['0',n[0]],['1',n[1]]],'0')}</fieldset>
  <fieldset><legend>Quantidade</legend>${chips('q',[100,500,1000,2500,5000].map(v=>[v,'-'+fmt(v)]),100)}</fieldset>
  <label>Ou valor personalizado<input name="c" type="number" min="1" inputmode="numeric"></label>
  <label>Por quê?<input name="r" maxlength="60" autocomplete="off" placeholder="Ajuste de XP."></label><p class="err" role="alert"></p>
  <div class="row"><button type="button" class="ghost" data-a="x">CANCELAR</button><button class="btn">REMOVER XP</button></div></form>`,f=>{
    $('form',f).onsubmit=e=>{e.preventDefault();const d=new FormData(e.target),uid=+d.get('who'),amt=+d.get('c')||+d.get('q'),r=d.get('r').trim();
      if(r.length<2)return bad(f,'r','Escreve o motivo.');if(!(amt>0))return bad(f,'c','Escolhe uma quantidade.');if(amt>S.users[uid].xp)return bad(f,'c','Não podes retirar mais XP do que a pessoa tem.');
      closeSheet();award([{uid,amt:-amt}],r,'loss')}})}

/* Momentos: recompensa e marcos */
function moment(label,amt,from,to){return new Promise(res=>{const st=$('#stage');st.className='stage on';
  st.innerHTML=`<div><p class="line lab" style="--d:.1s">${label}</p><p class="line b2 serif" style="--d:.4s">${amt<0?'-':'+'}${fmt(Math.abs(amt))} XP</p><p class="line lab" style="--d:.9s">Total <b id="tt" style="color:var(--text);font-size:1.2rem;font-weight:500">${fmt(from)}</b></p><p class="line serif it" style="--d:1.7s">${amt<0?'Ajustado.':'Mais perto.'}</p></div>`;
  setTimeout(()=>countUp($('#tt'),from,to,1000),900);
  const end=()=>{clearTimeout(t);st.onclick=null;st.className='stage';st.innerHTML='';res()},t=setTimeout(end,3400);st.onclick=end})}
function unlockSeq(m){return new Promise(res=>{const st=$('#stage');st.className='stage on dark';
  st.innerHTML=`<div><p class="line huge serif" style="--d:.3s">${fmt(m.xp)}</p><p class="line lab" style="--d:1.3s">Marco desbloqueado</p><p class="line serif it" style="--d:2.1s">Vocês chegaram até aqui.</p><p class="line lab" style="--d:3s;margin-top:32px">Recompensa</p><p class="line serif" style="--d:3.3s;font-size:1.8rem">“${esc(m.reward)}”</p><button class="btn line" style="--d:4s;margin-top:28px" id="ab">ABRIR</button></div>`;
  st.focus();const end=()=>{document.removeEventListener('keydown',k);st.className='stage';st.innerHTML='';res();go('marcos')},k=e=>e.key==='Escape'&&end();
  document.addEventListener('keydown',k);$('#ab').onclick=end})}
async function award(list,reason,kind){
  const before=total(),pre=S.users.map(u=>u.xp),amt=list.reduce((s,x)=>s+x.amt,0);
  lastPct=Math.min(1,before/nextMs(before).xp);
  list.forEach(x=>{S.users[x.uid].xp=Math.max(0,S.users[x.uid].xp+x.amt);S.history.unshift({t:Date.now(),uid:x.uid,amt:x.amt,reason,kind})});
  const after=total(),crossed=MILESTONES.filter(m=>before<m.xp&&after>=m.xp);
  S.missions.forEach(m=>{if(m.secret&&m.locked&&after>=m.unlockAt){m.locked=false;m.reveal=1}});
  Store.save(S);await moment(kind==='mission'?'MISSÃO COMPLETA':kind==='loss'?'XP REMOVIDO':'XP ATRIBUÍDO',amt,before,after);
  render();go('home',1);countUp($('#tot'),before,after,1200);
  $$('.pxp').forEach(e=>countUp(e,pre[e.dataset.u],S.users[e.dataset.u].xp,1200));
  const b=$('#bigxp');b.classList.add('pulse');
  for(const m of crossed){await new Promise(r=>setTimeout(r,1800));await unlockSeq(m)}}
function completeMission(id){const m=S.missions.find(x=>x.id===id);if(!m||m.done||(m.secret&&m.locked))return;
  m.done=true;award(m.who==='both'?[{uid:0,amt:m.xp/2},{uid:1,amt:m.xp/2}]:[{uid:+m.who,amt:m.xp}],m.title,'mission')}

/* Eventos */
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
  if(a==='new')missionSheet();else if(a==='give')giveSheet();else if(a==='take')loseSheet();else if(a==='x')closeSheet();
  else if(a==='done')completeMission(+b.dataset.id);
  else if(a==='replay')unlockSeq(MILESTONES.find(m=>m.xp==b.dataset.xp));
  else if(a==='share')share();
  else if(a==='photo')$('#file').click();
  else if(a==='reset'&&confirm('Sair deste espaço neste dispositivo? O espaço continua a existir e podes voltar com o código.')){localStorage.removeItem(KEY);Sync.leave();location.reload()}});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role=button]')){e.preventDefault();e.target.click()}});
$$('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
$('#file').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>{const k=Math.min(1,720/i.width),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);S.photo=c.toDataURL('image/jpeg',.8);Store.save(S);render()};i.src=r.result};r.readAsDataURL(f)};
let ck=0,ct;$('#logo').onclick=()=>{ck++;clearTimeout(ct);ct=setTimeout(()=>ck=0,1800);if(ck>=5){ck=0;const w=document.createElement('div');w.className='whisper serif';w.textContent='you found us.';document.body.append(w);setTimeout(()=>w.remove(),3600)}};
if(matchMedia('(hover:hover) and (pointer:fine)').matches){document.body.classList.add('hc');const c=$('#cur');addEventListener('pointermove',e=>{c.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;const t=e.target.closest('button,a,input,label,[data-cur],[role=button]');c.dataset.s=t?(t.closest('[data-cur=lock]')?'lock':'act'):''},{passive:true})}

/* Primeiro acesso */
const steps=$$('.step');let si=0;
function step(i){si=i;steps.forEach((s,j)=>s.classList.toggle('on',j===i));const f=$('input,button',steps[i]);f&&f.focus({preventScroll:true})}
$$('[data-next]').forEach(b=>b.onclick=()=>step(si+1));
$('#n1').oninput=e=>{$('#f2').hidden=!e.target.value.trim()};
const chk=()=>{$('#b1').disabled=!($('#n1').value.trim()&&$('#n2').value.trim())};$('#n1').addEventListener('input',chk);$('#n2').addEventListener('input',chk);
$('#enter').onclick=()=>{S={couple:{name:$('#sn').value.trim()||'Us.',since:$('#sd').value},next:17,photo:'',history:[],
  users:[{name:$('#n1').value.trim(),xp:8430},{name:$('#n2').value.trim(),xp:10000}],
  missions:[{id:1,n:14,title:'Anda como um sapo',desc:'Durante 30 segundos.',xp:1000,who:'both',dif:'Fácil',due:'',done:false},
    {id:2,n:15,title:'Faz uma surpresa',desc:'Sem avisar.',xp:2500,who:'1',dif:'Normal',due:'',done:false},
    {id:3,n:16,title:'Uma noite sem telemóveis',desc:'Só nós dois, até ao fim do dia.',xp:5000,who:'both',dif:'Difícil',due:'',done:false,secret:true,locked:true,unlockAt:20000}]};
  Store.save(S);create()};
function start(){$('#intro').hidden=true;$('#app').hidden=false;render();go('home');if(Sync.link&&!start.p){start.p=setInterval(tick,3500);tick()}}

/* Ligação entre as duas pessoas */
$('#go0').onclick=()=>step(Sync.on?1:2);$('#jn').onclick=()=>step(5);$('#go2').onclick=start;
async function create(){if(!Sync.on)return start();
  try{const c=await Sync.create(S);$('#cd').textContent=Sync.show(c);step(6)}catch(e){console.error(e);toast('Servidor: '+(e.message||'erro desconhecido'))}}
async function share(){const u=location.origin+location.pathname+'#'+Sync.link.code;
  try{if(navigator.share)await navigator.share({title:'US.',text:'Entra no nosso espaço. Código: '+Sync.show(Sync.link.code),url:u});else{await navigator.clipboard.writeText(u);toast('Link copiado.')}}catch(e){}}
$('#jb').onclick=async()=>{const c=Sync.norm($('#jc').value);if(c.length<12)return toast('O código tem 12 caracteres.');
  try{const r=await Sync.find(c);if(!r)return toast('Não encontrei esse espaço.');
    $('#jw').innerHTML='<p class="lab" style="width:100%">Quem és?</p>'+r.data.users.map((u,i)=>`<button class="btn" data-me="${i}">SOU ${esc(u.name).toUpperCase()}</button>`).join('');
    $$('#jw [data-me]').forEach(b=>b.onclick=async()=>{try{S=await Sync.join(c,+b.dataset.me);localStorage.setItem(KEY,JSON.stringify(S));start()}catch(e){console.error(e);toast('Não foi possível entrar nesta sala.')}})}
  catch(e){console.error(e);toast('Servidor: '+(e.message||'erro desconhecido'))}};
async function tick(){if(tick.b||!Sync.link||document.hidden||dlg.open||$('#stage').classList.contains('on'))return;tick.b=1;
  try{const r=await Sync.pull();if(r)await applyRemote(r)}catch(e){}tick.b=0}
async function applyRemote(r){const n=r.data,me=Sync.link.me,before=total(),last=S.history[0]?S.history[0].t:0,news=n.history.filter(h=>h.t>last),
    after=n.users[0].xp+n.users[1].xp,crossed=MILESTONES.filter(m=>before<m.xp&&after>=m.xp),mine=news.filter(h=>h.uid===me).reduce((s,h)=>s+h.amt,0);
  S=n;localStorage.setItem(KEY,JSON.stringify(S));
  if(mine>0)await moment('XP RECEBIDO',mine,before,after);else toast('Novidades no vosso espaço.');
  lastPct=Math.min(1,before/nextMs(before).xp);render();
  if(cur==='home'){setThread();countUp($('#tot'),before,after,1100)}
  for(const m of crossed){await new Promise(r=>setTimeout(r,1500));await unlockSeq(m)}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});

/* Arranque */
const hh=Sync.norm(location.hash);
if(Sync.link){Sync.pull(!S).then(r=>{if(r?.data){S=r.data;localStorage.setItem(KEY,JSON.stringify(S))}if(S?.users)start();else throw new Error('empty room')}).catch(e=>{console.error(e);toast('Sem ligação ao servidor.')})}
else if(!Sync.on&&S&&S.users)start();
else{$('#intro').hidden=false;if(Sync.on&&hh.length>=12){$('#jc').value=hh;step(5)}else step(0)}
