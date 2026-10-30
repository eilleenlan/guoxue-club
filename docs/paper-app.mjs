import {validateCatalog,filterWorks,questionLimit} from './engine.mjs';
import {buildPaper} from './paper-engine.mjs';
import {planBook} from './paper-layout.mjs';
import {canvasMeasure,drawPage,renderPDF} from './paper-pdf.mjs';
const $=id=>document.getElementById(id);
let catalog=null,batch=null,books=null,urls=[],blobs=null,pageNumber=0,busy=false,downloadLinks=[];
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function selected(){return [...$('paper-units').querySelectorAll('input:checked')].map(input=>({workId:input.value,...(input.dataset.paragraph!==undefined?{paragraph:Number(input.dataset.paragraph),count:Number($('paper-count').value)}:{})}));}
function status(text){$('paper-status').textContent=text;}
function sync(){const count=selected().length;$('paper-selected').textContent=`已選 ${count} 個練習單元`;$('paper-generate').disabled=busy||count===0;$('paper-regenerate').disabled=busy||!batch||count===0;$('paper-units').inert=busy;$('paper-rounds').disabled=busy;}
function checkbox(work,title,parent,paragraph){const label=el('label'),input=el('input');input.type='checkbox';input.value=work.id;input.name='paper-unit';if(paragraph!==undefined)input.dataset.paragraph=paragraph;label.append(input,el('span',title));parent.append(label);}
async function load(){
  if(catalog)return;const response=await fetch('./data/materials.json');if(!response.ok)throw new Error('無法讀取教材');catalog=validateCatalog(await response.json());
  for(const work of filterWorks(catalog)){
    if(work.status==='demo')continue;
    if(work.children){
      const units=filterWorks(work.children),details=el('details'),summary=el('summary',`${work.title}｜個別選擇 ${units.length} 則`),list=el('div');list.className='paper-choices';
      units.forEach(w=>{checkbox(w,w.title,list);list.lastChild.querySelector('input').disabled=!(w.playable&&w.status==='verified');});
      const tools=el('div');tools.className='paper-range';const all=el('button','全選'),none=el('button','全不選'),from=el('select'),to=el('select'),apply=el('button','套用範圍（取代目前勾選）'),hint=el('p');hint.setAttribute('role','status');
      for(const [i,w] of units.entries())for(const select of [from,to]){const option=el('option',w.title);option.value=i+1;select.append(option);}
      to.value=units.length;const fromLabel=el('label','從第幾則 '),toLabel=el('label','到第幾則 ');fromLabel.append(from);toLabel.append(to);
      const changed=()=>list.dispatchEvent(new Event('change',{bubbles:true}));
      const replace=predicate=>{[...list.querySelectorAll('input')].forEach((input,i)=>input.checked=!input.disabled&&predicate(i+1));changed();};
      all.onclick=()=>replace(()=>true);none.onclick=()=>replace(()=>false);
      const validate=()=>{apply.disabled=Number(from.value)>Number(to.value);hint.textContent=apply.disabled?'起始則數不可大於結束則數。':'';};
      from.onchange=to.onchange=validate;apply.onclick=()=>{if(!apply.disabled)replace(n=>n>=Number(from.value)&&n<=Number(to.value));};
      tools.append(all,none,fromLabel,toLabel,apply,hint);details.append(summary,tools,list);$('paper-units').append(details);
    }
    else if(work.playable&&work.status==='verified'){
      const group=el('fieldset'),legend=el('legend',`${work.title}｜${work.author}`);group.append(legend);
      if(work.practiceMode==='random-contiguous'){
        const choices=el('div');choices.className='paper-choices';const paragraphs=[...new Set(work.segments.map(s=>s.paragraph))];paragraphs.forEach(p=>checkbox(work,`第${['一','二','三','四'][p]??p+1}段（${work.segments.filter(s=>s.paragraph===p).length}片段）`,choices,p));group.append(choices);
        const label=el('label','每個已選段落抽幾個連續片段？ '),select=el('select');select.id='paper-count';for(let n=2;n<=questionLimit(work);n++){const option=el('option',String(n));option.value=n;select.append(option);}select.value='4';label.append(select);group.append(label,el('p','短段容量不足時，只調整該題至本段全部片段；不跨段。'));
      }else checkbox(work,'全詩重組',group);
      $('paper-units').append(group);
    }
  }
  $('paper-units').addEventListener('change',()=>{sync();if(batch){$('paper-result').hidden=true;$('paper-downloads').hidden=true;release();books=null;status('選題已更新，請重新產生試卷；已隱藏舊預覽與下載，避免範圍不一致。');}});sync();
}
function release(){urls.forEach(URL.revokeObjectURL);urls=[];downloadLinks.forEach(a=>a.removeAttribute('href'));blobs=null;}
function drawPreview(){
  if(!books)return;const kind=$('paper-preview-kind').value,book=books[kind];pageNumber=Math.min(pageNumber,book.pages.length-1);
  drawPage(book.pages[pageNumber],$('paper-preview-canvas'));$('paper-page').textContent=`第 ${pageNumber+1} 頁／共 ${book.pages.length} 頁`;
  $('paper-prev').disabled=pageNumber===0;$('paper-next').disabled=pageNumber===book.pages.length-1;
}
function showIndex(){
  $('paper-index-body').replaceChildren();for(let i=0;i<batch.rounds.length;i++){const row=el('tr');const range=x=>x.start===x.end?String(x.start):`${x.start}–${x.end}`;row.append(el('th',`第 ${i+1} 回`),el('td',range(books.questions.index[i])),el('td',range(books.answers.index[i])));$('paper-index-body').append(row);}
}
async function generate(){
  if(busy)return;busy=true;sync();$('paper-downloads').hidden=true;$('paper-result').hidden=true;release();
  try{
    const candidate=buildPaper(catalog,{selections:selected(),rounds:Number($('paper-rounds').value),previous:batch});
    await document.fonts.ready;const measure=canvasMeasure(),planned={questions:planBook(candidate,'questions',measure),answers:planBook(candidate,'answers',measure)};
    const questionPDF=await renderPDF(planned.questions,(n,total)=>status(`產生題目卷 ${n}/${total} 頁…`));
    const answerPDF=await renderPDF(planned.answers,(n,total)=>status(`產生答案卷 ${n}/${total} 頁…`));
    batch=candidate;books=planned;blobs={questions:questionPDF,answers:answerPDF};
    for(const [id,kind,suffix] of [['paper-download-questions','questions','題目卷'],['paper-download-answers','answers','答案卷']]){const a=$(id),url=URL.createObjectURL(blobs[kind]);urls.push(url);a.href=url;a.download=`${batch.filenameBase}_${suffix}.pdf`;}
    $('paper-warnings').replaceChildren(...batch.warnings.map(w=>el('li',w)));
    $('paper-fixed').textContent=`已固定 ${batch.rounds.length} 回，每回 ${batch.rounds[0].questions.length} 題。預覽與下載共用這次結果，不會重新洗牌。`;
    $('paper-sizes').textContent=`題目卷 ${(questionPDF.size/1048576).toFixed(2)} MB；答案卷 ${(answerPDF.size/1048576).toFixed(2)} MB。`;
    pageNumber=0;$('paper-preview-kind').value='questions';showIndex();drawPreview();$('paper-result').hidden=false;$('paper-downloads').hidden=false;
    status('兩份 PDF 已完成，可分別下載。答案卷含正解，請由家長保管。');
  }catch(error){batch=null;books=null;status(`無法產生：${error.message}`);}finally{busy=false;sync();}
}
downloadLinks=[$('paper-download-questions'),$('paper-download-answers')];
$('open-paper').onclick=async()=>{$('home').hidden=true;$('paper').hidden=false;try{await load();$('paper-title').focus();}catch(e){status(e.message);}};
$('paper-back').onclick=()=>{$('paper').hidden=true;$('home').hidden=false;};
$('paper-generate').onclick=generate;$('paper-regenerate').onclick=generate;
$('paper-rounds').onchange=()=>{if(batch)status('回數已更動；請按產生試卷套用，下載仍是上次固定結果。');};
$('paper-preview-kind').onchange=()=>{pageNumber=0;drawPreview();};$('paper-prev').onclick=()=>{pageNumber--;drawPreview();};$('paper-next').onclick=()=>{pageNumber++;drawPreview();};
