const tree=new URL(process.env.DIZIGUI_TEST_TREE==='local'?'../':'../docs/',import.meta.url);
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const {resolveLibrary,gradeWorks,allGradeWorks,authorDisplay}=await import(new URL("library.mjs",tree));
const {filterWorks}=await import(new URL("engine.mjs",tree));

const read=async file=>JSON.parse(await readFile(new URL('data/'+file,tree),'utf8'));
const library=resolveLibrary(await read('materials.json'),await read('curricula.json'),await read('publication.json'));
const source=await readFile(new URL('app.mjs',tree),'utf8');
function ui(search=''){
 const nodes=new Map();
 class E{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};}
  append(...n){this.children.push(...n);}replaceChildren(...n){this.children=[];this._text='';this.append(...n);}
  set textContent(t){this._text=String(t);this.children=[];}get textContent(){return (this._text??'')+this.children.map(n=>n.textContent).join('');}
  set value(v){this._value=String(v);}get value(){return this._value??'';}
  setAttribute(k,v){this[k]=v;}focus(){}
 }
 for(const id of ['grade-select','grade-controls','catalog','collection-back','list-title','grade-note','search','result-count','clear-search'])nodes.set(id,new E('div'));
 const c={document:{createElement:t=>new E(t)},$:id=>nodes.get(id),library,works:library.works,
  gradeSelection:'all',category:'all',collection:null,work:null,gradeWorks,allGradeWorks,authorDisplay,filterWorks,
  location:{search,assign:()=>{}},URLSearchParams,renderLunyuSelection:()=>{},selectedLunyuChildren:g=>g.children,updateCatalogDisclosure:()=>{}};
 const part=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i);assert.ok(i>=0&&j>i);return source.slice(i,j);};
 runInNewContext(part('function el(','\nfunction setupGrades(')+'\n'+part('function setupGrades(','\n$(\'grade-select\').onchange')+'\n'+part('function catalog(){','\nfunction resetSolution('),c);
 c.setupGrades();c.catalog();return {c,get:id=>nodes.get(id),ids:()=>nodes.get('catalog').children.map(n=>n.dataset.workId).filter(Boolean)};
}

test('未指定或無效年級預設全部年級，明確 G1／G3 仍直接選到指定年級（模擬介面）',()=>{
 for(const query of ['', '?grade=all','?grade=9']){
  const h=ui(query);assert.equal(h.c.gradeSelection,'all');
  assert.equal(h.get('grade-select').children.find(n=>n.value==='all').textContent,'全部年級');
  assert.equal(h.get('list-title').textContent,'全部年級作品');
 }
 for(const g of [1,3]){
  const h=ui('?grade='+g);assert.equal(h.c.gradeSelection,String(g));
  assert.deepEqual(h.ids(),gradeWorks(library,g).filter(w=>w.status!=='demo').map(w=>w.id));
 }
});

test('全部年級依 G1 至 G6 排列、共享作品不重複且保留各年級標示',()=>{
 const all=allGradeWorks(library),h=ui();
 assert.deepEqual(h.ids(),all.map(w=>w.id));assert.equal(new Set(all.map(w=>w.id)).size,all.length);
 const years=all.map(w=>w.catalogGrades[0]);assert.deepEqual(years,[...years].sort((a,b)=>a-b));
 assert.equal(all[0].id,'di-zi-gui');
 const lunyu=all.find(w=>w.id==='lunyu');assert.deepEqual(lunyu.catalogGrades,[3,5]);
 const row=h.get('catalog').children.find(n=>n.dataset.workId==='lunyu');
 assert.ok(row.textContent.includes('三年級、五年級'));
});

test('未列入前台開放清單、待確認、DEMO 及無可用內容的資料不進全部年級',()=>{
 const lib=structuredClone(library),template=lib.works.find(w=>w.id==='song-bie');
 const extra=[
  {...template,id:'unlisted-candidate',status:'verified',playable:true},
  {...template,id:'pending-candidate',status:'pending',playable:false},
  {...template,id:'demo-candidate',status:'demo',playable:true},
  {...template,id:'unusable-candidate',status:'verified',playable:false}
 ];
 lib.works.push(...extra);lib.frontWorks.push(...extra.slice(1));
 lib.publishedCurricula.push({grade:2,items:extra.map((w,order)=>({workId:w.id,order}))});
 const all=allGradeWorks(lib);assert.ok(extra.every(w=>!all.some(x=>x.id===w.id)));
});

test('全部年級搜尋、古詩／古文分類、清除與切換 G3 保留交集規則（模擬介面）',()=>{
 const h=ui(),all=allGradeWorks(library);
 for(const category of ['all','poem','prose'])for(const query of ['','弟子規','王維','論語','不存在的篇名']){
  h.c.category=category;h.get('search').value=query;h.c.catalog();
  assert.deepEqual(h.ids(),filterWorks(all,category,query).map(w=>w.id));
 }
 h.c.category='all';h.get('search').value='';h.c.catalog();assert.equal(h.get('clear-search').disabled,true);
 h.c.gradeSelection='3';h.c.catalog();assert.ok(!h.ids().includes('di-zi-gui'));
 assert.deepEqual(h.ids(),filterWorks(gradeWorks(library,3)).map(w=>w.id));
});

test('年級標示與排序只建立顯示副本，不改寫任何教材、對照或原始資料',()=>{
 const before=JSON.stringify(library);allGradeWorks(library);allGradeWorks(library);
 assert.equal(JSON.stringify(library),before);
});
