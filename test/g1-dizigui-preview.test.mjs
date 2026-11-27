const tree=new URL(process.env.DIZIGUI_TEST_TREE==='local'?'../':'../docs/',import.meta.url);
import test from 'node:test';
import assert from 'node:assert/strict';
const {previewCards,diziguiBank}=await import(new URL("g1-dizigui-preview-data.mjs",tree));
const {createPreviewState,createWordCard,mountPreview}=await import(new URL("g1-dizigui-preview.mjs",tree));

test('只建立教材前四個三字片段，12 字逐字注音與提供照片轉錄一致',()=>{
 assert.deepEqual(previewCards.map(c=>c.text),['弟子規','聖人訓','首孝弟','次謹信']);
 assert.deepEqual(previewCards.map(c=>c.readings),[
  ['ㄉㄧˋ','ㄗˇ','ㄍㄨㄟ'],['ㄕㄥˋ','ㄖㄣˊ','ㄒㄩㄣˋ'],
  ['ㄕㄡˇ','ㄒㄧㄠˋ','ㄊㄧˋ'],['ㄘˋ','ㄐㄧㄣˇ','ㄒㄧㄣˋ']
 ]);
 assert.equal(previewCards.reduce((n,c)=>n+[...c.text].length,0),12);
});

test('兩個弟依各自詞句標音，不以單字鍵值覆蓋',()=>{
 assert.equal(previewCards[0].readings[0],'ㄉㄧˋ');
 assert.equal(previewCards[2].readings[2],'ㄊㄧˋ');
});

test('出題洗牌 100 次：四片不重複、不遺漏，且不直接給正序',()=>{
 for(let i=0;i<100;i++){
  const s=createPreviewState(),q=s.question;
  assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(x=>x.id)).size,4);
  assert.deepEqual(q.options.map(x=>x.id).sort(),q.answer.map(x=>x.id).sort());
  assert.notDeepEqual(q.options.map(x=>x.id),q.answer.map(x=>x.id));
 }
});

test('正序判對、倒序判錯、未排完不判完成；答錯後可調整再判對',()=>{
 const s=createPreviewState(),ids=s.question.answer.map(x=>x.id);
 s.add(ids[1]);assert.equal(s.check(),'incomplete');
 for(const id of [ids[0],ids[2],ids[3]])s.add(id);
 assert.equal(s.check(),'incorrect');s.move(ids[0],-1);assert.equal(s.check(),'correct');
 s.clear();for(const id of [...ids].reverse())s.add(id);assert.equal(s.check(),'incorrect');
});

test('重複／不存在卡片不能加入，前後邊界安全，可移除後重新加入',()=>{
 const s=createPreviewState(),ids=s.question.answer.map(x=>x.id);
 assert.equal(s.add('missing'),false);assert.equal(s.add(ids[0]),true);assert.equal(s.add(ids[0]),false);
 assert.equal(s.move(ids[0],-1),false);assert.equal(s.move(ids[0],1),false);assert.equal(s.move(ids[0],2),false);
 s.add(ids[1]);assert.equal(s.move(ids[0],1),true);assert.deepEqual(s.selected,[ids[1],ids[0]]);
 s.remove(ids[0]);assert.deepEqual(s.selected,[ids[1]]);assert.equal(s.add(ids[0]),true);
});

test('重新洗牌清空排列、保留同一題與全部卡片，之後仍可答對',()=>{
 const s=createPreviewState();for(const p of s.question.answer)s.add(p.id);
 const before=s.question.options.map(x=>x.id);assert.equal(s.check(),'correct');
 s.reshuffle();assert.deepEqual(s.selected,[]);assert.equal(s.check(),'incomplete');
 assert.notDeepEqual(s.question.options.map(x=>x.id),before);
 for(const p of s.question.answer)s.add(p.id);assert.equal(s.check(),'correct');
});

function withDocument(fn){
 const original=globalThis.document,nodes=new Map();
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={};}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[];this._text='';this.append(...items);}
  set textContent(v){this._text=String(v);this.children=[];}
  get textContent(){return (this._text??'')+this.children.map(n=>n.textContent).join('');}
  setAttribute(k,v){this.attributes[k]=v;}
  focus(){}
 }
 for(const id of ['dizigui-answer','dizigui-options','dizigui-feedback','dizigui-check','dizigui-reshuffle','dizigui-clear',
  'dizigui-start','dizigui-settings','dizigui-practice','dizigui-summary','dizigui-progress','dizigui-next',
  'dizigui-score','dizigui-summary-title','dizigui-settings-title','dizigui-repeat','dizigui-reselect',
  'dizigui-select-all','dizigui-select-none','dizigui-range-status','dizigui-range-error',
  ...[1,2,3,4,5].map(n=>'dizigui-section-'+n)])nodes.set(id,new Element('div'));
 globalThis.document={createElement:t=>new Element(t),getElementById:id=>nodes.get(id)};
 try{return fn(nodes);}finally{globalThis.document=original;}
}

test('實際卡片 DOM：逐字旁置直式注音，聲調獨立，一聲不另加符號',()=>withDocument(()=>{
 const s=createPreviewState();let pairs=0;
 for(const segment of s.question.answer){
  const word=createWordCard(segment);assert.equal(word.children.length,3);
  for(const [i,pair] of word.children.entries()){
   assert.equal(pair.children[0].textContent,previewCards[segment.index].text[i]);
   const unit=pair.children[1],reading=previewCards[segment.index].readings[i];
   assert.equal(unit.dataset.reading,reading);
   const stack=unit.children[0],tones=stack.children.filter(n=>n.className.startsWith('g1-zy-tone'));
   assert.equal(tones.length,/[ˊˇˋ˙]/u.test(reading)?1:0);pairs++;
  }
 }
 assert.equal(pairs,12);
}));

test('實際按鈕事件：選取、移動、移除、判分、清空及洗牌皆可繼續操作（模擬介面）',()=>withDocument(nodes=>{
 const controller=mountPreview({bank:[diziguiBank[0]]}),get=id=>nodes.get(id);
 get('dizigui-start').onclick();
 const s=controller.round.state,ids=s.question.answer.map(x=>x.id);
 const click=id=>get('dizigui-options').children.find(n=>n.dataset.segmentId===id).onclick();
 click(ids[1]);click(ids[0]);click(ids[2]);click(ids[3]);get('dizigui-check').onclick();
 assert.ok(get('dizigui-feedback').className.includes('retry'));
 get('dizigui-answer').children[1].children[2].children[0].onclick();
 assert.deepEqual(s.selected,ids);get('dizigui-check').onclick();
 assert.ok(get('dizigui-feedback').textContent.includes('答對了'));
 get('dizigui-answer').children[0].children[2].children[2].onclick();assert.equal(s.selected.length,3);
 get('dizigui-reshuffle').onclick();assert.equal(s.selected.length,0);
 assert.equal(get('dizigui-options').children.length,4);
 for(const id of ids)click(id);get('dizigui-check').onclick();assert.equal(s.check(),'correct');
 get('dizigui-clear').onclick();assert.equal(s.selected.length,0);assert.equal(get('dizigui-clear').disabled,true);
}));
