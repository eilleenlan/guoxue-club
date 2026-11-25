import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolveLibrary,gradeWorks} from '../docs/library.mjs';
import {alignReadingZhuyin} from '../docs/reading-support.mjs';
import {createQuestion,grade,shuffle} from '../docs/engine.mjs';
import {renderLunyuSelection,selectedLunyuChildren} from '../docs/lunyu-selection.mjs';

const read=async name=>JSON.parse(await readFile(new URL('../docs/data/'+name,import.meta.url),'utf8'));
const materials=await read('materials.json');
const library=resolveLibrary(materials,await read('curricula.json'),await read('publication.json'));
const group=gradeWorks(library,3).find(w=>w.id==='lunyu');
const releaseBase='cd16f1355ca5e6c29685a631087b9592db645b5d';
const baseline=path=>execFileSync('git',['show',releaseBase+':'+path],{cwd:new URL('..',import.meta.url),encoding:'utf8'});

test('發布候選：G3/G5 共用 27 則、615 字注音、兩段對應及已確認文字',async()=>{
 assert.strictEqual(group.children,gradeWorks(library,5).find(w=>w.id==='lunyu').children);
 assert.deepEqual(group.children.map(w=>w.id),Array.from({length:27},(_,i)=>'lunyu-'+(i+1)));
 let count=0;
 for(const work of group.children){
  const d=await read('reading-'+work.id+'.json');
  assert.equal(work.readingSupport,true);assert.equal(d.workId,work.id);
  const aligned=alignReadingZhuyin(work.text,d);count+=aligned.filter(x=>x.reading).length;
  const white=d.schoolTranslation.textSource==='work.explanation'?[work.explanation]:d.schoolTranslation.paragraphs;
  assert.ok(white.every(Boolean));assert.ok(d.childExplanation.paragraphs.every(Boolean));
  assert.equal(d.childExplanation.paragraphs.length,work.id==='lunyu-4'?2:1);
  if(work.id==='lunyu-4'){assert.equal(white.length,2);assert.deepEqual(d.childExplanation.lineGroups,[1,1]);}
  if(['lunyu-2','lunyu-17'].includes(work.id)){
   assert.deepEqual(d.zhuyin.notes,[]);
   const [character,reading]=work.id==='lunyu-2'?['傳','ㄔㄨㄢˊ']:['夫','ㄈㄨˊ'];
   assert.equal(aligned.find(x=>x.text===character).reading,reading);
  }
 }
 assert.equal(count,615);
 assert.ok((await read('reading-lunyu-8.json')).schoolTranslation.paragraphs[0].includes('小人只懂的私利'));
 assert.ok((await read('reading-lunyu-9.json')).schoolTranslation.paragraphs[0].includes('骯髒'));
});

test('發布隔離：materials 僅新增 13 個閱讀入口，其他作品及考次維持發布基準',async()=>{
 const base=JSON.parse(baseline('docs/data/materials.json')),expected=structuredClone(base);
 for(const w of expected.works.find(w=>w.id==='lunyu').children.slice(0,13))w.readingSupport=true;
 assert.deepEqual(materials,expected);
 assert.deepEqual(await read('curricula.json'),JSON.parse(baseline('docs/data/curricula.json')));
 const files=await readdir(new URL('../docs/data/',import.meta.url));
 for(const work of gradeWorks(library,4).filter(w=>w.category==='poem')){
  assert.equal(Boolean(work.readingSupport),false);
  assert.ok(!files.includes('reading-'+work.id+'.json'));
 }
 const app=await readFile(new URL('../docs/app.mjs',import.meta.url),'utf8');
 assert.ok(!app.includes('本機教材驗收稿'));
 assert.ok(!app.includes("new URLSearchParams(location.search).get('reading-review')"));
 for(const match of app.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g))await readFile(new URL('../docs/'+match[1],import.meta.url));
});

test('候選排序引擎：27 則正序、錯序、清空及重新洗牌後可重答',()=>{
 for(const work of group.children){
  const q=createQuestion(work,2),ids=q.answer.map(x=>x.id);
  assert.ok(grade(q,ids));assert.ok(!grade(q,[...ids].reverse()));assert.ok(!grade(q,[]));
  q.options=shuffle(q.options);assert.ok(grade(q,ids));
  const retry=createQuestion(work,2);assert.ok(grade(retry,retry.answer.map(x=>x.id)));
 }
});

test('候選 G3/G5 自選：清除、非連續選章、全選及年級狀態互不影響（模擬介面）',()=>{
 const previous=globalThis.document,nodes=new Map();
 class E{
  constructor(){this.children=[];}
  set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}
  append(...items){this.children.push(...items);}remove(){}focus(){}
  before(n){nodes.set('current',n);}
 }
 nodes.set('catalog',new E());
 globalThis.document={createElement:()=>new E(),createTextNode:t=>({textContent:t}),getElementById:id=>nodes.get(id)};
 try{
  for(const g of [3,5]){
   const render=()=>renderLunyuSelection(group,115,g,render);render();
   nodes.get('current').children[1].children[1].onclick();
   assert.equal(selectedLunyuChildren(group,115,g).length,0);
   for(const n of [1,14,27]){const input=nodes.get('lunyu-choice-lunyu-'+n);input.checked=true;input.onchange();}
   assert.deepEqual(selectedLunyuChildren(group,115,g).map(w=>w.id),['lunyu-1','lunyu-14','lunyu-27']);
   assert.equal(selectedLunyuChildren(group,115,g===3?5:3).length,27);
   nodes.get('current').children[1].children[0].onclick();
   assert.equal(selectedLunyuChildren(group,115,g).length,27);
  }
 }finally{globalThis.document=previous;}
});
