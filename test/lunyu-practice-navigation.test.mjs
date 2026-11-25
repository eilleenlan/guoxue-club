import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {resolveLibrary,authorDisplay} from '../docs/library.mjs';
import {chapterNeighbors} from '../docs/learning-ui.mjs';
import {createQuestion,questionLimit} from '../docs/engine.mjs';

const read=async file=>JSON.parse(await readFile(new URL('../docs/data/'+file,import.meta.url),'utf8'));
const library=resolveLibrary(await read('materials.json'),await read('curricula.json'),await read('publication.json'));
const group=library.works.find(w=>w.id==='lunyu');
const sourcePaths=['../docs/app.mjs'];
if(existsSync(new URL('../app.mjs',import.meta.url)))sourcePaths.unshift('../app.mjs');
const sources=await Promise.all(sourcePaths.map(p=>readFile(new URL(p,import.meta.url),'utf8')));

function harness(source,grade,ids=['lunyu-1','lunyu-14','lunyu-27']){
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.hidden=false;}
  append(...nodes){for(let n of nodes){if(typeof n==='string')n={textContent:n};n.parent=this;this.children.push(n);}}
  replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
  set textContent(s){this.replaceChildren();this._text=String(s);}get textContent(){return (this._text??'')+this.children.map(n=>n.textContent).join('');}
  set value(v){this._value=String(v);}get value(){return this._value??'';}
  setAttribute(k,v){this[k]=v;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
  after(n){n.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,n);}
  querySelector(selector){return walk(this).find(n=>selector.startsWith('.')?n.className===selector.slice(1):n.tag===selector)??null;}
  focus(options){this.focusOptions=options;this.focused=true;}
  scrollIntoView(options){this.scrollOptions=options;}
 }
 const walk=n=>[n,...(n.children??[]).flatMap(walk)],root=new Element('main'),practice=new Element('section');practice.id='practice';root.append(practice);
 const get=id=>walk(root).find(n=>n.id===id)??null;
 for(const id of ['reading','home','work-title','author','mode','count-label','next','count','range-note','show-solution','solution','solution-list','feedback','answer','options','progress','clear','reading-start']){
  const n=new Element('div');n.id=id;practice.append(n);
 }
 const context={document:{createElement:t=>new Element(t)},$:get,works:[group],library,gradeSelection:String(grade),collection:group,listReturn:{id:ids[0]},work:null,question:null,selected:[],chapterNeighbors,createQuestion,questionLimit,authorDisplay,
  selectedLunyuChildren:g=>({...g,children:g.children.filter(w=>ids.includes(w.id))}).children,
  readWork:w=>{context.readTarget=w;}};
 function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
 const code=[extract('function chapterNavigation(','\nfunction el('),extract('function el(','\nfunction setupGrades('),extract('function resetSolution(','\nfunction readWork('),extract('function start(','\nfunction next('),extract('function next(','\nfunction feedback('),extract('function feedback(','\ndocument.querySelectorAll(')].join('\n');
 runInNewContext(code,context);
 const nav=position=>get('practice-chapter-nav'+(position==='bottom'?'-bottom':''));
 const button=(position,label)=>nav(position).children.find(n=>n.tag==='button'&&n.textContent===label);
 return {context,get,practice,nav,button,start:id=>context.start(group.children.find(w=>w.id===id))};
}

test('G3/G5 上下導覽遵守非連續選章順序、邊界及新標題定位（模擬介面）',()=>{
 for(const source of sources)for(const grade of [3,5])for(const position of ['top','bottom']){
  const h=harness(source,grade);h.start('lunyu-1');
  assert.equal(h.button(position,'上一則').disabled,true);
  assert.equal(h.button(position,'下一則').disabled,false);
  assert.equal(h.practice.children.at(-1),h.nav('bottom'));
  for(const id of ['lunyu-14','lunyu-27']){
   h.button(position,'下一則').onclick();assert.equal(h.context.work.id,id);
   assert.equal(h.nav('top').children[0].textContent,h.nav('bottom').children[0].textContent);
   assert.ok(h.nav('bottom').textContent.includes('已選 3 則'));
   assert.equal(h.get('work-title').scrollOptions.block,'start');
   assert.equal(h.context.selected.length,0);assert.equal(h.context.question.workId,id);
  }
  assert.equal(h.button(position,'下一則').disabled,true);
  h.button(position,'上一則').onclick();assert.equal(h.context.work.id,'lunyu-14');
  h.button(position,'上一則').onclick();assert.equal(h.context.work.id,'lunyu-1');
  assert.equal(h.button(position,'上一則').disabled,true);
 }
});

test('上下導覽共用未完成作答確認：取消保留、確認切換清空並建立新題',()=>{
 for(const source of sources)for(const grade of [3,5]){
  const h=harness(source,grade);h.start('lunyu-1');
  h.get('options').children[0].onclick();const oldQuestion=h.context.question;
  h.button('top','下一則').onclick();assert.ok(h.nav('top').querySelector('.chapter-confirm'));
  h.button('bottom','下一則').onclick();assert.equal(h.nav('top').querySelector('.chapter-confirm'),null);
  let confirm=h.nav('bottom').querySelector('.chapter-confirm');assert.ok(confirm);
  confirm.children.find(n=>n.textContent==='留在本則').onclick();
  assert.equal(h.context.work.id,'lunyu-1');assert.equal(h.context.question,oldQuestion);assert.equal(h.context.selected.length,1);
  h.button('bottom','下一則').onclick();confirm=h.nav('bottom').querySelector('.chapter-confirm');
  confirm.children.find(n=>n.textContent==='清空並切換').onclick();
  assert.equal(h.context.work.id,'lunyu-14');assert.equal(h.context.selected.length,0);
  assert.equal(h.context.question.workId,'lunyu-14');assert.equal(h.get('solution').hidden,true);
  assert.equal(h.get('show-solution').hidden,true);assert.equal(h.get('feedback').textContent,'');
  assert.equal(h.get('options').children.length,h.context.question.answer.length);
  assert.ok(h.get('options').children.every(n=>n.dataset.segmentId.startsWith('lunyu-14:')));
  h.get('options').children[0].onclick();assert.equal(h.context.selected.length,1);
 }
});

test('單選章句兩端停用；閱讀頁及其他作品不增加底部導覽',()=>{
 for(const source of sources){
  const h=harness(source,3,['lunyu-14']);h.start('lunyu-14');
  for(const pos of ['top','bottom'])for(const label of ['上一則','下一則'])assert.equal(h.button(pos,label).disabled,true);
  h.context.chapterNavigation(group.children[13],'reading');assert.equal(h.get('reading-chapter-nav-bottom'),null);
  const other={...group,id:'other-group'};h.context.works=[other];
  h.context.chapterNavigation(group.children[13],'practice');assert.equal(h.nav('bottom'),null);assert.ok(h.nav('top'));
 }
});
