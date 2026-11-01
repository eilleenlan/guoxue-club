import {roundFits} from './idiom-paper-layout.mjs';
import {validateIdiomBank} from './idiom-engine.mjs';
import {shuffle} from './engine.mjs';
export function buildIdiomPaper(banks,{preview=false,random=Math.random,previous=null,mode='random',count=mode==='all'?10:12,measure=(s,n)=>[...s].length*n}={}){
 if(!Array.isArray(banks)||!banks.length)throw Error('請至少選一個已發布課次。');
 const lessons=new Set(),terms=new Set(),ids=new Set(),items=[];
 for(const bank of banks){validateIdiomBank(bank);const l=bank.lesson,key=`${l.academicYear}:G${l.grade}:${l.code}`;if(lessons.has(key))throw Error('課次重複：'+key);lessons.add(key);if(!preview&&bank.status!=='approved')throw Error('課次尚未正式核准：'+key);
 for(const e of bank.entries){if(terms.has(e.term)||ids.has(e.id))throw Error('成語或識別碼重複：'+e.term);terms.add(e.term);ids.add(e.id);const examples=e.examples.filter(q=>(preview?q.review.status!=='needs-revision':q.review.status==='approved'&&q.review.confirmedBy==='媽媽')&&!q.initialCheck?.needsRevision);if((preview?e.review.status==='needs-revision':e.review.status!=='approved'||e.review.confirmedBy!=='媽媽')||!examples.length)throw Error('成語缺少正式核准例句：'+e.term);const q=shuffle(examples,random)[0];items.push({id:e.id,term:e.term,text:q.text,lesson:key});}}
 const reorder=(array,prior)=>{let result=shuffle(array,random);if(prior&&result.length>1&&result.every((e,i)=>e.id===prior[i]?.id))result=[...result.slice(1),result[0]];return result;};

 if(!['random','all'].includes(mode)||!Number.isInteger(count)||count<1||count>12||mode==='all'&&![10,12].includes(count))throw Error('出卷模式或題數無效');
 const lessonsData=banks.map(b=>({...b.lesson})),ordered=reorder(items,previous?.rounds.flatMap(r=>r.questions)),pending=mode==='random'?ordered.slice(0,Math.min(count,items.length)):ordered,rounds=[],adjustments=[];
 const makeRound=(chosen)=>{const ids=new Set(chosen.map(q=>q.id)),distractors=shuffle(items.filter(q=>!ids.has(q.id)),random).slice(0,2),options=shuffle([...chosen,...distractors],random).map((q,i)=>({id:q.id,term:q.term,number:i+1})),numbers=new Map(options.map(o=>[o.id,o.number]));return {number:rounds.length+1,options,questions:chosen.map((q,i)=>({...q,number:i+1,answerNumber:numbers.get(q.id)}))};};
 let offset=0;while(offset<pending.length){const requested=Math.min(count,pending.length-offset);let size=requested,round;for(;size>=1;size--){round=makeRound(pending.slice(offset,offset+size));if(roundFits(round,measure,lessonsData))break;}if(size<1)throw Error('單題與選項無法在A4單面清楚呈現，請人工確認題目長度。');if(size<requested)adjustments.push({round:round.number,requested,actual:size});rounds.push(round);offset+=size;if(mode==='random')break;}
 return {lessons:lessonsData,mode,requestedCount:count,rounds,adjustments,total:rounds.reduce((sum,r)=>sum+r.questions.length,0)};
}
