import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/11228/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4187/docs/';
const lookup=new Map(JSON.parse(await readFile('docs/data/idiom-questions.json')).questions.map(q=>[q.questionId,q.answerId]));
const results=[];
try{for(const width of [1280,390,320]){
 const p=await browser.newPage({viewport:{width,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const grade of [5,6]){
  await p.goto(base+'idioms-unit.html');
  await p.locator('#grade-options button[data-grade="'+grade+'"]').click();
  await p.locator('#combined-courses input').last().waitFor();
  assert.equal(await p.locator('#lesson-options a').count(),6);
  assert(await p.locator('#combined-start').isDisabled());
  await p.locator('#combined-all').click();assert.equal(await p.locator('#combined-courses input:checked').count(),6);
  await p.locator('#combined-clear').click();assert.equal(await p.locator('#combined-courses input:checked').count(),0);
  await p.locator('#combined-all').click();
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('#combined-start').click();await p.locator('.question').last().waitFor();
  assert.equal(await p.locator('.question').count(),10);assert.equal(await p.locator('#idiom-options button').count(),12);
  assert.match(await p.locator('h1').innerText(),new RegExp('G'+grade+' 跨課'));
  const ids=await p.locator('.question').evaluateAll(ns=>ns.map(n=>n.dataset.exampleId));
  for(let i=0;i<ids.length;i++){await p.locator('[data-idiom-id="'+lookup.get(ids[i])+'"]').click();await p.getByRole('button',{name:'第'+(i+1)+'題答案格',exact:true}).click();}
  await p.locator('#check-all').click();assert.match(await p.locator('#idiom-result').innerText(),/10／10/);
  await p.locator('#new-round').click();assert.match(await p.locator('#idiom-progress').innerText(),/已填 0／10/);
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert(await p.locator('#idiom-scroll').evaluate(n=>n.clientHeight>=190));
 }
 for(const [path,count,options] of [['idioms-g5-l3.html',4,6],['idioms-g5-l2.html',10,12],['idioms-g6-l5.html',12,14]]){
  await p.goto(base+path);await p.locator('.question').last().waitFor();
  assert.equal(await p.locator('.question').count(),count);assert.equal(await p.locator('#idiom-options button').count(),options);
 }
 await p.goto(base+'idioms.html?mode=combined&grade=5&lesson=115:6:L1');
 await p.locator('#idiom-message').filter({hasText:'無法載入'}).waitFor();assert.equal(await p.locator('.question').count(),0);
 assert.deepEqual(errors,[]);results.push({width,passed:true,combinedGrades:[5,6],singleCourses:3});await p.close();
}await writeFile('test-results/idiom-combined-browser.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
