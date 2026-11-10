import {selectPermitCandidates, matchesPermitAnswer} from './g1-permit-candidates.mjs';
import {g1ApprovedWords} from './g1-context-approved-words.mjs';
import {g1DifficultyLabel,g1Stage} from './g1-difficulty.mjs';
import {g1FinalWords} from './g1-context-final-words.mjs';
import {g1Batch2Words} from './g1-context-batch2-words.mjs';
import {createG1ZhuyinFlow} from './g1-zhuyin-display.mjs';
import {g1ContextWords} from './g1-context-words.mjs';
import {validateG1Bank,createG1Session,currentG1Question,optionsFor,answerG1,nextG1,reviewG1,snapshotG1Session,restoreG1Session} from './g1-sounds-engine.mjs';
const $=id=>document.getElementById(id),node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};let bank,session,savedSession=null,loadVersion=0,inspecting=false,roundStage=null;const storageKey='guoxue:g1-sounds:v1';const imageURLs=new Map();
let abandonedSession = null;
let abandonedRounds = [];

function writeProgress(current, metadata = {}) {
  localStorage.setItem(storageKey, JSON.stringify({
    ...snapshotG1Session(current), roundStage, abandonedRounds, ...metadata,
  }));
}
function remember(){if(inspecting)return;try{writeProgress(session);}catch{$('error').textContent='此瀏覽器無法保存進度，關閉頁面前請先完成練習。';}}
function showFeedback(q,buttons){for(const b of buttons){b.disabled=true;if(b.dataset.option===q.correctOption)b.classList.add('correct');else if(b.dataset.option===session.feedback.selected)b.classList.add('wrong');}const feedback=node('span',session.feedback.correct?'✅ 答對了！':'再試一次也沒關係。正確讀音是：');$('feedback').replaceChildren(feedback);if(!session.feedback.correct){const reading=createG1ZhuyinFlow(q.correctOption);reading.classList.add('answer-reading');$('feedback').append(reading);}$('wrong-count').textContent='待清零 '+Object.keys(session.mistakes).length+' 題';$('next').textContent=session.index===session.queue.length-1?'看本輪結果 →':'下一題 →';$('next').hidden=inspecting;if(inspecting)$('wrong-count').textContent='家長驗收';$('abandon-round').hidden=!unfinishedRound();}
function panels(active){for(const key of ['start','question','summary'])$(key+'-panel').hidden=key!==active;}
async function renderQuestion(){const version=++loadVersion,q=currentG1Question(session);panels('question');$('abandon-round').hidden=!unfinishedRound();$('inspect-back').hidden=!inspecting;$('progress').textContent=(session.roundKind==='first'?'第一輪':'錯題再練')+'｜'+(session.index+1)+'／'+session.queue.length;if(inspecting)$('progress').textContent='家長驗收｜第 '+q.sourceNumber+' 題';$('wrong-count').textContent=inspecting?'驗收作答':'待清零 '+Object.keys(session.mistakes).length+' 題';$('question-title').textContent=q.promptType==='IMAGE'?'🖼️ 看圖片，選讀音':'💬 讀短句，選讀音';$('question-title').textContent+='｜'+g1DifficultyLabel(q);$('prompt').replaceChildren();$('feedback').replaceChildren();$('next').hidden=true;const options=session.optionOrder?.id===q.id?session.optionOrder.values:optionsFor(q);session.optionOrder={id:q.id,values:options};remember();const buttons=options.map(option=>{const b=node('button');b.type='button';b.dataset.option=option;b.setAttribute('aria-label',option);b.append(createG1ZhuyinFlow(option));b.disabled=true;b.onclick=()=>{if(session.answered)return;session=answerG1(session,option);remember();showFeedback(q,buttons);};return b;});$('answers').replaceChildren(...buttons);
 try{if(q.promptType==='IMAGE'){let url=imageURLs.get(q.imagePath);if(!url){const r=await fetch(q.imagePath);if(!r.ok)throw Error('圖片讀取失敗');url=URL.createObjectURL(new Blob([await r.text()],{type:'image/svg+xml'}));imageURLs.set(q.imagePath,url);}const img=node('img');img.alt='請看圖片，選出正確讀音';img.src=url;await img.decode();if(version!==loadVersion)return;$('prompt').append(img);}else{const p=node('p');p.className='context';p.append(createG1ZhuyinFlow(q.contextSentence,{wordGroups:g1ApprovedWords[q.sourceNumber]??g1ContextWords[q.sourceNumber]??g1Batch2Words[q.sourceNumber]??g1FinalWords[q.sourceNumber]}));$('prompt').append(p);}if(version!==loadVersion)return;if(session.answered)showFeedback(q,buttons);else buttons.forEach(b=>b.disabled=false);$('question-title').focus({preventScroll:true});window.scrollTo(0,0);}catch(e){$('error').textContent='這題無法完整顯示，請重新整理後再試。'+e.message;}}
function matchesStage(question, stage) {
  return stage === 'MIXED' || g1Stage(question) === stage;
}

function newRound() {
  const value = $('round-size').value;
  const stage = $('stage').value;
  const next = createG1Session(bank, {
    limit: value === 'all' ? 'all' : Number(value),
    seenIds: abandonedSession?.seenIds ?? session?.seenIds ?? (session?.phase === 'summary' ? session.queue : []),
    includeQuestion: question => matchesStage(question, stage),
  });
  roundStage = stage;
  if (abandonedSession) {
    next.mistakes = { ...abandonedSession.mistakes };
    abandonedSession = null;
  }
  return next;
}
for(const id of ['round-size','summary-size'])$(id).onchange=()=>{const other=id==='round-size'?'summary-size':'round-size';$(other).value=$(id).value;};
for(const id of ['stage','summary-stage']) {
  $(id).onchange=()=>{ $(id==='stage'?'summary-stage':'stage').value=$(id).value; };
}

$('inspect-form').onsubmit=event=>{
  event.preventDefault();
  if(!bank)return;
  const input=$('inspect-number').value.trim();
  const number=Number(input);
  const question=bank.entries.find(q=>q.sourceNumber===number&&q.status==='READY');
  if(!/^\d+$/.test(input)||!question){
    $('inspect-status').textContent=/^\d+$/.test(input)&&number>=1&&number<=bank.sourceTotal?'這個題號目前暫緩，無法開啟。':'找不到這個題號。';
    return;
  }
  $('inspect-status').textContent='';
  inspecting=true;
  session=createG1Session(bank,{includeQuestion:q=>q.id===question.id});
  renderQuestion();
};

$('inspect-back').onclick=()=>{
  ++loadVersion;
  inspecting=false;
  session=null;
  $('error').textContent='';
  panels('start');
  $('inspect-number').focus();
};


let permitQuestion;
let permitCandidates = [];
let permitGranted = false;
let composing = false;
const dialog = $('abandon-dialog');
const permitInput = $('permit-answer');

function unfinishedRound() {
  const current = session ?? savedSession;
  if (inspecting || current?.phase !== 'question') return null;
  return current.answered && current.index === current.queue.length - 1 ? null : current;
}

function openAbandonDialog() {
  if (!unfinishedRound()) return;
  permitGranted = false;
  permitQuestion = null;
  $('permit-title').textContent = '放棄本輪';
  $('abandon-warning').hidden = false;
  $('permit-form').hidden = true;
  $('abandon-confirmation').hidden = true;
  $('abandon-error').textContent = '';
  $('apply-permit').disabled = permitCandidates.length === 0;
  $('permit-load-status').textContent = permitCandidates.length ? '' : '目前沒有可用的解鎖題，請繼續練習。';
  dialog.showModal();
  $('cancel-abandon').focus();
}
$('abandon-round').onclick = openAbandonDialog;
$('abandon-saved-round').onclick = openAbandonDialog;
$('cancel-abandon').onclick = () => dialog.close();
$('apply-permit').onclick = () => {
  if (!permitCandidates.length) return;
  permitQuestion = permitCandidates[Math.floor(Math.random() * permitCandidates.length)];
  $('permit-title').textContent = '🔐 逃跑許可證';
  $('permit-reading').replaceChildren(createG1ZhuyinFlow(permitQuestion.correctOption));
  $('abandon-warning').hidden = true;
  $('permit-form').hidden = false;
  $('permit-feedback').textContent = '';
  permitInput.value = '';
  permitInput.focus();
};
permitInput.addEventListener('compositionstart', () => { composing = true; });
permitInput.addEventListener('compositionend', () => { composing = false; });
dialog.addEventListener('close', () => { composing = false; permitGranted = false; });
$('permit-form').onsubmit = event => {
  event.preventDefault();
  if (composing || !dialog.open || !permitQuestion || permitGranted) return;
  if (!matchesPermitAnswer(permitInput.value, permitQuestion.word)) {
    $('permit-feedback').textContent = '詞語不符，請再試一次。';
    return;
  }
  permitGranted = true;
  $('permit-form').hidden = true;
  $('abandon-confirmation').hidden = false;
  $('cancel-abandon').focus();
};

$('confirm-abandon').onclick = () => {
  const current = unfinishedRound();
  if (!dialog.open || !permitGranted || !current) return;
  const archive = [...abandonedRounds, { ...snapshotG1Session(current), roundStage }];
  try {
    writeProgress(current, { roundAbandoned: true, abandonedRounds: archive });
  } catch {
    $('abandon-error').textContent = '無法保存本輪紀錄，請繼續原本的練習。';
    return;
  }
  abandonedRounds = archive;
  abandonedSession = current;
  savedSession = null;
  session = null;
  permitGranted = false;
  dialog.close();
  $('start').textContent = '開始練習 →';
  $('abandon-saved-round').hidden = true;
  $('stage').disabled = false;
  $('round-size').disabled = false;
  panels('start');
  $('bank-count').textContent = '本輪已結束，待練錯題已保留。請選擇下一輪。';
  $('stage').focus();
};

function summary(){++loadVersion;panels('summary');const pending=Object.keys(session.mistakes).length;$('summary-title').textContent=pending?'這一輪完成了！':'全部清零 🎉';$('summary-text').textContent=pending?'還有 '+pending+' 題要再練。錯題答對兩次才清零；每輪只練還沒清零的題目，清零後可開始新一輪。':'很棒！這次的題目都答對了。';$('review').hidden=!pending;$('restart').disabled=!!pending;$('summary-size').disabled=!!pending;$('summary-stage').disabled=!!pending;$('summary-title').focus();window.scrollTo(0,0);}
$('start').onclick=()=>{session=savedSession??newRound();if(!session.seenIds)session.seenIds=session.queue.slice(0,session.phase==='summary'?session.queue.length:session.index+Number(session.answered));savedSession=null;remember();session.phase==='summary'?summary():renderQuestion();};$('next').onclick=()=>{if(inspecting||!session.answered||session.phase!=='question')return;session=nextG1(session);remember();session.phase==='summary'?summary():renderQuestion();};$('review').onclick=()=>{session=reviewG1(session);session.optionOrder=null;remember();renderQuestion();};$('restart').onclick=()=>{if(Object.keys(session.mistakes).length)return;session=newRound();remember();renderQuestion();};
try{const r=await fetch('./data/g1-sounds.json');if(!r.ok)throw Error('來源資料無法讀取');bank=validateG1Bank(await r.json());
permitCandidates = selectPermitCandidates(bank);
const count=bank.entries.filter(e=>e.status==='READY').length;$('bank-count').textContent='本批 '+count+' 題・答錯會集中再練';for(const id of ['stage','summary-stage']){
  for(const option of $(id).options){
    const total=bank.entries.filter(q=>q.status==='READY'&&matchesStage(q,option.value)).length;
    option.textContent+='（'+total+' 題）';
    option.disabled=total===0;
  }
}
$('inspect-open').disabled=false;
const saved=localStorage.getItem(storageKey);if(saved){const snapshot=JSON.parse(saved);const restored=restoreG1Session(bank,snapshot);abandonedRounds=Array.isArray(snapshot.abandonedRounds)?snapshot.abandonedRounds:[];if(snapshot.roundAbandoned===true){abandonedSession=restored;$('bank-count').textContent+='・待練錯題已保留';}else{savedSession=restored;$('start').textContent='繼續上次練習 →';$('round-size').disabled=true;$('stage').disabled=true;const stages=new Set(bank.entries.filter(q=>savedSession.queue.includes(q.id)).map(g1Stage));roundStage=['IMAGE','CONTEXT','BOSS','MIXED'].includes(snapshot.roundStage)?snapshot.roundStage:stages.size===1?[...stages][0]:'MIXED';$('stage').value=$('summary-stage').value=roundStage;if(savedSession.roundLimit!==undefined){$('round-size').value=String(savedSession.roundLimit);$('summary-size').value=String(savedSession.roundLimit);}$('bank-count').textContent+='・已保留上次進度';}}$('abandon-saved-round').hidden=!unfinishedRound();$('start').disabled=false;}catch(e){$('error').textContent='無法開始練習：'+e.message;}
