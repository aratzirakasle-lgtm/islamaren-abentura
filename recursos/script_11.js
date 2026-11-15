
/* Gizarte-piramidea V17. Source: teacher PDF pages 19–20. No external libraries. */
(()=>{'use strict';
const S=document.getElementById('social-v17-root'); // created only after launch
const IDS=['arist','herria','eskl'];
const NAMES={arist:'Aristokrazia',herria:'Klase ertainak',eskl:'Esklaboak'};
const DESCS=[
 {id:'arist',text:'Arabiar jatorrikoak gehienbat; jabetza handiak eta gobernuko goi-karguak zituzten.',img:'crown'},
 {id:'herria',text:'Nekazariak, eskulangileak eta merkatari askeak.',img:'wheat'},
 {id:'eskl',text:'Gerrako presoak ziren edo merkatariek salerositakoak.',img:'chains'}
];
const PERSONS=[
 {id:'arist',img:'noble',caption:'Pertsona honek jabetza handiak eta gobernuko goi-kargua ditu.'},
 {id:'herria',img:'free',caption:'Pertsona hau merkatari askea da eta produktuak saltzen ditu.'},
 {id:'eskl',img:'enslaved',caption:'Testuinguruak dio pertsona hau gerrako presoa dela eta esklabo gisa saldu zutela.'}
];
const KEY='islamaren_abentura_v17_gizartea_top10',SHARED_KEY='islama-v4-puntuazioak';
const ART=window.SOCIAL_V17_ART||{};
const src=k=>ART[k]||'';
const E=s=>String(s??'').replace(/[&<>"']/g,a=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[a]));
const $=id=>document.getElementById(id);
const shuffle=a=>{let b=[...a];for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
let root=null,st=null,timer=null,feedbackTimer=null,ctx=null,selected=null,locked={};
function audio(kind){if(!st||!st.sound)return;try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();let o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=kind==='ok'?740:250;g.gain.value=.035;o.start();o.stop(ctx.currentTime+.13)}catch(_){}}
function reset(){st={phase:1,nickname:'',seconds:165,lives:3,correct:0,errors:0,points:0,wrongThisStage:false,groups:{},descs:{},locked1:[],locked2:[],selected:null,chosen:null,index:0,busy:false,finished:false,sound:false,order1:shuffle(IDS),order2:shuffle(IDS),characters:shuffle(PERSONS),photoChosen:false,results:[],message:'Aukeratu txartel bat eta piramideko maila.',messageType:'',saved:false};selected=null;locked={};}
function rows(){
 let legacy=[],common={};
 try{const arr=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(arr))legacy=arr}catch(_){}
 try{common=JSON.parse(localStorage.getItem(SHARED_KEY)||'{}')||{}}catch(_){}
 if(!common||typeof common!=='object')common={};
 const merged=new Map();
 const add=(name,score)=>{if(typeof name!=='string'||!Number.isFinite(score))return;
  const id=name.toLocaleLowerCase('eu');const old=merged.get(id);
  if(!old||score>old.score)merged.set(id,{nick:name,score});};
 for(const v of legacy)add(v?.nick,v?.score);
 for(const v of Object.values(common.gizartea||{}))add(v?.name,v?.score);
 const sorted=[...merged.values()].sort((a,b)=>b.score-a.score).slice(0,10);
 // Keep previous V17 records visible from both the sixth game and the general menu.
 const table={...(common.gizartea||{})};let changed=false;
 for(const rec of sorted){const id=rec.nick.toLocaleLowerCase('eu');if(!table[id]||table[id].score<rec.score){table[id]={name:rec.nick,score:rec.score,timestamp:Date.now()};changed=true;}}
 if(changed){try{common.gizartea=table;localStorage.setItem(SHARED_KEY,JSON.stringify(common))}catch(_){}}
 return sorted;
}
function save(){if(st.saved||!st.finished||st.correct!==9)return false;
 try{
  const nick=st.nickname.toLocaleLowerCase('eu');
  const previous=rows();const old=previous.find(x=>x.nick.toLocaleLowerCase('eu')===nick);
  const updated=previous.filter(x=>x.nick.toLocaleLowerCase('eu')!==nick);
  updated.push(old&&old.score>st.points?old:{nick:st.nickname,score:st.points});
  const sorted=updated.sort((a,b)=>b.score-a.score).slice(0,10);
  localStorage.setItem(KEY,JSON.stringify(sorted));
  let common={};try{common=JSON.parse(localStorage.getItem(SHARED_KEY)||'{}')||{}}catch(_){}
  if(!common.gizartea)common.gizartea={};
  const top=old&&old.score>st.points?old:{nick:st.nickname,score:st.points};
  if(!common.gizartea[nick]||top.score>common.gizartea[nick].score)common.gizartea[nick]={name:top.nick,score:top.score,timestamp:Date.now()};
  localStorage.setItem(SHARED_KEY,JSON.stringify(common));
  st.saved=true;return true;
 }catch(_){st.saved=false;return false}
}
function rank(){const r=rows();if(!r.length)return `<ol class="s17-rank-list">${Array.from({length:10},(_,i)=>`<li><span>${i+1}.</span><span>—</span><span>—</span></li>`).join('')}</ol><p class="s17-rank-empty" style="padding:5px 8px;font-size:14px">Oraindik ez dago puntuaziorik.</p>`;return `<ol class="s17-rank-list">${Array.from({length:10},(_,i)=>{let x=r[i];return `<li><span>${i+1}.</span><span>${x?E(x.nick):'—'}</span><span>${x?Number(x.score).toLocaleString('eu-ES'):'—'}</span></li>`}).join('')}</ol>`}
function layout(){root=document.createElement('div');root.id='social-v17-root';document.body.appendChild(root);root.innerHTML=`<div class="s17-fit"><main class="s17-canvas" role="main" aria-label="Gizarte-piramidea"><div class="s17-bg" style="background-image:url('${src('courtyard')}')"></div><img class="s17-crest" src="${src('crest')}" alt="Islamaren Abentura"><header class="s17-hud"><button type="button" class="s17-home" id="s17-home" aria-label="Jokoen menura itzuli">⌂</button><div class="s17-title">6. Gizarte-piramidea</div><span class="s17-hearts" id="s17-hearts">❤️❤️❤️</span><span class="s17-chip" id="s17-score">Puntuak: 0</span><span class="s17-chip" id="s17-time">⏱ 02:45</span><button type="button" id="s17-sound" class="s17-sound" title="Soinua aktibatu edo isilarazi" aria-label="Soinua aktibatu edo isilarazi">🔇</button></header><div class="s17-ribbon" id="s17-ribbon"></div><aside class="s17-side"><div class="s17-side-medal">6. JOKOA</div><h2 class="s17-side-title">Gizarte-<br>piramidea</h2><img class="s17-side-pyramid" src="${src('pyramid-mini')}" alt="Hiru mailako piramide ilustratua"><p class="s17-side-instr" id="s17-side-instr"></p><div class="s17-progress-badge" id="s17-counter">0/9</div><div class="s17-hint"><strong>✦ Aholkua</strong><p id="s17-hint"></p></div></aside><div class="s17-left-tokens" id="s17-tokens"></div><div class="s17-pyramid"><img class="s17-pyramid-art" alt="Aristokraziaren, talde askeen eta esklabotzaren eszena historiko ilustratuak dituen piramidea" src="${src('pyramid-illustration')}"><div id="s17-targets"></div></div><div class="s17-side-cards" id="s17-description-cards"></div><aside class="s17-rank"><div class="s17-rank-title">🏆 TOP 10</div><div id="s17-ranking">${rank()}</div></aside><div class="s17-feedback" id="s17-feedback" aria-live="polite"></div><button type="button" class="s17-act" id="s17-check">✓ Egiaztatu</button><div class="s17-progress"><div class="s17-progress-title">Erronka motak · 9 guztira</div><div id="s17-progress-rows"></div></div><section class="s17-characters"><div class="s17-characters-title">Pertsonaiak identifikatzeko erronkak</div><div id="s17-persons" style="display:contents"></div></section><nav class="s17-bottom-nav" aria-label="Jokoen nabigazioa"><button class="s17-navbtn" id="s17-prev">← Aurreko jokoa</button><div class="s17-steps">${Array.from({length:10},(_,i)=>`<button type="button" class="s17-step ${i===5?'current':''}" data-game-step="${i+1}" aria-label="${i+1}. jokoa">${i+1}</button>`).join('')}</div><button class="s17-navbtn next" id="s17-next">Hurrengo jokoa →</button></nav></main></div><div class="s17-shade" id="s17-shade"><div class="s17-modal" id="s17-modal"><h2>Gizarte-piramidea</h2><p>9 erronka, 3 fase eta 3 bizitza. Aukeratu goitizen bat eta hasi abentura!</p><label for="s17-nick">Goitizena</label><input id="s17-nick" maxlength="18" placeholder="Adibidez: Ikasle07" autocomplete="off"><p class="s17-error" id="s17-nick-error"></p><button id="s17-start">▶ Hasi jokoa</button><button type="button" id="s17-intro-back">⌂ Menura itzuli</button></div></div>`;
 $('s17-home').addEventListener('click',quit);$('s17-intro-back').addEventListener('click',quit);
 $('s17-prev').addEventListener('click',()=>navigate(5));$('s17-next').addEventListener('click',()=>navigate(7));
 root.querySelectorAll('[data-game-step]').forEach(x=>x.addEventListener('click',()=>{let n=Number(x.dataset.gameStep);if(n===6)return;navigate(n)}));
 $('s17-sound').addEventListener('click',()=>{st.sound=!st.sound;$('s17-sound').textContent=st.sound?'🔊':'🔇'});
 $('s17-start').addEventListener('click',start);$('s17-nick').addEventListener('keydown',e=>{if(e.key==='Enter')start()});
 $('s17-check').addEventListener('click',verify);
 fit();window.addEventListener('resize',fit);
}
function fit(){if(!root)return;const cv=root.querySelector('.s17-canvas');if(window.innerWidth<=800){cv.style.transform='none';return;}let scale=Math.min(window.innerWidth/1648,window.innerHeight/928);cv.style.transform=`translate(-50%,-50%) scale(${scale})`}
function launch(){if(root){quit()}reset();layout();update();}
function quit(){if(timer)clearInterval(timer);timer=null;if(feedbackTimer)clearTimeout(feedbackTimer);feedbackTimer=null;window.removeEventListener('resize',fit);root?.remove();root=null;st=null}
function navigate(n){quit();let b=document.querySelector(`#game-gallery [data-game]`);let item=[...document.querySelectorAll('#game-gallery [data-game]')][n-1];if(item)item.click();else b?.click()}
function start(){let nick=$('s17-nick').value.trim().normalize('NFC');if(!/^[\p{L}\p{N} _-]{2,18}$/u.test(nick)){$('s17-nick-error').textContent='Erabili 2–18 karaktereko goitizena.';return;}st.nickname=nick;$('s17-shade').style.display='none';st.active=true;timer=setInterval(()=>{if(!st||st.finished||!st.active)return;st.seconds=Math.max(0,st.seconds-1);updateHUD();if(st.seconds===0)finish('time')},1000);render();}
function updateHUD(){if(!root)return;$('s17-hearts').textContent='❤️'.repeat(st.lives)+'🖤'.repeat(3-st.lives);$('s17-score').textContent='Puntuak: '+st.points;$('s17-time').textContent='⏱ '+String(Math.floor(st.seconds/60)).padStart(2,'0')+':'+String(st.seconds%60).padStart(2,'0');$('s17-counter').textContent=st.correct+'/9';}
function update(){if(!root)return;updateHUD();if(st.active)render()}
function msg(text,type=''){st.message=text;st.messageType=type;if(root){$('s17-feedback').textContent=text;$('s17-feedback').className='s17-feedback '+type}}
function phaseCopy(){return st.phase===1?['Kokatu gizarte-taldeak dagokien mailan piramidean.','Kokatu talde bakoitza piramidean.','Taldearen izena irakurri eta sakatu dagokion maila.']:st.phase===2?['Lotu deskribapenak gizarte-maila egokiarekin.','Lotu gizarte-taldeen ezaugarriak.','Aztertu PDFko deskribapenak eta lotu mailarekin.']:['1. Egin klik beheko argazki argiztatuan. 2. Sakatu piramideko maila.','Egin klik argazkian eta ondoren piramideko mailan.','Irakurri pertsonaiaren deskribapena; ez erabaki itxuraren arabera.']}
function render(){if(!root||!st.active)return;
 const copy=phaseCopy();$('s17-ribbon').textContent=copy[0];root.classList.toggle('s17-phase3',st.phase===3);root.classList.toggle('s17-photo-picked',st.phase===3&&st.photoChosen);$('s17-side-instr').textContent=copy[1];$('s17-hint').textContent=copy[2];updateHUD();
 let map=st.phase===1?st.groups:st.descs;let lk=st.phase===1?st.locked1:st.locked2;
 $('s17-targets').innerHTML=IDS.map((id,i)=>{let v=map[id];let text=st.phase===1?(v?NAMES[v]:'Kokatu hemen'):st.phase===2?(v?DESCS.find(x=>x.id===v)?.text:'Lotu hemen'):NAMES[id];let active=true;let paired=st.phase===3&&st.characters.slice(0,st.index).some(p=>p.id===id);return `<button type="button" class="s17-target ${(st.phase===3?paired:lk.includes(id))?'s17-correct':''} ${st.phase===3?'s17-pair-target':''}" data-level="${id}" aria-label="${i+1}. maila: ${E(text)}" ${!active||paired?'disabled':''}>${text===('Kokatu hemen')||text==='Lotu hemen'?`<span class="s17-placeholder">${E(text)}</span>`:`<span class="${st.phase===2?'s17-sml':''}">${E(text)}</span>`}</button>`}).join('');
 $('s17-tokens').innerHTML=st.phase===1?st.order1.filter(id=>!Object.values(st.groups).includes(id)).map(id=>`<button type="button" draggable="true" class="s17-token ${selected===id?'s17-selected':''}" data-token="${id}">${E(NAMES[id])}</button>`).join(''):IDS.map(id=>`<span class="s17-token s17-reference">${E(NAMES[id])}</span>`).join('');
 $('s17-description-cards').innerHTML=st.phase===3?`<div class="s17-pair-guide"><h3>Nola egin bikoteak?</h3><div class="s17-pair-step ${!st.photoChosen?'s17-current-step':''}"><strong>1</strong><span>Egin klik beheko <b>ARGAZKI ARGIZTATUAN</b>.</span></div><div class="s17-pair-step ${st.photoChosen?'s17-current-step':''}"><strong>2</strong><span>Sakatu <b>PIRAMIDEKO MAILA</b> egokia.</span></div><div class="s17-pair-clue"><b>Pertsonaiaren azalpena:</b><p>${E(st.characters[st.index]?.caption||'')}</p></div><p class="s17-pair-hint">${st.photoChosen?'✓ Argazkia aukeratuta! Orain sakatu piramideko maila.':'👇 Aukeratu argazkia behean hasteko.'}</p></div>`:st.order2.filter(id=>st.phase===1||!Object.values(st.descs).includes(id)).map(id=>{let d=DESCS.find(x=>x.id===id);return `<button type="button" class="s17-desc-card ${st.phase===2?'s17-active':'s17-muted'} ${selected===id?'s17-selected':''}" data-desc="${id}" draggable="${st.phase===2?'true':'false'}"><img src="${src(d.img)}" alt=""><span>${E(d.text)}</span></button>`}).join('');
 $('s17-progress-rows').innerHTML=[['Taldeak kokatzea',0],['Deskribapenak lotzea',1],['Pertsonaiak identifikatzea',2]].map(([t,i])=>`<div class="s17-progress-row ${st.phase>i+1?'s17-done':st.phase===i+1?'s17-current':''}"><span>${i===0?'△':i===1?'▤':'♙'}</span><span class="s17-num">3</span><span>${t}</span><span class="s17-status">${st.phase>i+1?'✓':st.phase===i+1?'●':'○'}</span></div>`).join('');
 $('s17-persons').innerHTML=st.characters.map((p,i)=>`<button type="button" class="s17-person ${st.phase!==3?'s17-future':i<st.index?'s17-done':i===st.index?'s17-current s17-photo-clickable':'s17-future'} ${i===st.index&&st.photoChosen&&st.phase===3?'s17-photo-selected':''}" data-photo="${i}" aria-label="${E(p.caption)}" ${st.phase!==3||i!==st.index?'disabled':''}><img src="${src(p.img)}" alt=""><small>${i<st.index?'✓ Eginda':i===st.index&&st.phase===3?(st.photoChosen?'✓ HAUTATUTA':'👆 EGIN KLIK'):'Pertsonaia '+(i+1)}</small></button>`).join('');
 $('s17-ranking').innerHTML=rank();$('s17-check').style.display=st.phase===3?'none':'';$('s17-check').disabled=st.phase===3;msg(st.message,st.messageType);
 root.querySelectorAll('[data-token]').forEach(el=>wireItem(el,el.dataset.token));
 root.querySelectorAll('[data-desc]').forEach(el=>{if(st.phase===2)wireItem(el,el.dataset.desc)});
 root.querySelectorAll('[data-level]').forEach(el=>{el.addEventListener('click',()=>st.phase===3?(st.photoChosen?answer(el.dataset.level):msg('Lehenik, egin klik beheko argazki argiztatuan.')):put(el.dataset.level,selected));el.addEventListener('dragover',e=>{if(st.phase===3)return;e.preventDefault();el.classList.add('s17-hover')});el.addEventListener('dragleave',()=>el.classList.remove('s17-hover'));el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('s17-hover');put(el.dataset.level,e.dataTransfer.getData('text/plain'))})});
 root.querySelectorAll('[data-photo]').forEach(el=>el.addEventListener('click',()=>{if(st.phase===3&&Number(el.dataset.photo)===st.index&&!st.finished&&!st.busy){st.photoChosen=true;st.message='Argazkia hautatu duzu. Orain, sakatu piramideko maila.';st.messageType='';render()}}));
}
function wireItem(el,id){el.addEventListener('click',()=>{selected=id;st.message='Hautatu piramideko maila.';render()});el.addEventListener('dragstart',e=>{selected=id;e.dataTransfer.setData('text/plain',id);e.dataTransfer.effectAllowed='move'});}
function put(level,id){if(st.finished||st.busy||st.phase===3)return;let chosen=st.phase===1?st.groups:st.descs,done=st.phase===1?st.locked1:st.locked2;if(done.includes(level))return;if(!id){if(chosen[level]){delete chosen[level];st.message='Txartela kendu duzu. Aukeratu beste bat.';render();return;}msg('Aukeratu lehenik txartel bat.','');return;}if(!IDS.includes(id))return;for(const k of IDS){if(chosen[k]===id){if(done.includes(k))return;delete chosen[k]}}chosen[level]=id;selected=null;st.message='Jarrita. Aldatu nahi baduzu, aukeratu beste txartel bat.';st.messageType='';render();}
function verify(){if(!st||st.finished||st.busy||st.phase===3)return;let map=st.phase===1?st.groups:st.descs,done=st.phase===1?st.locked1:st.locked2;if(IDS.some(id=>!map[id]&&!done.includes(id))){st.message='Osatu hiru laukiak egiaztatu aurretik. Ez duzu bizitzarik galdu.';st.messageType='';render();return;}
 let bad=0,gained=0;for(let id of IDS){if(done.includes(id))continue;const val=map[id];if(val===id){done.push(id);st.correct++;gained+=st.wrongThisStage?70:100;}else{bad++;delete map[id]}}
 st.points=Math.min(900,st.points+gained);if(bad){st.errors++;st.lives--;st.wrongThisStage=true;audio('no');st.message='Zenbait lotura ez dira zuzenak. Zuzendu gainerakoak.';st.messageType='bad';if(st.lives<=0){render();finish('lives');return;}render();return;}
 audio('ok');if(done.length===3){st.phase++;st.wrongThisStage=false;st.message=st.phase===2?'Ondo! Orain lotu hiru deskribapenak.':'Bikain! Identifikatu hiru pertsonaiak.';st.messageType='good';}render();}
function answer(val){if(!st||st.phase!==3||st.finished||st.busy)return;const p=st.characters[st.index];if(!p)return;st.busy=true;if(val===p.id){st.correct++;st.points+=st.wrongThisStage?70:100;st.wrongThisStage=false;st.index++;st.photoChosen=false;audio('ok');st.message='Bikain! Pertsonaiaren egoera ondo identifikatu duzu.';st.messageType='good';if(st.index>=3){st.points=Math.min(1000,st.points+Math.min(100,Math.round(100*st.seconds/165)));st.busy=false;finish('win');return;}}else{st.lives--;st.errors++;st.wrongThisStage=true;audio('no');st.message='Ez da zuzena. Begiratu pertsonaiaren egoeraren azalpena.';st.messageType='bad';if(st.lives<=0){st.busy=false;finish('lives');return;}}
 st.busy=false;render();}
function finish(reason){if(!st||st.finished)return;st.finished=true;st.active=false;if(timer)clearInterval(timer);timer=null;const persisted=reason==='win'?save():false;updateHUD();const win=reason==='win';$('s17-ranking').innerHTML=rank();$('s17-shade').style.display='grid';$('s17-modal').innerHTML=`<h2>${win?'🏆 Zorionak!':'Partida amaitu da'}</h2><p>${win?'Gizarte-piramidearen 9 erronkak gainditu dituzu!':reason==='time'?'Denbora agortu da.':'Hiru bizitzak agortu dira.'}</p><p><strong>Puntuak: ${st.points}/1.000</strong> · Zuzenak: ${st.correct}/9 · Akatsak: ${st.errors}</p><p>${win?(persisted?'Errekorra gailu honetan gordeta.':'Ezin izan da errekorra nabigatzailean gorde.'):'Berriro saia zaitezke.'}</p><button id="s17-retry">↻ Berriro jokatu</button> <button class="s17-quit" id="s17-quit">⌂ Jokoen menura itzuli</button>`;$('s17-retry').addEventListener('click',()=>{const nick=st.nickname;const snd=st.sound;reset();st.nickname=nick;st.sound=snd;st.active=true;$('s17-shade').style.display='none';timer=setInterval(()=>{if(!st||st.finished||!st.active)return;st.seconds--;updateHUD();if(st.seconds<=0)finish('time')},1000);render()});$('s17-quit').addEventListener('click',quit)}
rows(); // Migrate existing sixth-game results as soon as the platform loads.
window.SOCIAL_V17={launch,debug:()=>st?{phase:st.phase,correct:st.correct,lives:st.lives,points:st.points,groups:{...st.groups},descs:{...st.descs},characters:st.characters.map(x=>x.id),index:st.index,finished:st.finished}:null};
})();

