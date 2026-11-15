
/* V30 · 9. JOKOA. Independent 9.1 visual quiz with a safe extension slot for 9.2. */
(()=>{'use strict';
const Q=[
 {text:'Zein dekorazio-motari dagokio irudia?',key:'landare',kind:'motif',options:['Landare estilizatuak','Geometria-irudiak','Inskripzioak'],answer:'Landare estilizatuak'},
 {text:'Zein dekorazio-motari dagokio irudia?',key:'geometria',kind:'motif',options:['Landare estilizatuak','Geometria-irudiak','Inskripzioak'],answer:'Geometria-irudiak'},
 {text:'Zein dekorazio-motari dagokio irudia?',key:'inskripzioa',kind:'motif',options:['Landare estilizatuak','Geometria-irudiak','Koraneko testuen inskripzioak'],answer:'Koraneko testuen inskripzioak'},
 {text:'Zein hiri agertzen da irudian?',key:'samarra',kind:'building',options:['Samarra','Kairu','Kordoba'],answer:'Samarra'},
 {text:'Zein hiri agertzen da irudian?',key:'kairo',kind:'building',options:['Kordoba','Kairu','Samarra'],answer:'Kairu'},
 {text:'Zein hiri agertzen da irudian?',key:'kordoba',kind:'building',options:['Damasko','Bagdad','Kordoba'],answer:'Kordoba'}
];
// The next challenge is deliberately not fabricated. A later version can register
// an independently rendered activity without changing 9.1 or replacing this screen.
const phases=[{id:'9.1',title:'Ondarearen aztarnak',status:'ready',questions:Q},{id:'9.2',title:'Bigarren erronka',status:'pending',mount:null}];
const ART=window.ART30_CUTOUTS||{};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuf=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
let secondResult=null,finalSaved=false,scoreStorageError=false;let root,started=false,stage='intro',timer=null,nick='',questions=[],index=0,correct=0,errors=0,lives=3,seconds=180,history=[],busy=false,savedOverflow='',completed=false,feedbackTimer=null,soundOn=false;
const score=()=>{const ratio=correct/Q.length;return Math.max(0,Math.min(1000,Math.round(750*ratio+250*ratio*(seconds/180))))};
const clockStr=()=>String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
function sharedScores(){try{return JSON.parse(localStorage.getItem('islama-v4-puntuazioak')||'{}')||{}}catch{return {}}}
function saveScore(finalPoints){const all=sharedScores(),table=all.artea||{},k=nick.toLocaleLowerCase('eu'),newScore=Math.max(0,Math.min(1000,Math.round(finalPoints))),prev=table[k];if(!prev||newScore>prev.score){table[k]={name:nick,score:newScore,timestamp:Date.now()};all.artea=table;try{localStorage.setItem('islama-v4-puntuazioak',JSON.stringify(all));return true}catch{scoreStorageError=true;return false}}return false}
function beep(ok){if(!soundOn)return;try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),v=c.createGain();o.type='triangle';o.frequency.value=ok?690:220;v.gain.value=.026;o.connect(v).connect(c.destination);o.start();o.stop(c.currentTime+.12);setTimeout(()=>c.close(),350)}catch{}}
function build(){if(root)return;root=document.createElement('div');root.id='art30-root';root.hidden=true;
 const pan=window.ISLAMA_V28_ART?.market_backdrop||window.ISLAMA_V28_ART?.['market_backdrop'];
 if(pan)root.style.setProperty('--art30-panorama',`url("${pan}")`);
 root.innerHTML=`<div class="a30-world">
 <header class="a30-top"><button type="button" class="a30-ornbtn" data-a30="home" aria-label="Jokoen menura itzuli" title="Hasierara">⌂</button>
 <div class="a30-top-title"><strong id="a30-top-heading">9.1 Arte islamiarraren aztarnak</strong></div>
 <div class="a30-hud"><div class="a30-pill a30-hearts" id="a30-hearts" aria-label="Bizitzak">♥ ♥ ♥</div><div class="a30-pill"><span class="a30-hud-icon">✦</span><span id="a30-score">Puntuak: 0</span></div><div class="a30-pill"><span class="a30-hud-icon">⌛</span><span id="a30-time">03:00</span></div></div>
 <button type="button" class="a30-ornbtn" data-a30="sound" aria-label="Soinua aktibatu edo desaktibatu" title="Soinua" style="font-size:32px" id="a30-sound">♪</button></header>
 <main class="a30-main"><aside class="a30-side"><div class="a30-medallion" aria-hidden="true">✧</div><h2 class="a30-side-title">9. JOKOA</h2><div class="a30-parchment-title">Arte islamiarraren aztarnak</div><p class="a30-side-desc">Aztertu artearen xehetasunak: dekorazioak, monumentuak eta iraganeko hiriak.</p><div class="a30-side-rule" aria-hidden="true"></div><div class="a30-progress-medal"><strong id="a30-side-progress">0/6</strong><span>GALDERA</span></div><div class="a30-phase-list" id="a30-phase-list"></div></aside>
 <section class="a30-gallery" aria-label="Irudi handiaren erakusleihoa"><div class="a30-ribbon" id="a30-ribbon">1. ERRONKA · Galdera-sorta</div><div class="a30-question-dots" id="a30-dots" aria-label="Galderen aurrerapena"></div><div class="a30-display"><img id="a30-image" class="a30-display-art" alt="Erantzuna adierazten ez duen artelanen irudia" draggable="false"></div><div class="a30-gallery-sub" id="a30-caption">Aztertu irudia arretaz · Aukeratu erantzuna</div></section>
 <aside class="a30-question-panel"><div class="a30-note-heading">✎ &nbsp; Artelanen enigma</div><div class="a30-question-box"><p class="a30-question-text" id="a30-question">Prest al zaude?</p></div><div class="a30-choices-title">Aukeratu erantzun egokia:</div><div class="a30-choices" id="a30-choices"></div><div class="a30-feedback" id="a30-feedback" aria-live="polite">Irudiari begiratu eta aukeratu.</div></aside></main>
 <footer class="a30-footer"><span>✦ 9. JOKOA · PDF 26.–27. eta 30. orrialdeak</span><span>1. erronka: 6 galdera · 2. erronka: 12 galdera / 2 maila</span><div class="a30-footer-nav"><button type="button" data-a30="prev">❮ 8. jokoa</button><button type="button" data-a30="next">10. jokoa ❯</button></div></footer></div>
 <div class="a30-shade" id="a30-shade" role="dialog" aria-modal="true" aria-label="Arte islamiarraren aztarnak"></div>`;
 document.body.appendChild(root);
 root.addEventListener('click',e=>{const b=e.target.closest('[data-a30]');if(!b||!root.contains(b))return;const a=b.dataset.a30;if(a==='home')close();else if(a==='prev'||a==='next'){const key=a==='prev'?'merkataritza':'ondarea';close();document.querySelector(`#game-gallery [data-game="${key}"]`)?.click()}
 else if(a==='sound'){soundOn=!soundOn;$('a30-sound').textContent=soundOn?'♫':'♪';$('a30-sound').title=soundOn?'Soinua piztuta':'Soinua itzalita'}
 else if(a==='start')start();else if(a==='retry')showIntro();else if(a==='again')start();else if(a==='retry-second'){secondResult=null;finalSaved=false;const p=phases[1];stage='second';$('a30-shade').hidden=true;p.mount(root,{nickname:nick,firstChallenge:{score:score(),correct,total:Q.length,errors,seconds},finishSecond:(result)=>{secondResult=result;stage='finished';showResult()}})}else if(a==='close')close();else if(a==='answer')answer(b);else if(a==='second'){const p=phases[1];if(p.status==='ready'&&typeof p.mount==='function'){stopClock();$('a30-shade').hidden=true;stage='second';p.mount(root,{nickname:nick,firstChallenge:{score:score(),correct,total:Q.length,errors,seconds},finishSecond:(result)=>{secondResult=result;stage='finished';showResult()}})}}});
 root.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='a30-nick'){e.preventDefault();start()}});
}
function updatePhases(){if(!root)return;$('a30-phase-list').innerHTML=`<div class="a30-phase is-active"><span class="a30-phase-num">1</span><span>Galdera-sorta<small>6 galdera · prest</small></span></div><div class="a30-phase ${phases[1].status==='pending'?'is-pending':''}"><span class="a30-phase-num">2</span><span>${esc(phases[1].title)}<small>${phases[1].status==='pending'?'Edukiaren zain':'Prestatzeko moduan'}</small></span></div>`}
function setDots(){const done=history.length;$('a30-dots').innerHTML=Q.map((_,i)=>`<span class="a30-question-dot ${history[i]?(history[i]==='ok'?'done':'failed'):i===index&&stage==='playing'?'current':''}" aria-label="${i+1}. galdera">${history[i]?(history[i]==='ok'?'✓':'×'):i+1}</span>`).join('')}
function updateHud(){if(!root)return;$('a30-score').textContent='Puntuak: '+score();$('a30-hearts').textContent=('♥ '.repeat(lives)+'♡ '.repeat(3-lives)).trim();$('a30-hearts').setAttribute('aria-label',lives+' bizitza');$('a30-time').textContent=clockStr();$('a30-side-progress').textContent=Math.min(index+ (stage==='playing'?1:0),Q.length)+'/'+Q.length;setDots()}
function showIntro(){secondResult=null;finalSaved=false;stopClock();stage='intro';started=false;index=0;correct=0;errors=0;lives=3;seconds=180;history=[];completed=false;questions=[];busy=false;updatePhases();$('a30-image').src=ART.geometria||'';$('a30-image').alt='Izenik gabeko mosaikoaren irudia';$('a30-question').textContent='Zer ezkutatzen du arteak?';$('a30-choices').innerHTML='<p style="text-align:center;color:#74502b;font-size:19px">Sei galdera, eta bigarren erronkan jatorrizko mezkitako 12 galderak.</p>';$('a30-feedback').textContent='Aukeratu erantzuna artearen xehetasunei erreparatuz.';$('a30-caption').textContent='9.1 · Dekorazioak eta ondarea';$('a30-top-heading').textContent='9.1 Arte islamiarraren aztarnak';$('a30-ribbon').textContent='1. ERRONKA · Galdera-sorta';updateHud();$('a30-shade').hidden=false;
 let remembered='';try{remembered=localStorage.getItem('art30-last-nick')||''}catch{}
 $('a30-shade').innerHTML=`<div class="a30-dialog"><div class="a30-dialog-mark">❖</div><h2>9. JOKOA<br>Arte islamiarraren aztarnak</h2><p><strong>1. erronka:</strong> 6 galdera, 3 bizitza eta 3 minutu. Aztertu irudiak arretaz eta aukeratu erantzuna.</p><p class="a30-planned-note">2. erronka: Mezkitaren misterioa, 12 galdera eta 2 maila (jatorrizko 10. jokoa).</p><label for="a30-nick" style="font-size:18px;font-weight:bold">Zure goitizena</label><input id="a30-nick" value="${esc(remembered)}" maxlength="18" autocomplete="off" placeholder="Goitizena (2–18)" aria-label="Goitizena"><div class="a30-dialog-error" id="a30-nick-error"></div><div class="a30-dialog-buttons"><button type="button" class="a30-quietcta" data-a30="close">Atzera</button><button type="button" class="a30-maincta" data-a30="start">▶ Hasi 1. erronka</button></div></div>`;
 setTimeout(()=>$('a30-nick')?.focus(),0);
}
function launch(){build();if(!root.hidden)return; savedOverflow=document.body.style.overflow;document.body.style.overflow='hidden';root.hidden=false;root.scrollTop=0;showIntro()}
function close(){stopClock();if(!root)return;root.hidden=true;document.body.style.overflow=savedOverflow;stage='closed';}
function start(){secondResult=null;finalSaved=false;scoreStorageError=false;const inp=$('a30-nick');if(inp){nick=inp.value.trim().normalize('NFC');if(!/^[\p{L}\p{N}_ -]{2,18}$/u.test(nick)){$('a30-nick-error').textContent='Idatzi 2 eta 18 karaktere arteko goitizen bat.';return}}else if(!nick)nick='Jokalaria';try{localStorage.setItem('art30-last-nick',nick)}catch{}
 stopClock();started=true;stage='playing';questions=shuf(Q);index=0;correct=0;errors=0;lives=3;seconds=180;history=[];busy=false;completed=false;$('a30-shade').hidden=true;updatePhases();renderQuestion();updateHud();timer=setInterval(()=>{if(stage!=='playing')return;seconds=Math.max(0,seconds-1);updateHud();if(seconds<=0)finish()},1000)}
function renderQuestion(){if(!questions[index]){finish();return}const q=questions[index];$('a30-image').src=ART[q.key]||'';$('a30-image').alt='Identifikatu beharreko artelanaren irudia, izen eta azalpenik gabe';$('a30-image').style.animation='none';void $('a30-image').offsetWidth;$('a30-image').style.animation='';$('a30-question').textContent=q.text;$('a30-caption').textContent=(q.kind==='motif'?'❖ Dekorazio artistikoak':'❖ Arkitektura eta ondarea')+' · Erreparatu xehetasunei';$('a30-choices').innerHTML=shuf(q.options).map((option,i)=>`<button type="button" data-a30="answer" data-option="${esc(option)}" class="a30-choice"><span class="a30-choice-letter">${'ABC'[i]}</span><span>${esc(option)}</span></button>`).join('');$('a30-feedback').className='a30-feedback';$('a30-feedback').textContent='Begiratu irudiari eta aukeratu erantzun egokia.';updateHud()}
function answer(btn){if(stage!=='playing'||busy||!questions[index])return;busy=true;const q=questions[index],selected=btn.dataset.option,ok=(selected===q.answer);history[index]=ok?'ok':'bad';if(ok){correct++;btn.classList.add('is-correct');$('a30-feedback').textContent='✓ Bikain! Erantzun zuzena!';$('a30-feedback').className='a30-feedback good'}else{errors++;lives=Math.max(0,lives-1);btn.classList.add('is-wrong');$('a30-feedback').textContent='✗ Ez da zuzena. Aztertu hurrengo irudia arretaz.';$('a30-feedback').className='a30-feedback bad'}root.querySelectorAll('.a30-choice').forEach(el=>el.disabled=true);beep(ok);updateHud();clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>{if(stage!=='playing')return;index++;if(index>=Q.length||lives<=0){finish();return}busy=false;renderQuestion()},980)}
function stopClock(){if(timer!==null)clearInterval(timer);timer=null;if(feedbackTimer!==null)clearTimeout(feedbackTimer);feedbackTimer=null}
function finish(){if(stage!=='playing')return;stage='finished';stopClock();completed=history.length===Q.length&&lives>0&&seconds>0;const points=score();updateHud();$('a30-side-progress').textContent=history.length+'/'+Q.length;$('a30-feedback').textContent='1. erronka amaitu da.';$('a30-shade').hidden=false;
 const next=phases[1],canStartNext=next.status==='ready'&&typeof next.mount==='function';
 $('a30-shade').innerHTML=`<div class="a30-dialog"><div class="a30-dialog-mark">${correct===Q.length?'🏆':'✦'}</div><h2>${correct===Q.length?'Zorionak!':'1. erronka amaituta'}</h2><span class="a30-dialog-score">${points.toLocaleString('eu-ES')} puntu</span><p><strong>${correct}/${Q.length}</strong> asmatuta · <strong>${180-seconds}</strong> segundo · <strong>${errors}</strong> huts.</p><p>Azken puntuazioa bi erronkak amaitutakoan kalkulatuko da.</p><p class="a30-planned-note">${canStartNext?(completed?'2. erronka prest dago.':'1. erronka ez da osatu: 2. erronka praktikatu dezakezu, baina ez da errekorra gordeko.'):'2. erronkaren tokia prest dago, baina oraindik ez du edukirik.'}</p><div class="a30-dialog-buttons"><button type="button" data-a30="close" class="a30-quietcta">Jokoetara itzuli</button><button type="button" data-a30="again" class="a30-maincta">↻ Berriro jokatu</button>${canStartNext?('<button type="button" data-a30="second" class="a30-maincta">'+(completed?'2. erronka ▶':'2. erronka praktikatzeko ▶')+'</button>'):''}</div></div>`;
}
function showResult(){
 if(!secondResult)return;
 const firstPoints=score(),secondPoints=Math.max(0,Math.min(1000,Math.round(Number(secondResult.score)||0)));
 const total=Math.round((firstPoints+secondPoints)/2);
 const passed=completed&&secondResult.completed!==false;
 let improved=false;
 if(!finalSaved){if(passed)improved=saveScore(total);finalSaved=true;}
 $('a30-time').textContent='00:00';$('a30-score').textContent='Puntuak: '+total;
 $('a30-hearts').textContent=passed?'✦ ✦ ✦':'◇ ◇ ◇';$('a30-hearts').setAttribute('aria-label',passed?'Bi erronkak osatuta':'Partida osatu gabe');
 $('a30-side-progress').textContent='2/2';$('a30-side-progress').parentElement.querySelector('span').textContent='ERRONKA';
 $('a30-top-heading').textContent='9. JOKOA · Jakintza eta kultura';
 $('a30-phase-list').innerHTML='<div class="a30-phase is-active"><span class="a30-phase-num">'+(completed?'✓':'!')+'</span><span>Ondarearen aztarnak<small>1. erronka</small></span></div><div class="a30-phase is-active"><span class="a30-phase-num">'+(secondResult.completed!==false?'✓':'!')+'</span><span>Mezkitaren misterioa<small>2. erronka · 12 galdera</small></span></div>';
 $('a30-shade').hidden=false;
 $('a30-shade').innerHTML=`<div class="a30-dialog" role="document"><div class="a30-dialog-mark">${passed?'🏆':'✦'}</div><h2>${passed?'9. JOKOA · Bi erronkak osatuta!':'9. JOKOA · Partida amaitu da'}</h2><span class="a30-dialog-score">${total.toLocaleString('eu-ES')} puntu</span>
 <p>1. erronka: <strong>${firstPoints}/1000</strong> · ${correct}/6 erantzun zuzen.</p>
 <p>2. erronka: <strong>${secondPoints}/1000</strong> · ${secondResult.correct}/${secondResult.total} erantzun zuzen.</p>
 <p>Puntuazio orokorra: bi erronken batezbestekoa.</p>
 <p>${!passed?'Emaitza partziala: erronkaren bat denboraz edo bizitzaz amaitu da; ez da errekorretan gorde.':scoreStorageError?'Ezin izan da marka gorde: nabigatzailearen biltegiratzea blokeatuta dago.':improved?'Zure marka onena gorde da!':'Zure aurreko marka onena mantendu da.'}</p>
 <div class="a30-dialog-buttons"><button type="button" data-a30="close" class="a30-quietcta">Jokoetara itzuli</button>${completed?'<button type="button" data-a30="retry-second" class="a30-maincta">↻ 2. erronka errepikatu</button>':''}<button type="button" data-a30="again" class="a30-quietcta">↻ Bi erronkak berriro</button></div></div>`;
}
function registerSecondChallenge(config){if(!config||typeof config.mount!=='function'||!config.title)return false;const p=phases[1];p.title=String(config.title);p.mount=config.mount;p.status='ready';updatePhases();return true}
window.ART_V30={launch,close,registerSecondChallenge,getState:()=>({stage,nickname:nick,index,correct,errors,lives,seconds,score:score(),completed,challenge2Ready:phases[1].status==='ready'}),questions:()=>Q.map(q=>({question:q.text,image:q.key,options:[...q.options],answer:q.answer})),testStart:(nickname='Proba09')=>{launch();$('a30-nick').value=nickname;start();return true}};
})();

/* V32 · Keep the former Game 10 unchanged and mount it as challenge 9.2. */
(()=>{'use strict';
 window.ART_V30.registerSecondChallenge({title:'Mezkitaren misterioa',mount:(root,context)=>{
   root.hidden=true;
   document.body.style.overflow='';
   window.ISLAMA_V32_GAME10.startAsSecond({nickname:context.nickname,
     onFinish:result=>{root.hidden=false;document.body.style.overflow='hidden';context.finishSecond(result)},
     onExit:()=>window.ART_V30.close()
   });
 }});
})();

/* V32 · Empty, future-ready tenth game. */
(()=>{'use strict';
 let node=null;
 function show(){
  if(!node){node=document.createElement('section');node.id='v32-empty10';node.hidden=true;
   node.innerHTML=`<div class="v32-empty-world"><button type="button" class="v32-empty-home" aria-label="Jokoetara itzuli">⌂</button><div class="v32-empty-card"><div class="v32-empty-emblem" aria-hidden="true">✦</div><p class="v32-eyebrow">ISLAMAREN ABENTURA · 10. JOKOA</p><h1>Hurrengo abentura</h1><div class="v32-empty-orn" aria-hidden="true">❖ ━ ✦ ━ ❖</div><p>Joko honen edukia oraindik zehaztu gabe dago.</p><p>Mezkitako atalen jolasa 9. jokoaren bigarren erronkan dago orain.</p><div class="v32-empty-actions"><button type="button" class="v32-empty-back">❮ Jokoen bildumara itzuli</button></div></div></div>`;
   document.body.appendChild(node);
   node.querySelector('.v32-empty-home').addEventListener('click',close);
   node.querySelector('.v32-empty-back').addEventListener('click',close);
  }
  node.hidden=false;document.body.style.overflow='hidden';
 }
 function close(){if(!node)return;node.hidden=true;document.body.style.overflow='';}
 window.ISLAMA_V32_EMPTY10={show,close};
})();
