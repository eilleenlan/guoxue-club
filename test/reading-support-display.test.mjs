import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const tree=new URL(process.env.LUNYU_TEST_TREE==='local'?'../':'../docs/',import.meta.url);
const {renderReadingSupport}=await import(new URL('reading-support.mjs',tree));
const {resolveLibrary,gradeWorks}=await import(new URL('library.mjs',tree));

// Exercise the real renderer and change handlers without claiming browser layout coverage.
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.hidden=false;this.dataset={};this.attributes={};this.classes=new Set();this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),toggle:(v,on)=>on?this.classes.add(v):this.classes.delete(v)};}
 append(...nodes){for(let n of nodes){if(typeof n==='string')n={textContent:n};n.parentElement=this;this.children.push(n);}}
 replaceChildren(...nodes){for(const n of this.children)n.parentElement=null;this.children=[];this.append(...nodes);}
 set textContent(text){this.replaceChildren();this._text=String(text);}
 get textContent(){return (this._text??'')+this.children.map(n=>n.textContent).join('');}
 set value(v){this._value=v;}
 get value(){return this._value??(this.tagName==='select'?this.children[0]?.value:'');}
 get childElementCount(){return this.children.filter(n=>n instanceof Element).length;}
 get isConnected(){return Boolean(this.parentElement);}
 get hash(){return this.href?.slice(this.href.indexOf('#'));}
 setAttribute(k,v){this.attributes[k]=v;}
 before(n){const p=this.parentElement;n.parentElement=p;p.children.splice(p.children.indexOf(this),0,n);}
 after(n){const p=this.parentElement;n.parentElement=p;p.children.splice(p.children.indexOf(this)+1,0,n);}
 focus(){this.focused=true;}
 scrollIntoView(){this.scrolled=true;}
}
function descendants(root){return [root,...root.children.flatMap(n=>n instanceof Element?descendants(n):[])];}
const read=async name=>JSON.parse(await readFile(new URL('data/'+name,tree),'utf8'));

test('G3/G5 27 則：空備註無區塊，非空備註獨立於注音，內部狀態不顯示',async()=>{
 const previousDocument=globalThis.document,previousFetch=globalThis.fetch;
 const root=new Element('main');
 for(const id of ['reading-title','reading-author','full-text','reading-explanation','reading-material-notes']){const n=new Element('div');n.id=id;root.append(n);}
 const byId=id=>descendants(root).find(n=>n.id===id)??null;
 globalThis.document={createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),getElementById:byId};
 globalThis.fetch=async url=>({ok:true,json:()=>read(new URL(url).pathname.split('/').at(-1))});
 try{
  const library=resolveLibrary(await read('materials.json'),await read('curricula.json'),await read('publication.json'));
  const third=gradeWorks(library,3).find(w=>w.id==='lunyu');
  assert.strictEqual(third.children,gradeWorks(library,5).find(w=>w.id==='lunyu').children);
  let withNotes=0,withoutNotes=0;
  for(const grade of [3,5])for(const work of gradeWorks(library,grade).find(w=>w.id==='lunyu').children){
   byId('reading-title').textContent=work.title;byId('reading-author').textContent=work.author;
   await renderReadingSupport(work);
   const data=await read('reading-'+work.id+'.json');
   const expected=(data.zhuyin?.notes??data.pronunciationNotes??[]).filter(n=>n?.text?.trim()).length;
   const content=byId('reading-support'),notes=byId('reading-pronunciation-notes');
   assert.equal(content.hidden,!expected,work.id);
   assert.equal(content.childElementCount,expected?1:0,work.id);
   const controls=byId('reading-support-controls');
   const status=controls.children.find(n=>n.attributes?.role==='status');
   assert.equal(status.hidden,true);assert.equal(status.textContent,'');
   const selects=descendants(controls).filter(n=>n.tagName==='select');
   assert.equal(selects[1].value,'schoolTranslation');
   selects[0].value='parallel';selects[0].onchange();
   selects[1].value='childExplanation';selects[1].onchange();
   assert.equal(byId('full-text').children.filter(n=>n.tagName==='details').length,work.id==='lunyu-4'?2:1);
   const toggle=byId('show-reading-zhuyin');
   for(const checked of [true,false]){toggle.checked=checked;toggle.onchange();assert.equal(content.hidden,!expected);}
   if(expected){
    withNotes++;assert.equal(notes.children[1].children.length,expected);
    const marker=descendants(byId('full-text')).find(n=>n.className==='reading-note-marker');
    assert.ok(marker,work.id);marker.onclick({preventDefault(){}});
    assert.equal(notes.open,true);
    const item=descendants(notes).find(n=>n.id===marker.href.slice(1));
    const back=item.children.find(n=>n.className==='reading-note-return');
    back.onclick({preventDefault(){}});assert.equal(marker.focused,true);
    assert.equal(selects[0].value,'parallel');assert.equal(selects[1].value,'childExplanation');
   }else{withoutNotes++;assert.equal(notes,null);}
  }
  assert.equal(withNotes,0);assert.equal(withoutNotes,54);
  // Independent fixture: never add notes back into the textbook to exercise links.
  for(const grade of [3,5]){
   const fixture={workId:'test-notes-'+grade,pronunciationNotes:[
    {character:'傳',text:'「傳」讀 ㄔㄨㄢˊ。'},
    {character:'夫',text:'「夫」讀 ㄈㄨˊ。'}
   ]};
   globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(fixture)});
   byId('reading-title').textContent='測試用章句';byId('reading-author').textContent='';
   await renderReadingSupport({id:fixture.workId,text:'傳夫',readingSupport:true});
   const content=byId('reading-support'),notes=byId('reading-pronunciation-notes');
   assert.equal(content.hidden,false);assert.equal(notes.children[1].children.length,2);
   notes.open=true;assert.equal(notes.open,true);
   notes.open=false;assert.equal(notes.open,false);
   for(const marker of descendants(byId('full-text')).filter(n=>n.className==='reading-note-marker')){
    marker.onclick({preventDefault(){}});assert.equal(notes.open,true);
    const item=byId(marker.href.slice(1)),back=item.children.find(n=>n.className==='reading-note-return');
    back.onclick({preventDefault(){}});assert.equal(marker.focused,true);
    notes.open=false;
   }
   const toggle=byId('show-reading-zhuyin');toggle.checked=false;toggle.onchange();
   assert.equal(content.hidden,false);
   // Switching from fixture notes to an actual empty chapter removes the frame.
   globalThis.fetch=async url=>({ok:true,json:()=>read(new URL(url).pathname.split('/').at(-1))});
   await renderReadingSupport(gradeWorks(library,grade).find(w=>w.id==='lunyu').children[1]);
   assert.equal(byId('reading-support').hidden,true);
   assert.equal(byId('reading-pronunciation-notes'),null);
  }
  // Empty strings and whitespace must not create an empty frame either.
  globalThis.fetch=async()=>({ok:true,json:async()=>({workId:'blank-notes',pronunciationNotes:[{text:''},{text:'  '}],pendingContent:['v1.0 內部進度']})});
  await renderReadingSupport({id:'blank-notes',text:'原文',readingSupport:true});
  assert.equal(byId('reading-support').hidden,true);
  assert.equal(byId('reading-support').childElementCount,0);
 }finally{globalThis.document=previousDocument;globalThis.fetch=previousFetch;}
});
