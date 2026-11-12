import {TrainerGame,UP_RANKS,ACTIONS,chartAction,handInfo,displayHand,ruleExplanation,isNatural} from './engine.js';
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const storeKey='blackjack-lab-progress-v1';
const initialStats=()=>({correct:0,wrong:0,streak:0,best:0,rounds:0,perfect:0});
function loadStats(){try{const o=JSON.parse(localStorage.getItem(storeKey)||'null');return o&&typeof o.correct==='number'?{...initialStats(),...o}:initialStats();}catch{return initialStats();}}
let stats=loadStats(),game=new TrainerGame(),screen='home',showCount=false,autoDeal=true,roundHadMistake=false,roundDecisionCount=0,locked=false,autoTimer=null,correctTimer=null,countAnswerVisible=false;
const save=()=>{try{localStorage.setItem(storeKey,JSON.stringify(stats));}catch{}};
const clearTimer=()=>{if(autoTimer!==null)clearTimeout(autoTimer);if(correctTimer!==null)clearTimeout(correctTimer);autoTimer=correctTimer=null;locked=false;};
const fmtCount=n=>(n>0?'+':'')+n;
function switchScreen(name){if(!document.getElementById(name))return;screen=name;$$('.screen').forEach(x=>x.classList.toggle('active',x.id===name));$$('[data-screen]').forEach(x=>x.classList.toggle('active',x.dataset.screen===name));window.scrollTo({top:0,behavior:'instant'});if(name==='practice'&&game.phase==='idle')startHand();if(name==='stats')renderStats();if(name==='practice'&&game.phase==='ended'&&autoDeal)scheduleNext();}
function makeCard(card,hidden=false){const el=document.createElement('div');const red=card&&!hidden&&('♥♦'.includes(card.suit));el.className=`playing-card ${hidden?'back':''} ${red?'red':''}`;el.setAttribute('aria-label',hidden?'Face-down card':`${card.rank} of ${{'♠':'spades','♥':'hearts','♦':'diamonds','♣':'clubs'}[card.suit]}`);if(hidden){el.innerHTML='<span class="middle-suit">✦</span>';}else{const top=document.createElement('span'),suit=document.createElement('span'),mid=document.createElement('span');top.className='corner';top.textContent=card.rank;suit.className='corner-suit';suit.textContent=card.suit;mid.className='middle-suit';mid.textContent=card.suit;el.append(top,suit,mid);}return el;}
function fillCards(el,cards,hideSecond=false){el.replaceChildren();cards.forEach((c,i)=>el.append(makeCard(c,hideSecond&&i===1)));}
function getAccuracy(){const total=stats.correct+stats.wrong;return total?`${Math.round(100*stats.correct/total)}%`:'—';}
function renderScores(){ $('#score-accuracy').textContent=getAccuracy();$('#score-correct').textContent=stats.correct;$('#score-streak').textContent=stats.streak;$('#score-hands').textContent=stats.rounds; }
function renderStats(){const values={'stat-accuracy':getAccuracy(),'stat-correct':stats.correct,'stat-wrong':stats.wrong,'stat-best':stats.best,'stat-rounds':stats.rounds,'stat-perfect':stats.perfect};for(const [id,v]of Object.entries(values))$('#'+id).textContent=v;}
function addAction(code,label,sub,enabled=true){const b=document.createElement('button');b.type='button';b.className='action-button';b.disabled=!enabled||locked;b.innerHTML='';b.append(document.createTextNode(label));const sm=document.createElement('small');sm.textContent=sub;b.append(sm);b.addEventListener('click',()=>choose(code));$('#actions').append(b);}
function showFeedback(kind,headline,detail,rule=''){
 const f=$('#feedback');f.hidden=false;f.className=`feedback ${kind}`;f.replaceChildren();const strong=document.createElement('strong');strong.textContent=headline;f.append(strong);const p=document.createElement('p');p.textContent=detail;f.append(p);if(rule){const note=document.createElement('p');note.className='feedback-rule';note.textContent=`RULE TO REMEMBER: ${rule}`;f.append(note);}
}
function hideFeedback(){$('#feedback').hidden=true;$('#feedback').replaceChildren();}
function showEnd(){const outcomes=game.outcomes.join(' · ');const dealerH=handInfo(game.dealer);$('#decision-question').textContent=`Round ${game.round} complete`;
 $('#decision-help').textContent=`Result: ${outcomes}. Dealer: ${dealerH.total}${dealerH.bust?' (bust)':''}. Outcome doesn't affect your score.`;
 $('#actions').replaceChildren();$('#round-end-actions').hidden=false;
 showFeedback('correct',roundHadMistake?'Review complete — keep learning':'✓ Perfect decision round',roundHadMistake?'You corrected your mistakes before proceeding.':'You made every strategy decision correctly this round.');
 if(autoDeal&&screen==='practice')scheduleNext();
}
function renderGame(){
 renderScores();$('#shoe-number').textContent=String(game.shoeNumber).padStart(2,'0');$('#shoe-progress').textContent=`${game.shoe.length} cards left · ${Math.round(game.penetration*100)}% used`;
 fillCards($('#dealer-cards'),game.dealer,!game.holeShown);
 $('#dealer-total').textContent=game.holeShown?displayHand(game.dealer):`Showing ${game.dealer[0]?game.dealer[0].rank:'—'}`;
 const hands=$('#player-hands');hands.replaceChildren();for(let i=0;i<game.hands.length;i++){
 const h=game.hands[i],container=document.createElement('div');container.className=`player-hand ${game.phase==='playing'&&i===game.activeHandIndex?'current':''}`;
 const cards=document.createElement('div');cards.className='cards';fillCards(cards,h.cards);container.append(cards);const subtitle=document.createElement('div');subtitle.className='subhand-label';subtitle.textContent=game.hands.length>1?`HAND ${i+1} · ${handInfo(h.cards).total}`:displayHand(h.cards);container.append(subtitle);hands.append(container);
 }
 const active=game.currentHand;$('#active-hand-tag').textContent=game.hands.length>1&&game.phase==='playing'?`(${game.activeHandIndex+1}/${game.hands.length})`:'';
 $('#player-total').textContent=game.phase==='playing'&&active?displayHand(active.cards):game.hands.length===1?displayHand(game.hands[0].cards):`${game.hands.length} hands`;
 $('#actions').replaceChildren();$('#round-end-actions').hidden=true;
 if(game.phase==='ended'){showEnd();}
 else if(game.phase==='insurance'){
 $('#decision-question').textContent='Dealer shows an Ace. Take insurance?';$('#decision-help').textContent='Insurance is a separate side bet. Make the basic-strategy choice.';
 addAction('N','Decline','Correct basic strategy');addAction('Y','Take insurance','2:1 side bet');
 } else if(game.phase==='playing'){
 $('#decision-question').textContent='What is the right move?';$('#decision-help').textContent=`${displayHand(active.cards)} vs dealer ${game.dealer[0].rank} · Choose the best legal action.`;
 const available=game.available();for(const [code,word,key] of [['H','HIT','H'],['S','STAND','S'],['D','DOUBLE','D'],['P','SPLIT','P'],['R','SURRENDER','R']])addAction(code,word,key,available.includes(code));
 }
 if(showCount)renderCountPanel();
}
function record(correct){if(correct){roundDecisionCount++;stats.correct++;stats.streak++;stats.best=Math.max(stats.best,stats.streak);}else{stats.wrong++;stats.streak=0;roundHadMistake=true;}save();renderScores();}
function choose(code){if(locked||screen!=='practice')return;
 if(game.phase==='insurance'){
   if(code!=='N'){record(false);showFeedback('error','✕ Not the basic-strategy choice','Decline insurance. It is a separate side bet and is not recommended in ordinary basic strategy.','Never take insurance or even money under basic strategy.');return;}
   record(true);locked=true;showFeedback('correct','✓ Correct — decline insurance','Without an independent count-based edge, insurance is not a good basic-strategy bet.');
   correctTimer=setTimeout(()=>{locked=false;game.declineInsurance();hideFeedback();renderGame();},650);return;
 }
 if(game.phase!=='playing')return;
 const recommended=game.recommendation();const h=game.currentHand;const {reason,rule}=ruleExplanation(h.cards,game.dealer[0],recommended,{fromSplit:h.fromSplit});
 if(code!==recommended){record(false);showFeedback('error',`✕ Incorrect — correct move: ${ACTIONS[recommended].toUpperCase()}`,`You selected ${ACTIONS[code]}. ${reason}`,rule);return;}
 record(true);locked=true;showFeedback('correct',`✓ Correct — ${ACTIONS[code].toUpperCase()}`,reason);$$('.action-button').forEach(b=>b.disabled=true);
 correctTimer=setTimeout(()=>{locked=false;game.apply(code);hideFeedback();if(game.phase==='ended'){stats.rounds++;if(!roundHadMistake&&roundDecisionCount>0)stats.perfect++;save();}renderGame();},550);
}
function scheduleNext(){if(autoTimer!==null)clearTimeout(autoTimer);autoTimer=setTimeout(()=>{autoTimer=null;if(autoDeal&&game.phase==='ended'&&screen==='practice')startHand();},2000);}
function startHand(){clearTimer();roundHadMistake=false;roundDecisionCount=0;countAnswerVisible=false;$('#count-guess').value='';$('#count-answer').textContent='Hidden until you check or reveal';$('#count-answer').className='count-answer';hideFeedback();game.startRound();if(game.phase==='ended'){stats.rounds++;save();}renderGame();}
function resetShoe(){clearTimer();game.shuffle();game.phase='idle';startHand();}
function renderCountPanel(){if(!showCount)return;if(countAnswerVisible){$('#count-answer').textContent=`RC ${fmtCount(game.runningCount)} · TC ≈ ${game.trueCount>=0?'+':''}${game.trueCount.toFixed(1)} · Unseen: ${game.remainingDecks.toFixed(1)} decks`;}}
function checkCount(){const inp=$('#count-guess');if(inp.value.trim()===''){$('#count-answer').textContent='Enter your running count first.';return;}const guess=Number(inp.value);const good=guess===game.runningCount;$('#count-answer').className=`count-answer ${good?'good':'bad'}`;$('#count-answer').textContent=good?`✓ Correct. RC ${fmtCount(game.runningCount)} · TC ≈ ${fmtCount(Number(game.trueCount.toFixed(1)))}`:`✕ Your count: ${fmtCount(guess)}. Actual RC: ${fmtCount(game.runningCount)} (visible cards only).`;countAnswerVisible=true;}
function showCountAnswer(){countAnswerVisible=true;$('#count-answer').className='count-answer';renderCountPanel();}
function buildChart(){const configs=[{title:'Hard totals',desc:'No Ace counts as 11. Surrender is marked R where available.',group:'hard',rows:Array.from({length:16},(_,i)=>i+5)},{title:'Soft totals',desc:'At least one Ace counts as 11. An Ace gives flexibility when hitting.',group:'soft',rows:[13,14,15,16,17,18,19,20]},{title:'Pairs',desc:'Two cards of equal value. Pair actions take priority when splitting is best.',group:'pair',rows:['2','3','4','5','6','7','8','9','10','A']}];
 for(const cfg of configs){const section=document.createElement('section');section.className='chart-section';const title=document.createElement('h2');title.textContent=cfg.title;const desc=document.createElement('p');desc.textContent=cfg.desc;const scroll=document.createElement('div');scroll.className='chart-scroll';const t=document.createElement('table');t.className='strategy-table';const thead=document.createElement('thead'),headRow=document.createElement('tr');['YOUR HAND',...UP_RANKS].forEach(label=>{const th=document.createElement('th');th.textContent=label;headRow.append(th);});thead.append(headRow);t.append(thead);const body=document.createElement('tbody');for(const row of cfg.rows){const tr=document.createElement('tr');const label=document.createElement('td');label.textContent=cfg.group==='pair'?`${row}, ${row}`:cfg.group==='soft'?`A, ${Number(row)-11}`:String(row);tr.append(label);for(const up of UP_RANKS){const move=chartAction(cfg.group,row,up);const td=document.createElement('td');td.className=`move-${move}`;td.textContent=move;td.title=`${label.textContent} vs ${up}: ${ACTIONS[move]}`;tr.append(td);}body.append(tr);}t.append(body);scroll.append(t);section.append(title,desc,scroll);$('#chart-tables').append(section);}
}
$$('[data-screen]').forEach(b=>b.addEventListener('click',()=>switchScreen(b.dataset.screen)));
$('#new-shoe').addEventListener('click',()=>{if(confirm('Start a new shuffled shoe? Current round progress will be discarded.'))resetShoe();});
$('#count-toggle').addEventListener('click',()=>{showCount=!showCount;$('#count-toggle').textContent=showCount?'◉ Hide count panel':'◉ Show count';$('#count-toggle').setAttribute('aria-pressed',String(showCount));$('#count-panel').hidden=!showCount;if(showCount)renderCountPanel();});
$('#check-count').addEventListener('click',checkCount);$('#reveal-count').addEventListener('click',showCountAnswer);
$('#next-hand').addEventListener('click',startHand);$('#auto-deal').addEventListener('change',e=>{autoDeal=e.target.checked;if(!autoDeal&&autoTimer!==null){clearTimeout(autoTimer);autoTimer=null;}if(autoDeal&&game.phase==='ended')scheduleNext();});
$('#reset-stats').addEventListener('click',()=>{if(confirm('Permanently erase your locally saved practice statistics?')){stats=initialStats();save();renderScores();renderStats();}});
window.addEventListener('keydown',e=>{if(screen!=='practice'||e.ctrlKey||e.altKey||e.metaKey||['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;const map={h:'H',s:'S',d:'D',p:'P',r:'R'};const code=map[e.key.toLowerCase()];if(code&&game.phase==='playing'&&game.available().includes(code))choose(code);if(game.phase==='ended'&&e.key==='Enter')startHand();});
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
buildChart();renderStats();renderScores();
