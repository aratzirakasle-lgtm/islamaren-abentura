
/* ISLAMAREN ABENTURA — Interactive regions reusable map engine and Game 4.
   Contours derived from PDF slide 16 via original color classes and vector tracing.
   The engine is generic: pass {id: SVG path array}, palette, and an interaction handler.
   The standalone game keeps local records; connected server score validation NOT installed. */
(()=>{
'use strict';
const ROOT_ID='hd12-root';
const TARGET_GAME='hedapena';
const KEY='islama-v4-puntuazioak';
const COLORS={ma:'#7c2a21',or:'#ec6541',om:'#f6c156'};
const NAMES={ma:'Mahomaren garaia',or:'Kalifaldi ortodoxoa',om:'Omeiatar kalifaldia'};
const YEARS={ma:'632 arte',or:'632–661',om:'661–750'};
const PATHS=window.HD12_REGION_PATHS;
const MAP=window.HD12_MAP;
const BACK=window.HD12_BACK;
let root,st=null,timer=null,locked=false,fallbackScores={};
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function el(id){return root.querySelector('#'+id)}
function migrateExpansionRecords(){
 try{const data=JSON.parse(localStorage.getItem(KEY)||'{}');
  const legacy=data['hedapena-v12'];
  if(!legacy||typeof legacy!=='object')return;
  data.hedapena=data.hedapena&&typeof data.hedapena==='object'?data.hedapena:{};
  for(const [key,record] of Object.entries(legacy)){
   if(!record||!Number.isFinite(record.score))continue;
   const prev=data.hedapena[key];
   if(!prev||record.score>prev.score)data.hedapena[key]=record;
  }
  localStorage.setItem(KEY,JSON.stringify(data));
 }catch(_){/* Private browsing may prevent storing records; gameplay still works. */}
}
migrateExpansionRecords();
function getBoard(){let data=fallbackScores;try{data=JSON.parse(localStorage.getItem(KEY))||fallbackScores}catch{}return Object.values(data[TARGET_GAME]||{}).sort((a,b)=>b.score-a.score).slice(0,10)}
function keepScore(nick,score){let data=fallbackScores;try{data=JSON.parse(localStorage.getItem(KEY))||data}catch{}data[TARGET_GAME]??={};const key=nick.toLocaleLowerCase('eu');if(!data[TARGET_GAME][key]||data[TARGET_GAME][key].score<score)data[TARGET_GAME][key]={name:nick,score,timestamp:Date.now()};fallbackScores=data;try{localStorage.setItem(KEY,JSON.stringify(data))}catch{el('hd-feedback').textContent='Behin-behineko errekorra; nabigatzaileak biltegiratzea blokeatu du.'}}
function board(){const records=getBoard();el('hd-ranklist').innerHTML=Array.from({length:10},(_,i)=>{const r=records[i];return `<div class="hd-rankrow ${r?'':'hd-rankrow-empty'}"><span>${i+1}.</span><span>${r?esc(r.name):'—'}</span><span>${r?Number(r.score).toLocaleString('eu-ES'):'—'}</span></div>`}).join('')+(!records.length?'<p class="hd-empty">Oraindik ez dago puntuaziorik.</p>':'')}
const MISSIONS=[
 {level:1,mode:'region',target:'ma',text:'Egin klik Mahomaren garaiko hedapen-eremuan.',tip:'Mapako eremu marroi iluna bilatu.',source:'16'},
 {level:1,mode:'region',target:'or',text:'Aurkitu kalifaldi ortodoxoaren hedapen-eremua.',tip:'Arabiatik kanpoko ekialdeko eta Afrika iparraldeko eremuetan hedatu zen.',source:'15–16'},
 {level:1,mode:'region',target:'om',text:'Non agertzen da omeiatarren garaiko hedapena?',tip:'Mendebaldean Iberiar penintsularaino iritsi zen.',source:'15–16'},
 {level:2,mode:'phase',target:'or',text:'Siria, Palestina eta Egiptorako hedapena: zein kalifalditan?',tip:'Mahomaren ondorengo kalifen garaia da.',source:'15'},
 {level:2,mode:'phase',target:'om',text:'Zein etapari dagokio Iberiar penintsulara iritsitako hedapena?',tip:'Mendebalderanzko hedapenik handiena.',source:'15–16'},
 {level:2,mode:'phase',target:'ma',text:'632. urterako ia Arabia osoa islamiarren menpe zegoen. Zein garairekin lotzen da?',tip:'Mahomaren heriotzaren urteari erreparatu.',source:'12'},
 {level:2,mode:'phase',target:'om',text:'Zein kalifalditan hedatu zen islama Afrika iparraldean zehar mendebalderantz?',tip:'Iberiar penintsulako hedapenarekin lotutako garaia.',source:'15'},
 {level:3,mode:'rebuild',target:'ma',text:'Berreraiki mapa: aukeratu lehenengo hedapen-etapa.',tip:'Mahomaren garaiarekin hasten da.',source:'16'},
 {level:3,mode:'rebuild',target:'or',text:'Zein da bigarren hedapen-etapa?',tip:'Mahomaren ondorengo kalifen garaia.',source:'16'},
 {level:3,mode:'rebuild',target:'om',text:'Eta zein da hirugarren hedapen-etapa?',tip:'Omeiatarren garaiko hedapena.',source:'16'}
];
class RegionMapEngine{
 constructor(svg){this.svg=svg;this.paths=[];this.draw()}
 draw(){
   this.svg.innerHTML=`<defs><marker id="hd-route-head" markerWidth="10" markerHeight="10" refX="8" refY="3.5" orient="auto"><path d="M0 0 8 3.5 0 7Z" fill="#ffe9a4"/></marker></defs><image class="hd-map-img" href="${MAP}" x="0" y="0" width="1872" height="1053" preserveAspectRatio="xMidYMid meet"/><g class="hd-flow-arrows" aria-hidden="true"><path d="M1250 555 Q1120 345 970 325"/><path d="M1125 585 Q810 390 620 450"/><path d="M1130 575 Q680 250 370 270"/><path d="M1260 550 Q1420 310 1580 310"/></g>`+
    Object.entries(PATHS).map(([id,arr])=>`<g data-region="${id}" role="button" aria-label="${NAMES[id]}" tabindex="0" style="outline:none">`+
      arr.map(d=>`<path class="hd-svg-region" data-phase="${id}" fill="${COLORS[id]}" d="${d}"/>`).join('')+`<circle class="hd-region-target" cx="${({ma:1295,or:1205,om:470})[id]}" cy="${({ma:596,or:416,om:375})[id]}" r="24"/><circle class="hd-region-target-core" cx="${({ma:1295,or:1205,om:470})[id]}" cy="${({ma:596,or:416,om:375})[id]}" r="9"/>`+`</g>`).join('');
   this.paths=[...this.svg.querySelectorAll('[data-region]')];
   this.svg.addEventListener('click',e=>{const g=e.target.closest('[data-region]');if(g)selectRegion(g.dataset.region)})
   this.svg.addEventListener('keydown',e=>{const g=e.target.closest('[data-region]');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectRegion(g.dataset.region)}})
 }
 setMode(mode,revealed=[]){
  this.svg.closest('.hd-mapcard').classList.toggle('hd-rebuild',mode==='rebuild');this.svg.closest('.hd-mapcard').classList.toggle('hd-region-mode',mode==='region');
  for(const el of this.paths){const id=el.dataset.region;el.querySelectorAll('path').forEach(p=>{
   p.classList.toggle('hd-inactive',mode!=='region'&&(mode!=='rebuild'||!revealed.includes(id)));
   p.classList.toggle('hd-revealed',mode==='rebuild'&&revealed.includes(id));
   p.classList.remove('hd-selected');
  });el.setAttribute('aria-disabled',mode==='region'?'false':'true');}
 }
 select(id){for(const el of this.paths){el.querySelectorAll('path').forEach(p=>p.classList.toggle('hd-selected',el.dataset.region===id))}}
}
let mapEngine=null;
function popup(title,body,buttons,showName){el('hd-popup-title').textContent=title;el('hd-popup-text').textContent=body;el('hd-name').closest('label').hidden=!showName;el('hd-popup-error').textContent='';el('hd-popup-buttons').innerHTML=buttons;el('hd-popup').hidden=false}
function closePopup(){el('hd-popup').hidden=true}
function launch(){
 if(root)root.remove();root=document.createElement('div');root.id=ROOT_ID;document.body.append(root);
 root.innerHTML=`<main class="hd-app" style="--hd-back:url('${BACK}')">
 <header class="hd-header"><button class="hd-home" data-action="home" aria-label="Hasierara itzuli">⌂</button>
  <div class="hd-title">✦ 4. Islamaren hedapena ✦</div>
  <span id="hd-hearts" class="hd-indicator hd-hearts">❤️❤️❤️</span>
  <span id="hd-score" class="hd-indicator">Puntuak: 0</span>
  <span id="hd-time" class="hd-indicator">⏱ 01:30</span>
  <button class="hd-sound" data-action="sound" aria-label="Soinua aktibatu edo desaktibatu">🔊</button>
 </header>
 <div class="hd-layout">
  <aside class="hd-left"><div class="hd-plaque" id="hd-level">1. MAILA</div>
    <div class="hd-subtitle" id="hd-leveltitle">Hedapenaren maparen erronka</div>
    <div class="hd-compass" aria-hidden="true"><svg viewBox="0 0 100 100" width="96" height="96"><circle cx="50" cy="50" r="45" fill="#092d64" stroke="#e3a93a" stroke-width="5"/><circle cx="50" cy="50" r="36" fill="none" stroke="#fdf0bb" stroke-width="2"/><path d="M50 7 59 42 93 50 59 58 50 93 41 58 7 50 41 42Z" fill="#f7c14b" stroke="#fff7c4" stroke-width="2"/><path d="M50 17 58 49 50 50 42 49Z" fill="#1874c1"/><circle cx="50" cy="50" r="9" fill="#faf3d2" stroke="#a8782a" stroke-width="3"/></svg></div>
    <div class="hd-question" id="hd-question">Aztertu mapa.</div>
    <div class="hd-instruction" id="hd-instruction">Egin klik mapako eremu egokian.</div>
    <div class="hd-progress" id="hd-progress">0 / 10</div>
    <div class="hd-pips" id="hd-pips"></div>
    <div class="hd-tip"><strong>💡 Aholkua</strong><div id="hd-tip">Pentsatu hedapenaren hiru etapetan.</div></div>
    <p class="hd-source">Irakaslearen PDFa · 12.–16. or.</p>
  </aside>
  <section class="hd-center" aria-label="Hedapenaren mapa interaktiboa">
    <div class="hd-mapcard" id="hd-mapcard">
      <div class="hd-map-badge">ISLAMIAR ZABALKUNDEA</div>
      <button class="hd-zoom" data-action="zoom" type="button" aria-label="Mapa handitu edo txikitu">＋ Handitu</button>
      <svg id="hd-map" class="hd-map-svg" viewBox="0 139 1872 800" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Islamaren hedapena mapan: egin klik koloreetako eremuetan"></svg>
      <div id="hd-map-info" class="hd-map-overlay"><span>🧭 Egin klik mapan</span><small>Mapako hiru hedapen-eremuak hauta ditzakezu.</small></div>
      <div class="hd-map-bottom-note" id="hd-map-bottom-note">Egin klik mapan eta identifikatu hedapenaren etapak.</div>
      <span class="hd-map-caption">PDF · 16. or.</span>
    </div>
    <div class="hd-under-map"><div class="hd-stage-buttons" id="hd-stage-buttons"></div></div>
    <div class="hd-feedback" id="hd-feedback" role="status" aria-live="polite">Aukeratu erantzun bat.</div>
    <div class="hd-legend" id="hd-legend"><span class="hd-key">1. MAPAK</span><span class="hd-key">2. ETAPAK</span><span class="hd-key">3. BERRERAIKITZEA</span></div>
  </section>
  <aside class="hd-rank"><h2>🏆 TOP 10</h2><div id="hd-ranklist" class="hd-ranklist"></div><div class="hd-rank-note">Nabigatzaile honetako sailkapena</div></aside>
 </div>
 <footer class="hd-footer"><button class="hd-nav" data-action="prev">⬅ Aurrekoa</button>
   <div id="hd-navdots" class="hd-navdots">${Array.from({length:10},(_,i)=>`<button data-nav="${i+1}" class="${i===3?'current':''}" aria-label="${i+1}. jokoa">${i+1}</button>`).join('')}</div>
   <button class="hd-nav" data-action="next">Hurrengoa ➜</button></footer>
 <div id="hd-popup" class="hd-modal"><div class="hd-modal-card"><h2 id="hd-popup-title">Islamaren hedapena</h2><p id="hd-popup-text"></p><label>Goitizena<input id="hd-name" maxlength="18" placeholder="Zure goitizena" value=""></label><p id="hd-popup-error" class="hd-modal-error"></p><div id="hd-popup-buttons"></div></div></div>
 </main>`;
 mapEngine=new RegionMapEngine(el('hd-map'));
 root.addEventListener('click',handleClick);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el('hd-popup').hidden)close()});
 board();
 popup('4. Islamaren hedapena','Hiru maila: identifikatu eremuak, lotu lurraldeak eta berreraiki hedapena. 10 erronka · 3 bizitza · 90 segundo.', '<button class="hd-primary" data-action="start">▶ Jolastu</button><button class="hd-secondary" data-action="home">Itzuli</button>',true);
}
function start(){const nick=el('hd-name').value.trim().normalize('NFC');if(!/^[\p{L}\p{N}_ -]{2,18}$/u.test(nick)){el('hd-popup-error').textContent='Idatzi 2 eta 18 karaktere arteko goitizen bat.';return}
 st={nick,seconds:90,lives:3,correct:0,errors:0,index:0,score:0,done:false,revealed:[],sound:true};locked=false;closePopup();render();hud();board();clearInterval(timer);timer=setInterval(()=>{if(!st||st.done)return;st.seconds=Math.max(0,st.seconds-1);hud();if(st.seconds===0)finish('Denbora amaitu da.')},1000)}
function hud(){if(!st)return;el('hd-hearts').textContent='❤️'.repeat(st.lives)+'🖤'.repeat(3-st.lives);el('hd-score').textContent='Puntuak: '+st.score;el('hd-time').textContent='⏱ '+String(Math.floor(st.seconds/60)).padStart(2,'0')+':'+String(st.seconds%60).padStart(2,'0')}
function render(){if(!st||st.done)return;const q=MISSIONS[st.index];if(!q){finish('Zorionak! Hiru etapak osatu dituzu.');return}
 el('hd-level').textContent=q.level+'. MAILA';el('hd-leveltitle').textContent=q.level===1?'Eremuak ezagutu':q.level===2?'Lurraldeak eta etapak':'Hedapena berreraiki';el('hd-question').textContent=q.text;
 el('hd-instruction').textContent=q.mode==='region'?'Egin klik mapako eremu egokian.':'Aukeratu etaparen izena beheko hiru botoietatik.';
 el('hd-tip').textContent=q.tip;el('hd-progress').textContent=st.index+' / '+MISSIONS.length;
 el('hd-pips').innerHTML=MISSIONS.map((_,i)=>`<span class="${i<st.index?'solved':''}"></span>`).join('');
 mapEngine.setMode(q.mode,st.revealed);
 el('hd-stage-buttons').innerHTML=['ma','or','om'].map((id,i)=>`<button ${q.mode==='region'?'disabled':`data-phase="${id}"`} class="hd-phase-btn hd-phase-${id} ${q.mode==='region'?'hd-informational':''} ${q.mode==='rebuild'&&st.revealed.includes(id)?'hd-checked':''}" aria-label="${NAMES[id]}, ${YEARS[id]}"><span class="hd-phase-number">${i+1}</span><span class="hd-phase-copy"><strong>${NAMES[id]}</strong><small>${YEARS[id]}</small></span></button>`).join('');
 el('hd-map-info').innerHTML=q.mode==='region'?'🧭 Egin klik dagokion eremuan<small>Mapako eremuak zuzenean hauta ditzakezu.</small>':q.mode==='phase'?'📜 Aukeratu hedapen-etapa<small>Maparen eta 15. orrialdeko azalpenen arabera.</small>':'🧩 Mapa berreraiki<small>Etapak ordenan aukeratu. Mapak pixkanaka kolorea berreskuratuko du.</small>';
 el('hd-feedback').className='hd-feedback';el('hd-feedback').textContent='Prest? Aukeratu erantzuna.';el('hd-map-bottom-note').textContent=q.mode==='region'?'Egin klik mapako eremu egokian.':q.mode==='phase'?'Aukeratu dagokion kalifaldia beheko hiru botoietan.':'Berreraiki hedapena: aukeratu etapak ordenan.';
}
function selectRegion(id){if(!st||st.done||locked)return;const q=MISSIONS[st.index];if(q.mode!=='region')return;verify(id);}
function verify(id){if(!st||st.done||locked)return;const q=MISSIONS[st.index];if(!q)return;locked=true;const ok=id===q.target;const answeredRound=st;mapEngine.select(id);
 if(ok){st.correct++;st.score=st.correct*80;if(q.mode==='rebuild'&&!st.revealed.includes(id))st.revealed.push(id);
  el('hd-feedback').textContent='✔ Bikain! '+NAMES[id]+'.';el('hd-feedback').className='hd-feedback good';el('hd-map-bottom-note').textContent='Bikain! '+NAMES[id]+' hautatu duzu.';
 }else{st.errors++;st.lives--;el('hd-feedback').textContent='✖ Ez da zuzena. Saiatu berriro!';el('hd-feedback').className='hd-feedback bad';el('hd-map-bottom-note').textContent='Ez da zuzena. Saiatu berriro!';}
 hud();sound(ok);
 setTimeout(()=>{if(st!==answeredRound)return;locked=false;if(!st||st.done)return;if(st.lives<=0){finish('Bizitzak amaitu dira.');return}if(ok)st.index++;if(st.index>=MISSIONS.length){finish('Zorionak! Islamaren hedapena berreraiki duzu.');return}render()},ok?690:920)
}
function sound(ok){if(!st?.sound)return;try{const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;const ctx=new AudioContext(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=ok?650:240;gain.gain.value=.045;osc.start();gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.12);osc.stop(ctx.currentTime+.12);osc.onended=()=>ctx.close()}catch{}}
function finish(message){if(!st||st.done)return;st.done=true;clearInterval(timer);if(st.index>=MISSIONS.length)st.score=Math.min(1000,st.score+Math.round(st.seconds/90*200));hud();if(st.index>=MISSIONS.length)keepScore(st.nick,st.score);board();const best=getBoard().find(r=>r.name.toLocaleLowerCase('eu')===st.nick.toLocaleLowerCase('eu'))?.score||st.score;
 popup(st.correct===MISSIONS.length?'🏆 Zorionak!':'Partida amaitu da',`${message} Puntuak: ${st.score} / 1.000 · Zuzenak: ${st.correct}/${MISSIONS.length} · Akatsak: ${st.errors} · Zure errekorra: ${best}.`, '<button class="hd-primary" data-action="again">↻ Berriro jokatu</button><button class="hd-secondary" data-action="home">Hasiera</button>',false)
}
function close(){clearInterval(timer);timer=null;st=null;locked=false;if(root){root.remove();root=null}}
function navigate(n){close();const map={1:'arabia',2:'denbora',3:'bost',4:'hedapena',5:'kalifaldi',6:'gizartea',7:'hiria',8:'merkataritza',9:'artea',10:'ondarea'};const t=document.querySelector('#game-gallery [data-game="'+map[n]+'"]');if(t)t.click()}
function handleClick(e){const a=e.target.closest('[data-action]');if(a){const action=a.dataset.action;if(action==='home')close();else if(action==='start')start();else if(action==='again'){const nick=st?.nick||'';el('hd-name').value=nick;start()}else if(action==='prev')navigate(3);else if(action==='next')navigate(5);else if(action==='sound'){if(st){st.sound=!st.sound;a.textContent=st.sound?'🔊':'🔇'}}else if(action==='zoom'){const card=el('hd-mapcard');card.classList.toggle('hd-zoomed');a.textContent=card.classList.contains('hd-zoomed')?'− Txikitu':'＋ Handitu';}return}
 const phase=e.target.closest('[data-phase]');if(phase){if(!st||st.done||locked)return;const q=MISSIONS[st.index];if(q.mode==='phase'||q.mode==='rebuild')verify(phase.dataset.phase);return}
 const nav=e.target.closest('[data-nav]');if(nav){const n=Number(nav.dataset.nav);if(n!==4)navigate(n);return}
}
window.HEDAPENA_V12={launch,close,getState:()=>st?{...st}:null,answerForTest:verify,regionsForTest:PATHS,missions:MISSIONS,MapEngine:RegionMapEngine};
window.IslamarenMapEngine=RegionMapEngine;
})();

