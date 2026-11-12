const han=c=>/\p{Script=Han}/u.test(c);
export function alignReadingZhuyin(text,data){
 const paragraphs=text.split('\n\n');if(paragraphs.length!==data.zhuyin.paragraphs.length)throw Error('原文與注音段數不符');
 const aligned=[];
 paragraphs.forEach((paragraph,index)=>{
  const supplied=[];
  for(const run of data.zhuyin.paragraphs[index].runs){const characters=[...run.text].filter(han),syllables=run.reading.replace(/[，。、；？！,;!?]/gu,' ').trim().split(/\s+/u);if(characters.length!==syllables.length)throw Error(`第${index+1}段注音字數不符`);for(let i=0;i<characters.length;i++){if(!/^[\u3105-\u3129ˊˇˋ˙]+$/u.test(syllables[i]))throw Error('注音格式不符');supplied.push({text:characters[i],reading:syllables[i]});}}
  const actual=[...paragraph].filter(han);if(actual.join('')!==supplied.map(s=>s.text).join(''))throw Error(`第${index+1}段原文與注音用字不一致`);
  let cursor=0;for(const character of paragraph)aligned.push(han(character)?supplied[cursor++]:{text:character,reading:null});
  if(index<paragraphs.length-1)aligned.push({text:'\n',reading:null},{text:'\n',reading:null});
 });return aligned;
}
const readingFiles={'er-shi-ji-qu':'reading-er-shi-ji-qu.json','lou-shi-ming':'reading-lou-shi-ming.json'};
let renderVersion=0;
const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
export function splitZhuyinDisplay(reading){
 const tones=[...reading.matchAll(/[ˊˇˋ˙]/gu)].map(m=>m[0]),symbols=[...reading.replace(/[ˊˇˋ˙]/gu,'')];
 if(tones.length>1||!symbols.length||symbols.length>3||symbols.some(s=>!/[\u3105-\u3129]/u.test(s)))throw Error('單字注音顯示格式不符');
 return {symbols,tone:tones[0]??'',neutral:tones[0]==='˙'};
}
export function createZhuyinAnnotation(reading){
 const parts=splitZhuyinDisplay(reading),rt=node('rt'),stack=node('span');rt.dataset.reading=reading;rt.setAttribute('aria-label',reading);stack.className='zhuyin-stack'+(parts.neutral?' neutral-stack':'');if(parts.neutral)rt.className='has-neutral-tone';
 const tone=parts.tone?node('span',parts.tone):null;if(tone)tone.className='zhuyin-tone'+(parts.neutral?' neutral-tone':'');
 if(parts.neutral)stack.append(tone);for(const symbol of parts.symbols){const glyph=node('span',symbol);glyph.className='zhuyin-symbol';stack.append(glyph);}if(tone&&!parts.neutral)stack.append(tone);rt.append(stack);return rt;
}
export function locateReadingNotes(text,notes){
 const anchors=[];
 notes.forEach((note,noteIndex)=>{const scoped=note.text.match(/^「([^」]+)」的「([^」]+)」/u),character=scoped?.[2]??note.character??note.text.match(/^「([\p{Script=Han}])」/u)?.[1];if(!character||[...character].length!==1)return;
  if(scoped){const phrase=scoped[1],within=phrase.lastIndexOf(character);if(within<0)return;let start=0,index;while((index=text.indexOf(phrase,start))!==-1){anchors.push({offset:[...text.slice(0,index+within)].length,character,noteIndex});start=index+phrase.length;}}
  else [...text].forEach((c,offset)=>{if(c===character)anchors.push({offset,character,noteIndex});});
 });return anchors.sort((a,b)=>a.offset-b.offset||a.noteIndex-b.noteIndex);
}
function focusReadingTarget(target) {
 target.focus({preventScroll:true});
 target.scrollIntoView({block:'center'});
}
function noteHint(character, noteIndex, offset, returnLinks) {
 const sup=node('sup'), link=node('a','＊');
 sup.className='reading-note-hint';
 link.className='reading-note-marker';
 link.id='reading-marker-'+offset+'-'+noteIndex;
 link.href='#reading-note-'+noteIndex;
 link.setAttribute('aria-label','查看「'+character+'」的讀音備註');
 link.onclick=event=>{
  event.preventDefault();
  document.getElementById('reading-pronunciation-notes').open=true;
  const back=returnLinks[noteIndex];
  back.href='#'+link.id;
  back.hidden=false;
  focusReadingTarget(document.getElementById('reading-note-'+noteIndex));
 };
 sup.append(link);
 return sup;
}
export async function renderReadingSupport(work){
 const version=++renderVersion,full=document.getElementById('full-text');let controls=document.getElementById('reading-support-controls'),content=document.getElementById('reading-support');
 if(!controls){controls=node('div');controls.id='reading-support-controls';controls.className='reading-support-controls';full.before(controls);content=node('section');content.id='reading-support';full.after(content);}
 controls.replaceChildren();content.replaceChildren();controls.hidden=true;content.hidden=true;full.classList.remove('with-zhuyin');
 const file=readingFiles[work.id];if(!file)return;
 controls.hidden=false;const label=node('label'),toggle=node('input'),status=node('span','正在讀取閱讀輔助資料…');toggle.type='checkbox';toggle.id='show-reading-zhuyin';toggle.disabled=true;toggle.setAttribute('aria-controls','full-text');status.setAttribute('role','status');label.append(toggle,document.createTextNode('顯示注音'));controls.append(label,status);
 try{
  const response=await fetch(new URL('./data/'+file,import.meta.url));if(!response.ok)throw Error('閱讀資料無法載入');const data=await response.json();if(version!==renderVersion)return;if(data.workId!==work.id)throw Error('閱讀資料篇目不符');const aligned=alignReadingZhuyin(work.text,data);
  const anchors=new Map();for(const anchor of locateReadingNotes(work.text,data.zhuyin.notes)){const notes=anchors.get(anchor.offset)??[];notes.push(anchor.noteIndex);anchors.set(anchor.offset,notes);}
  toggle.disabled=false;
  status.textContent=data.zhuyin.review?.status==='pending'?'注音初稿待核對':'';
  function select(labelText, options) {
   const wrapper=node('label',labelText), field=node('select');
   for(const [value,text] of options){const option=node('option',text);option.value=value;field.append(option);}
   wrapper.append(field);controls.append(wrapper);return field;
  }
  const mode=select('閱讀方式',[['original','純原文閱讀'],['parallel','逐段對照']]);
  const translation=select('對照版本',[['schoolTranslation','教材白話'],['childExplanation','姐姐版淺白解說']]);
  const opened=new Set(), paragraphs=[[]], returnLinks=[];
  let nameEnd=-1;
  const names=new Set(data.properNames??[]);
  const characters=aligned.map((character,index)=>{
   const name=[...names].find(value=>work.text.startsWith(value,index));
   if(name)nameEnd=index+name.length;
   return {...character,index,name,insideName:index<nameEnd};
  });
  for(const character of characters){
   if(character.text==='\n'){
    if(paragraphs.at(-1).length)paragraphs.push([]);
   }else paragraphs.at(-1).push(character);
  }
  function paintText(){
   const parallel=mode.value==='parallel';
   translation.parentElement.hidden=!parallel;
   full.classList.toggle('with-zhuyin',toggle.checked);
   full.replaceChildren();
   paragraphs.forEach((characters,index)=>{
    const paragraph=node('p');let target=paragraph;
    for(const character of characters){
     if(character.name){target=node('span');target.className='reading-proper-name';target.setAttribute('aria-label',character.name);paragraph.append(target);}
     if(!character.insideName)target=paragraph;
     const noteIndexes=anchors.get(character.index);
     if(!character.reading||(!toggle.checked&&!noteIndexes)){target.append(document.createTextNode(character.text));continue;}
     const unit=node(toggle.checked?'ruby':'span'),base=node('span',character.text);
     base.className='reading-base';
     if(noteIndexes){unit.classList.add('reading-note-unit');for(const noteIndex of noteIndexes)base.append(noteHint(character.text,noteIndex,character.index,returnLinks));}
     unit.append(base);
     if(toggle.checked)unit.append(createZhuyinAnnotation(character.reading));
     target.append(unit);
    }
    if(index)full.append(document.createTextNode('\n\n'));
    full.append(paragraph);
    if(!parallel)return;
    const layer=data[translation.value],details=node('details'),summary=node('summary','第 '+(index+1)+' 段｜'+layer.label);
    details.open=opened.has(index);details.ontoggle=()=>{if(details.isConnected){if(details.open)opened.add(index);else opened.delete(index);}};
    details.append(summary,node('p',layer.paragraphs[index]));
    for(const supplement of layer.supplements??[])if(supplement.paragraph===index+1){const note=node('p',supplement.note);note.className='reading-source-note';details.append(note);}
    full.append(details);
   });
  }
  toggle.onchange=mode.onchange=translation.onchange=paintText;
  const notes=node('details'),summary=node('summary','讀音備註'),list=node('ul');
  notes.id='reading-pronunciation-notes';
  data.zhuyin.notes.forEach((note,index)=>{
   const item=node('li','＊ '+note.text), back=node('a','↩ 返回原文');
   item.id='reading-note-'+index;
   item.tabIndex=-1;
   back.className='reading-note-return';
   back.hidden=true;
   back.onclick=event=>{
    event.preventDefault();
    const marker=document.getElementById(back.hash.slice(1));
    if(marker)focusReadingTarget(marker);
   };
   returnLinks.push(back);
   item.append(document.createTextNode(' '),back);
   list.append(item);
  });
  notes.append(summary,list);
  content.append(notes);
  content.hidden=false;
  paintText();
 }catch(error){if(version!==renderVersion)return;status.textContent='閱讀輔助資料待核對：'+error.message+'；原文與練習仍可使用。';toggle.disabled=true;}
}
