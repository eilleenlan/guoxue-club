import {createG1ZhuyinSyllable} from './g1-zhuyin-display.mjs';
import {diziguiBank} from './g1-dizigui-preview-data.mjs';
import {createDiziguiRound} from './g1-dizigui-round.mjs';
export {createPreviewState} from './g1-dizigui-round.mjs';

export function createWordCard(segment,entry=diziguiBank.find(q=>q.id===segment.id.slice(0,segment.id.lastIndexOf(':')))){
 const data=entry?.cards[segment.index];
 if(!data||data.text!==segment.text)throw Error('卡片與教材資料不符');
 if(!data.readings||data.readings.length!==3)throw Error('教材注音尚未核對完成');
 const word=document.createElement('span');word.className='word-card';
 for(const [index,character] of [...data.text].entries()){
  const pair=document.createElement('span');pair.className='character-pair';
  const han=document.createElement('span');han.className='han';han.textContent=character;
  pair.append(han,createG1ZhuyinSyllable(data.readings[index]));word.append(pair);
 }
 return word;
}

export function mountPreview({bank=diziguiBank,random=Math.random}={}){
 const $=id=>document.getElementById(id);let round=null,lastSections=[1,2,3,4,5];
 const button=(text,action)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;return b;};
 const feedback=(text='',kind='')=>{const box=$('dizigui-feedback');box.textContent=text;box.className='feedback'+(kind?' '+kind:'');};
 const change=action=>{action();feedback();render();};
 const selections=()=>[1,2,3,4,5].filter(n=>$('dizigui-section-'+n).checked);
 function updateRanges(){
  const sections=selections(),count=bank.filter(q=>sections.includes(q.section)).length;
  $('dizigui-start').disabled=!sections.length;
  $('dizigui-range-status').textContent=sections.length?`已選 ${sections.length} 段，共 ${count} 題；本回合 ${Math.min(5,count)} 題。`:'請先選擇至少一段。';
  $('dizigui-range-error').textContent='';
 }
 function startRound(sections){
  try{
   const nextRound=createDiziguiRound(sections,{bank,random});round=nextRound;lastSections=[...sections];
   $('dizigui-settings').hidden=true;$('dizigui-summary').hidden=true;$('dizigui-practice').hidden=false;
   feedback();render();$('dizigui-progress').focus();
  }catch(error){$('dizigui-range-error').textContent=error.message;}
 }
 function render(){
  const state=round.state;
  $('dizigui-progress').textContent=`第 ${round.position}／${round.total} 題`;
  $('dizigui-next').disabled=!round.canAdvance;
  $('dizigui-next').textContent=round.position===round.total?'完成本回合':'下一題';
  const answer=$('dizigui-answer'),options=$('dizigui-options');answer.replaceChildren();options.replaceChildren();
  if(!state.selected.length){const empty=document.createElement('li');empty.className='empty';empty.textContent='從下面選一張卡片吧！';answer.append(empty);}
  state.selected.forEach((id,index)=>{
   const segment=state.question.answer.find(s=>s.id===id),row=document.createElement('li');row.className='answer-row';
   const number=document.createElement('span');number.className='answer-number';number.textContent=String(index+1);
   const controls=document.createElement('div');controls.className='answer-controls';
   for(const [label,delta] of [['前移',-1],['後移',1]]){
    const b=button(label,()=>change(()=>state.move(id,delta)));b.disabled=index+delta<0||index+delta>=state.selected.length;
    b.setAttribute('aria-label',segment.text+'，'+label);controls.append(b);
   }
   const remove=button('移除',()=>change(()=>state.remove(id)));remove.setAttribute('aria-label','移除'+segment.text);controls.append(remove);
   row.append(number,createWordCard(segment,round.entry),controls);answer.append(row);
  });
  for(const segment of state.question.options){
   const option=button('',()=>change(()=>state.add(segment.id)));option.className='option-card';
   option.setAttribute('aria-label','加入'+segment.text);option.disabled=state.selected.includes(segment.id);
   option.dataset.segmentId=segment.id;option.append(createWordCard(segment,round.entry));options.append(option);
  }
  $('dizigui-clear').disabled=!state.selected.length;
 }
 $('dizigui-check').onclick=()=>{
  const result=round.check();
  if(result==='correct')feedback('答對了！四張卡片都排好了！','success');
  else if(result==='incomplete')feedback('還沒排完喔，把四張卡片都放進來吧！','retry');
  else feedback('順序還差一點，試著前移、後移，或移除再選一次。','retry');
  $('dizigui-next').disabled=!round.canAdvance;
 };
 $('dizigui-reshuffle').onclick=()=>{round.state.reshuffle();render();feedback('卡片洗好了，再排一次吧！');};
 $('dizigui-clear').onclick=()=>change(()=>round.state.clear());
 $('dizigui-next').onclick=()=>{
  if(!round.advance())return;
  if(round.finished){
   $('dizigui-practice').hidden=true;$('dizigui-summary').hidden=false;
   $('dizigui-score').textContent=`本回合答對 ${round.score}／${round.total} 題。`;
   $('dizigui-summary-title').focus();
  }else{feedback();render();$('dizigui-progress').focus();}
 };
 $('dizigui-repeat').onclick=()=>startRound(lastSections);
 $('dizigui-reselect').onclick=()=>{
  round=null;$('dizigui-summary').hidden=true;$('dizigui-practice').hidden=true;$('dizigui-settings').hidden=false;
  updateRanges();$('dizigui-settings-title').focus();
 };
 for(const n of [1,2,3,4,5]){$('dizigui-section-'+n).checked=true;$('dizigui-section-'+n).onchange=updateRanges;}
 $('dizigui-select-all').onclick=()=>{for(const n of [1,2,3,4,5])$('dizigui-section-'+n).checked=true;updateRanges();};
 $('dizigui-select-none').onclick=()=>{for(const n of [1,2,3,4,5])$('dizigui-section-'+n).checked=false;updateRanges();};
 $('dizigui-start').onclick=()=>startRound(selections());
 updateRanges();return {get round(){return round;}};
}
if(typeof document!=='undefined')mountPreview();
