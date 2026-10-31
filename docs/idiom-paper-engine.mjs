import {validateIdiomBank} from './idiom-engine.mjs';
import {shuffle} from './engine.mjs';
export function buildIdiomPaper(banks,{random=Math.random,previous=null}={}){
 if(!Array.isArray(banks)||!banks.length)throw Error('請至少選一個已發布課次。');
 const lessons=new Set(),terms=new Set(),ids=new Set(),items=[];
 for(const bank of banks){validateIdiomBank(bank);const l=bank.lesson,key=`${l.academicYear}:G${l.grade}:${l.code}`;if(lessons.has(key))throw Error('課次重複：'+key);lessons.add(key);if(bank.status!=='approved')throw Error('課次尚未正式核准：'+key);
 for(const e of bank.entries){if(terms.has(e.term)||ids.has(e.id))throw Error('成語或識別碼重複：'+e.term);terms.add(e.term);ids.add(e.id);const examples=e.examples.filter(q=>q.review.status==='approved'&&q.review.confirmedBy==='媽媽'&&!q.initialCheck?.needsRevision);if(e.review.status!=='approved'||e.review.confirmedBy!=='媽媽'||!examples.length)throw Error('成語缺少正式核准例句：'+e.term);const q=shuffle(examples,random)[0];items.push({id:e.id,term:e.term,text:q.text,lesson:key});}}
 const reorder=(array,prior)=>{let result=shuffle(array,random);if(prior&&result.length>1&&result.every((e,i)=>e.id===prior[i]?.id))result=[...result.slice(1),result[0]];return result;};
 const options=reorder(items.map(({id,term})=>({id,term})),previous?.options).map((o,i)=>({...o,number:i+1}));const numbers=new Map(options.map(o=>[o.id,o.number]));
 const questions=reorder(items,previous?.questions).map((q,i)=>({...q,number:i+1,answerNumber:numbers.get(q.id)}));
 return {lessons:banks.map(b=>({...b.lesson})),options,questions};
}
