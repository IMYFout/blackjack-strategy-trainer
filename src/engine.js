/**
 * Blackjack training engine — fixed 6-deck, American hole-card, S17, DAS,
 * late surrender, 3:2 natural blackjack, split to 4, no re-split aces.
 * Educational simulation only: no bets or payouts.
 * Strategy based on 4–8-deck S17 DAS late surrender basic strategy,
 * https://wizardofodds.com/games/blackjack/strategy/4-decks/
 */
export const RULES = Object.freeze({decks:6, dealerHitsSoft17:false, doubleAfterSplit:true, lateSurrender:true, maxHands:4, resplitAces:false, blackjackPays:'3:2', cutPenetration:0.75});
export const ACTIONS = Object.freeze({H:'Hit',S:'Stand',D:'Double',P:'Split',R:'Surrender'});
export const UP_RANKS = Object.freeze(['2','3','4','5','6','7','8','9','10','A']);
const SUITS = ['♠','♥','♦','♣'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const cardValue = (card) => card.rank === 'A' ? 11 : ['10','J','Q','K'].includes(card.rank) ? 10 : Number(card.rank);
export const upValue = (card) => cardValue(card);
export const hiLoDelta = card => {const v=cardValue(card); return v===11||v===10?-1 : v>=2&&v<=6?1:0;};
export function handInfo(cards) {
  let sum = 0, aces = 0;
  for(const c of cards){let v=cardValue(c); if(v===11){aces++;sum+=1;}else sum+=v;}
  const soft=aces>0 && sum+10<=21;
  const total=soft?sum+10:sum;
  return {total, soft, bust:total>21, blackjack:cards.length===2&&total===21&&aces===1, pair: cards.length===2&&cardValue(cards[0])===cardValue(cards[1])};
}
export const displayHand = cards => {const h=handInfo(cards);return `${h.soft?'Soft':'Hard'} ${h.total}`;};
export const isNatural = hand => handInfo(hand.cards).blackjack&&!hand.fromSplit;
export function createShoe(decks=6, random=Math.random) {
  if(!Number.isInteger(decks)||decks<1||decks>8) throw new Error('Decks must be 1–8');
  const cards=[];
  for(let d=0;d<decks;d++) for(const suit of SUITS) for(const rank of RANKS) cards.push({rank,suit});
  for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1)); [cards[i],cards[j]]=[cards[j],cards[i]];}
  return cards;
}
export const dealerMustHit = cards => {const h=handInfo(cards);return h.total<17||(RULES.dealerHitsSoft17&&h.soft&&h.total===17);};

/** Returns legal actions for current hand, without judging their quality. */
export function legalActions(cards,{fromSplit=false,splitAces=false,numberOfHands=1,canSurrender=true}={}) {
  const h=handInfo(cards);
  if(h.bust||h.total>=21||splitAces) return [];
  const options=['H','S'];
  if(cards.length===2) {
    if(!fromSplit||RULES.doubleAfterSplit) options.push('D');
    if(h.pair && numberOfHands<RULES.maxHands && !(fromSplit&&cardValue(cards[0])===11&&!RULES.resplitAces)) options.push('P');
    if(!fromSplit&&canSurrender&&RULES.lateSurrender) options.push('R');
  }
  return options;
}

/**
 * Rules evaluated in priority order: surrender -> pairs -> double -> hit/stand.
 * Unavailable actions automatically fall back to the best legal basic strategy.
 * Most basic-strategy charts assume a fresh two-card hand without information
 * from preceding cards. This trainer intentionally teaches that convention.
 */
export function recommendAction(cards,dealerUp,context={}) {
  const available=legalActions(cards,context), h=handInfo(cards), up=upValue(dealerUp);
  if(!available.length) return null;
  const has=code=>available.includes(code);
  if(has('R') && !h.soft && !(h.pair&&cardValue(cards[0])===8) && ((h.total===16 && up>=9) || (h.total===15 && up===10))) return 'R';
  if(h.pair && has('P')) {
    const p=cardValue(cards[0]);
    if(p===11||p===8) return 'P';
    if((p===2||p===3) && up>=2&&up<=7) return 'P';
    if(p===4 && (up===5||up===6)) return 'P';
    if(p===6 && up>=2&&up<=6) return 'P';
    if(p===7 && up>=2&&up<=7) return 'P';
    if(p===9 && ((up>=2&&up<=6)||(up>=8&&up<=9))) return 'P';
  }
  if(h.soft){
    if(has('D')) {
      if((h.total===13||h.total===14) && (up===5||up===6)) return 'D';
      if((h.total===15||h.total===16) && up>=4&&up<=6) return 'D';
      if((h.total===17||h.total===18) && up>=3&&up<=6) return 'D';
    }
    if(h.total<=17) return 'H';
    if(h.total===18) return up>=9?'H':'S';
    return 'S';
  }
  if(has('D')) {
    if(h.total===9 && up>=3&&up<=6) return 'D';
    if(h.total===10 && up>=2&&up<=9) return 'D';
    if(h.total===11 && up>=2&&up<=10) return 'D';
  }
  if(h.total<=11) return 'H';
  if(h.total===12) return up>=4&&up<=6?'S':'H';
  if(h.total<=16) return up>=2&&up<=6?'S':'H';
  return 'S';
}
export function ruleExplanation(cards,dealerUp,action,context={}) {
  const h=handInfo(cards), up=upValue(dealerUp), dealer=dealerUp.rank==='A'?'Ace':String(up);
  const kind=displayHand(cards);
  const lead=`${kind} vs dealer ${dealer}: ${ACTIONS[action]?.toUpperCase()||'N/A'}. `;
  let reason='';
  switch(action){
    case 'R':reason=h.total===16?'Surrender hard 16 against 9, 10 or Ace (except a pair of 8s).':'Surrender hard 15 against dealer 10. Late surrender is allowed only on your original two cards, after the dealer checks for blackjack.';break;
    case 'P': {
      const p=cardValue(cards[0]);
      reason=p===11?'Always split Aces; each split Ace receives one more card only.':p===8?'Always split 8s. Two starting hands of 8 are generally better than a hard 16.':p===9?'Split 9s vs 2–6 or 8–9; stand against 7, 10, Ace.':p===7?'Split 7s vs 2–7.':p===6?'Split 6s vs 2–6 when double after split is allowed.':p===4?'Split 4s only vs 5–6 with double after split allowed.':'Split 2s or 3s vs 2–7 with double after split allowed.';break;
    }
    case 'D':reason=h.soft?`Soft ${h.total} is doubled against this dealer card. Doubling means taking exactly ONE additional card, then standing. The extra bet is only simulated here.`:h.total===9?'Double hard 9 vs dealer 3–6. Otherwise hit.':h.total===10?'Double hard 10 vs 2–9. Otherwise hit.':'Double hard 11 vs 2–10. Against Ace, hit in this S17 game.';break;
    case 'S':reason=h.soft? h.total>=19?'Always stand on soft 19 or higher under these rules.':`Stand on soft 18 vs 2, 7 or 8; double vs 3–6 only when allowed; hit vs 9, 10, Ace.`:h.total>=17?'Always stand on hard 17 or higher.':h.total===12?'Stand on hard 12 against 4–6; otherwise hit.':'Stand on hard 13–16 against 2–6; otherwise hit (unless late surrender applies).';break;
    case 'H':reason=h.soft?h.total<=17?'Hit soft 17 or lower when doubling is not the best available action. A usable Ace protects you from busting on one hit.':'Hit soft 18 vs 9, 10 or Ace.':h.total<=11?'Hit hard 11 or less when doubling is not the best available action.':h.total===12?'Hit hard 12 vs 2–3 or 7–Ace; stand vs 4–6.':h.total<=16?'Hit hard 13–16 vs dealer 7–Ace (unless surrender applies).':'Hit because standing is not best with this hand.';break;
  }
  return {lead,reason,rule:`${lead}${reason}`};
}
export function chartCards(group,row) {
  if(group==='pair') return [{rank:row,suit:'♠'},{rank:row,suit:'♥'}];
  if(group==='soft') return [{rank:'A',suit:'♠'},{rank:String(row-11),suit:'♥'}];
  const hardMap={5:['2','3'],6:['2','4'],7:['3','4'],8:['3','5'],9:['4','5'],10:['4','6'],11:['5','6'],12:['5','7'],13:['6','7'],14:['6','8'],15:['7','8'],16:['7','9'],17:['8','9'],18:['8','10'],19:['9','10'],20:['10','Q']};
  return (hardMap[row]||['10','10']).map((rank,i)=>({rank,suit:SUITS[i]}));
}
export function chartAction(group,row,up) {
  return recommendAction(chartCards(group,row),{rank:up,suit:'♣'},{numberOfHands:1});
}

export class TrainerGame {
  constructor(decks=6,random=Math.random){
    this.decks=decks;this.random=random;this.shoe=[];this.shoeNumber=0;this.runningCount=0;this.visibleCount=0;this.dealtCount=0;this.phase='idle';this.hands=[];this.dealer=[];this.activeHandIndex=0;this.round=0;this.hasPeeked=false;this.holeShown=false;this.outcomes=[];this.pendingShuffle=false;this.shuffle();
  }
  shuffle(){this.shoe=createShoe(this.decks,this.random);this.shoeNumber++;this.runningCount=0;this.visibleCount=0;this.dealtCount=0;this.pendingShuffle=false;}
  draw(visible=true){if(!this.shoe.length) throw new Error('Shoe empty');const card=this.shoe.pop();this.dealtCount++;if(visible) this.reveal(card);return card;}
  reveal(card){this.runningCount+=hiLoDelta(card);this.visibleCount++;}
  get remainingDecks(){return (this.shoe.length+(this.holeShown?0:((this.phase==='idle'||this.phase==='ended')?0:1)))/52;}
  get trueCount(){return this.remainingDecks?this.runningCount/this.remainingDecks:0;}
  get penetration(){return this.dealtCount/(this.decks*52);}
  get currentHand(){return this.hands[this.activeHandIndex];}
  startRound(){
    if(this.shoe.length<this.decks*52*(1-RULES.cutPenetration)||this.shoe.length<30)this.shuffle();
    this.round++;this.phase='playing';this.hasPeeked=false;this.holeShown=false;this.outcomes=[];
    this.hands=[{cards:[],fromSplit:false,splitAces:false,finished:false,doubled:false,surrendered:false}];this.activeHandIndex=0;this.dealer=[];
    // Player card, dealer up, player card, dealer hole. Hidden hole excluded from Hi-Lo.
    this.hands[0].cards.push(this.draw());this.dealer.push(this.draw());this.hands[0].cards.push(this.draw());this.dealer.push(this.draw(false));
    this.phase=this.dealer[0].rank==='A'?'insurance':'playing';
    if(this.phase==='playing')this.checkPeekAndNaturals();
    return this;
  }
  checkPeekAndNaturals(){
    this.hasPeeked=true;
    const up=upValue(this.dealer[0]);
    const dealerBJ=handInfo(this.dealer).blackjack;
    if((up===10||up===11)&&dealerBJ){this.endRound();return;}
    if(isNatural(this.hands[0])){this.endRound();return;}
    this.phase='playing';
  }
  declineInsurance(){if(this.phase!=='insurance')throw new Error('Not in insurance phase');this.phase='playing';this.checkPeekAndNaturals();}
  available(){if(this.phase!=='playing')return [];const h=this.currentHand;return legalActions(h.cards,{fromSplit:h.fromSplit,splitAces:h.splitAces,numberOfHands:this.hands.length,canSurrender:true});}
  recommendation(){if(this.phase==='insurance')return 'N';if(this.phase!=='playing')return null;const h=this.currentHand;return recommendAction(h.cards,this.dealer[0],{fromSplit:h.fromSplit,splitAces:h.splitAces,numberOfHands:this.hands.length});}
  apply(action){
    if(this.phase!=='playing'||!this.available().includes(action))throw new Error('Illegal action for current hand');
    const h=this.currentHand;
    switch(action){
      case 'H':h.cards.push(this.draw());if(handInfo(h.cards).total>=21)h.finished=true;break;
      case 'S':h.finished=true;break;
      case 'D':h.cards.push(this.draw());h.doubled=true;h.finished=true;break;
      case 'R':h.surrendered=true;h.finished=true;break;
      case 'P': {
        const first=h.cards[0],second=h.cards[1],isAce=cardValue(first)===11;
        h.cards=[first,this.draw()];h.fromSplit=true;h.splitAces=isAce;
        const other={cards:[second,this.draw()],fromSplit:true,splitAces:isAce,finished:false,doubled:false,surrendered:false};
        this.hands.splice(this.activeHandIndex+1,0,other);
        if(isAce){h.finished=true;other.finished=true;}else if(handInfo(h.cards).total===21) h.finished=true;
        break;
      }
      default:throw new Error('Unknown action');
    }
    this.advance();return this;
  }
  advance(){
    // After split, active index remains on the first split hand, if still playable.
    while(this.activeHandIndex<this.hands.length && (this.hands[this.activeHandIndex].finished||handInfo(this.hands[this.activeHandIndex].cards).total>=21)) this.activeHandIndex++;
    if(this.activeHandIndex>=this.hands.length) this.endRound();
  }
  endRound(){
    if(this.phase==='ended')return;
    if(!this.holeShown){this.reveal(this.dealer[1]);this.holeShown=true;}
    const anyLive=this.hands.some(h=>!h.surrendered&&!handInfo(h.cards).bust);
    // Don't draw unnecessarily when every hand lost or surrendered, or there's a natural BJ.
    if(anyLive&&!handInfo(this.dealer).blackjack&&!this.hands.every(h=>isNatural(h)||h.surrendered||handInfo(h.cards).bust)) {
      while(dealerMustHit(this.dealer))this.dealer.push(this.draw());
    }
    const di=handInfo(this.dealer);
    this.outcomes=this.hands.map(h=>{
      const p=handInfo(h.cards);
      if(h.surrendered) return 'Surrender';
      if(p.bust) return 'Loss';
      if(isNatural(h)) return di.blackjack?'Push':'Blackjack';
      if(di.blackjack)return 'Loss';
      if(di.bust)return 'Win';
      if(p.total>di.total)return 'Win';
      if(p.total<di.total)return 'Loss';
      return 'Push';
    });
    this.phase='ended';
  }
}
