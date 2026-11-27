import {createQuestion,grade,shuffle} from './engine.mjs';
import {diziguiBank} from './g1-dizigui-preview-data.mjs';
import {splitG1Zhuyin} from './g1-zhuyin-display.mjs';

export function createPreviewState(random=Math.random,entry=diziguiBank[0],onChange=()=>{}){
 const question=createQuestion(entry.work,4,null,random);let selected=[];
 return {
  get question(){return question;},get entry(){return entry;},get selected(){return [...selected];},
  add(id){if(!question.options.some(s=>s.id===id)||selected.includes(id))return false;selected.push(id);onChange();return true;},
  remove(id){if(!selected.includes(id))return;selected=selected.filter(x=>x!==id);onChange();},
  move(id,delta){const i=selected.indexOf(id),j=i+delta;if(![-1,1].includes(delta)||i<0||j<0||j>=selected.length)return false;[selected[i],selected[j]]=[selected[j],selected[i]];onChange();return true;},
  clear(){selected=[];onChange();},
  reshuffle(){question.options=shuffle(question.options,random);selected=[];onChange();},
  check(){return selected.length<question.answer.length?'incomplete':grade(question,selected)?'correct':'incorrect';}
 };
}

export function selectedPool(sections,bank=diziguiBank){
 if(!Array.isArray(sections)||!sections.length)throw Error('請先選擇至少一段。');
 if(sections.some(s=>!Number.isInteger(s)||s<1||s>5))throw Error('練習範圍不正確。');
 const chosen=new Set(sections),pool=bank.filter(q=>chosen.has(q.section));
 if(!pool.length)throw Error('請先選擇至少一段。');return pool;
}

export function drawRound(sections,{bank=diziguiBank,random=Math.random}={}){
 const pool=[...selectedPool(sections,bank)];
 // 抽題可自然出現任一順序，不套用卡片「不得原序」的洗牌修正。
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,Math.min(5,pool.length));
}

export function createDiziguiRound(sections,{bank=diziguiBank,random=Math.random}={}){
 const pool=selectedPool(sections,bank);
 const missing=[...new Set(pool.filter(q=>q.sourceStatus!=='textbook-transcribed'||q.cards.some(c=>!c.readings||c.readings.length!==3)).map(q=>q.section))];
 if(missing.length)throw Error('第（'+missing.join('）、第（')+'）段還缺教材注音，請先選擇已完成的範圍。');
 for(const entry of pool)for(const card of entry.cards)for(const reading of card.readings)splitG1Zhuyin(reading);
 const entries=drawRound(sections,{bank,random});let index=0,finished=false,checked=false,completed=0;
 const newState=()=>createPreviewState(random,entries[index],()=>{checked=false;});
 let state=newState();
 return {
  get state(){return state;},get entry(){return entries[index];},get total(){return entries.length;},
  get position(){return index+1;},get finished(){return finished;},get score(){return completed;},
  get entries(){return [...entries];},get canAdvance(){return !finished&&checked&&state.check()==='correct';},
  check(){const result=state.check();checked=result==='correct';return result;},
  advance(){
   if(finished||!checked||state.check()!=='correct')return false;
   completed++;checked=false;
   if(index===entries.length-1)finished=true;
   else{index++;state=newState();}
   return true;
  }
 };
}
