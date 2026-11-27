import {selectedLunyuChildren,renderLunyuSelection} from './lunyu-selection.mjs';
import {updateCatalogDisclosure} from './catalog-collapse.mjs';
import {renderReadingSupport} from './reading-support.mjs';
import {representativeText,chapterNeighbors} from './learning-ui.mjs';
import {validateCatalog,filterWorks,createQuestion,questionLimit,shuffle,grade} from './engine.mjs';
import {loadLibrary,materialNotes,gradeWorks,allGradeWorks,authorDisplay} from './library.mjs';
let library=null;
const $=id=>document.getElementById(id);
let works=[],category='all',collection=null,parentSearch='',work,question,selected=[];
let gradeSelection='all',listReturn=null,parentReturn=null;
function rememberList(w){listReturn={y:window.scrollY,id:w.id};}
function restoreList(saved){requestAnimationFrame(()=>requestAnimationFrame(()=>{const row=[...$('catalog').children].find(r=>r.dataset.workId===saved?.id);row?.querySelector('button')?.focus({preventScroll:true});window.scrollTo(0,saved?.y??0);if(row){const r=row.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)row.scrollIntoView({block:'center'});}}));}
function chapterNavigation(w,view){
 const id=view+'-chapter-nav';
 $(id)?.remove();$(id+'-bottom')?.remove();
 const baseGroup=works.find(g=>g.children?.some(c=>c.id===w.id));
 if(!baseGroup)return;
 const group={...baseGroup,children:selectedLunyuChildren(baseGroup,library?.academicYear,gradeSelection)};
 const n=chapterNeighbors(group,w.id),boxes=[];
 const focusNewChapter=()=>{
  if(view!=='practice'||group.id!=='lunyu')return;
  $('work-title').focus({preventScroll:true});
  $('work-title').scrollIntoView({block:'start'});
 };
 const go=target=>{
  if(listReturn)listReturn.id=target.id;
  view==='reading'?readWork(target):start(target);
  focusNewChapter();
 };
 const requestSwitch=(target,box)=>{
  if(view==='practice'&&selected.length){
   for(const sibling of boxes)sibling.querySelector('.chapter-confirm')?.remove();
   const confirm=el('div',undefined,'chapter-confirm');
   confirm.append(el('p','切換章句會清空目前排列。要繼續嗎？'));
   const yes=el('button','清空並切換'),no=el('button','留在本則');
   yes.onclick=()=>go(target);no.onclick=()=>confirm.remove();
   confirm.append(yes,no);box.append(confirm);
  }else go(target);
 };
 const positions=view==='practice'&&group.id==='lunyu'?['top','bottom']:['top'];
 for(const position of positions){
  const box=el('nav',undefined,'chapter-navigation');
  box.id=id+(position==='bottom'?'-bottom':'');
  box.setAttribute('aria-label',position==='bottom'?'底部章句導覽':'章句導覽');
  box.append(el('span',group.id==='lunyu'?`${w.title}／已選 ${n.total} 則`:`第 ${n.index+1} 則／共 ${n.total} 則`));
  for(const [label,target] of [['上一則',n.previous],['下一則',n.next]]){
   const button=el('button',label);button.disabled=!target;
   button.onclick=()=>requestSwitch(target,box);box.append(button);
  }
  boxes.push(box);
  if(position==='bottom')$('practice').append(box);
  else $(view==='reading'?'reading-start':'range-note').after(box);
 }
}

function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function setupGrades(){const select=$('grade-select');select.replaceChildren();const grades=[...new Set(library.publishedCurricula.map(c=>c.grade))].sort((a,b)=>a-b);for(const grade of grades){const option=el('option',`${['','一','二','三','四','五','六'][grade]??grade}年級`);option.value=grade;select.append(option);}const all=el('option','全部年級');all.value='all';select.append(all);const requestedGrade=new URLSearchParams(location.search).get('grade');gradeSelection=requestedGrade!==null&&grades.includes(Number(requestedGrade))?String(Number(requestedGrade)):'all';select.value=gradeSelection;$('grade-controls').hidden=false;}
$('grade-select').onchange=()=>{gradeSelection=$('grade-select').value;collection=null;parentSearch='';listReturn=null;parentReturn=null;catalog();};
function catalog(){
  $('catalog').replaceChildren();$('collection-back').hidden=!collection;
  $('list-title').textContent=collection?`${collection.title}・選擇章句`:gradeSelection==='all'?'全部年級作品':`${['','一','二','三','四','五','六'][Number(gradeSelection)]??gradeSelection}年級作品`;
  const pool=library?(gradeSelection==='all'?allGradeWorks(library):gradeWorks(library,Number(gradeSelection))):works;
  renderLunyuSelection(collection,library?.academicYear,gradeSelection,catalog);
  const source=collection?selectedLunyuChildren(collection,library?.academicYear,gradeSelection):pool.some(w=>w.status==='verified'||w.children?.some(c=>c.status==='verified'))?pool.filter(w=>w.status!=='demo'):pool;
  if(library)$('grade-note').textContent=`${library.academicYear} 學年度`;
  const list=filterWorks(source,category,$('search').value);
  $('result-count').textContent=`${list.length} ${collection?'則':'篇'}`;
  for(const w of list){
    const group=Array.isArray(w.children),linked=w.linkedPractice===true,enabled=group||w.playable||linked;
    const row=el('article',undefined,`card ${enabled?'':'pending'}`),info=el('div',undefined,'work-info');
    row.dataset.workId=w.id;
    const heading=el('h2');
    if(linked){const link=el('a',w.title,'linked-practice-title');link.href=w.practiceHref;heading.append(link);}else heading.textContent=w.title;
    const gradeLabel=gradeSelection==='all'&&w.catalogGrades?.length?w.catalogGrades.map(g=>['','一','二','三','四','五','六'][g]+'年級').join('、')+' · ':linked?'一年級 · ':'';
    info.append(heading,el('p',gradeLabel+(linked?'古文 · 第（1）～（5）段':`${authorDisplay(w)} · ${w.category==='poem'?'古詩':'古文'}${group?` · ${w.children.length} 則`:''}`)));
    if(collection)info.append(el('p',representativeText(w),'representative'));
    info.append(el('span',linked?'三字片段排序 · 五段共十題':group?`可練習 ${w.children.filter(c=>c.playable).length} 則`:w.status==='demo'&&w.playable?'DEMO 自編測試':w.playable?'可練習':w.reason,'work-state'));
    const b=el('button',linked?'開始練習':group?'選擇章句':w.playable?'開始重組練習':'待核對');b.disabled=!enabled;b.setAttribute('aria-label',`${b.textContent}：${w.title}`);
    b.onclick=()=>{if(linked){location.assign(w.practiceHref);}else if(group){parentReturn={y:window.scrollY,id:w.id};parentSearch=$('search').value;$('search').value='';collection=w;catalog();$('list-title').focus();}else {rememberList(w);start(w);}};
    const actions=el('div',undefined,'row-actions');
    if(w.playable){const read=el('button','閱讀全文');read.setAttribute('aria-label',`閱讀全文：${w.title}`);read.onclick=()=>{rememberList(w);readWork(w);};actions.append(read);}
    actions.append(b);row.append(info,actions);$('catalog').append(row);
  }
  if(!list.length)$('catalog').append(el('p','找不到符合的篇目','empty'));
  $('clear-search').disabled=!$('search').value;
  updateCatalogDisclosure({key:[gradeSelection,collection?.id??'',category,$('search').value].join('|'),list,collectionTitle:collection?.title,selected:work,onStart:w=>{rememberList(w);start(w);}});
}
function resetSolution(){$('show-solution').hidden=true;$('solution').hidden=true;$('solution-list').replaceChildren();}
function readWork(w){work=w;question=null;selected=[];resetSolution();$('answer').replaceChildren();$('options').replaceChildren();$('home').hidden=true;$('practice').hidden=true;$('reading').hidden=false;$('reading-title').textContent=w.title;$('reading-author').textContent=authorDisplay(w);$('reading-status').textContent=w.status==='verified'?'閱讀全文':'DEMO 自編測試';$('full-text').textContent=w.text;let explanation=$('reading-explanation');if(!explanation){explanation=el('section',undefined,'reading-explanation');explanation.id='reading-explanation';$('full-text').after(explanation);}explanation.replaceChildren();explanation.hidden=!w.explanation;if(w.explanation){explanation.append(el('h2','白話論語'),el('p',w.explanation));}showMaterialNotes(w);renderReadingSupport(w);chapterNavigation(w,'reading');$('reading-title').focus();}
function showMaterialNotes(w){let section=$('reading-material-notes');if(!section){section=el('section',undefined,'reading-explanation');section.id='reading-material-notes';$('reading-explanation').after(section);}section.replaceChildren();const texts=new Map((library?materialNotes(library,w.id):[]).filter(n=>n.item.sourceMeaning?.text).map(n=>[n.item.sourceMeaning.text,n.item.sourceMeaning.label??'教材語意']));section.hidden=!texts.size;for(const [text,label] of texts)section.append(el('h2',label),el('p',text));}
function start(w){work=w;question=null;$('reading').hidden=true;$('home').hidden=true;$('practice').hidden=false;$('work-title').textContent=w.title;$('author').textContent=collection?`${collection.title} · ${authorDisplay(w)}`:authorDisplay(w);$('mode').textContent=w.practiceMode==='full'?(w.category==='poem'?'全詩重組':collection?'本則全文重組':'全文重組'):w.status==='demo'?'DEMO 自編試玩':'隨機分段重組';$('count-label').hidden=w.practiceMode==='full';$('next').hidden=w.practiceMode==='full';$('count').replaceChildren();const max=questionLimit(w);for(let n=2;n<=max;n++){const option=el('option',`${n} 段`);option.value=n;$('count').append(option);}
if(w.allowFullChallenge){const option=el('option','挑戰全文');option.value='full';$('count').append(option);}
$('count').value=Math.min(4,max);next();chapterNavigation(w,'practice');$('work-title').tabIndex=-1;$('work-title').focus();}
function next(){
const choice=$('count').value, challenge=choice==='full';
$('next').hidden=challenge||work.practiceMode==='full';
if(work.allowFullChallenge)$('mode').textContent=challenge?'挑戰全文':'隨機分段重組';
question=createQuestion(work,challenge?'full':Number(choice),question?.workId===work.id?question.start:null);selected=[];resetSolution();feedback('');const paragraph=work.layout==='prose-paragraphs';if(challenge||work.practiceMode==='full'){$('range-note').textContent=`全文共 ${question.answer.length} 個片段，全部都要排列；重新洗牌會打亂同一份全文。`;render();return;}$('range-note').textContent=`本題取自${paragraph?`第${['一','二','三','四'][question.answer[0].paragraph]||question.answer[0].paragraph+1}段`:collection?'同一章句':'同一篇目'}連續 ${question.answer.length} 個片段。${paragraph?`${work.mergePracticeParagraphs?'以練習段落為單位抽題。':'先等機率抽段，不跨段落。'}${question.answer.length<question.requestedCount?`本段只有 ${question.answer.length} 片段，本題由 ${question.requestedCount} 調整為 ${question.answer.length}；下題仍保留原設定。`:''}`:work.segments.length===question.answer.length?'已選全篇，換題只會重新洗牌。':'換一題會選擇另一個連續區段。'}`;render();}
function feedback(text,kind=''){$('feedback').textContent=text;$('feedback').className=`feedback ${kind}`;}
function change(fn){fn();feedback('');render();}
function render(){
  $('answer').replaceChildren();if(!selected.length)$('answer').append(el('li','點選待選片段，開始排列。','empty'));
  selected.forEach((id,index)=>{
    const segment=question.options.find(s=>s.id===id),row=el('li');row.append(el('span',`${index+1}`,'number'),el('span',segment.text,'words'));
    const controls=el('div',undefined,'controls');
    for(const [label,delta] of [['前移',-1],['後移',1]]){const b=el('button',label);b.disabled=index+delta<0||index+delta>=selected.length;b.setAttribute('aria-label',`第 ${index+1} 段${label}`);b.onclick=()=>change(()=>{[selected[index],selected[index+delta]]=[selected[index+delta],selected[index]];});controls.append(b);}
    const remove=el('button','移除');remove.setAttribute('aria-label',`移除第 ${index+1} 段`);remove.onclick=()=>change(()=>selected.splice(index,1));controls.append(remove);row.append(controls);$('answer').append(row);
  });
  $('options').replaceChildren();for(const s of question.options){const b=el('button',s.text);b.dataset.segmentId=s.id;b.disabled=selected.includes(s.id);b.onclick=()=>change(()=>selected.push(s.id));$('options').append(b);}
  $('progress').textContent=`已選 ${selected.length} / ${question.answer.length} 段`;$('clear').disabled=selected.length===0;
}
document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));catalog();});
$('search').oninput=catalog;$('clear-search').onclick=()=>{$('search').value='';catalog();$('search').focus();};
$('collection-back').onclick=()=>{collection=null;$('search').value=parentSearch;catalog();restoreList(parentReturn);};
function backHome(){$('practice').hidden=true;$('reading').hidden=true;$('home').hidden=false;question=null;resetSolution();catalog();restoreList(listReturn);}
$('back').onclick=backHome;$('back-bottom').onclick=backHome;$('reading-back').onclick=backHome;
$('review-full').onclick=()=>readWork(work);$('reading-start').onclick=()=>start(work);
$('count').onchange=next;$('next').onclick=next;$('clear').onclick=()=>change(()=>selected=[]);
$('reshuffle').onclick=()=>{question.options=shuffle(question.options);selected=[];resetSolution();feedback('已重新洗牌，請重新排列。');render();};
$('check').onclick=()=>{$('show-solution').hidden=false;if(selected.length!==question.answer.length)feedback('還沒排完喔，請把所有片段排好再檢查。','retry');else if(grade(question,selected))feedback('答對了！每個片段都回到正確的位置。','success');else feedback('順序還差一點，再想想看！可以調整排列，或查看正確答案。','retry');};
$('show-solution').onclick=()=>{$('solution-list').replaceChildren(...question.answer.map(s=>el('li',s.text)));$('solution').hidden=false;};
$('retry').onclick=()=>{selected=[];resetSolution();feedback('同一題，再試一次！');render();};
$('import').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>1024*1024)throw new Error('檔案超過 1 MB');const loaded=validateCatalog(JSON.parse(await file.text()));works=loaded;library=null;gradeSelection='all';$('grade-controls').hidden=true;collection=null;catalog();const units=works.flatMap(w=>w.children||[w]);$('import-status').textContent=`已載入 ${works.length} 個作品，可練習 ${units.filter(w=>w.playable).length} 個單位。重新整理後恢復內建資料。`;}catch(e){$('import-status').textContent=`匯入失敗：${e.message}，保留原題庫。`;}event.target.value='';};
try{library=await loadLibrary();works=library.works;setupGrades();catalog();}catch(e){$('error').textContent=`載入失敗：${e.message}。請透過本機 HTTP 伺服器開啟，勿直接雙擊 HTML。`;}
