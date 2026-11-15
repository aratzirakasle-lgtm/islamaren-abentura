/* Islamaren Abentura V37 · aula conectada; los motores de los 10 juegos siguen intactos.
   RPC protegidas en Supabase. Sin configurar, la V36.7 conserva su modo local. */
(()=>{'use strict';
const C=window.V37_CONFIG||{};
const cfgOK=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(C.url||'')&&
 /^sb_publishable_[A-Za-z0-9_-]+$/.test(C.publicKey||'');
const GAMES=[['arabia','Arabia'],['denbora','Denbora-lerroa'],['bost','Bost zutabeak'],
 ['hedapena','Hedapena'],['kalifaldi','Kalifaldiak'],['gizartea','Gizartea'],
 ['hiria','Hiria'],['merkataritza','Merkataritza'],['artea','Artea eta mezkita'],['ondarea','Ondarea']];
const GAME_SET=new Set(GAMES.map(x=>x[0]));
const DB_KEY='islama-v4-puntuazioak', SESSION_KEY='v37-aula-saioak';
const $$=id=>document.getElementById(id);
const E=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let session=null,roomSnapshot=null,activeGame='',seen={},selectedStudent='',selectedGame='',
 retryQueue=[],refreshBusy=false, lastProgress=0,rankVisible=false;
let storageReady=false, nativeGet, nativeSet;
function appStatus(message,kind='info'){
 const e=$$('v37-status');if(e){e.textContent=message;e.dataset.kind=kind;}
}
function configWarning(){appStatus(cfgOK?'Ikasgela konektatu gabe':'Hodeia konfiguratu gabe · tokiko modua',cfgOK?'info':'warn');}
function apiBase(){return (C.url||'').replace(/\/$/,'')+'/rest/v1/rpc/';}
async function rpc(fn,payload={},accessToken=null){
 if(!cfgOK)throw Error('Hodeiko zerbitzua ez dago konfiguratuta.');
 const ctrl=new AbortController(),tid=setTimeout(()=>ctrl.abort(),11000);
 try{
  const headers={'apikey':C.publicKey,'Content-Type':'application/json'};
  if(accessToken)headers.Authorization='Bearer '+accessToken;
  const r=await fetch(apiBase()+fn,{method:'POST',headers,body:JSON.stringify(payload),cache:'no-store',signal:ctrl.signal});
  const value=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(typeof value?.message==='string'?value.message:'Zerbitzuak '+r.status+' erantzun du.');
  return value;
 }finally{clearTimeout(tid)}
}
function roomsKey(){return session?'v37-class-results-'+session.room_id+'-r'+session.generation:'';}
function queueKey(){return session?'v37-pending-'+session.room_id+'-r'+session.generation:'';}
function readJSON(k,fallback){try{return JSON.parse(nativeGet?nativeGet.call(localStorage,k):localStorage.getItem(k))||fallback}catch{return fallback}}
function saveJSON(k,v){try{(nativeSet||Storage.prototype.setItem).call(localStorage,k,JSON.stringify(v));return true}catch{return false}}
function installStorage(){
 if(storageReady)return;
 try{
  nativeGet=Storage.prototype.getItem;nativeSet=Storage.prototype.setItem;
  Storage.prototype.getItem=function(key){
   if(this===window.localStorage&&key===DB_KEY&&session){return nativeGet.call(this,roomsKey())||'{}'}
   return nativeGet.call(this,key);
  };
  Storage.prototype.setItem=function(key,value){
   if(this===window.localStorage&&key===DB_KEY&&session){
    const old=nativeGet.call(this,roomsKey())||'{}';
    const result=nativeSet.call(this,roomsKey(),value);
    queueMicrotask(()=>inspectScoreChange(old,String(value)));
    return result;
   }
   return nativeSet.call(this,key,value);
  };
  storageReady=true;
 }catch(err){console.warn('V37 Storage adapter:',err)}
}
function scoreSnapshot(){const x=readJSON(roomsKey(),{});return x&&typeof x==='object'?x:{}}
function currentBest(game,nick){
 const data=scoreSnapshot();const bucket=data[game]||{};
 const entry=Object.values(bucket).find(e=>e&&String(e.name||e.nick||'').normalize('NFC').trim().toLocaleLowerCase('eu')===nick.toLocaleLowerCase('eu'));
 return typeof entry?.score==='number'?entry.score:null;
}
function inspectScoreChange(before,after){
 if(!session)return;
 let oldData,newData;try{oldData=JSON.parse(before);newData=JSON.parse(after)}catch{return}
 for(const [game] of GAMES){
  const bucket=newData?.[game];if(!bucket||typeof bucket!=='object')continue;
  for(const r of Object.values(bucket)){
   if(!r||typeof r!=='object'||String(r.name||r.nick||'').normalize('NFC').trim().toLocaleLowerCase('eu')!==session.nickname.toLocaleLowerCase('eu'))continue;
   const v=Number(r.score);
   if(!Number.isFinite(v)||v<0||v>1000)continue;
   const old=Object.values(oldData?.[game]||{}).find(x=>x&&String(x.name||x.nick||'').toLocaleLowerCase('eu')===session.nickname.toLocaleLowerCase('eu'));
   if(!old||v>Number(old.score)){
     const attempt=(crypto.randomUUID?.()||('v37-'+Date.now()+'-'+Math.random().toString(36).slice(2)));
     retryQueue.push({p_game:game,p_score:Math.round(v),p_attempt:attempt});
     saveJSON(queueKey(),retryQueue);activeGame='';
     flushScores();appStatus('Marka bidaltzen: '+game+' · '+v+' puntu','info');
   }
  }
 }
}
async function flushScores(){
 if(!session||!retryQueue.length||flushScores.busy)return;
 flushScores.busy=true;
 try{
  while(retryQueue.length&&session){
   let x=retryQueue[0];
   await rpc('v37_student_finish',{p_token:session.token,p_generation:session.generation,...x});
   retryQueue.shift();saveJSON(queueKey(),retryQueue);
   appStatus('Marka hodeian gordeta ✓','success');
   void fetchBoard();
  }
 }catch(err){appStatus('Konexiorik ez; markak berriz bidaliko dira.','warn');}
 finally{flushScores.busy=false}
}
function readSessions(){return readJSON(SESSION_KEY,{})}
function persistSession(s){const entries=readSessions();entries[s.code]=s;saveJSON(SESSION_KEY,entries)}
function clearSession(){
 const entries=readSessions();if(session)delete entries[session.code];saveJSON(SESSION_KEY,entries);
 session=null;roomSnapshot=null;retryQueue=[];activeGame='';
 configWarning();drawDock();drawJoin();
}
async function joinRoom(code,nickname,fromSaved=false){
 if(!cfgOK){appStatus('Irakasleak ez du hodeia konfiguratu.','warn');return}
 const inputCode=String(code||'').trim().toUpperCase(),name=String(nickname||'').trim();
 if(!/^[0-9A-F]{10}$/.test(inputCode)||!/^[\p{L}0-9_-]{3,20}$/u.test(name)){
  appStatus('Kodea (10 karakter) eta goitizen baliozkoa behar dira.','warn');return;
 }
 const old=readSessions()[inputCode];
 try{
  appStatus('Ikasgelara konektatzen…');
  const response=await rpc('v37_student_join',{p_code:inputCode,p_nickname:name,p_resume_token:old?.token||null});
  session={code:inputCode,nickname:response.nickname,room:response.room,room_id:response.room_id,generation:response.generation||1,token:response.token};
  persistSession(session);installStorage();
  retryQueue=readJSON(queueKey(),[]);
  if(!Array.isArray(retryQueue))retryQueue=[];
  appStatus('Konektatuta · '+session.room,'success');
  drawDock();drawJoin();await fetchBoard();void flushScores();
  if(!fromSaved)showTab('ranking');
 }catch(err){if(fromSaved){clearSession();return}appStatus(err.message||'Konexio-errorea','warn')}
}
function drawDock(){const e=$$('v37-button');if(!e)return;e.textContent=session?'🏆 Zuzenean · '+session.nickname:'🏆 Ikasgela';
 const name=$$('v37-room-name');if(name)name.textContent=session?session.room:'Aula conectada';}
function drawJoin(){const e=$$('v37-login');if(!e)return;
 if(session){e.innerHTML=`<div class="v37-connected"><strong>✓ ${E(session.nickname)}</strong><span>${E(session.room)} · Kodea ${E(session.code)}</span><button id="v37-exit" type="button" class="v37-btn small">Saioa aldatu</button></div>`;
  e.querySelector('#v37-exit').onclick=()=>{if(confirm('Aldatu gelako saioa?'))clearSession()};
 }else{
 e.innerHTML=`<form id="v37-join-form" class="v37-join"><label>Gelako kodea <input id="v37-code" autocomplete="off" maxlength="10" placeholder="AB12CD34EF" required/></label><label>Goitizena <input id="v37-nick" autocomplete="off" maxlength="20" placeholder="Izar24" required/></label><button class="v37-btn primary" type="submit" ${cfgOK?'':'disabled'}>Sartu ikasgelan</button></form>`;
 const query=new URLSearchParams(location.search).get('klase');if(query)e.querySelector('#v37-code').value=query;
 e.querySelector('#v37-join-form').onsubmit=e=>{e.preventDefault();joinRoom($$('v37-code').value,$$('v37-nick').value)};
 }
}
function openModal(){const e=$$('v37-overlay');e.hidden=false;showTab(session?'ranking':'connect');if(session)fetchBoard()}
function closeModal(){$$('v37-overlay').hidden=true;rankVisible=false}
function showTab(which){
 $$('v37-connect-tab').hidden=which!=='connect';$$('v37-rank-tab').hidden=which!=='ranking';
 $$('v37-tab-join').classList.toggle('active',which==='connect');$$('v37-tab-rank').classList.toggle('active',which==='ranking');
 rankVisible=which==='ranking';if(rankVisible)renderBoard();
}
function format(n){return Math.round(Number(n)||0).toLocaleString('es-ES')}
function renderBoard(){
 const panel=$$('v37-board');if(!panel)return;
 if(!session){panel.innerHTML='<p>Sartu lehenik ikasgelaren kodearekin.</p>';return}
 if(!roomSnapshot){panel.innerHTML='<p>Elkarbanatutako puntuazioak kargatzen…</p>';return}
 const students=(roomSnapshot.students||[]).slice();
 const measure=s=>selectedGame?Number(s.scores?.[selectedGame]||0):Number(s.total||0);
 const maximum=selectedGame?1000:10000;
 students.sort((a,b)=>measure(b)-measure(a)||Number(b.completed)-Number(a.completed)||a.nickname.localeCompare(b.nickname,'eu'));
 const own=students.find(s=>String(s.nickname).toLocaleLowerCase('eu')===session.nickname.toLocaleLowerCase('eu'));
 const medal=['🥇','🥈','🥉'];
 const podium=students.slice(0,3).map((s,i)=>`<div class="v37-podium-item p${i+1}"><span class="v37-medal">${medal[i]}</span><strong>${E(s.nickname)}</strong><b>${format(measure(s))} <small>/ ${format(maximum)}</small></b><small>${s.completed}/10 joko</small></div>`).join('');
 let rows=students.map((s,i)=>{
  const live=s.activity&&s.activity.status==='playing'&&Date.now()-Date.parse(s.activity.updated_at)<46000;
  return `<button type="button" class="v37-leader-row ${s.nickname===session.nickname?'mine':''}" data-v37-student="${E(s.id)}"><span>${i+1}.</span><strong>${E(s.nickname)}</strong><span>${s.completed}/10</span><b>${format(measure(s))}</b>${live?'<em>● Jokatzen</em>':''}</button>`;
 }).join('');
 const current=students.find(s=>s.id===selectedStudent)||own;
 const perGame=current?GAMES.map(([id,name],i)=>{
  const score=current.scores?.[id];const pending=score==null;
  const active=current.activity?.game===id&&current.activity?.status==='playing';
  const v=pending?0:Number(score)||0;
  return `<div class="v37-score-box"><span>${i+1}. ${E(name)}</span><strong>${pending?'—':format(v)}</strong><div class="v37-bar"><i style="width:${Math.min(100,Math.max(0,v/10))}%"></i></div>${active?'<small>Jokatzen · '+format(current.activity.partial||0)+' puntu behin-behineko</small>':''}</div>`;
 }).join(''):'';
 panel.innerHTML=`<div class="v37-board-head"><strong>${E(roomSnapshot.room.title)}</strong><span>${students.length} jokalari · Eguneratze automatikoa</span></div><label class="v37-filter-label">Sailkapena <select id="v37-game-filter"><option value="">Orokorra · 10 jokoak</option>${GAMES.map(([id,n])=>`<option value="${id}" ${selectedGame===id?'selected':''}>${E(n)}</option>`).join('')}</select></label>${students.length?`<div class="v37-podium">${podium}</div><div class="v37-leaders">${rows}</div><div class="v37-student-detail"><h3>${E(current?.nickname||'')} · 10 jokoak</h3><div class="v37-score-grid">${perGame}</div></div>`:'<p class="v37-empty">Oraindik ez dago ikaslerik. Izan zaitez lehena!</p>'}`;
 panel.querySelector('#v37-game-filter').onchange=e=>{selectedGame=e.target.value;renderBoard()};
 panel.querySelectorAll('[data-v37-student]').forEach(b=>b.onclick=()=>{selectedStudent=b.dataset.v37Student;renderBoard()});
}
async function fetchBoard(){if(!session||refreshBusy)return;
 refreshBusy=true;
 try{
  roomSnapshot=await rpc('v37_student_board',{p_token:session.token});
  if(roomSnapshot?.room?.generation&&roomSnapshot.room.generation!==session.generation){
   session.generation=roomSnapshot.room.generation;persistSession(session);retryQueue=[];
   activeGame='';appStatus('Irakasleak ikasgela berrabiarazi du. Markak hutsetik.', 'warn');
  }
  if(rankVisible)renderBoard();
  const mine=(roomSnapshot?.students||[]).find(s=>s.nickname===session.nickname);
  if(mine){const t=$$('v37-total');if(t)t.textContent=format(mine.total)+' puntu';}
 }catch(err){appStatus('Sarea: '+(err.message||'ez dago konektatuta'),'warn')}
 finally{refreshBusy=false}
}
function visibleText(selector){const e=document.querySelector(selector);if(!e||e.closest('[hidden]')||e.getClientRects().length===0)return '';
 return (e.textContent||'').trim();}
function currentPartial(){
 const sel={arabia:'#aa-score',denbora:'#tl9-score',bost:'#p10-score',
  hedapena:'#hd-score',kalifaldi:'#cv14-score',gizartea:'#s17-score',
  hiria:'#city-score',merkataritza:'#ag24-score',artea:'#a30-score',ondarea:'#od-score'}[activeGame];
 if(!sel)return 0;
 const m=visibleText(sel).match(/\b\d[\d.,]*\b/);if(!m)return 0;
 const n=Number(m[0].replace(/\./g,'').replace(',','.'));
 return Number.isFinite(n)?Math.min(1000,Math.max(0,Math.round(n))):0;
}
async function reportProgress(force=false,status='playing'){
 if(!session||!activeGame||(!force&&Date.now()-lastProgress<3500))return;
 lastProgress=Date.now();
 try{await rpc('v37_student_progress',{p_token:session.token,p_game:activeGame,
  p_partial:currentPartial(),p_status:status,p_generation:session.generation})}catch(err){ /* retry on next heartbeat */ }
}
function trackGameClicks(){
 function applyClassNickname(){
  if(!session)return;
  for(const e of document.querySelectorAll('input[type="text"],input:not([type])')){
   if(!/(nick|name|goitizen|izen)/i.test(e.id+' '+e.name+' '+e.placeholder))continue;
   if(e.closest('#v37-overlay')||e===document.activeElement)continue;
   if(e.getClientRects().length&&e.value!==session.nickname)e.value=session.nickname;
  }
 }
 document.addEventListener('pointerdown',e=>{
  if(session&&!e.target.matches('input'))applyClassNickname();
 },true);
 document.addEventListener('keydown',e=>{if(session&&e.key==='Enter')applyClassNickname()},true);
 document.addEventListener('click',e=>{
  if(!session)return;
  const item=e.target.closest('[data-game]');
  if(item&&GAME_SET.has(item.dataset.game)){
   activeGame=item.dataset.game;void reportProgress(true);
  }
  if(e.target.closest('#back-home, #home-btn, [data-back-home], .v37-exit-game')){
   if(activeGame){void reportProgress(true,'idle');activeGame=''}
  }
 },true);
 setInterval(applyClassNickname,950);
 // Detecta también la transición directa del juego 9 al 10.
 const engine=window.ISLAMA_V33_GAME10;
 if(engine&&typeof engine.launch==='function'&&!engine.__v37Wrapped){
  const original=engine.launch;
  engine.launch=function(...args){if(session){activeGame='ondarea';void reportProgress(true)}return original.apply(this,args)};
  engine.__v37Wrapped=true;
 }
}
function makeUI(){
 document.body.insertAdjacentHTML('beforeend',`<div id="v37-cloud-dock" role="region" aria-label="Ikasgela konektatua"><button id="v37-button" type="button">🏆 Ikasgela</button><span id="v37-total"></span></div>
 <div id="v37-overlay" hidden role="dialog" aria-modal="true" aria-label="Ikasgelako sailkapena"><div class="v37-modal">
 <div class="v37-modal-top"><div><small>ISLAMAREN ABENTURA · V37</small><h2>🏆 Sailkapena zuzenean</h2><p id="v37-room-name">Aula conectada</p></div><button id="v37-close" type="button" aria-label="Itxi">✕</button></div>
 <div class="v37-tabs"><button id="v37-tab-join">Ikasgelako saioa</button><button id="v37-tab-rank">Zuzeneko sailkapena</button></div>
 <div id="v37-status" role="status"></div><section id="v37-connect-tab"><div id="v37-login"></div></section><section id="v37-rank-tab"><div id="v37-board"></div></section>
 <p class="v37-footer">Jokoko errekorrak automatikoki gordetzen dira konektatuta zaudenean. Internetik gabe, tokiko markak erabiliko dira.</p></div></div>`);
 $$('v37-button').onclick=openModal;$$('v37-close').onclick=closeModal;
 $$('v37-overlay').addEventListener('click',e=>{if(e.target.id==='v37-overlay')closeModal()});
 $$('v37-tab-join').onclick=()=>showTab('connect');$$('v37-tab-rank').onclick=()=>showTab('ranking');
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$$('v37-overlay').hidden)closeModal()});
 const originalRanking=$$('home-ranking');
 if(originalRanking)originalRanking.addEventListener('click',e=>{
  if(session){e.preventDefault();e.stopImmediatePropagation();openModal();}
 },true);
 configWarning();drawJoin();drawDock();
}
function init(){makeUI();installStorage();trackGameClicks();
 if(cfgOK){
  const sessions=readSessions(),qs=new URLSearchParams(location.search).get('klase');
  const found=qs?sessions[qs.toUpperCase()]:Object.values(sessions)[0];
  if(found?.code&&found?.nickname)void joinRoom(found.code,found.nickname,true);
 }
 setInterval(()=>{if(session){void flushScores();void fetchBoard();if(activeGame)void reportProgress()}},3500);
}
window.V37_CLOUD={get session(){return session?{nickname:session.nickname,room:session.room,code:session.code}:null},open:openModal,join:joinRoom,refresh:fetchBoard,configOK:cfgOK};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
