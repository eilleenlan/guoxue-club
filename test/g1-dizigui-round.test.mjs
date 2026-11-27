const tree=new URL(process.env.DIZIGUI_TEST_TREE==='local'?'../':'../docs/',import.meta.url);
import test from 'node:test';
import assert from 'node:assert/strict';
const {diziguiBank,sourceQuestions,textbookImageSources}=await import(new URL("g1-dizigui-preview-data.mjs",tree));
const {splitG1Zhuyin}=await import(new URL("g1-zhuyin-display.mjs",tree));
const {drawRound,createDiziguiRound,createPreviewState}=await import(new URL("g1-dizigui-round.mjs",tree));
const {mountPreview,createWordCard}=await import(new URL("g1-dizigui-preview.mjs",tree));

// 正常回合及介面測試使用完整真實教材；缺少來源的案例另建測試副本。
const fixtureBank=diziguiBank;
const randomSeed=()=>{let seed=173;return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};};

test('五段各兩題，十題文字保留汎、凊、反等教材原字',()=>{
 assert.equal(diziguiBank.length,10);assert.equal(new Set(diziguiBank.map(q=>q.id)).size,10);
 for(const n of [1,2,3,4,5])assert.equal(diziguiBank.filter(q=>q.section===n).length,2);
 assert.deepEqual(diziguiBank.map(q=>q.cards.map(c=>c.text).join('／')),[
  '弟子規／聖人訓／首孝弟／次謹信','汎愛眾／而親仁／有餘力／則學文',
  '父母呼／應勿緩／父母命／行勿懶','父母教／須敬聽／父母責／須順承',
  '冬則溫／夏則凊／晨則省／昏則定','出必告／反必面／居有常／業無變',
  '事雖小／勿擅為／苟擅為／子道虧','物雖小／勿私藏／苟私藏／親心傷',
  '親所好／力為具／親所惡／謹為去','身有傷／貽親憂／德有傷／貽親羞'
 ]);
});

test('五張教材來源可追溯，120 字逐字對應；未確認字保留空值及疑點，不冒充已核對',()=>{
 assert.equal(Object.keys(textbookImageSources).length,5);
 let count=0,missing=0;
 for(const q of diziguiBank)for(const c of q.cards){
  assert.equal(c.text.length,3);assert.equal(c.readings.length,3);
  for(const reading of c.readings){count++;if(reading===null){missing++;assert.ok(sourceQuestions.some(item=>item.question===q.number));assert.notEqual(q.sourceStatus,'textbook-transcribed');}else splitG1Zhuyin(reading);}
 }
 assert.equal(count,120);assert.equal(missing,sourceQuestions.length);
 assert.equal(missing,0);assert.ok(diziguiBank.every(q=>q.sourceStatus==='textbook-transcribed'));
});

test('本批可辨識的多音字依照片區分，使用真實教材資料完成已核對範圍回合',()=>{
 assert.equal(diziguiBank[2].cards[1].readings[0],'ㄧㄥˋ');
 assert.equal(diziguiBank[4].cards[2].readings[2],'ㄒㄧㄥˇ');
 assert.equal(diziguiBank[4].cards[1].text,'夏則凊');assert.equal(diziguiBank[4].cards[1].readings[2],'ㄐㄧㄥˋ');
 assert.equal(diziguiBank[6].cards[1].readings[2],'ㄨㄟˊ');
 assert.equal(diziguiBank[8].cards[0].readings[2],'ㄏㄠˋ');
 assert.equal(diziguiBank[8].cards[1].readings[1],'ㄨㄟˋ');
 assert.equal(diziguiBank[8].cards[2].readings[2],'ㄨˋ');
 const round=createDiziguiRound([1,2,3,4,5]);assert.equal(round.total,5);
 while(!round.finished){for(const card of round.state.question.answer)round.state.add(card.id);assert.equal(round.check(),'correct');round.advance();}
 assert.equal(round.score,5);
});

test('全選十題抽五題，100 回合不重複、不漏出題資格且題序有變化',()=>{
 const random=randomSeed(),seen=new Set(),orders=new Set();
 for(let i=0;i<100;i++){
  const round=drawRound([1,2,3,4,5],{random});assert.equal(round.length,5);
  assert.equal(new Set(round.map(q=>q.id)).size,5);round.forEach(q=>seen.add(q.id));orders.add(round.map(q=>q.id).join(','));
 }
 assert.equal(seen.size,10);assert.ok(orders.size>1);
});

test('單段出兩題，題序不是永遠反序；跨段只抽指定段落，少於五題全出',()=>{
 for(const n of [1,2,3,4,5])assert.equal(drawRound([n]).length,2);
 assert.notDeepEqual(drawRound([1],{random:()=>0}).map(q=>q.id),drawRound([1],{random:()=>.999}).map(q=>q.id));
 for(let i=0;i<50;i++){
  const five=drawRound([1,3,5]);assert.equal(five.length,5);assert.ok(five.every(q=>[1,3,5].includes(q.section)));
  const four=drawRound([2,4]);assert.equal(four.length,4);assert.ok(four.every(q=>[2,4].includes(q.section)));
 }
 assert.throws(()=>drawRound([]),/至少一段/);assert.throws(()=>drawRound([6]),/範圍/);
});

test('缺教材注音時阻止開始，不以已抽中的題目僥倖略過來源核對',()=>{
 for(const n of [1,2])assert.equal(diziguiBank[n-1].sourceStatus,'textbook-transcribed');
 for(const q of diziguiBank.filter(q=>q.sourceStatus==='awaiting-source'))assert.ok(q.cards.every(c=>c.readings===null));
 const missingFixture=fixtureBank.map(q=>q.number===3?{...q,sourceStatus:'awaiting-source',cards:q.cards.map(c=>({...c,readings:null}))}:q);
 assert.throws(()=>createDiziguiRound([1,2,3,4,5],{bank:missingFixture,random:()=>.999}),/還缺教材注音/);
 assert.equal(createDiziguiRound([1]).total,2);
});

test('十題分別使用共用排序判分，不混入其他題的片段',()=>{
 for(const entry of diziguiBank){
  const s=createPreviewState(Math.random,entry),ids=s.question.answer.map(c=>c.id);
  assert.equal(ids.length,4);assert.ok(s.question.options.every(c=>c.id.startsWith(entry.id+':')));
  for(const id of [...ids].reverse())s.add(id);assert.equal(s.check(),'incorrect');
  s.clear();for(const id of ids)s.add(id);assert.equal(s.check(),'correct');
 }
});

test('必須檢查答對才能前進，改動或洗牌會撤銷通關，最後一次才結算',()=>{
 const round=createDiziguiRound([1],{random:()=>.999});
 assert.equal(round.advance(),false);assert.equal(round.check(),'incomplete');
 const ids=round.state.question.answer.map(x=>x.id);
 for(const id of ids)round.state.add(id);assert.equal(round.advance(),false);
 assert.equal(round.check(),'correct');assert.equal(round.canAdvance,true);
 round.state.move(ids[0],1);assert.equal(round.canAdvance,false);assert.equal(round.check(),'incorrect');
 round.state.move(ids[0],-1);round.check();round.state.reshuffle();assert.equal(round.canAdvance,false);
 for(const id of ids)round.state.add(id);round.check();assert.equal(round.advance(),true);
 assert.equal(round.position,2);assert.equal(round.score,1);assert.equal(round.state.selected.length,0);
 for(const s of round.state.question.answer)round.state.add(s.id);round.check();round.advance();
 assert.equal(round.finished,true);assert.equal(round.score,2);assert.equal(round.advance(),false);assert.equal(round.score,2);
});

test('新回合重新從完整教材範圍抽題，上一回合已答對的題仍有資格',()=>{
 const options={bank:fixtureBank,random:()=>.999},sections=[1,2,3,4,5];
 const first=createDiziguiRound(sections,options);
 while(!first.finished){for(const p of first.state.question.answer)first.state.add(p.id);first.check();first.advance();}
 assert.equal(first.score,5);
 const second=createDiziguiRound(sections,options);
 assert.deepEqual(second.entries.map(q=>q.id),first.entries.map(q=>q.id));assert.equal(second.score,0);assert.equal(second.position,1);
});

function domTest(fn){
 const previous=globalThis.document,nodes=new Map();
 class E{
  constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.dataset={};}
  append(...n){this.children.push(...n);}replaceChildren(...n){this.children=[];this._text='';this.append(...n);}
  set textContent(t){this._text=String(t);this.children=[];}get textContent(){return (this._text??'')+this.children.map(n=>n.textContent).join('');}
  setAttribute(k,v){this.attributes[k]=v;}focus(){}
 }
 const ids=['answer','options','feedback','check','reshuffle','clear','start','settings','practice','summary','progress','next','score','summary-title','settings-title','repeat','reselect','select-all','select-none','range-status','range-error',...[1,2,3,4,5].map(n=>'section-'+n)];
 for(const id of ids)nodes.set('dizigui-'+id,new E('div'));
 globalThis.document={createElement:t=>new E(t),getElementById:id=>nodes.get(id)};
 try{return fn(id=>nodes.get('dizigui-'+id));}finally{globalThis.document=previous;}
}

test('十題共 120 字實際卡片 DOM 均對齊教材注音，含各聲調及一聲無額外符號（模擬介面）',()=>domTest(()=>{
 let characters=0;
 for(const entry of diziguiBank){
  const state=createPreviewState(Math.random,entry);
  for(const segment of state.question.answer){
   const card=createWordCard(segment,entry),source=entry.cards[segment.index];
   assert.equal(card.children.length,3);
   for(const [index,pair] of card.children.entries()){
    assert.equal(pair.children[0].textContent,source.text[index]);
    const unit=pair.children[1],reading=source.readings[index];
    assert.equal(unit.dataset.reading,reading);
    const tones=unit.children[0].children.filter(n=>n.className.startsWith('g1-zy-tone'));
    assert.equal(tones.length,/[ˊˇˋ˙]/u.test(reading)?1:0);characters++;
   }
  }
 }
 assert.equal(characters,120);
}));

test('範圍 UI：預設全選、清空阻止開始、跨段複選及全選（模擬介面）',()=>domTest(get=>{
 const app=mountPreview({bank:fixtureBank,random:()=>.999});
 assert.ok([1,2,3,4,5].every(n=>get('section-'+n).checked));
 get('select-none').onclick();assert.equal(get('start').disabled,true);assert.ok(get('range-status').textContent.includes('至少一段'));
 get('start').onclick();assert.equal(app.round,null);
 for(const n of [1,3,5]){get('section-'+n).checked=true;get('section-'+n).onchange();}
 get('start').onclick();assert.equal(app.round.total,5);assert.ok(app.round.entries.every(q=>[1,3,5].includes(q.section)));
 get('select-all').onclick();assert.ok([1,2,3,4,5].every(n=>get('section-'+n).checked));
}));

test('回合 UI：逐題檢查、進度、結算、再練及重新選範圍（模擬介面）',()=>domTest(get=>{
 const app=mountPreview({bank:fixtureBank,random:()=>.999});get('start').onclick();
 assert.equal(get('progress').textContent,'第 1／5 題');assert.equal(get('next').disabled,true);
 for(let i=0;i<5;i++){
  const state=app.round.state;
  for(const card of state.question.answer)get('options').children.find(b=>b.dataset.segmentId===card.id).onclick();
  assert.equal(get('next').disabled,true);get('check').onclick();assert.equal(get('next').disabled,false);
  get('next').onclick();
 }
 assert.equal(get('summary').hidden,false);assert.equal(get('practice').hidden,true);assert.equal(get('score').textContent,'本回合答對 5／5 題。');
 get('repeat').onclick();assert.equal(app.round.position,1);assert.equal(app.round.score,0);assert.equal(get('summary').hidden,true);
 for(let i=0;i<5;i++){for(const c of app.round.state.question.answer)get('options').children.find(b=>b.dataset.segmentId===c.id).onclick();get('check').onclick();get('next').onclick();}
 get('reselect').onclick();assert.equal(app.round,null);assert.equal(get('settings').hidden,false);
}));
