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
 retryQueue=[],refreshBusy=false, lastProgress=0,rankVisible=false,confirmedCloudBest={};
let storageReady=false, nativeGet, nativeSet;
let lastBoardError='';
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
function restoreClassMarks(){
 // Recover only this pupil's scores from THIS class's isolated storage.
 // Never copy scores from the old unscoped browser data or another class.
 if(!session||!roomSnapshot||!Array.isArray(roomSnapshot.students))return;
 const name=session.nickname.normalize('NFC').trim().toLocaleLowerCase('eu');
 const mine=roomSnapshot.students.find(s=>String(s.nickname||'').normalize('NFC').trim().toLocaleLowerCase('eu')===name);
 if(!mine)return;
 const local=scoreSnapshot();
 let count=0;
 for(const [game] of GAMES){
  const records=local?.[game];
  if(!records||typeof records!=='object')continue;
  const record=Object.values(records).find(r=>r&&String(r.name||r.nick||'').normalize('NFC').trim().toLocaleLowerCase('eu')===name);
  const score=Number(record?.score);
  if(!record||!Number.isFinite(score)||score<0||score>1000)continue;
  const cloud=mine.scores?.[game]==null?-1:Number(mine.scores[game]);
  const known=Math.max(Number.isFinite(cloud)?cloud:-1,confirmedCloudBest[game]??-1);
  if(score<=known||retryQueue.some(x=>x.p_game===game&&Number(x.p_score)>=score))continue;
  retryQueue.push({p_game:game,p_score:Math.round(score),
   p_attempt:crypto.randomUUID?.()||('v37-recover-'+Date.now()+'-'+Math.random().toString(36).slice(2))});
  count++;
 }
 if(count){
  saveJSON(queueKey(),retryQueue);
  appStatus('Tokiko markak berreskuratzen: '+count+' joko · Hodeira bidaltzen…','info');
  void flushScores();
 }
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
   confirmedCloudBest[x.p_game]=Math.max(confirmedCloudBest[x.p_game]??-1,Number(x.p_score)||0);
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
 session=null;roomSnapshot=null;retryQueue=[];activeGame='';confirmedCloudBest={};
 document.documentElement.classList.remove('v37-cloud-connected');
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
  persistSession(session);installStorage();confirmedCloudBest={};
  retryQueue=readJSON(queueKey(),[]);
  if(!Array.isArray(retryQueue))retryQueue=[];
  appStatus('Konektatuta · '+session.room,'success');
  drawDock();drawJoin();await fetchBoard();void flushScores();renderRightRankings();
  if(!fromSaved)showTab('ranking');
 }catch(err){if(fromSaved){clearSession();return}appStatus(err.message||'Konexio-errorea','warn')}
}
function drawDock(){const e=$$('v37-button');if(!e)return;e.textContent=session?'🏆 Zuzenean · '+session.nickname:'🏆 Ikasgela';
 const name=$$('v37-room-name');if(name)name.textContent=session?session.room:'Aula conectada';const myBtn=$$('v37-my-button');if(myBtn)myBtn.hidden=!session;}
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
function openOwnMarks(){
 openModal();if(!session)return;
 const expand=()=>{const d=$$('v37-board')?.querySelector('details.v37-self-details');if(d){d.open=true;d.scrollIntoView({block:'nearest',behavior:'instant'});}};
 expand();void fetchBoard().then(expand);
}
function showTab(which){
 $$('v37-connect-tab').hidden=which!=='connect';$$('v37-rank-tab').hidden=which!=='ranking';
 $$('v37-tab-join').classList.toggle('active',which==='connect');$$('v37-tab-rank').classList.toggle('active',which==='ranking');
 rankVisible=which==='ranking';
 $$('v37-overlay').classList.toggle('v37-fullscreen-ranking',rankVisible);
 if(rankVisible){$$('v37-rank-tab').scrollTop=0;renderBoard();}
}
function format(n){return Math.round(Number(n)||0).toLocaleString('es-ES')}
function renderBoard(){
 const panel=$$('v37-board');if(!panel)return;
 const personalOpen=panel.querySelector('details.v37-self-details')?.open===true;
 if(!session){panel.innerHTML='<p>Sartu lehenik ikasgelaren kodearekin.</p>';return}
 if(!roomSnapshot){panel.innerHTML='<p>Elkarbanatutako puntuazioak kargatzen…</p>';return}
 const students=(roomSnapshot.students||[]).slice();
 const measure=student=>selectedGame?Number(student.scores?.[selectedGame]||0):Number(student.total||0);
 const maximum=selectedGame?1000:10000;
 const isMine=student=>String(student.nickname||'').normalize('NFC').toLocaleLowerCase('eu')===session.nickname.normalize('NFC').toLocaleLowerCase('eu');
 const eligible=students.filter(student=>selectedGame?
   student.scores?.[selectedGame]!=null&&Number.isFinite(Number(student.scores[selectedGame])):
   student.total!=null&&Number(student.completed||0)>0);
 eligible.sort((a,b)=>measure(b)-measure(a)||Number(b.completed||0)-Number(a.completed||0)||String(a.nickname||'').localeCompare(String(b.nickname||''),'eu'));
 const top10=eligible.slice(0,10);
 const mine=students.find(isMine);
 const serverRank=Number(roomSnapshot?.own_ranks?.[selectedGame||'global']);
 const myRank=Number.isInteger(serverRank)&&serverRank>0?serverRank-1:eligible.findIndex(isMine);
 const medal=['🥇','🥈','🥉'];
 const rows=top10.map((student,i)=>`<div class="v37-leader-row ${isMine(student)?'mine':''}" role="listitem"><span class="v37-place">${medal[i]||(i+1)+'.'}</span><strong>${E(student.nickname)}</strong><span>${Number(student.completed||0)}/10</span><b>${format(measure(student))}</b></div>`).join('');
 const ownOutside=mine&&myRank>=10?
   `<div class="v37-my-own-position"><strong>👤 ZURE POSTUA · TOP 10etik kanpo</strong><div class="v37-leader-row mine"><span>${myRank+1}.</span><strong>${E(mine.nickname)}</strong><span>${Number(mine.completed||0)}/10</span><b>${format(measure(mine))}</b></div></div>`:
   mine&&myRank<0?'<p class="v37-my-own-position">👤 Oraindik ez duzu sailkapen honetako markarik.</p>':'';
 const perGame=mine?GAMES.map(([id,name],i)=>{
  const score=mine.scores?.[id],pending=score==null;
  const active=mine.activity?.game===id&&mine.activity?.status==='playing';
  const v=pending?0:Number(score)||0;
  return `<div class="v37-score-box"><span>${i+1}. ${E(name)}</span><strong>${pending?'—':format(v)}</strong><div class="v37-bar"><i style="width:${Math.min(100,Math.max(0,v/10))}%"></i></div>${active?'<small>Jokatzen · '+format(mine.activity.partial||0)+' puntu behin-behineko</small>':''}</div>`;
 }).join(''):'';
 panel.innerHTML=`<div class="v37-board-head"><strong>${E(roomSnapshot.room.title)}</strong><span>🏆 TOP 10</span></div><label class="v37-filter-label">Sailkapena <select id="v37-game-filter"><option value="">Orokorra · 10 jokoak</option>${GAMES.map(([id,n])=>`<option value="${id}" ${selectedGame===id?'selected':''}>${E(n)}</option>`).join('')}</select></label>${top10.length?`<div class="v37-leaders v37-leaders-full" role="list" aria-label="TOP 10">${rows}</div>`:'<p class="v37-empty">Oraindik ez dago amaitutako markarik.</p>'}${ownOutside}${mine?`<details class="v37-self-details" ${personalOpen?'open':''}><summary>👤 NIRE PUNTUAZIOAK · ${E(mine.nickname)} <span>Ikusi 10 jokoetako markak</span></summary><div class="v37-student-detail"><div class="v37-score-grid">${perGame}</div></div></details>`:'<p class="v37-empty">Zure puntuazioak kargatzen…</p>'}`;
 panel.querySelector('#v37-game-filter').onchange=e=>{selectedGame=e.target.value;renderBoard()};
}
function installStudentRankingPrivacyStyle(){
 if(document.getElementById('v37-student-privacy-style'))return;
 const style=document.createElement('style');style.id='v37-student-privacy-style';
 style.textContent='.v37-my-own-position{margin:12px 0;padding:10px;border:2px solid #7cb9b5;border-radius:11px;background:#e9f6f5;color:#164d60;font-size:13px;line-height:1.4}.v37-my-own-position>.v37-leader-row{margin-top:7px}.v37-my-own-position>strong{display:block;margin-bottom:3px}';
 document.head.appendChild(style);
}
async function fetchBoard(){if(!session||refreshBusy)return;
 refreshBusy=true;
 try{
  // Transition-safe: once the Supabase restricted RPC is installed, no full
  // classroom roster is downloaded by the student client. Old deployments
  // keep working until the non-destructive SQL migration is applied.
  try {
   roomSnapshot=await rpc('v37_student_board_safe',{p_token:session.token});
  }catch(error){
   if(!/could not find the function|pgrst202/i.test(String(error?.message||'')))throw error;
   roomSnapshot=await rpc('v37_student_board',{p_token:session.token});
  }
  lastBoardError='';
  if(roomSnapshot?.room?.generation&&roomSnapshot.room.generation!==session.generation){
   session.generation=roomSnapshot.room.generation;persistSession(session);retryQueue=[];
   activeGame='';appStatus('Irakasleak ikasgela berrabiarazi du. Markak hutsetik.', 'warn');
  }
  if(rankVisible)renderBoard();
  renderRightRankings();
  const mine=(roomSnapshot?.students||[]).find(s=>s.nickname===session.nickname);
  if(mine){const t=$$('v37-total');if(t)t.textContent=format(mine.total)+' puntu';}
  restoreClassMarks();
 }catch(err){lastBoardError=String(err?.message||'Konexiorik ez');appStatus('Sarea: '+lastBoardError,'warn');if(rankVisible&&!roomSnapshot){const board=$$('v37-board');if(board)board.innerHTML='<p class="v37-empty">Ezin izan dira puntuazioak kargatu. Egiaztatu konexioa eta saiatu berriro.</p>';}}
 finally{refreshBusy=false}
}
function installRightRankStyle(){
  if(document.getElementById('v37-live-right-style'))return;
  const style=document.createElement('style');style.id='v37-live-right-style';
  style.textContent=
    'html.v37-cloud-connected #aa-rank,html.v37-cloud-connected #v8-ranking,html.v37-cloud-connected #tl9-ranking,html.v37-cloud-connected #p10-ranking,html.v37-cloud-connected #hd-ranklist,html.v37-cloud-connected #cv14-rank-rows,html.v37-cloud-connected #s17-ranking,html.v37-cloud-connected #ranking-rows{display:none!important}'+
    'html:not(.v37-cloud-connected) .v37-live-right-panel{display:none!important}'+
    'html.v37-cloud-connected .v37-live-right-panel{display:block!important}'+
    'html.v37-cloud-connected .v8-local-label,html.v37-cloud-connected .tl9-localnote,html.v37-cloud-connected .p10-rank-local,html.v37-cloud-connected .hd-rank-note,html.v37-cloud-connected .cv14-note,html.v37-cloud-connected #cv14-rank-note,html.v37-cloud-connected #rank-disclaimer,html.v37-cloud-connected .aa-footer>span{display:none!important}'+
    '.v37-live-right-panel{font-family:Trebuchet MS,Arial,sans-serif;flex:1 1 auto;min-width:0;width:100%;max-height:380px;overflow-y:auto;overflow-x:hidden;box-sizing:border-box}'+
    '.v37-right-heading{padding:8px 6px 6px;color:#176552;font-size:11px;font-weight:900;letter-spacing:.1px}'+
    '.v37-right-row{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:7px;border-bottom:1px solid #b7ad8a66;padding:9px 5px;font-size:12px;color:#342a20}'+
    '.v37-right-row.v37-mine{background:#e3f6e7}.v37-right-row .v37-rname{overflow-wrap:anywhere;min-width:0;font-weight:800}'+
    '.v37-right-row .v37-rscore{font-variant-numeric:tabular-nums;font-weight:900;color:#315f44}.v37-right-row .v37-rpos{text-align:center}'+
    '.v37-right-empty{padding:15px 7px;font-size:12px;line-height:1.5;color:#6c6051}'+
    '.v37-right-hint{font-size:10px;color:#537965;padding:6px;line-height:1.4}';
  document.head.appendChild(style);
}
function renderRightRankings(){
  const connected=Boolean(session&&roomSnapshot&&Array.isArray(roomSnapshot.students));
  document.documentElement.classList.toggle('v37-cloud-connected',connected);
  if(!connected)return;
  const panels=[['aa-rank','arabia'],['v8-ranking','arabia'],['tl9-ranking','denbora'],
    ['p10-ranking','bost'],['hd-ranklist','hedapena'],['cv14-rank-rows','kalifaldi'],
    ['s17-ranking','gizartea'],['ranking-rows',null]];
  for(const [id,fixedGame] of panels){
    const el=document.getElementById(id);if(!el)continue;
    const game=fixedGame||activeGame;
    if(!GAME_SET.has(game))continue;
    const rows=roomSnapshot.students.filter(s=>s&&s.scores&&
      Object.prototype.hasOwnProperty.call(s.scores,game)&&
      s.scores[game]!==null&&s.scores[game]!==undefined&&Number.isFinite(Number(s.scores[game])))
      .map(s=>({nickname:String(s.nickname||''),score:Number(s.scores[game])}))
      .sort((a,b)=>b.score-a.score||a.nickname.localeCompare(b.nickname,'eu')).slice(0,10);
    const heading='<div class="v37-right-heading">📡 '+E(session.room)+' · ZUZENEAN</div>';
    const body=rows.length?rows.map((r,i)=>'<div class="v37-right-row '+
      (r.nickname===session.nickname?'v37-mine':'')+'"><span class="v37-rpos">'+
      (['🥇','🥈','🥉'][i]||(i+1)+'.')+'</span><span class="v37-rname">'+
      E(r.nickname)+'</span><span class="v37-rscore">'+format(r.score)+'</span></div>').join(''):
      '<div class="v37-right-empty">Oraindik ez dago amaitutako partidarik ikasgela honetan.</div>';
    const html=heading+body+'<div class="v37-right-hint">Amaitutako jokoak bakarrik · Hodeian gordetako markak</div>';
    const hostId='v37-side-'+id;
    let host=document.getElementById(hostId);
    if(!host){host=document.createElement('div');host.id=hostId;host.className='v37-live-right-panel';}
    if(host.parentElement!==el.parentElement||host.previousElementSibling!==el){
      el.insertAdjacentElement('afterend',host);
    }
    if(host.innerHTML!==html)host.innerHTML=html;
  }
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
 function lockNicknameForSave(event){
  if(!session)return;
  const target=event.target.closest('button');
  if(!target)return;
  const id=target.id;
  const specific=(id==='cv14-start'?'cv14-nickname':id==='od-intro-play'?'od-nickname':null);
  const art=target.dataset.a30==='start'?'a30-nick':null;
  const nameInput=document.getElementById(specific||art||'');
  if(nameInput&&nameInput.value!==session.nickname)nameInput.value=session.nickname;
 }
 document.addEventListener('click',lockNicknameForSave,true);
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
 document.body.insertAdjacentHTML('beforeend',`<div id="v37-cloud-dock" role="region" aria-label="Ikasgela konektatua"><button id="v37-button" type="button">🏆 Ikasgela</button><button id="v37-my-button" type="button" hidden>👤 NIRE PUNTUAZIOAK</button><span id="v37-total"></span></div>
 <div id="v37-overlay" hidden role="dialog" aria-modal="true" aria-label="Ikasgelako sailkapena"><div class="v37-modal">
 <div class="v37-modal-top"><div><small>ISLAMAREN ABENTURA · V37</small><h2>🏆 Sailkapena zuzenean</h2><p id="v37-room-name">Aula conectada</p></div><button id="v37-close" type="button" aria-label="Itxi">✕</button></div>
 <div class="v37-tabs"><button id="v37-tab-join">Ikasgelako saioa</button><button id="v37-tab-rank">Zuzeneko sailkapena</button></div>
 <div id="v37-status" role="status"></div><section id="v37-connect-tab"><div id="v37-login"></div></section><section id="v37-rank-tab"><div id="v37-board"></div></section>
 <p class="v37-footer">Jokoko errekorrak automatikoki gordetzen dira konektatuta zaudenean. Internetik gabe, tokiko markak erabiliko dira.</p></div></div>`);
 $$('v37-button').onclick=openModal;$$('v37-my-button').onclick=openOwnMarks;$$('v37-close').onclick=closeModal;
 $$('v37-overlay').addEventListener('click',e=>{if(e.target.id==='v37-overlay')closeModal()});
 $$('v37-tab-join').onclick=()=>showTab('connect');$$('v37-tab-rank').onclick=()=>showTab('ranking');
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$$('v37-overlay').hidden)closeModal()});
 const originalRanking=$$('home-ranking');
 if(originalRanking)originalRanking.addEventListener('click',e=>{
  if(session){e.preventDefault();e.stopImmediatePropagation();openModal();}
 },true);
 configWarning();drawJoin();drawDock();
}

/* V37.10 · TOP 10 plegable dentro de los juegos 7, 8, 9 y 10. */
function setupGameMiniRanking(){
 if($$('v37-game-mini-ranking'))return;
 const host=document.createElement('div');
 host.id='v37-game-mini-ranking';host.hidden=true;
 host.innerHTML='<button type="button" id="v37-game-mini-toggle" aria-expanded="false" aria-controls="v37-game-mini-panel" aria-label="Joko honetako TOP 10 sailkapena zabaldu">🏆 TOP 10 <span aria-hidden="true">▴</span></button>'+
  '<button type="button" id="v37-game-mini-own-open" aria-controls="v37-game-mini-panel">👤 NIRE NOTAK</button>'+ 
  '<section id="v37-game-mini-panel" hidden role="region" aria-label="Joko honetako TOP 10 sailkapena">'+
  '<header class="v37-game-mini-header"><div><small>SAILKAPENA ZUZENEAN</small>'+
  '<strong id="v37-game-mini-title">🏆 TOP 10</strong></div>'+
  '<button type="button" id="v37-game-mini-close" aria-label="Itxi sailkapena">✕</button></header>'+
  '<div id="v37-game-mini-list" role="list"></div><p id="v37-game-mini-foot"></p><button type="button" id="v37-game-mini-refresh">↻ Eguneratu</button></section>';
 document.body.appendChild(host);
 const button=$$('v37-game-mini-toggle'),panel=$$('v37-game-mini-panel');
 const list=$$('v37-game-mini-list'),foot=$$('v37-game-mini-foot'),title=$$('v37-game-mini-title');
 const games=[
  ['od-v33','ondarea'],['art30-root','artea'],
  ['ag24-root','merkataritza'],['city20-root','hiria']
 ];
 let currentGame='',lastHTML='',miniMode='game';
 function visible(root){
  if(!root||!root.isConnected||root.hidden||!root.getClientRects().length)return false;
  const st=getComputedStyle(root);
  return st.display!=='none'&&st.visibility!=='hidden';
 }
 function findGame(){
  for(const [id,game] of games)if(visible($$(id)))return game;
  return '';
 }
 function setOpen(open){
  if(open&&!session){openModal();return;}
  panel.hidden=!open;
  button.setAttribute('aria-expanded',String(open));
  button.setAttribute('aria-label',open?'Itxi joko honetako TOP 10 sailkapena':'Joko honetako TOP 10 sailkapena zabaldu');
  button.querySelector('span').textContent=open?'▾':'▴';
  if(open)draw();
 }
 function draw(){
  const game=currentGame;if(!game||panel.hidden)return;
  const name=GAMES.find(x=>x[0]===game)?.[1]||game;
  title.textContent=miniMode==='mine'?'👤 NIRE PUNTUAZIOAK':'🏆 '+name;
  if(!session){
   if(lastHTML!=='login'){list.innerHTML='<p class="v37-game-mini-empty">Ikasgelako TOP 10a ikusteko, sartu lehenik zure gelako saioan.</p>';lastHTML='login';}
   foot.textContent='Ikasgela · Konektatu hasierako pantailan';
   return;
  }
  if(!roomSnapshot||!Array.isArray(roomSnapshot.students)){
   if(lastHTML!=='loading'){list.innerHTML='<p class="v37-game-mini-empty">Sailkapena kargatzen…</p>';lastHTML='loading';}
   foot.textContent='☁ '+session.room;
   return;
  }
  /* V37.12. Mis diez notas guardadas en Supabase. */
  if(miniMode==='mine'){
   const norm=n=>String(n||'').normalize('NFC').trim().toLocaleLowerCase('eu');
   const me=roomSnapshot.students.find(s=>norm(s?.nickname)===norm(session.nickname));
   if(!me){
    const html='<p class="v37-game-mini-empty">Zure puntuazioak ez dira ageri. Egiaztatu goitizena.</p>';
    if(html!==lastHTML){list.innerHTML=html;lastHTML=html;}
    foot.textContent='☁ '+session.room;return;
   }
   const html=GAMES.map(([id,name],i)=>{
    const value=me.scores?.[id];
    const exists=value!=null&&Number.isFinite(Number(value));
    return '<div class="v37-game-mini-row" role="listitem"><span class="v37-game-mini-place">'+(i+1)+'.</span><strong>'+E(name)+'</strong><b>'+(exists?format(Number(value)):'—')+'</b></div>';
   }).join('');
   if(html!==lastHTML){list.innerHTML=html;lastHTML=html;}
   foot.textContent='👤 '+session.nickname+' · '+format(me.total||0)+' puntu · '+Number(me.completed||0)+'/10';return;
  }

  // Completed marks only; never reinterpret a missing score as zero.
  const leaders=roomSnapshot.students.filter(s=>s?.scores?.[game]!==null&&
   s?.scores?.[game]!==undefined&&Number.isFinite(Number(s.scores[game])))
    .map(s=>({name:String(s.nickname||''),score:Number(s.scores[game])}))
    .filter(s=>s.name.trim()!=='')
    .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'eu')).slice(0,10);
  const myName=session.nickname.normalize('NFC').toLocaleLowerCase('eu');
  const rows=leaders.map((s,i)=>'<div class="v37-game-mini-row'+
   (s.name.normalize('NFC').toLocaleLowerCase('eu')===myName?' mine':'')+
   '" role="listitem"><span class="v37-game-mini-place">'+
   (['🥇','🥈','🥉'][i]||(i+1)+'.')+'</span><strong>'+E(s.name)+
   '</strong><b>'+format(s.score)+'</b></div>').join('');
  const html=rows||'<p class="v37-game-mini-empty">Oraindik ez dago amaitutako markarik joko honetan.</p>';
  if(html!==lastHTML){list.innerHTML=html;lastHTML=html;}
  const ownRank=Number(roomSnapshot?.own_ranks?.[game]);
  const suffix=Number.isInteger(ownRank)&&ownRank>10?' · Zure postua: '+ownRank+'.':'';
  foot.textContent='☁ '+session.room+' · Hodeian gordetako markak'+suffix;
 }
 function sync(){
  const game=findGame();
  const mainOpen=!$$('v37-overlay')?.hidden;
  if(!game||mainOpen){
   if(!host.hidden){host.hidden=true;setOpen(false);}
   if(!game)currentGame='';
   return;
  }
  if(game!==currentGame){
   currentGame=game;miniMode='game';lastHTML='';setOpen(false);
  }
  if(host.hidden)host.hidden=false;
  if(!panel.hidden)draw();
 }
 button.addEventListener('click',()=>{const open=panel.hidden||miniMode!=='game';miniMode='game';setOpen(open)});
 $$('v37-game-mini-own-open').addEventListener('click',()=>{const open=panel.hidden||miniMode!=='mine';miniMode='mine';setOpen(open)});
 $$('v37-game-mini-close').addEventListener('click',()=>{setOpen(false);button.focus()});
 $$('v37-game-mini-refresh').addEventListener('click',()=>void fetchBoard());
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!panel.hidden&&!host.hidden){setOpen(false);button.focus();e.stopPropagation();}
 },true);
 document.addEventListener('pointerdown',e=>{
  if(!host.hidden&&!panel.hidden&&!host.contains(e.target))setOpen(false);
 },true);
 window.setInterval(sync,800);sync();
}

function init(){makeUI();installStorage();trackGameClicks();installRightRankStyle();installStudentRankingPrivacyStyle();setupGameMiniRanking();setInterval(renderRightRankings,950);
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
