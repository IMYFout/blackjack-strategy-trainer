import test from 'node:test';
import assert from 'node:assert/strict';
import {TrainerGame,RULES,createShoe,handInfo,cardValue,hiLoDelta,dealerMustHit,recommendAction,legalActions,chartAction,chartCards,upValue} from '../src/engine.js';
const hand=(...r)=>r.map((rank,i)=>({rank,suit:i%2?'♥':'♠'}));
const up=rank=>({rank,suit:'♣'});
const answer=(r,u,ctx={})=>recommendAction(hand(...r),up(u),ctx);
const deterministic=()=>0.321;

test('shoe has 312 cards in 6 decks, one of every card in each deck',()=>{
 const shoe=createShoe(6,deterministic);assert.equal(shoe.length,312);
 assert.equal(shoe.filter(c=>c.rank==='A').length,24);
 assert.equal(shoe.filter(c=>cardValue(c)===10).length,96);
 assert.equal(shoe.filter(c=>c.suit==='♠').length,78);
});
test('soft hard totals, natural blackjack, bust and hi-lo counting',()=>{
 assert.deepEqual(handInfo(hand('A','6')).soft,true);
 assert.deepEqual(handInfo(hand('A','6','K')), {total:17,soft:false,bust:false,blackjack:false,pair:false});
 assert.equal(handInfo(hand('A','K')).blackjack,true);
 assert.equal(handInfo(hand('K','K','A')).blackjack,false);
 assert.equal(handInfo(hand('10','K')).pair,true);
 assert.equal(handInfo(hand('10','9','3')).bust,true);
 assert.equal(['5','K','3','8','A','6'].map(r=>hiLoDelta(hand(r)[0])).reduce((a,b)=>a+b,0),1);
 assert.equal(dealerMustHit(hand('A','6')),false);
 assert.equal(dealerMustHit(hand('10','6')),true);
});
test('S17 basic strategy for hard totals',()=>{
 for(const upcard of ['2','3','4','5','6','7','8','9','10','A']){
  assert.equal(answer(['10','7'],upcard),'S');
  assert.equal(answer(['4','4'],upcard),['5','6'].includes(upcard)?'P':'H');
  assert.equal(answer(['10','2'],upcard),['4','5','6'].includes(upcard)?'S':'H');
  assert.equal(answer(['10','3'],upcard),['2','3','4','5','6'].includes(upcard)?'S':'H');
  assert.equal(answer(['5','6'],upcard),upcard==='A'?'H':'D');
  assert.equal(answer(['5','5'],upcard),['2','3','4','5','6','7','8','9'].includes(upcard)?'D':'H');
 }
 assert.equal(answer(['10','6'],'9'),'R');
 assert.equal(answer(['10','6'],'10'),'R');
 assert.equal(answer(['10','6'],'A'),'R');
 assert.equal(answer(['10','5'],'10'),'R');
 assert.equal(answer(['10','5'],'A'),'H');
 assert.equal(answer(['4','5'],'2'),'H');
 assert.equal(answer(['4','5'],'3'),'D');
 assert.equal(answer(['4','5'],'6'),'D');
 assert.equal(answer(['4','5'],'7'),'H');
});
test('soft-hand strategy boundaries',()=>{
 const expectations={
  'A,2':['H','H','H','D','D','H','H','H','H','H'],
  'A,3':['H','H','H','D','D','H','H','H','H','H'],
  'A,4':['H','H','D','D','D','H','H','H','H','H'],
  'A,5':['H','H','D','D','D','H','H','H','H','H'],
  'A,6':['H','D','D','D','D','H','H','H','H','H'],
  'A,7':['S','D','D','D','D','S','S','H','H','H'],
  'A,8':['S','S','S','S','S','S','S','S','S','S'],
  'A,9':['S','S','S','S','S','S','S','S','S','S']};
 for(const [key,moves] of Object.entries(expectations)){
  const cards=key.split(',');UP_RANKS.forEach((u,i)=>assert.equal(answer(cards,u),moves[i],key+' vs '+u));
 }
});
const UP_RANKS=['2','3','4','5','6','7','8','9','10','A'];
test('pair splitting chart includes DAS-specific decisions',()=>{
 const rows={
 '2':['P','P','P','P','P','P','H','H','H','H'],
 '3':['P','P','P','P','P','P','H','H','H','H'],
 '4':['H','H','H','P','P','H','H','H','H','H'],
 '6':['P','P','P','P','P','H','H','H','H','H'],
 '7':['P','P','P','P','P','P','H','H','H','H'],
 '8':['P','P','P','P','P','P','P','P','P','P'],
 '9':['P','P','P','P','P','S','P','P','S','S'],
 'A':['P','P','P','P','P','P','P','P','P','P']
 };
 for(const [p,vals] of Object.entries(rows))UP_RANKS.forEach((u,i)=>assert.equal(answer([p,p],u),vals[i],`${p},${p} vs ${u}`));
 assert.equal(answer(['8','8'],'A'),'P');
 assert.equal(answer(['5','5'],'6'),'D');
 assert.equal(answer(['K','Q'],'6'),'S');
});
test('legal fallback after hit, after split, split cap, and no surrender after split',()=>{
 assert.equal(answer(['A','7'],'3',{fromSplit:true}),'D');
 assert.equal(answer(['A','7','2'],'3',{fromSplit:true}),'S');
 assert.equal(answer(['5','5','2'],'6'),'S'); // hard 12 after hitting: stand vs 4–6.
 assert.equal(answer(['10','6'],'10',{fromSplit:true}),'H');
 assert.equal(answer(['8','8'],'10',{numberOfHands:4}),'H');
 assert.equal(answer(['A','A'],'6',{fromSplit:true,splitAces:true}),null);
 assert.deepEqual(legalActions(hand('8','8'),{fromSplit:true,splitAces:true}),[]);
 assert.deepEqual(legalActions(hand('10','5','2')),['H','S']);
});
test('basic strategy chart and engine return same actions for initial two cards',()=>{
 for(const u of UP_RANKS){
  for(let n=5;n<=20;n++) assert.equal(chartAction('hard',n,u),recommendAction(chartCards('hard',n),up(u)));
  for(let n=13;n<=20;n++)assert.equal(chartAction('soft',n,u),recommendAction(chartCards('soft',n),up(u)));
  for(const p of ['2','3','4','5','6','7','8','9','10','A'])assert.equal(chartAction('pair',p,u),recommendAction(chartCards('pair',p),up(u)));
 }
});
test('game is continuous, no replacement, resets visible count on shuffle',()=>{
 const game=new TrainerGame(6,Math.random);
 game.startRound();assert.equal(game.shoe.length,308);assert.equal(game.dealtCount,4);assert.equal(game.visibleCount,3);
 assert.equal(game.runningCount,game.hands[0].cards.reduce((s,c)=>s+hiLoDelta(c),hiLoDelta(game.dealer[0])));
 assert.equal(game.remainingDecks,(game.shoe.length+1)/52);
 let tries=0;
 while(game.phase==='insurance'&&tries++<2) game.declineInsurance();
 if(game.phase==='playing'){
  let safety=0;
  while(game.phase==='playing'&&safety++<50){const rec=game.recommendation();assert(game.available().includes(rec));game.apply(rec);}
  assert(safety<50);
 }
 assert.equal(game.phase,'ended');assert.equal(game.holeShown,true);
 assert.equal(game.visibleCount,game.dealtCount);
 const left=game.shoe.length;game.startRound();assert.equal(game.shoe.length,left-4);
 game.shuffle();assert.equal(game.runningCount,0);assert.equal(game.visibleCount,0);assert.equal(game.shoe.length,312);
});
test('randomly simulate 3000 rounds without illegal recommendations or infinite loops',()=>{
 const game=new TrainerGame();let actions=0;
 for(let round=0;round<3000;round++){
  game.startRound();if(game.phase==='insurance')game.declineInsurance();
  let steps=0;
  while(game.phase==='playing'){
   const rec=game.recommendation();assert(game.available().includes(rec),`Round ${round}: recommendation ${rec} not in ${game.available()}`);game.apply(rec);actions++;steps++;assert(steps<45);
  }
  assert.equal(game.phase,'ended');assert.equal(game.outcomes.length,game.hands.length);assert(game.shoe.length>0);
 }
 assert(actions>2000);
});
const setTop=(game,draws)=>{
 const shoe=game.shoe;for(let i=0;i<draws.length;i++)shoe[shoe.length-1-i]={rank:draws[i],suit:i%2?'♦':'♠'};
};
test('Ace upcard requests insurance and dealer blackjack peeks before decisions',()=>{
 const game=new TrainerGame();setTop(game,['10','A','6','K']);game.startRound();
 assert.equal(game.phase,'insurance');assert.equal(game.holeShown,false);assert.equal(game.visibleCount,3);
 game.declineInsurance();assert.equal(game.phase,'ended');assert.equal(game.outcomes[0],'Loss');assert.equal(game.holeShown,true);assert.equal(game.visibleCount,4);
});
test('natural blackjack beats a non-blackjack 21 and resolves with no extra hit',()=>{
 const game=new TrainerGame();setTop(game,['A','9','K','7']);game.startRound();
 assert.equal(game.phase,'ended');assert.equal(game.outcomes[0],'Blackjack');assert.equal(game.dealer.length,2);
});
test('splitting creates two independently playable hands',()=>{
 const game=new TrainerGame();setTop(game,['8','6','8','K','3','A','10']);game.startRound();
 assert.equal(game.recommendation(),'P');game.apply('P');assert.equal(game.hands.length,2);
 assert.equal(game.hands[0].cards.length,2);assert.equal(game.hands[1].cards.length,2);
 assert.equal(game.recommendation(),'D');game.apply('D');assert.equal(game.hands[0].doubled,true);
 assert.equal(game.activeHandIndex,1);assert.equal(game.recommendation(),'S');game.apply('S');
 assert.equal(game.phase,'ended');assert.equal(game.outcomes.length,2);
});
test('split Aces each get one card, no playable extra hit; re-shuffle after cut card',()=>{
 const game=new TrainerGame();setTop(game,['A','6','A','K','8','9']);game.startRound();
 assert.equal(game.recommendation(),'P');game.apply('P');assert.equal(game.phase,'ended');
 assert.equal(game.hands.length,2);assert.equal(game.hands[0].cards.length,2);assert.equal(game.hands[1].cards.length,2);
 assert.equal(game.hands[0].fromSplit,true);assert.equal(game.outcomes.every(x=>x!=='Blackjack'),true);
 const second=new TrainerGame();second.shoe=second.shoe.slice(0,60);second.startRound();assert.equal(second.shoeNumber,2);assert.equal(second.shoe.length,308);
});
