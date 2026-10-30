import {shuffle} from './engine.mjs';
export const BLANK='＿＿＿＿';
const validReview=r=>['pending','approved','needs-revision'].includes(r?.status)&&(r.status!=='approved'||(typeof r.confirmedBy==='string'&&r.confirmedBy.trim()&&/^\d{4}-\d{2}-\d{2}$/.test(r.confirmedAt??'')));
export function validateIdiomBank(bank){
 if(bank?.schemaVersion!==1||bank.kind!=='idiom-gap-fill'||!bank.lesson||!Array.isArray(bank.entries))throw Error('成語題庫格式不正確');
 const l=bank.lesson;if(!Number.isInteger(l.academicYear)||!Number.isInteger(l.grade)||!l.code||!Number.isInteger(l.questionCount)||l.questionCount<1||!Number.isInteger(l.optionCount)||l.questionCount>l.optionCount||bank.entries.length!==l.optionCount)throw Error('課次或題數設定不正確');
 const ids=new Set(),terms=new Set(),examples=new Set();
 for(const e of bank.entries){if(!e.id||ids.has(e.id)||!e.term||terms.has(e.term)||!e.definition||!e.textbookSource||e.academicYear!==l.academicYear||e.grade!==l.grade||e.lesson!==l.code||!validReview(e.review)||!Array.isArray(e.examples))throw Error('成語欄位遺失、重複或課次不符');ids.add(e.id);terms.add(e.term);
 for(const q of e.examples){if(!q.id||examples.has(q.id)||typeof q.text!=='string'||q.text.split(BLANK).length!==2||q.text.replace(BLANK,'').includes('＿')||q.answerId!==e.id||q.answer!==e.term||!q.source||!validReview(q.review))throw Error('例句欄位、空格或答案不正確');examples.add(q.id);}}
 return bank;
}
export function eligibleIdiomEntries(bank,{preview=false}={}){validateIdiomBank(bank);return bank.entries.map(e=>({...e,examples:e.examples.filter(q=>!q.initialCheck?.needsRevision&&(preview?q.review.status!=='needs-revision':q.review.status==='approved'&&q.review.confirmedBy==='媽媽'&&e.review.status==='approved'&&e.review.confirmedBy==='媽媽'))})).filter(e=>e.examples.length&&(preview?e.review.status!=='needs-revision':e.review.status==='approved'&&e.review.confirmedBy==='媽媽'));}
export function createIdiomRound(bank,{preview=false,previous=null,random=Math.random}={}){
 const eligible=eligibleIdiomEntries(bank,{preview}),count=bank.lesson.questionCount;if(eligible.length<count)throw Error(`已核對例句不足：可用 ${eligible.length} 個成語，需要 ${count} 個；不使用待核對題目湊數。`);
 if(!preview&&(bank.status!=='approved'||bank.entries.some(e=>e.review.status!=='approved'||e.review.confirmedBy!=='媽媽')))throw Error('本課題庫與選項必須全部經媽媽確認，才能正式出題。');
 const prior=new Set(previous?.questions.map(q=>q.answerId)??[]),ordered=shuffle(eligible,random).sort((a,b)=>Number(prior.has(a.id))-Number(prior.has(b.id))),chosen=ordered.slice(0,count);
 const questions=shuffle(chosen.map(e=>{const priorExample=previous?.questions.find(q=>q.answerId===e.id)?.id,variants=e.examples.filter(q=>q.id!==priorExample),q=shuffle(variants.length?variants:e.examples,random)[0];return {...q,term:e.term};}),random);
 let options=shuffle(bank.entries.map(e=>({id:e.id,term:e.term})),random);if(previous&&options.every((o,i)=>o.id===previous.options[i].id))options=[...options.slice(1),options[0]];
 return {preview,lesson:{...bank.lesson},questions,options};
}
export function assignIdiom(round,answers,index,id){if(!Number.isInteger(index)||index<0||index>=round.questions.length||answers.length!==round.questions.length)throw Error('答案格不正確');if(id!==null&&!round.options.some(o=>o.id===id))throw Error('選項不屬於本課');if(id!==null&&answers.some((v,i)=>v===id&&i!==index))throw Error('同一成語不能同時填入兩題，請先清除原答案。');const copy=[...answers];copy[index]=id;return copy;}
export function gradeIdiomRound(round,answers){if(answers.length!==round.questions.length||answers.some(v=>!v)||new Set(answers).size!==answers.length||answers.some(id=>!round.options.some(o=>o.id===id)))throw Error('請先完成所有答案，每個成語只能使用一次。');const results=round.questions.map((q,i)=>({correct:answers[i]===q.answerId,answerId:q.answerId,answer:q.answer}));return {score:results.filter(r=>r.correct).length,total:results.length,results};}
