/* ISLAMAREN ABENTURA V24 · Jokoa 8. Uses original illustrations, accessible interactive controls, four consecutive challenges. */
(()=>{'use strict';
const KEY='islama-v4-puntuazioak', NICK='islama-v24-merkataritza-nick';
const PHASES=[
 {title:'Laborantzaren aniztasuna',instruction:'Arrastatu edo hautatu beheko izenak eta kokatu dagokien landarearen ondoan. Hamar produktuak identifikatu.',time:300,art:'lab',labels:[['garia','Garia'],['arroza','Arroza'],['kotoia','Kotoia'],['azukre','Azukre-kanabera'],['azafrai','Azafraia'],['masusta','Masustondoa'],['zitriko','Fruta zitrikoak'],['espinaka','Espinaka'],['alberjinia','Alberjinia'],['barazki','Barazkiak']]},
 {title:'Ureztapenaren maisuak',instruction:'Lotu ureztatze-teknikak beren funtzioekin, eta aktibatu beheko sistema.',time:180,art:'water',labels:[['noriak','Noriak'],['ubideak','Ubideak'],['putzuak','Putzuak eta uharkak'],['terrazak','Terrazak']]},
 {title:'Tailerren patioa',instruction:'Bisitatu hiru tailerrak eta osatu bakoitzaren jarduera agertokia utzi gabe.',time:300,art:'workshop',labels:[['ehungintza','Ehungintza'],['zeramika','Zeramika'],['metalgintza','Metalgintza']]},
 {title:'Trukea eta luxua',instruction:'Ezagutu merkataritza-produktuak, garraiobideak eta truke-bideak.',time:180,art:'trade',labels:[['karabana','Karabana handiak'],['dinar','Urrezko txanpona (dinarra)'],['truke','Truke letra']]}
];
const PLOTS=[{x:22,y:44.8},{x:37.1,y:44.8},{x:51.0,y:44.8},{x:65.2,y:44.8},{x:79.9,y:44.8},
 {x:22.0,y:83.5},{x:36.8,y:83.5},{x:51.0,y:83.5},{x:65.5,y:83.5},{x:79.8,y:83.5}];
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shuffle(input){const a=input.slice();for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const assets=window.ISLAMA_V24_ASSETS||{}, irArt=window.ISLAMA_V25_ART||{}; if(irArt.water_backdrop)assets.water=irArt.water_backdrop;
let root=null,timer=null,s=null,feedbackTimer=null,touchDrag=null;
const q=(sel)=>root?.querySelector(sel);
function labels(){return PHASES[s.phase-1].labels}
function phase(){return PHASES[s.phase-1]}
function formTime(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function score(){return Math.min(1000,s.points+(s.win?s.timeBonus:0))}
function readData(){try{let d=JSON.parse(localStorage.getItem(KEY)||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{}}catch{return {}}}
function leaderboard(){const d=readData();return Object.values(d.merkataritza_v24||{}).filter(x=>x?.version===24&&Number.isFinite(x.score)).sort((a,b)=>b.score-a.score||(a.timestamp||0)-(b.timestamp||0)).slice(0,10)}
function saveRecord(){try{let d=readData(),bucket=d.merkataritza_v24||{},key=s.nick.toLocaleLowerCase('eu-ES'),old=bucket[key];let value=score();if(!old||value>old.score)bucket[key]={name:s.nick,score:value,timestamp:Date.now(),version:24,completedChallenges:4};d.merkataritza_v24=bucket;
 // Compatible menu display, while preserving older game-8 records separately.
 if(!d.merkataritza)d.merkataritza={};const previous=d.merkataritza[key];if(previous&&previous.version!==24){d.merkataritza_v23_archivo||={};if(!d.merkataritza_v23_archivo[key])d.merkataritza_v23_archivo[key]=previous;}
 if(!previous||previous.version!==24||value>previous.score)d.merkataritza[key]={name:s.nick,score:value,timestamp:Date.now(),version:24};
 localStorage.setItem(KEY,JSON.stringify(d));return true}catch{return false}}
function clearTimers(){clearInterval(timer);clearTimeout(feedbackTimer);timer=null;feedbackTimer=null}
function close(){clearTimers();if(touchDrag?.ghost)touchDrag.ghost.remove();touchDrag=null;root?.remove();root=null;s=null;document.body.style.overflow='';document.getElementById('home-screen')?.classList.remove('hidden');document.getElementById('game-screen')?.classList.add('hidden')}
function toGame(n){close();const ids=['arabia','denbora','bost','hedapena','kalifaldi','gizartea','hiria','merkataritza','artea','ondarea'];document.querySelector('#game-gallery [data-game="'+ids[n-1]+'"]')?.click()}
function reset(){clearTimers();s={nick:'',phase:1,seconds:300,lives:3,points:0,win:false,finished:false,playing:false,selected:null,placements:{},solved:new Set(),stageCorrect:0,errors:0,selectedCount:0,orders:PHASES.map(p=>shuffle(p.labels.map(x=>x[0]))),sumRemaining:0,timeBonus:0,sound:false,irrigation:null,artisans:null,market:null};}
function labelOf(id){return labels().find(([key])=>key===id)?.[1]||id}
function build(){root=document.createElement('section');root.id='ag24-root';root.setAttribute('aria-label','8. Jokoa: Merkatarien erronka');root.innerHTML=`
 <div class="ag24-world">
 <header class="ag24-top"><button class="ag24-logo" data-action="home" aria-label="Jokoen menura itzuli">⌂</button><div class="ag24-lives" id="ag24-lives" aria-label="3 bizitza">❤️❤️❤️</div><div class="ag24-title"><small id="ag24-subtitle">8. JOKOA · 1. ERRONKA / 4</small><span id="ag24-title">Laborantzaren aniztasuna</span></div><div class="ag24-chip">◷ <span id="ag24-clock">05:00</span></div><div class="ag24-chip ag24-score">🏆 <span id="ag24-score">0</span></div><button class="ag24-sound" data-action="sound" aria-label="Soinua piztu edo itzali">♪</button></header>
 <div class="ag24-rule"><span class="ag24-info">i</span><span id="ag24-rule"></span></div>
 <main class="ag24-scene" id="ag24-scene" data-phase="1"><div id="ag24-targets"></div></main>
 <div class="ag24-tray"><div class="ag24-cards" id="ag24-cards"></div><button class="ag24-verify" id="ag24-verify" data-action="verify">✓ Egiaztatu</button></div>
 <nav class="ag24-nav"><div class="ag24-phase-chip" id="ag24-phase-chip">1. erronka / 4</div><div class="ag24-dots" id="ag24-dots" aria-label="Lau erronken aurrerapena"></div><div class="ag24-help-note">Laborantza · Ureztatzea · Eskulangintza · Merkataritza</div></nav>
 <div class="ag24-feedback" id="ag24-feedback" role="status" aria-live="polite"></div>
 <div class="ag24-modalwrap" id="ag24-modalwrap"><div class="ag24-modal" id="ag24-modal" role="dialog" aria-modal="true"></div></div>
 </div>`;
 document.body.appendChild(root);root.addEventListener('click',onClick);root.addEventListener('dragstart',onDragStart);root.addEventListener('dragover',onDragOver);root.addEventListener('dragleave',onDragLeave);root.addEventListener('drop',onDrop);root.addEventListener('pointerdown',onTouchStart);root.addEventListener('pointerdown',irPointerDown);
}
function launch(){if(root){close()}reset();build();document.body.style.overflow='hidden';document.getElementById('home-screen')?.classList.add('hidden');document.getElementById('game-screen')?.classList.add('hidden');render();showIntro()}
function showModal(markup){q('#ag24-modal').innerHTML=markup;q('#ag24-modalwrap').hidden=false}
function hideModal(){q('#ag24-modalwrap').hidden=true}
function showIntro(){let nick='';try{nick=localStorage.getItem(NICK)||''}catch{}showModal(`<div style="font-size:44px">🌾 ✦ 🏛️ ✦ 🏺</div><h2>8. Jokoa · Merkatarien erronka</h2><p><strong>Lau erronka jarraian:</strong> laborantzaren aniztasuna, ureztapena, eskulangintza eta merkataritza.</p><p>Hiru bizitza dituzu joko osorako. Hirugarren erronkako tailerretan okerrak zuzendu ditzakezu bizitzarik galdu gabe; beste erronketan egiaztapen okerrek bizitza bat kentzen dute. Etiketak testu hutsez agertuko dira.</p><label for="ag24-nick">Zure goitizena</label><div><input id="ag24-nick" maxlength="18" autocomplete="off" value="${esc(nick)}" placeholder="Adibidez: Historia8"></div><p class="ag24-error" id="ag24-error"></p><div class="ag24-modal-buttons"><button type="button" class="ag24-primary" data-action="start">▶ Jolastu</button><button type="button" class="ag24-secondary" data-action="home">⌂ Menura itzuli</button></div>`);q('#ag24-nick')?.addEventListener('keydown',e=>{if(e.key==='Enter')start()});}
function start(){let n=q('#ag24-nick')?.value.trim().normalize('NFC')||'';if(!/^[\p{L}\p{N}_ -]{2,18}$/u.test(n)){q('#ag24-error').textContent='Idatzi 2 eta 18 karaktere arteko goitizen bat.';return}s.nick=n;try{localStorage.setItem(NICK,n)}catch{}hideModal();s.playing=true;startTimer();render()}
function startTimer(){clearInterval(timer);timer=setInterval(()=>{if(!s||!s.playing||s.finished)return;s.seconds=Math.max(0,s.seconds-1);if(q('#ag24-clock'))q('#ag24-clock').textContent=formTime(s.seconds);if(s.seconds===0){end(false,'Denbora agortu da.')}},1000)}
function notify(message,kind=''){let box=q('#ag24-feedback');if(!box)return;box.textContent=message;box.className='ag24-feedback show '+kind;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>{if(box)box.classList.remove('show')},2300)}
function render(){if(!root||!s)return;root.dataset.ir25=s.phase===2?'on':'off';root.dataset.ar27=s.phase===3?'on':'off';root.dataset.mk28=s.phase===4?'on':'off';const p=phase();q('#ag24-title').textContent=p.title;q('#ag24-subtitle').textContent=`8. JOKOA · ${s.phase}. ERRONKA / 4`;q('#ag24-rule').textContent=p.instruction;q('#ag24-clock').textContent=formTime(s.seconds);q('#ag24-score').textContent=score().toLocaleString('eu-ES');q('#ag24-lives').textContent='❤️'.repeat(s.lives)+'♡'.repeat(3-s.lives);q('#ag24-lives').setAttribute('aria-label',s.lives+' bizitza');q('#ag24-phase-chip').textContent=s.phase+'. erronka / 4 · '+s.solved.size+'/'+labels().length+' zuzen';q('#ag24-dots').innerHTML=PHASES.map((ph,i)=>`<span class="ag24-dot ${i+1<s.phase?'done':i+1===s.phase?'active':''}" aria-label="${i+1}. erronka">${i+1<s.phase?'✓':i+1}</span>`).join('');q('#ag24-verify').disabled=s.finished||!s.playing;
 q('#ag24-scene').style.setProperty('--ag24-scene',`url("${assets[p.art]}")`);q('#ag24-scene').dataset.phase=String(s.phase);
 if(s.phase===2){renderIrrigation();return;}
  if(s.phase===3){renderArtisans();return;}
 if(s.phase===4){mkRender();return;}
 const target=(id,i,secondary)=>{const assigned=s.placements[id],done=s.solved.has(id),sel=!!s.selected&&!done;const name=assigned?labelOf(assigned):'';return `<button type="button" class="ag24-target ${assigned?'has-card':''} ${done?'solved':''} ${sel?'selected-target':''}" data-slot="${id}" aria-label="${done?esc('Osatuta: '+name):'Landare edo produktuaren '+(i+1)+'. irudia'}" aria-pressed="false" ${done?'disabled':''}>${assigned?esc(name)+(done?' ✓':''):'<span class="ag24-mark">?</span>'}</button>`};
 if(s.phase===1){q('#ag24-targets').innerHTML=p.labels.map(([id],i)=>`<div style="display:contents"><span style="display:none">${i+1}</span>${target(id,i).replace('class="ag24-target','style="left:'+PLOTS[i].x+'%;top:'+PLOTS[i].y+'%" class="ag24-target')}</div>`).join('');}
 else{q('#ag24-targets').innerHTML=`<div class="ag24-sec-grid">${p.labels.map(([id],i)=>`<div class="ag24-sec-slot"><img src="${assets[id]||''}" alt="" draggable="false" loading="eager">${target(id,i)}</div>`).join('')}</div>`}
 q('#ag24-cards').innerHTML=s.orders[s.phase-1].map(id=>{const placed=Object.values(s.placements).includes(id),done=s.solved.has(id);return `<button class="ag24-card ${s.selected===id?'is-selected':''} ${done?'is-solved':''} ${placed&&!done?'is-placed':''}" data-card="${id}" aria-pressed="${s.selected===id}" draggable="${s.playing&&!done}" ${done?'disabled':''}>${esc(labelOf(id))}${done?'<span class="ag24-correctmark">✓</span>':''}</button>`}).join('');
}

/* Phase 2 of 4 — genuinely interactive SVG connections + a separate circuit substage. */
const IR_IDS=['noriak','ubideak','putzuak','terrazak'];
const IR_FN={noriak:'Ura ateratzeko',ubideak:'Ura banatzeko',putzuak:'Ura biltzeko',terrazak:'Mendi-hegaletan landatzeko'};
function irNewState(){let fnOrder=shuffle(IR_IDS);if(fnOrder.every((id,i)=>id===IR_IDS[i]))fnOrder.reverse();return {step:'matching',links:{},correct:new Set(),placements:{},circuitCorrect:new Set(),selectedTech:null,selectedPiece:null,busy:false,wrong:[],fnOrder,stageDone:false};}
function irState(){if(!s.irrigation)s.irrigation=irNewState();return s.irrigation;}
function irLabel(id){return ({noriak:'Noriak',ubideak:'Ubideak',putzuak:'Putzuak eta uharkak',terrazak:'Terrazak'})[id]||id}
function irArtUrl(id){return irArt['card_'+id]||assets[id]||''}
function renderIrrigation(){const ir=irState(),step=ir.step,matched=ir.correct.size,activated=ir.circuitCorrect.size;
 const scene=q('#ag24-scene'),tray=q('#ag24-cards'),verify=q('#ag24-verify');
 scene.dataset.ir25=step;
 q('#ag24-phase-chip').textContent='2. erronka / 4 · '+(step==='matching'?matched+'/4 lotura':activated+'/4 aktibatuta');
 q('#ag24-rule').textContent=step==='matching'?'Aukeratu teknika bat eta lotu dagokion funtzioarekin.':'Aukeratu teknika eta sakatu irudian dagokion elementua.';
 const top=ir.fnOrder.map(id=>`<button type="button" data-ir-fn="${id}" class="ir25-function ${ir.correct.has(id)?'correct':''} ${ir.selectedTech?'selected':''}" ${ir.correct.has(id)?'disabled':''}><span>${IR_FN[id]}</span><span class="ir25-pin"></span></button>`).join('');
 const cards=IR_IDS.map(id=>`<button type="button" class="ir25-tech ${ir.correct.has(id)?'correct':''} ${ir.selectedTech===id?'selected':''}" data-ir-tech="${id}" ${ir.correct.has(id)?'disabled':''} aria-pressed="${ir.selectedTech===id}"><span class="ir25-pin" data-ir-drag="${id}"></span><span class="ir25-tech-label">${irLabel(id)}</span><img class="ir25-art" src="${irArtUrl(id)}" alt="" draggable="false"><span class="ir25-tech-hint">${ir.correct.has(id)?'✓ Zuzen':ir.links[id]?'↗ '+IR_FN[ir.links[id]]:ir.selectedTech===id?'Aukeratuta — lotu goiko funtzioarekin':'Hautatu eta lotu'}</span></button>`).join('');
 const circ=IR_IDS.map((id,i)=>{const chosen=ir.placements[id],done=ir.circuitCorrect.has(id);const blocked=step==='matching'||done;return `<button type="button" class="ir25-circuit-btn ir26-circuit-arrow ${done?'correct':chosen?'placed':''} ${step==='matching'?'preview':''}" data-ir-place="${id}" style="left:${[25.2,39.0,49.6,80.4][i]}%" aria-label="${step==='matching'?'Hurrengo jarduera: ':''}Ureztatzeko sistemaren ${i+1}. eremua${chosen?' : '+irLabel(chosen):''}" title="${step==='matching'?'Osatu lehenik goiko lau loturak':chosen?irLabel(chosen):'Aukeratu izen bat behean eta sakatu hemen'}" ${blocked?'disabled':''}><span class="ir26-arrow-symbol" aria-hidden="true">${done?'✓':'❯'}</span>${chosen&&!done?`<span class="ir26-arrow-label">${irLabel(chosen)}</span>`:''}</button>`}).join('');
 const active=['noriak','ubideak','putzuak','terrazak'].filter(id=>ir.circuitCorrect.has(id)).map(id=>'active-'+id).join(' ');
 const instruction=step==='matching'?'Lotu teknika bakoitza bere funtzioarekin.':'Aukeratu izen bat, eta sakatu beheko paisaian dagokion lekua.';
 q('#ag24-targets').innerHTML=`<div class="ir25-stage"><aside class="ir25-sidebar"><div class="ir25-sidebar-title">8. JOKOA</div><div class="ir25-sidebar-sub">Ureztapen-erronka</div><div class="ir25-sidebar-icon">❈</div><div class="ir25-sidebar-instruct">${instruction}</div><div class="ir25-sidebar-progress">${step==='matching'?matched:activated}/4</div></aside><div class="ir25-main"><div class="ir25-board"><div class="ir25-functions">${top}</div><div class="ir25-techcards">${cards}</div><svg class="ir25-wires" id="ir25-wires" aria-hidden="true"></svg></div><div class="ir25-circuit ${active}" style="background-image:url('${irArt.circuit||assets.water}')"><div class="ir25-circuit-title">Ureztatze-sistema · ${step==='matching'?'Hurrengo jarduera':'Aktibatu lau elementuak'}</div><span class="ir25-wheel-spin"></span><span class="ir25-flow"></span><span class="ir25-ripple"></span><span class="ir25-terrace-glow"></span>${circ}</div></div></div>`;
 if(step==='matching'){
   tray.innerHTML=`<div class="ir25-summary">✦ Lotu lau teknikak eta goiko funtzioak. Lerroak alda ditzakezu egiaztatu aurretik. ✦</div>`;
   verify.textContent='✓ Egiaztatu';
   requestAnimationFrame(irDrawLines);
 }else if(step==='circuit'||step==='completed'){
   tray.innerHTML=`<div class="ir25-pieces">${IR_IDS.map(id=>`<button type="button" class="ir25-piece ${ir.selectedPiece===id?'selected':''} ${ir.circuitCorrect.has(id)?'correct':''}" data-ir-piece="${id}" ${ir.circuitCorrect.has(id)?'disabled':''} aria-pressed="${ir.selectedPiece===id}">${irLabel(id)}${ir.circuitCorrect.has(id)?' ✓':''}</button>`).join('')}</div>`;
   verify.textContent=step==='completed'?'✓ Osatuta':'✓ Egiaztatu';
 }
 verify.disabled=!s.playing||s.finished||ir.busy;
}
function irClick(ev){const tech=ev.target.closest('[data-ir-tech]'),fn=ev.target.closest('[data-ir-fn]'),piece=ev.target.closest('[data-ir-piece]'),place=ev.target.closest('[data-ir-place]');
 if(!tech&&!fn&&!piece&&!place)return false;
 if(!s?.playing||s?.finished)return true;
 const ir=irState();if(ir.busy)return true;
 if(tech){const id=tech.dataset.irTech;if(ir.step!=='matching'||ir.correct.has(id))return true;ir.selectedTech=ir.selectedTech===id?null:id;render();if(ir.selectedTech)notify('Aukeratu goiko funtzioa: '+irLabel(id));return true;}
 if(fn){if(ir.step!=='matching')return true;const id=fn.dataset.irFn;if(ir.correct.has(id))return true;if(!ir.selectedTech){notify('Lehenik, aukeratu beheko teknika bat.');return true;}irLink(ir.selectedTech,id);return true;}
 if(piece){if(ir.step!=='circuit')return true;let id=piece.dataset.irPiece;if(ir.circuitCorrect.has(id))return true;ir.selectedPiece=ir.selectedPiece===id?null:id;render();if(ir.selectedPiece)notify('Sakatu orain paisaian dagokion lekua.');return true;}
 if(place){if(ir.step!=='circuit')return true;const slot=place.dataset.irPlace;if(ir.circuitCorrect.has(slot))return true;if(ir.selectedPiece)irPlace(slot,ir.selectedPiece);else if(ir.placements[slot]){delete ir.placements[slot];render();}else notify('Hautatu beheko izen bat.');return true;}
 return false;
}
function irLink(tech,fn){if(!s?.playing||s.phase!==2)return;const ir=irState();if(ir.step!=='matching'||ir.correct.has(tech)||ir.correct.has(fn)||!IR_IDS.includes(tech)||!IR_IDS.includes(fn))return;
 for(const old of IR_IDS){if(ir.links[old]===fn&&old!==tech&&!ir.correct.has(old))delete ir.links[old];}
 if(ir.links[tech]===fn)delete ir.links[tech];else ir.links[tech]=fn;
 ir.selectedTech=null;render();}
function irPlace(slot,id){if(!s?.playing||s.phase!==2)return;const ir=irState();if(ir.step!=='circuit'||ir.circuitCorrect.has(slot)||ir.circuitCorrect.has(id)||!IR_IDS.includes(slot)||!IR_IDS.includes(id))return;
 const prev=Object.keys(ir.placements).find(k=>ir.placements[k]===id);if(prev&&prev!==slot)delete ir.placements[prev];const prior=ir.placements[slot];if(ir.placements[slot]===id)delete ir.placements[slot];else ir.placements[slot]=id;
 ir.selectedPiece=null;render();}
function irDrawLines(){if(!root||s?.phase!==2||s?.irrigation?.step!=='matching')return;const layer=q('#ir25-wires');if(!layer)return;const r=layer.getBoundingClientRect(),ir=irState();let out='';
 for(const [tech,fn] of Object.entries(ir.links)){let from=q(`[data-ir-tech="${tech}"] .ir25-pin`),to=q(`[data-ir-fn="${fn}"] .ir25-pin`);if(!from||!to)continue;let a=from.getBoundingClientRect(),b=to.getBoundingClientRect();const x1=a.left+a.width/2-r.left,y1=a.top+a.height/2-r.top,x2=b.left+b.width/2-r.left,y2=b.top+b.height/2-r.top,dy=Math.max(14,Math.abs(y1-y2)*.46);const path=`M ${x1} ${y1} C ${x1} ${y1-dy} ${x2} ${y2+dy} ${x2} ${y2}`;out+=`<g class="${ir.correct.has(tech)?'good':'pending'}"><path class="ir25-wire-halo" d="${path}"/><path class="ir25-wire-core" d="${path}"/></g>`;}
 layer.innerHTML=out;
}
let irDrag=null;
function irPointerDown(e){const pin=e.target.closest?.('[data-ir-drag]');if(!pin||s?.phase!==2||e.button!==0)return;const ir=irState();if(ir.step!=='matching'||ir.correct.has(pin.dataset.irDrag))return;const id=pin.dataset.irDrag;let moved=false;const startX=e.clientX,startY=e.clientY;
 function move(ev){if(Math.hypot(ev.clientX-startX,ev.clientY-startY)>8){moved=true;pin.style.boxShadow='0 0 20px #afffff';}}
 function up(ev){if(ev.pointerId!==e.pointerId)return;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);pin.style.boxShadow='';if(ev.type!=='pointerup'||!moved||!s?.playing||s.phase!==2)return;const fn=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-ir-fn]');if(fn){irLink(id,fn.dataset.irFn);}}
 window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true});window.addEventListener('pointercancel',up,{once:true});}
function irVerify(){if(!s||s.phase!==2||!s.playing||s.finished)return;const ir=irState();if(ir.busy)return;const incomplete=IR_IDS.some(id=>ir.step==='matching'?(!ir.correct.has(id)&&!ir.links[id]):(!ir.circuitCorrect.has(id)&&!ir.placements[id]));if(incomplete){notify('Osatu lau loturak egiaztatu aurretik. Ez duzu bizitzarik galdu.');return;}ir.busy=true;
 let good=0,bad=0;
 if(ir.step==='matching'){
   for(const id of IR_IDS){if(ir.correct.has(id))continue;if(ir.links[id]===id){ir.correct.add(id);s.solved.add(id);s.points+=45;good++;}else{bad++;delete ir.links[id];}}
 }else if(ir.step==='circuit'){
   for(const id of IR_IDS){if(ir.circuitCorrect.has(id))continue;if(ir.placements[id]===id){ir.circuitCorrect.add(id);good++;}else{bad++;delete ir.placements[id];}}
 }else{ir.busy=false;return;}
 if(bad){s.lives=Math.max(0,s.lives-1);s.errors++;ir.selectedTech=null;ir.selectedPiece=null;ir.busy=false;render();notify(`${good} zuzen; ${bad} oker edo bete gabe. Bizitza bat galdu duzu.`,'bad');if(s.lives===0)end(false,'Hiru bizitzak galdu dituzu.');return;}
 ir.busy=false;
 if(ir.step==='matching'&&ir.correct.size===4){ir.step='circuit';render();notify('Bikain! Orain, aktibatu beheko lau elementuak.','good');return;}
 if(ir.step==='circuit'&&ir.circuitCorrect.size===4){ir.step='completed';s.playing=false;s.sumRemaining+=s.seconds;clearInterval(timer);render();notify('Bikain! Ureztatze-sistema osatu duzu!','good');{const finishedRound=s;setTimeout(()=>{if(s===finishedRound&&!s.finished&&s.phase===2)stageFinished()},450)};return;}
 render();notify('Ongi! Jarraitu falta diren loturekin.','good');}
window.addEventListener('resize',()=>{if(s?.phase===2&&s.irrigation?.step==='matching')requestAnimationFrame(irDrawLines)});

/* V27: Three interactive artisan workshops inside one illustrated courtyard. */
const AR_WORKSHOPS=['ehungintza','zeramika','metalgintza'];
const AR_LABELS={ehungintza:'Ehungintza',zeramika:'Zeramika',metalgintza:'Metalgintza',ehunak:'Kotoizko eta lihozko ehunak',alfonbrak:'Alfonbrak eta tapizak'};
const AR_CERAMIC_ITEMS=[
 {id:'clay',art:'object_clay',ceramic:true},
 {id:'vase',art:'object_ceramic_vase',ceramic:true},
 {id:'plate',art:'object_ceramic_plate',ceramic:true},
 {id:'leather',art:'object_leather',ceramic:false},
 {id:'fabric',art:'object_fabric',ceramic:false},
 {id:'metaljug',art:'object_metal_jug',ceramic:false}
];
const AR_METAL_ITEMS=[
 {id:'metaljug',art:'object_metal_jug',metal:true},
 {id:'metaltray',art:'object_metal_tray',metal:true},
 {id:'vase',art:'object_ceramic_vase',metal:false},
 {id:'leather',art:'object_leather',metal:false}
];
const arAssets=window.ISLAMA_V27_ART||{};
function arNewState(){return {active:null,done:new Set(),busy:false,lastCheckAt:-1e9,
 textile:{selected:null,placements:{},locked:new Set(),order:shuffle(['alfonbrak','ehunak'])},
 ceramic:{selected:new Set(),locked:new Set(),order:shuffle(AR_CERAMIC_ITEMS.map(o=>o.id))},
 metal:{placements:{},locked:new Set(),order:shuffle(AR_METAL_ITEMS.map(o=>o.id))}};}
function arState(){if(!s.artisans)s.artisans=arNewState();return s.artisans;}
function arImage(key){return arAssets[key]||'';}
function arPiece(id,items){return items.find(o=>o.id===id);}
function arActiveMarkup(a){const active=a.active;
 if(!active){return `<div class="ar27-empty"><div class="ar27-palm" aria-hidden="true">✧ ❈ ✧</div><div>${a.done.size?'Oso ondo! Aukeratu beste tailer bat.':'Aukeratu hiru tailerretako bat hasteko.'}</div><div class="ar27-note">Tailer bakoitzean, irudiek erakusten dituzten produktuak identifikatu.</div></div>`;}
 if(active==='ehungintza'){
  const tx=a.textile;
  const targets=[['ehunak','object_fabric'],['alfonbrak','object_carpet']];
  return `<div class="ar27-twocol">${targets.map(([slot,art],i)=>`<button type="button" class="ar27-product-target ${tx.locked.has(slot)?'done':''} ${tx.selected&&!tx.locked.has(slot)?'selected':''}" data-ar-target="${slot}" ${tx.locked.has(slot)?'disabled':''} aria-label="${i+1}. ehun-irudia; ${tx.placements[slot]?AR_LABELS[tx.placements[slot]]:'izenik gabe'}"><img src="${arImage(art)}" alt="" draggable="false"><span class="ar27-target-answer">${tx.placements[slot]?esc(AR_LABELS[tx.placements[slot]])+(tx.locked.has(slot)?' ✓':''):'? · Sakatu izena hautatu ondoren'}</span></button>`).join('')}</div><div class="ar27-text-cards">${tx.order.map(id=>{const placed=Object.values(tx.placements).includes(id),locked=tx.locked.has(id);return `<button type="button" class="ar27-text-card ${tx.selected===id?'selected':''} ${placed?'placed':''} ${locked?'done':''}" data-ar-card="${id}" aria-pressed="${tx.selected===id}" draggable="${s.playing&&!locked}" ${locked?'disabled':''}>${AR_LABELS[id]}${locked?' ✓':''}</button>`}).join('')}</div>`;
 }
 if(active==='zeramika'){
  return `<div class="ar27-pieces">${a.ceramic.order.map((id,i)=>{const item=arPiece(id,AR_CERAMIC_ITEMS),locked=a.ceramic.locked.has(id),selected=a.ceramic.selected.has(id);return `<button type="button" data-ar-ceramic="${id}" aria-pressed="${selected}" aria-label="${i+1}. objektua ${selected?'aukeratua':'aukeratu gabe'}" ${locked?'disabled':''} class="ar27-piece ${selected?'selected':''} ${locked?'done':''}"><img src="${arImage(item.art)}" alt="" draggable="false"><span class="ar27-piece-index">${i+1}</span>${locked?'<span class="ar27-piece-check">✓</span>':''}</button>`}).join('')}</div>`;
 }
 return `<div class="ar27-class-grid">${a.metal.order.map((id,i)=>{const item=arPiece(id,AR_METAL_ITEMS),locked=a.metal.locked.has(id),choice=a.metal.placements[id];return `<div class="ar27-class-card ${locked?'done':''}"><img src="${arImage(item.art)}" alt="" draggable="false"><span class="ar27-note">${i+1}. objektua ${locked?'✓':''}</span><div class="ar27-class-actions"><button type="button" class="ar27-class-choice ${choice==='metal'?'picked':''}" data-ar-class="${id}|metal" ${locked?'disabled':''} aria-pressed="${choice==='metal'}">Metala</button><button type="button" class="ar27-class-choice ${choice==='other'?'picked':''}" data-ar-class="${id}|other" ${locked?'disabled':''} aria-pressed="${choice==='other'}">Besteak</button></div></div>`}).join('')}</div>`;
}
function renderArtisans(){const a=arState(),active=a.active;const scene=q('#ag24-scene');
 scene.dataset.ar27='on';
 q('#ag24-title').textContent='Tailerren patioa';
 q('#ag24-rule').textContent='Bisitatu hiru tailerrak eta osatu jarduera bakoitza agertokia utzi gabe.';
 q('#ag24-phase-chip').textContent='3. erronka / 4 · '+a.done.size+'/3 tailer';
 const workshopCards=AR_WORKSHOPS.map(id=>{const done=a.done.has(id),chosen=active===id;return `<section class="ar27-workshop ${done?'done':''} ${chosen?'active':''}" data-ar-ws="${id}"><div class="ar27-workshop-top">${AR_LABELS[id]} ${done?'✓':''}</div><img class="ar27-workshop-img" src="${arImage('workshop_'+(id==='ehungintza'?'textile':id==='zeramika'?'ceramic':'metal'))}" alt="" draggable="false"><button type="button" class="ar27-ws-button" data-ar-open="${id}" aria-label="${AR_LABELS[id]} tailerra ${done?'osatuta':'ireki'}" aria-pressed="${chosen}" ${done?'disabled':''}>${done?'✓':'❯'}</button></section>`}).join('');
 const prompts={ehungintza:'Lotu bi ehun-produktuen izenak dagokien irudiekin.',zeramika:'Aukeratu zeramikazko hiru produktuak.',metalgintza:'Sailkatu objektuak: metalezkoak edo beste materialez egindakoak.'};
 q('#ag24-targets').innerHTML=`<div class="ar27-stage" style="--ar27-patio:url('${arImage('courtyard')}')"><aside class="ar27-side"><div class="ar27-side-title">8. JOKOA</div><div class="ar27-side-sub">Tailerren erronka</div><div class="ar27-side-flower" aria-hidden="true">✥</div><p class="ar27-side-instruction">Bisitatu hiru tailerrak eta osatu bakoitzaren jarduera, agertokia utzi gabe.</p><div class="ar27-progress">${a.done.size}/3<small>TAILER</small></div></aside><div class="ar27-right"><div class="ar27-workshops">${workshopCards}</div><section class="ar27-workbench" aria-label="Tailerreko jarduera"><div class="ar27-workbench-head"><span>✥ ${active?'Tailer aktiboa: '+AR_LABELS[active]:'Hiru tailerren erronka'}</span><small>${active?prompts[active]:'Hautatu tailer bat hasteko'}</small></div><div class="ar27-workbench-body">${arActiveMarkup(a)}</div></section><div class="ar27-actions">${a.done.size===3?'<div class="ar27-done-message">✓ Bikain! Hiru tailerrak osatu dituzu!</div>':active?'<button class="ar27-verify" type="button" data-ar-verify>✓ Egiaztatu</button>':'<div class="ar27-done-message">❯ Aukeratu tailer bat eta hasi jolasten!</div>'}</div></div></div>`;
 q('#ag24-verify').disabled=true; // old verifier stays visually hidden
}
function arSelectText(id){if(!s?.playing||s.phase!==3)return;const a=arState(),tx=a.textile;if(a.active!=='ehungintza'||tx.locked.has(id))return;tx.selected=tx.selected===id?null:id;render();}
function arAssignText(slot,id){if(!s?.playing||s.phase!==3)return;const a=arState(),tx=a.textile;if(a.active!=='ehungintza'||!['ehunak','alfonbrak'].includes(id)||tx.locked.has(id)||tx.locked.has(slot))return;
 const oldSlot=Object.keys(tx.placements).find(k=>tx.placements[k]===id),prior=tx.placements[slot];
 if(oldSlot===slot){tx.selected=null;render();return;}
 if(oldSlot)delete tx.placements[oldSlot];
 if(prior&&oldSlot&&!tx.locked.has(oldSlot))tx.placements[oldSlot]=prior;
 tx.placements[slot]=id;tx.selected=null;render();}
function arOpenWorkshop(id){if(!s?.playing||s.phase!==3)return;const a=arState();if(a.done.has(id))return;a.active=id;render();notify('Tailer aktiboa: '+AR_LABELS[id]);
 if(window.innerWidth<1181||window.innerHeight<820)requestAnimationFrame(()=>{const el=q('.ar27-workbench');if(el&&root&&s?.phase===3)root.scrollTo({top:Math.max(0,root.scrollTop+el.getBoundingClientRect().top-145),behavior:'smooth'});});}
function arClick(e){if(!s||s.phase!==3)return false;
 const open=e.target.closest('[data-ar-open]'),txt=e.target.closest('[data-ar-card]'),slot=e.target.closest('[data-ar-target]'),cer=e.target.closest('[data-ar-ceramic]'),met=e.target.closest('[data-ar-class]'),check=e.target.closest('[data-ar-verify]');
 if(!open&&!txt&&!slot&&!cer&&!met&&!check)return false;
 if(!s.playing||s.finished)return true;
 const a=arState();if(a.busy)return true;
 if(open){arOpenWorkshop(open.dataset.arOpen);return true;}
 if(txt){arSelectText(txt.dataset.arCard);return true;}
 if(slot){if(a.textile.selected)arAssignText(slot.dataset.arTarget,a.textile.selected);else if(a.textile.placements[slot.dataset.arTarget]&&!a.textile.locked.has(slot.dataset.arTarget)){delete a.textile.placements[slot.dataset.arTarget];render();}else notify('Lehenik, hautatu beheko izenetako bat.');return true;}
 if(cer){const id=cer.dataset.arCeramic;if(a.active==='zeramika'&&!a.ceramic.locked.has(id)){if(a.ceramic.selected.has(id))a.ceramic.selected.delete(id);else a.ceramic.selected.add(id);render();}return true;}
 if(met){const [id,v]=met.dataset.arClass.split('|');if(a.active==='metalgintza'&&!a.metal.locked.has(id)){a.metal.placements[id]=v;render();}return true;}
 if(check){arVerify();return true;}
 return true;
}
function arVerify(){if(!s||s.phase!==3||!s.playing||s.finished)return;const a=arState();if(a.busy)return;const active=a.active;if(!active){notify('Aukeratu osatu gabe dagoen tailer bat.');return;}let incomplete=false;if(active==='ehungintza')incomplete=['ehunak','alfonbrak'].some(id=>!a.textile.locked.has(id)&&!a.textile.placements[id]);else if(active==='zeramika')incomplete=a.ceramic.selected.size<3;else if(active==='metalgintza')incomplete=AR_METAL_ITEMS.some(item=>!a.metal.locked.has(item.id)&&!a.metal.placements[item.id]);if(incomplete){notify('Osatu jarduera egiaztatu aurretik. Ez duzu bizitzarik galdu.');return;}a.lastCheckAt=performance.now();a.busy=true;
 let good=0,bad=0,completed=false;
 if(active==='ehungintza'){
  const t=a.textile;for(const id of ['ehunak','alfonbrak']){if(t.locked.has(id))continue;if(t.placements[id]===id){t.locked.add(id);good++;}else{bad++;delete t.placements[id];}}
  completed=t.locked.size===2;
 }else if(active==='zeramika'){
  const c=a.ceramic;for(const item of AR_CERAMIC_ITEMS){if(item.ceramic&&!c.locked.has(item.id)){if(c.selected.has(item.id)){c.locked.add(item.id);good++;}else bad++;}else if(!item.ceramic&&c.selected.has(item.id)){bad++;c.selected.delete(item.id);}}
  completed=c.locked.size===3;
 }else if(active==='metalgintza'){
  const m=a.metal;for(const item of AR_METAL_ITEMS){if(m.locked.has(item.id))continue;const expected=item.metal?'metal':'other';if(m.placements[item.id]===expected){m.locked.add(item.id);good++;}else{bad++;delete m.placements[item.id];}}
  completed=m.locked.size===AR_METAL_ITEMS.length;
 }else {a.busy=false;notify('Lehenik, aukeratu tailer bat.','bad');return;}
 if(completed&&bad===0&&!a.done.has(active)){
  a.done.add(active);s.solved.add(active);s.points+=45;
  a.active=null; // returns to the same courtyard with all workshops visible
 }
 if(bad){s.errors++;a.busy=false;render();notify(`${good} ondo; ${bad} oker. Zuzendu eta saiatu berriro: ez duzu bizitzarik galdu.`,'bad');return;}
 a.busy=false;
 if(a.done.size===3){s.playing=false;clearInterval(timer);s.sumRemaining+=s.seconds;render();notify('Bikain! Hiru tailerrak osatu dituzu!','good');{const finishedRound=s;setTimeout(()=>{if(s===finishedRound&&!s.finished&&s.phase===3)stageFinished();},600)};return;}
 render();notify(`${AR_LABELS[active]} osatuta! ${a.done.size}/3 tailer. Aukeratu hurrengoa.`,'good');
 if(window.innerWidth<1181||window.innerHeight<820)requestAnimationFrame(()=>{const el=q('.ar27-workshops');if(el&&root&&s?.phase===3)root.scrollTo({top:Math.max(0,root.scrollTop+el.getBoundingClientRect().top-140),behavior:'smooth'});});
}

/* Game 8 / challenge 4: one persistent high-resolution bazaar, three grounded mini-challenges. */
const MK_IMG=Object.assign({},window.ISLAMA_V28_ART||{},window.ISLAMA_V29_CUTOUTS||{});
const MK_LABEL={zetak:'Zetak',ehunak:'Ehunak',metalak:'Metalak',larruak:'Larruak',gatza:'Gatza',espeziak:'Espeziak',caravan:'Karabana handiak',ship:'Bela-ontziak',dinar:'Urrezko txanpona (dinarra)',truke:'Truke letra',txekea:'Txekea'};
const MK_CFG={
 products:{title:'Azokako salgaiak',intro:'Lotu produktu bakoitzaren izena dagokion irudi handiarekin.',ids:['zetak','ehunak','metalak','larruak','gatza','espeziak'],marker:'karabana'},
 transport:{title:'Merkataritza-garraioa',intro:'Lotu lurreko eta itsasoko garraioa dagokien irudiekin.',ids:['caravan','ship'],marker:'dinar'},
 payments:{title:'Truke-bideak',intro:'Lotu truke-bide bakoitza dagokion irudiarekin.',ids:['dinar','truke','txekea'],marker:'truke'}
};
const MK_STEPS=['products','transport','payments'];
function mkNewState(){let orders={};for(const key of MK_STEPS){orders[key]=shuffle(MK_CFG[key].ids);if(orders[key].every((id,i)=>id===MK_CFG[key].ids[i]))orders[key].reverse();}return {step:'products',selected:null,placements:{products:{},transport:{},payments:{}},locked:{products:new Set(),transport:new Set(),payments:new Set()},done:new Set(),orders,busy:false,lastCheckAt:-1,finished:false};}
function mkState(){if(!s.market)s.market=mkNewState();return s.market;}
function mkAssign(slot,id){if(!s||s.phase!==4||!s.playing||s.finished)return;const m=mkState(),step=m.step,items=MK_CFG[step].ids;
 if(m.busy||m.finished||!items.includes(slot)||!items.includes(id)||m.locked[step].has(slot)||m.locked[step].has(id))return;
 const prev=Object.keys(m.placements[step]).find(k=>m.placements[step][k]===id);
 if(prev===slot){m.selected=null;render();return;}
 if(prev)delete m.placements[step][prev];
 m.placements[step][slot]=id;m.selected=null;render();notify('Txartela jarrita. Egiaztatu aurretik alda dezakezu.');
}
function mkOpen(step){if(!s||s.phase!==4||!MK_CFG[step])return;const m=mkState();if(m.finished)return;
 if(step!==m.step){notify('Amaitu lehenik oraingo jarduera.','bad');return;}
 render();}
function mkRender(){const m=mkState(),step=m.step,conf=MK_CFG[step],ids=conf.ids,placements=m.placements[step],locked=m.locked[step];
 const stage=q('#ag24-targets');q('#ag24-phase-chip').textContent=`4. erronka / 4 · ${m.done.size}/3 jarduera`;
 q('#ag24-rule').textContent='Ezagutu merkataritza-produktuak, garraiobideak eta truke-bideak.';
 root.style.setProperty('--mk28-backdrop',`url("${MK_IMG.market_backdrop}")`);
 const sideSteps=MK_STEPS.map((key,i)=>`<button type="button" class="mk28-side-step ${m.done.has(key)?'done':key===step?'active':''}" data-mk-open="${key}" aria-label="${MK_CFG[key].title}: ${m.done.has(key)?'osatuta':key===step?'aktiboa':'zain'}" ${key!==step?'disabled':''}><span class="mk28-step-dot">${m.done.has(key)?'✓':i+1}</span><span>${['Produktuak','Garraioa','Truke-bideak'][i]}</span></button>`).join('');
 const heroInfo=[['products','Salgaiak eta luxua','stall_goods'],['transport','Merkataritza-garraioa','stall_transport'],['payments','Truke-bideak','merchant']];
 const hero=heroInfo.map(([key,title,pic],i)=>`<button type="button" class="mk28-hero-tile ${m.done.has(key)?'done':key===step?'active':''}" data-mk-open="${key}" ${key!==step?'disabled':''} aria-label="${title}"><img src="${MK_IMG[pic]}" alt="" draggable="false"><span class="mk28-hero-state">${m.done.has(key)?'✓':i+1}</span><span class="mk28-hero-caption">${title}</span></button>`).join('');
 const cards=ids.map((id,i)=>{const val=placements[id],done=locked.has(id);return `<button type="button" class="mk28-object ${done?'correct':val?'placed':''}" data-mk-slot="${id}" aria-label="${i+1}. irudia; ${val?'Jarrita: '+MK_LABEL[val]:'izenik gabe'}" ${done||m.finished?'disabled':''}><img src="${MK_IMG[id]}" alt="" draggable="false"><span class="mk28-assigned">${val?esc(MK_LABEL[val])+(done?' ✓':''):'?'}</span></button>`;}).join('');
 const tray=m.orders[step].map(id=>{let done=locked.has(id),placed=Object.values(placements).includes(id);return `<button type="button" draggable="${s.playing&&!done}" data-mk-card="${id}" class="mk28-text-card ${m.selected===id?'selected':''} ${done?'locked':placed?'used':''}" aria-pressed="${m.selected===id}" ${done||m.finished?'disabled':''}>${esc(MK_LABEL[id])}${done?' ✓':''}</button>`}).join('');
 const activityNote=step==='products'?'PDFko ohar historikoa: esklaboak ere aipatzen dira garaiko merkataritzan. Pertsonen esklabotza errealitate historikoa izan zen; ez da salgai gisa jokatzeko erabiltzen.':step==='transport'?'Karabana handiek salgaiak lurrez garraiatzen zituzten. Itsasoz bela-ontziak erabiltzen ziren.':'Dinarra, truke letra eta txekea agertzen dira diapositiban. Identifikatu irudiak; ez dago aurrez aukeratutako erantzunik.';
 stage.innerHTML=`<div class="mk28-stage"><aside class="mk28-sidebar"><div class="mk28-side-title">8. JOKOA</div><div class="mk28-side-sub">Azokako erronka</div><div class="mk28-side-instruction">Ezagutu merkataritza-produktuak, garraiobideak eta truke-bideak.</div><div class="mk29-market-emblem" aria-hidden="true">✦ 🪙 ✦</div><div class="mk28-side-progress">${sideSteps}</div><div class="mk28-side-medal"><span>4. erronka<br><small>${m.done.size}/3 eginda</small></span></div></aside>
 <div class="mk28-main"><div class="mk28-market-hero">${hero}</div>
 <section class="mk28-workpane" aria-label="${conf.title}">
 <header class="mk28-work-head"><div class="mk28-work-title">${m.finished?'Azoka osatuta!':conf.title}</div><div class="mk28-work-instruction">${m.finished?'Hiru jarduerak gainditu dituzu!':conf.intro}</div></header>
 <div class="mk28-work-body">${m.finished?'<div class="mk28-done-note">✦ Bikain! Produktuak, garraioa eta truke-bideak ezagutu dituzu. ✦</div>':`<div class="${step==='products'?'mk28-object-grid':step==='transport'?'mk28-transport-grid':'mk28-pay-grid'}">${cards}</div><div class="mk28-text-tray">${tray}</div>`}<div class="mk28-context">${activityNote}</div></div>
 </section><div class="mk28-actions"><button type="button" class="${m.finished?'mk28-finish':'mk28-verify'}" ${m.finished?'data-mk-finish':'data-mk-verify'} ${!s.playing&&!m.finished?'disabled':''}>${m.finished?'🏆 Azoka itxi':'✓ Egiaztatu'}</button></div></div></div>`;
 q('#ag24-cards').innerHTML='';q('#ag24-verify').disabled=true;
}
function mkClick(e){const open=e.target.closest('[data-mk-open]'),item=e.target.closest('[data-mk-card]'),slot=e.target.closest('[data-mk-slot]'),check=e.target.closest('[data-mk-verify]'),finish=e.target.closest('[data-mk-finish]');
 if(!open&&!item&&!slot&&!check&&!finish)return false;
 if(!s||s.phase!==4)return true;
 const m=mkState();
 if(finish){if(m.finished&&!s.finished)stageFinished();return true;}
 if(!s.playing||s.finished||m.busy)return true;
 if(open){mkOpen(open.dataset.mkOpen);return true;}
 if(item){const id=item.dataset.mkCard;if(m.locked[m.step].has(id))return true;m.selected=m.selected===id?null:id;render();if(m.selected)notify('Aukeratuta: '+MK_LABEL[id]+'. Sakatu dagokion irudia.');return true;}
 if(slot){const id=slot.dataset.mkSlot;if(m.locked[m.step].has(id))return true;if(m.selected)mkAssign(id,m.selected);else if(m.placements[m.step][id]){delete m.placements[m.step][id];render();}else notify('Lehenik, hautatu beheko etiketa.');return true;}
 if(check){mkVerify();return true;}
 return true;
}
function mkVerify(){if(!s||s.phase!==4||!s.playing||s.finished)return;const m=mkState();if(m.finished||m.busy||performance.now()-m.lastCheckAt<480)return;const step=m.step,ids=MK_CFG[step].ids,placements=m.placements[step],locked=m.locked[step];if(ids.some(id=>!locked.has(id)&&!placements[id])){notify('Osatu txartel guztiak egiaztatu aurretik. Ez duzu bizitzarik galdu.');return;}m.busy=true;m.lastCheckAt=performance.now();let good=0,bad=0;
 for(const id of ids){if(locked.has(id))continue;if(placements[id]===id){locked.add(id);good++;}else{bad++;delete placements[id];}}
 if(bad){s.lives=Math.max(0,s.lives-1);s.errors++;m.selected=null;m.busy=false;render();notify(`${good} ondo; ${bad} oker edo bete gabe. Bizitza bat galdu duzu.`,'bad');if(s.lives===0){end(false,'Hiru bizitzak galdu dituzu.')}return;}
 if(locked.size===ids.length&&!m.done.has(step)){
 m.done.add(step);s.solved.add(MK_CFG[step].marker);s.points+=45;
 const nextIndex=MK_STEPS.indexOf(step)+1;
 if(nextIndex<MK_STEPS.length){m.step=MK_STEPS[nextIndex];m.selected=null;m.busy=false;render();notify('Bikain! '+MK_CFG[step].title+' osatuta. Hurrengo jarduera prest.','good');return;}
 m.finished=true;m.busy=false;s.playing=false;clearInterval(timer);s.sumRemaining+=s.seconds;render();notify('Bikain! Azokako hiru jarduerak gainditu dituzu!','good');return;
 }
 m.busy=false;render();notify(`${good} erantzun zuzen.`, 'good');
}

function choose(id){if(!s||!s.playing||s.finished||s.solved.has(id))return;s.selected=s.selected===id?null:id;render();if(s.selected)notify('Aukeratuta: '+labelOf(id)+'. Orain, sakatu irudian dagokion hutsunea.');}
function assign(slot,id){if(!s||!s.playing||s.finished)return;if(s.solved.has(slot))return;const allowed=labels().some(([x])=>x===id);if(!allowed||s.solved.has(id))return;const oldSlot=Object.keys(s.placements).find(k=>s.placements[k]===id);const oldCard=s.placements[slot];if(oldSlot===slot){s.selected=null;render();return;}
 if(oldSlot)delete s.placements[oldSlot];if(oldCard&&oldSlot&&!s.solved.has(oldSlot)){s.placements[oldSlot]=oldCard}
 s.placements[slot]=id;s.selected=null;render();notify('Txartela jarrita. Nahi baduzu, aldatu egiaztatu aurretik.');}
function remove(slot){if(!s||!s.playing||s.solved.has(slot))return;if(s.placements[slot]){delete s.placements[slot];render();notify('Txartela berriro aukeratu dezakezu.');}}
function verify(){if(s?.phase===2){irVerify();return;}if(s?.phase===3){arVerify();return;}if(s?.phase===4){mkVerify();return;}if(!s||s.finished||!s.playing)return;const pending=labels().filter(([id])=>!s.solved.has(id));if(!pending.length)return;if(pending.some(([id])=>!s.placements[id])){notify('Osatu hutsune guztiak egiaztatu aurretik. Ez duzu bizitzarik galdu.');return;}let good=0,bad=0;for(let [id] of pending){if(s.placements[id]===id){s.solved.add(id);good++;s.points+=45}else{bad++;delete s.placements[id];}}
 if(bad){s.lives--;s.errors++;s.selected=null;render();notify(`${good} zuzen; ${bad} falta edo oker. Bizitza bat galdu duzu.`,'bad');if(s.lives<=0){{const finishedRound=s;setTimeout(()=>{if(s===finishedRound)end(false,'Hiru bizitzak galdu dituzu.')},650)}}return;}
 render();if(s.solved.size===labels().length){s.playing=false;clearInterval(timer);s.sumRemaining+=s.seconds;{const finishedRound=s,finishedPhase=s.phase;setTimeout(()=>{if(s===finishedRound&&s.phase===finishedPhase)stageFinished()},550);}}else notify('Ongi egin duzu!','good');}
function stageFinished(){if(!s||s.finished)return;if(s.phase<4){let next=PHASES[s.phase];showModal(`<div style="font-size:48px">✨ 🌿 ✨</div><h2>Oso ondo! ${esc(phase().title)}</h2><p>${labels().length} loturak osatu dituzu. <strong>${s.lives} bizitza</strong> geratzen zaizkizu.</p><p>Hurrengo erronka: <strong>${esc(next.title)}</strong>.</p><div class="ag24-modal-buttons"><button type="button" class="ag24-primary" data-action="next">Hurrengoa →</button><button type="button" class="ag24-secondary" data-action="home">Menura itzuli</button></div>`)}else end(true,'Lau erronkak gainditu dituzu!')}
function next(){if(!s||s.finished||s.phase>=4)return;s.phase++;s.seconds=phase().time;s.irrigation=s.phase===2?irNewState():null;s.artisans=s.phase===3?arNewState():null;s.market=s.phase===4?mkNewState():null;s.selected=null;s.placements={};s.solved=new Set();s.playing=true;hideModal();render();startTimer()}
function end(won,reason){if(!s||s.finished)return;clearTimers();s.finished=true;s.playing=false;s.win=won;if(won)s.timeBonus=Math.round(100*s.sumRemaining/PHASES.reduce((n,p)=>n+p.time,0));const saved=won?saveRecord():false;render();let rows=leaderboard();showModal(`<div style="font-size:56px">${won?'🏆':'⌛'}</div><h2>${won?'Zorionak!':'Partida amaitu da'}</h2><p>${esc(reason)}</p><p><strong>${score().toLocaleString('eu-ES')} / 1.000 puntu</strong> · ${s.lives} bizitza · ${s.errors} hutsegite</p><p>${won?(saved?'Errekorra nabigatzaile honetan gordeta.':'Ezin izan da errekorra gorde.'):'Partida osatugabea: ez da errekorrik gordetzen.'}</p><div class="ag24-rank"><strong>🏆 TOP 10 · Nabigatzaile honetako errekorrak</strong>${rows.length?rows.map((r,i)=>`<div class="ag24-ranking-row"><span>${i+1}.</span><span>${esc(r.name)}</span><strong>${Number(r.score)}</strong></div>`).join(''):'<p>Oraindik ez dago puntuaziorik.</p>'}</div><div class="ag24-modal-buttons"><button class="ag24-primary" data-action="replay">↻ Berriro jokatu</button><button class="ag24-secondary" data-action="home">⌂ Menura itzuli</button></div>`)}
function onClick(e){if(s?.phase===4&&mkClick(e))return;if(s?.phase===3&&arClick(e))return;if(s?.phase===2&&irClick(e))return;let action=e.target.closest('[data-action]');if(action){switch(action.dataset.action){case 'home':close();return;case 'start':start();return;case 'next':next();return;case 'replay':{let nick=s?.nick||'';reset();render();if(nick){s.nick=nick;hideModal();s.playing=true;startTimer();render()}else showIntro();return;}case 'sound':s.sound=!s.sound;action.textContent=s.sound?'♫':'♪';return;case 'verify':verify();return;}}
 let card=e.target.closest('[data-card]');if(card){if(touchDrag?.swallowClick){touchDrag.swallowClick=false;return}choose(card.dataset.card);return;}let target=e.target.closest('[data-slot]');if(target){if(s?.selected)assign(target.dataset.slot,s.selected);else remove(target.dataset.slot);return;}}
function onDragStart(e){if(s?.phase===4){const c=e.target.closest('[data-mk-card]');if(c&&!c.disabled&&s.playing){e.dataTransfer?.setData('text/plain','MK:'+c.dataset.mkCard);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';}return;}if(s?.phase===3){const c=e.target.closest('[data-ar-card]');if(c&&!c.disabled&&s.playing){e.dataTransfer?.setData('text/plain','AR:'+c.dataset.arCard);if(e.dataTransfer)e.dataTransfer.effectAllowed='move';}return;}let b=e.target.closest('[data-card]');if(!b||s?.finished||!s?.playing)return;e.dataTransfer?.setData('text/plain',b.dataset.card);if(e.dataTransfer)e.dataTransfer.effectAllowed='move'}
function onDragOver(e){if(s?.phase===4){if(e.target.closest('[data-mk-slot]'))e.preventDefault();return;}if(s?.phase===3){if(e.target.closest('[data-ar-target]'))e.preventDefault();return;}let b=e.target.closest('[data-slot]');if(b&&!b.disabled){e.preventDefault();b.classList.add('drag-over')}}
function onDragLeave(e){e.target.closest('[data-slot]')?.classList.remove('drag-over')}
function onDrop(e){if(s?.phase===4){let target=e.target.closest('[data-mk-slot]');if(target){e.preventDefault();let item=e.dataTransfer?.getData('text/plain')||'';if(item.startsWith('MK:'))mkAssign(target.dataset.mkSlot,item.slice(3));}return;}if(s?.phase===3){let target=e.target.closest('[data-ar-target]');if(target){e.preventDefault();const item=e.dataTransfer?.getData('text/plain')||'';if(item.startsWith('AR:'))arAssignText(target.dataset.arTarget,item.slice(3));}return;}const b=e.target.closest('[data-slot]');if(!b||b.disabled)return;e.preventDefault();b.classList.remove('drag-over');assign(b.dataset.slot,e.dataTransfer?.getData('text/plain')||s?.selected)}
function onTouchStart(e){
 if(e.pointerType==='mouse'||!s?.playing||!e.isPrimary)return;
 const b=e.target.closest('[data-card]');if(!b||b.disabled)return;
 // A browser may cancel a touch when it takes control of scrolling: this is NOT a drop.
 const activeRound=s,pointerId=e.pointerId;
 const data={id:b.dataset.card,x:e.clientX,y:e.clientY,ghost:null,swallowClick:false};
 touchDrag=data;
 function cleanup(retainClick=false){
  window.removeEventListener('pointermove',move);
  window.removeEventListener('pointerup',up);
  window.removeEventListener('pointercancel',cancel);
  if(data.ghost){data.ghost.remove();data.ghost=null;}
  if(touchDrag===data){
   if(retainClick)setTimeout(()=>{if(touchDrag===data)touchDrag=null},120);
   else touchDrag=null;
  }
 }
 function move(ev){
  if(ev.pointerId!==pointerId||s!==activeRound||!s?.playing)return;
  const dx=ev.clientX-data.x,dy=ev.clientY-data.y;
  if(!data.ghost&&Math.hypot(dx,dy)>12){const ghost=document.createElement('div');ghost.className='ag24-touchghost';ghost.textContent=labelOf(data.id);document.body.appendChild(ghost);data.ghost=ghost;data.swallowClick=true;}
  if(data.ghost){data.ghost.style.left=(ev.clientX+12)+'px';data.ghost.style.top=(ev.clientY-18)+'px';}
 }
 function up(ev){
  if(ev.pointerId!==pointerId)return;
  const moved=!!data.ghost;cleanup(moved);
  if(moved&&s===activeRound&&s.playing){const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-slot]');if(target&&!target.disabled)assign(target.dataset.slot,data.id);}
 }
 function cancel(ev){if(ev.pointerId===pointerId)cleanup(false);}
 window.addEventListener('pointermove',move);
 window.addEventListener('pointerup',up);
 window.addEventListener('pointercancel',cancel);
}
// Capturing before the platform's legacy gallery handler prevents the original Game 8 from also opening.
document.addEventListener('click',e=>{const tile=e.target.closest?.('#game-gallery [data-game="merkataritza"]');if(!tile)return;e.preventDefault();e.stopImmediatePropagation();launch()},true);
window.ISLAMA_V24={launch,close,inspect:()=>s?{phase:s.phase,seconds:s.seconds,lives:s.lives,points:score(),placements:{...s.placements},solved:[...s.solved],finished:s.finished,win:s.win,errors:s.errors}:null,testStart:(name='Proba8')=>{launch();q('#ag24-nick').value=name;start()},testAssign:(slot,id)=>assign(slot,id),testVerify:verify,testNext:next,testIrrLink:(tech,fn)=>irLink(tech,fn),testIrrPlace:(slot,id)=>irPlace(slot,id),testIrrState:()=>s?.irrigation?{step:s.irrigation.step,links:{...s.irrigation.links},correct:[...s.irrigation.correct],placements:{...s.irrigation.placements},circuitCorrect:[...s.irrigation.circuitCorrect]}:null,testArtOpen:(id)=>arOpenWorkshop(id),testArtText:(slot,id)=>arAssignText(slot,id),testArtChooseCeramic:(id)=>{if(s?.phase===3){let a=arState();a.active="zeramika";a.ceramic.selected.add(id);render();}},testArtClass:(id,val)=>{if(s?.phase===3){let a=arState();a.active="metalgintza";a.metal.placements[id]=val;render();}},testArtVerify:arVerify,testArtState:()=>s?.artisans?{active:s.artisans.active,done:[...s.artisans.done],textile:{placements:{...s.artisans.textile.placements},locked:[...s.artisans.textile.locked]},ceramic:{selected:[...s.artisans.ceramic.selected],locked:[...s.artisans.ceramic.locked]},metal:{placements:{...s.artisans.metal.placements},locked:[...s.artisans.metal.locked]}}:null,testMarketAssign:(slot,id)=>mkAssign(slot,id),testMarketVerify:mkVerify,testMarketFinish:()=>{if(s?.market?.finished)stageFinished()},testMarketState:()=>s?.market?{step:s.market.step,done:[...s.market.done],finished:s.market.finished,placements:Object.fromEntries(Object.entries(s.market.placements).map(([k,v])=>[k,{...v}])),locked:Object.fromEntries(Object.entries(s.market.locked).map(([k,v])=>[k,[...v]]))}:null,testTimeout:()=>{if(s)end(false,'Denbora agortu da.')}};
})();
