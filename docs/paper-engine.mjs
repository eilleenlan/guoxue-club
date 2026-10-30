import {validateWork,filterWorks,shuffle} from './engine.mjs';
import {authorDisplay} from './library.mjs';
export const circled = n => n>=1&&n<=20 ? String.fromCodePoint(0x2460+n-1) : `(${n})`;
const signature = options => options.map(s=>s.text).join('\u0000');
function nextPermutation(items){
  let i=items.length-2;while(i>=0&&items[i].text>=items[i+1].text)i--;if(i<0)return false;
  let j=items.length-1;while(items[j].text<=items[i].text)j--;[items[i],items[j]]=[items[j],items[i]];
  for(let a=i+1,b=items.length-1;a<b;a++,b--)[items[a],items[b]]=[items[b],items[a]];return true;
}
function windows(work,selection){
  const {playable,segments}=validateWork(work);if(!playable||work.status!=='verified')throw new Error('只能選擇已核對正式教材');
  if(work.practiceMode==='full')return [segments];
  if(work.practiceMode!=='random-contiguous')throw new Error('此教材尚未設定紙本出題模式');
  if(!Number.isInteger(selection.paragraph)||selection.paragraph<0)throw new Error('請選擇自然段落');
  if(!Number.isInteger(selection.count)||selection.count<2||selection.count>15)throw new Error('片段數須為2至15');
  const pool=segments.filter(s=>s.paragraph===selection.paragraph);if(pool.length<2)throw new Error('所選段落沒有足夠片段');
  const actual=Math.min(selection.count,pool.length);
  return Array.from({length:pool.length-actual+1},(_,i)=>pool.slice(i,i+actual));
}
function selectVariant(candidates,used,random){
  for(let attempt=0;attempt<40;attempt++){
    const answer=candidates[Math.floor(random()*candidates.length)],options=shuffle(answer,random),key=signature(options);
    if(key!==signature(answer)&&!used.has(key))return {answer,options,key,repeated:false};
  }
  // Deterministic fallback checks actual visible permutations, including duplicate text.
  for(const answer of candidates){const options=[...answer].sort((a,b)=>a.text<b.text?-1:a.text>b.text?1:0);
    do{const key=signature(options);if(key!==signature(answer)&&!used.has(key))return {answer,options:[...options],key,repeated:false};}while(nextPermutation(options));
  }
  const answer=candidates[0],options=shuffle(answer,random);return {answer,options,key:signature(options),repeated:true};
}
function deepFreeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;}
export function buildPaper(catalog,{selections,rounds,previous=null},random=Math.random){
  if(!Number.isInteger(rounds)||rounds<1||rounds>5)throw new Error('回數須為1至5');
  if(!Array.isArray(selections)||!selections.length)throw new Error('請至少選取一個練習單元');
  const entries=new Map();let order=0;
  for(const work of filterWorks(catalog))for(const unit of work.children?filterWorks(work.children):[work])entries.set(unit.id,{unit,parent:work.children?work:null,order:order++});
  const seen=new Set(),chosen=selections.map(selection=>{
    const entry=entries.get(selection.workId);if(!entry)throw new Error('找不到指定教材');
    const key=entry.unit.id+(entry.unit.practiceMode==='random-contiguous'?`:${selection.paragraph}`:'');
    if(seen.has(key))throw new Error('練習單元不可重複選取');seen.add(key);
    return {...entry,selection,key,candidates:windows(entry.unit,selection),used:new Set((previous?.rounds||[]).flatMap(r=>r.questions).filter(q=>q.workId===entry.unit.id&&(q.paragraph??null)===(entry.unit.practiceMode==='random-contiguous'?selection.paragraph:null)).map(q=>signature(q.options)))};
  }).sort((a,b)=>a.order-b.order||(a.selection.paragraph??0)-(b.selection.paragraph??0));
  const warnings=new Set(),result=[];
  for(let round=1;round<=rounds;round++){
    const questions=chosen.map((entry,i)=>{
      const {unit,parent,selection}=entry,v=selectVariant(entry.candidates,entry.used,random);entry.used.add(v.key);
      const paragraph=unit.practiceMode==='random-contiguous'?selection.paragraph:null;
      const title=parent?`${parent.title}｜${unit.title}`:paragraph!==null?`${unit.title}｜第${['一','二','三','四'][paragraph]??paragraph+1}段`:unit.title;
      if(v.repeated)warnings.add(`${title}：可用的不重複排列不足，部分題目可能與本批或上次結果重複。`);
      if(paragraph!==null&&v.answer.length<selection.count)warnings.add(`${title}：設定${selection.count}片段，本段僅${v.answer.length}片段，已調整。`);
      const copy=s=>({id:s.id,text:s.text,raw:s.raw,index:s.index,paragraph:s.paragraph});
      const answer=v.answer.map(copy),options=v.options.map(copy);
      return {number:i+1,workId:unit.id,title,author:authorDisplay(unit),paragraph,answer,options,answerNumbers:answer.map(s=>options.findIndex(o=>o.id===s.id)+1),original:unit.practiceMode==='full'?unit.text:answer.map(s=>s.raw).join(''),repeated:v.repeated};
    });result.push({number:round,questions});
  }
  const names=[...new Set(chosen.map(e=>e.parent?.title||e.unit.title))],rangeName=names.length<=2?names.join('＋'):`${names[0]}等${names.length}篇`;
  const filenameBase=`小小國學所_${rangeName.replace(/[\\/:*?"<>|]/gu,'').slice(0,48)}_${rounds}回`;
  return deepFreeze({version:1,rounds:result,warnings:[...warnings],filenameBase});
}
