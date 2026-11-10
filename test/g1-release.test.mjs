import {selectPermitCandidates,matchesPermitAnswer} from '../docs/g1-permit-candidates.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {validateG1Bank,createG1Session,currentG1Question,answerG1,nextG1,reviewG1,snapshotG1Session,restoreG1Session} from '../docs/g1-sounds-engine.mjs';const bank=JSON.parse(await readFile(new URL('../docs/data/g1-sounds.json',import.meta.url))),fixture=JSON.parse(await readFile(new URL('./fixtures/g1-first-batch.json',import.meta.url)));
test('正式95題、46圖49情境，原48題詞語與答案相容',()=>{
  validateG1Bank(bank);
  assert.equal(bank.entries.length,95);
  assert.equal(bank.entries.filter(q=>q.promptType==='IMAGE').length,46);
  assert.equal(bank.entries.filter(q=>q.promptType==='CONTEXT').length,49);
  assert(bank.entries.every(q=>q.status==='READY'&&q.sourceNumber!==78));
  const revisedContexts=new Set([4,13,28,30,42,76]);
  for(const old of fixture.entries){
    const question=bank.entries.find(q=>q.id===old.id);
    assert(question);
    for(const key of Object.keys(old)){
      if(key==='contextSentence'&&revisedContexts.has(question.sourceNumber)) continue;
      assert.deepEqual(question[key],old[key],question.word);
    }
  }
});
test('所有音節輕聲位置、全注音情境、圖片實體檔及無洩題文字',async()=>{for(const e of bank.entries){for(const key of ['correctOption','wrongOption','contextSentence'])assert(!/[ㄅ-ㄩ]˙/u.test(e[key]??''));if(e.promptType==='IMAGE'){const svg=await readFile(new URL('../docs/'+e.imagePath.slice(2),import.meta.url),'utf8');assert(!/<(?:text|foreignObject|image)\b|[\p{Script=Han}ㄅ-ㄩ]/u.test(svg));}else assert(!/[\p{Script=Han}]/u.test(e.contextSentence));}});
function finish(s,fn){while(s.phase==='question'){const q=currentG1Question(s);s=nextG1(answerG1(s,fn(q)));}return s;}
test('95題完整作答，錯題兩輪答對清零，不能重複作答或跳題',()=>{let s=createG1Session(bank);assert.throws(()=>nextG1(s));const id=s.queue[0];s=finish(s,q=>q.id===id?q.wrongOption:q.correctOption);assert.deepEqual(s.mistakes,{[id]:2});s=finish(reviewG1(s),q=>q.correctOption);assert.equal(s.mistakes[id],1);s=finish(reviewG1(s),q=>q.correctOption);assert.deepEqual(s.mistakes,{});assert.throws(()=>reviewG1(s));});
test('JSON存回後保留目前題、作答、選項、錯題與完成狀態',()=>{let s=createG1Session(bank);const q=currentG1Question(s);s.optionOrder={id:q.id,values:[q.wrongOption,q.correctOption]};s=answerG1(s,q.wrongOption);const saved=JSON.parse(JSON.stringify(snapshotG1Session(s))),r=restoreG1Session(bank,saved);assert.deepEqual(snapshotG1Session(r),saved);assert.throws(()=>answerG1(r,q.correctOption));const summary=finish(nextG1(r),q=>q.correctOption);assert.deepEqual(snapshotG1Session(restoreG1Session(bank,snapshotG1Session(summary))),snapshotG1Session(summary));});
test('原48題進度與錯題可還原至95題，原隊列不重抽',()=>{
  const legacy={...bank,entries:bank.entries.filter(q=>fixture.entries.some(old=>old.id===q.id))};
  assert.equal(legacy.entries.length,48);
  let session=createG1Session(legacy);
  const q=currentG1Question(session);
  session.optionOrder={id:q.id,values:[q.wrongOption,q.correctOption]};
  session=answerG1(session,q.wrongOption);
  const saved=snapshotG1Session(session);
  const restored=restoreG1Session(bank,saved);
  assert.deepEqual(snapshotG1Session(restored),saved);
  assert.equal(restored.mistakes[q.id],2);
  assert.equal(createG1Session(bank).queue.length,95);
});
test('不相容紀錄會拒絕還原，不自動刪除或重設',()=>{const saved=snapshotG1Session(createG1Session(bank));saved.queue[0]='unknown-id';assert.throws(()=>restoreG1Session(bank,saved));});

test('解鎖池從發布題篩選並排除同音、異寫與讀音變體',()=>{
  const pool=selectPermitCandidates(bank);
  assert.equal(pool.length,72);
  assert(pool.some(q=>q.sourceNumber===112));
  for(const number of [15,44,63,94,110,111,117]) assert(!pool.some(q=>q.sourceNumber===number));
  assert(matchesPermitAnswer('　爭先恐後 ','爭先恐後'));
  assert(!matchesPermitAnswer('爭先恐后','爭先恐後'));
});
