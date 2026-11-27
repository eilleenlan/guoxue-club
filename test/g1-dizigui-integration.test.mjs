const tree=new URL(process.env.DIZIGUI_TEST_TREE==='local'?'../':'../docs/',import.meta.url);
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const {resolveLibrary,gradeWorks,authorDisplay}=await import(new URL("library.mjs",tree));
const {validateWork,createQuestion,filterWorks}=await import(new URL("engine.mjs",tree));
const {diziguiBank}=await import(new URL("g1-dizigui-preview-data.mjs",tree));

const read=async name=>JSON.parse(await readFile(new URL('data/'+name,tree),'utf8'));
const library=resolveLibrary(await read('materials.json'),await read('curricula.json'),await read('publication.json'));
const entry=library.works.find(w=>w.id==='di-zi-gui');

test('古詩古文 G1 分類引用單一弟子規入口，不複製教材及十題題庫',()=>{
 assert.equal(library.works.filter(w=>w.id==='di-zi-gui').length,1);
 assert.deepEqual(gradeWorks(library,1).map(w=>w.id),['di-zi-gui']);
 assert.ok(library.frontWorks.some(w=>w.id==='di-zi-gui'));
 assert.equal(entry.linkedPractice,true);assert.equal(entry.playable,false);
 assert.equal(entry.text,undefined);assert.equal(entry.children,undefined);
 assert.equal(entry.practiceHref,'./g1-dizigui-preview.html');
 assert.equal(filterWorks(gradeWorks(library,1),'prose','弟子規').length,1);
 assert.equal(filterWorks(gradeWorks(library,1),'poem').length,0);
 assert.equal(diziguiBank.length,10);assert.equal(diziguiBank.flatMap(q=>q.cards).flatMap(c=>c.readings).length,120);
});

test('獨立入口只接受本站相對 HTML，不誤進一般排序引擎',()=>{
 assert.equal(validateWork(entry).linkedPractice,true);
 assert.throws(()=>createQuestion(entry,4));
 for(const href of ['https://example.com/x.html','javascript:alert(1)','../x.html','/x.html','./x.js'])assert.throws(()=>validateWork({...entry,practiceHref:href}));
 assert.throws(()=>validateWork({...entry,text:'重複教材。'}));
});

test('其他年級入口不混入 G1；G3/G5 論語仍共用 27 則，G4 仍為 18 首',()=>{
 for(const g of [3,4,5,6])assert.ok(gradeWorks(library,g).every(w=>w.id!=='di-zi-gui'));
 const a=gradeWorks(library,3).find(w=>w.id==='lunyu'),b=gradeWorks(library,5).find(w=>w.id==='lunyu');
 assert.strictEqual(a.children,b.children);assert.equal(a.children.length,27);
 assert.equal(gradeWorks(library,4).filter(w=>w.category==='poem').length,18);
});

test('實際清單函式顯示一年級、篇名可點擊、練習按鈕導向同一頁（模擬介面）',async()=>{
 const source=await readFile(new URL('app.mjs',tree),'utf8');
 const nodes=new Map(),assigned=[];
 class E{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};}
  append(...n){this.children.push(...n);}replaceChildren(...n){this.children=[];this._text='';this.append(...n);}
  set textContent(t){this._text=String(t);this.children=[];}get textContent(){return (this._text??'')+this.children.map(n=>n.textContent).join('');}
  set value(v){this._value=String(v);}get value(){return this._value??'';}
  setAttribute(k,v){this[k]=v;}focus(){}
 }
 const ids=['grade-select','grade-controls','catalog','collection-back','list-title','grade-note','search','result-count','clear-search'];
 for(const id of ids)nodes.set(id,new E('div'));
 const context={document:{createElement:t=>new E(t)},$:id=>nodes.get(id),library,works:library.works,
  category:'all',collection:null,gradeSelection:'all',work:null,gradeWorks,authorDisplay,filterWorks,
  location:{search:'?grade=1',assign:p=>assigned.push(p)},URLSearchParams,
  renderLunyuSelection:()=>{},selectedLunyuChildren:g=>g.children,updateCatalogDisclosure:()=>{},
  rememberList:()=>{throw Error('不應進入一般練習');},start:()=>{throw Error('不應進入一般練習');}};
 function part(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);}
 runInNewContext(part('function el(','\nfunction setupGrades(')+'\n'+part('function setupGrades(','\n$(\'grade-select\').onchange')+'\n'+part('function catalog(){','\nfunction resetSolution('),context);
 context.setupGrades();context.catalog();
 assert.equal(context.gradeSelection,'1');
 assert.equal(nodes.get('grade-select').children.find(n=>n.value==='1').textContent,'一年級');
 assert.equal(nodes.get('list-title').textContent,'一年級作品');
 const cards=nodes.get('catalog').children;assert.equal(cards.length,1);
 const info=cards[0].children[0],link=info.children[0].children[0];
 assert.equal(link.textContent,'弟子規');assert.equal(link.href,entry.practiceHref);
 const button=cards[0].children[1].children[0];assert.equal(button.disabled,false);assert.equal(button.textContent,'開始練習');
 button.onclick();assert.deepEqual(assigned,[entry.practiceHref]);
 context.location.search='';context.setupGrades();assert.equal(context.gradeSelection,'all');
});

test('既有首頁仍連古詩古文；弟子規返回一年級清單，頁面無試排文案',async()=>{
 const index=await readFile(new URL('index.html',tree),'utf8');
 assert.ok(index.includes('href="./classics.html"'));
 const page=await readFile(new URL('g1-dizigui-preview.html',tree),'utf8');
 const back=page.match(/class="back-to-classics" href="([^"]+)"/);assert.equal(back?.[1],'classics.html?grade=1');
 await readFile(new URL(entry.practiceHref,tree));
 await readFile(new URL(back[1].split('?')[0],tree));
 assert.ok(!page.includes('試排'));assert.ok(!page.includes('開發測試'));
});
