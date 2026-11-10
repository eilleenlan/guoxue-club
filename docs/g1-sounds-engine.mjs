export const shuffled=(items,random=Math.random)=>{const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
const syllable=/^(?:˙[ㄅ-ㄩ]+|[ㄅ-ㄩ]+[ˊˇˋ]?)$/;
export function validateG1Bank(bank){
 const published=bank.releaseStatus==='published';
 if(bank.schemaVersion!==1||!Array.isArray(bank.entries)||(published?(bank.sourceTotal!==120||!bank.entries.length||bank.entries.length>120||bank.entries.some(e=>e.status!=='READY')):bank.entries.length!==120))throw Error('來源母庫或正式題庫範圍不符');
 const ids=new Set(),numbers=new Set();for(const e of bank.entries){if(!e.id||ids.has(e.id)||numbers.has(e.sourceNumber)||!Number.isInteger(e.sourceNumber)||e.sourceNumber<1||e.sourceNumber>120)throw Error('來源編號或ID重複');ids.add(e.id);numbers.add(e.sourceNumber);if(!['READY','HOLD','REVIEW'].includes(e.status))throw Error('來源狀態錯誤');if(e.status!=='READY')continue;
 if(e.sourceReview?.status==='needs-human-confirmation'||!e.sourceZhuyin||e.correctOption!==e.sourceZhuyin)throw Error('來源未確認或正確答案不符');
 const correct=e.correctOption.split(' '),wrong=e.wrongOption?.split(' ')??[];if(correct.length!==[...e.word].length||wrong.length!==correct.length||[...correct,...wrong].some(s=>!syllable.test(s))||e.correctOption===e.wrongOption)throw Error('答案須為完整音節');
 if(e.contextSentence&&/[ㄅ-ㄩ]˙/u.test(e.contextSentence))throw Error('輕聲須放在音節前方');
 if(!e.contentReview?.distractorRationale||!e.bossType||e.familiarity!=='FAMILIAR')throw Error('缺少辨音依據與熟悉度');
 if(e.promptType==='CONTEXT'){if(!e.contextSentence||e.contextSentence.split('＿＿＿＿').length!==2||/[\p{Script=Han}]/u.test(e.contextSentence)||e.imagePath)throw Error('情境須為全注音且僅一個填空');}
 else if(e.promptType==='IMAGE'){if(!/^\.\/assets\/g1\/[a-z-]+\.svg$/.test(e.imagePath??'')||!e.imagePrompt||e.contextSentence)throw Error('圖片提示缺漏');}
 else throw Error('READY題型不正確');
 }return bank;
}
export function createG1Session(bank,{random=Math.random,limit=null,seenIds=[],includeQuestion=()=>true}={}){validateG1Bank(bank);const ready=bank.entries.filter(e=>e.status==='READY'&&includeQuestion(e));if(!ready.length)throw Error('尚無可練習題目');if(limit!==null&&limit!=='all'&&(!Number.isInteger(limit)||limit<1))throw Error('題數設定不符');const seen=new Set(seenIds),ids=ready.map(e=>e.id);const queue=limit===null?shuffled(ids,random):[...shuffled(ids.filter(id=>!seen.has(id)),random),...shuffled(ids.filter(id=>seen.has(id)),random)].slice(0,limit==='all'?ids.length:Math.min(limit,ids.length));return{bank,random,phase:'question',roundKind:'first',roundNumber:1,queue,index:0,answered:false,feedback:null,mistakes:{},attempts:0,correctAttempts:0,...(limit!==null?{roundLimit:limit,seenIds:[...seen].filter(id=>ids.includes(id))}:{})};}
// 已開始的舊回合保留當時選項；新回合只抽最新核准選項。
function questionVersion(q,order){const history=q?.optionHistory?.find(h=>order?.id===q.id&&order.values?.length===2&&order.values.includes(h.correctOption)&&order.values.includes(h.wrongOption));return history?{...q,wrongOption:history.wrongOption}:q;}
export function currentG1Question(session){if(session.phase!=='question')return null;return questionVersion(session.bank.entries.find(e=>e.id===session.queue[session.index]),session.optionOrder);}
export function optionsFor(question,random=Math.random){return shuffled([question.correctOption,question.wrongOption],random);}
export function answerG1(session,selected){const q=currentG1Question(session);if(!q||session.answered)throw Error('此題已作答或尚未開始');if(![q.correctOption,q.wrongOption].includes(selected))throw Error('選項不屬於本題');const correct=selected===q.correctOption,mistakes={...session.mistakes};if(!correct)mistakes[q.id]=2;else if(session.roundKind==='review'&&mistakes[q.id]){mistakes[q.id]--;if(mistakes[q.id]===0)delete mistakes[q.id];}return{...session,...(session.seenIds?{seenIds:[...new Set([...session.seenIds,q.id])]}:{}),mistakes,answered:true,attempts:session.attempts+1,correctAttempts:session.correctAttempts+Number(correct),feedback:{correct,selected,correctOption:q.correctOption}};}
export function nextG1(session){if(session.phase!=='question'||!session.answered)throw Error('先作答才能換題');const index=session.index+1;return index<session.queue.length?{...session,index,answered:false,feedback:null,optionOrder:null}:{...session,phase:'summary'};}
export function reviewG1(session){if(session.phase!=='summary')throw Error('本輪尚未結束');const ids=Object.keys(session.mistakes);if(!ids.length)throw Error('錯題已清零');return{...session,phase:'question',roundKind:'review',roundNumber:session.roundNumber+1,queue:shuffled(ids,session.random),index:0,answered:false,feedback:null,optionOrder:null};}

// 僅保存本機作答狀態。題庫及圖片不複製到進度，追加新題不改動進行中的隊列。
export function snapshotG1Session(session){
 const {phase,roundKind,roundNumber,queue,index,answered,feedback,mistakes,attempts,correctAttempts,optionOrder=null}=session;
 return structuredClone({schemaVersion:1,...(session.roundLimit!==undefined?{roundLimit:session.roundLimit}:{}),...(session.seenIds?{seenIds:session.seenIds}:{}),phase,roundKind,roundNumber,queue,index,answered,feedback,mistakes,attempts,correctAttempts,optionOrder});
}
export function restoreG1Session(bank,saved,{random=Math.random}={}){
 validateG1Bank(bank);if(saved?.roundLimit!==undefined&&saved.roundLimit!=='all'&&(!Number.isInteger(saved.roundLimit)||saved.roundLimit<1))throw Error('題數紀錄不符');if(saved?.seenIds!==undefined&&(!Array.isArray(saved.seenIds)||saved.seenIds.some(id=>typeof id!=='string')))throw Error('練習紀錄不符');const allowed=new Map(bank.entries.filter(e=>e.status==='READY').map(e=>[e.id,e]));
 if(saved?.schemaVersion!==1||!['question','summary'].includes(saved.phase)||!['first','review'].includes(saved.roundKind)||!Array.isArray(saved.queue)||!saved.queue.length||new Set(saved.queue).size!==saved.queue.length||saved.queue.some(id=>!allowed.has(id))||!Number.isInteger(saved.index)||saved.index<0||saved.index>=saved.queue.length||typeof saved.answered!=='boolean'||!Number.isInteger(saved.roundNumber)||saved.roundNumber<1||!Number.isInteger(saved.attempts)||saved.attempts<0||!Number.isInteger(saved.correctAttempts)||saved.correctAttempts<0||saved.correctAttempts>saved.attempts||!saved.mistakes||typeof saved.mistakes!=='object'||Array.isArray(saved.mistakes)||Object.entries(saved.mistakes).some(([id,n])=>!allowed.has(id)||![1,2].includes(n)))throw Error('儲存的進度與題庫不符，未清除原紀錄');
 if(saved.optionOrder){const q=questionVersion(allowed.get(saved.queue[saved.index]),saved.optionOrder);if(saved.optionOrder.id!==q.id||!Array.isArray(saved.optionOrder.values)||saved.optionOrder.values.length!==2||new Set(saved.optionOrder.values).size!==2||saved.optionOrder.values.some(v=>![q.correctOption,q.wrongOption].includes(v)))throw Error('選項順序與題目不符');}
 if(saved.phase==='summary'&&(saved.index!==saved.queue.length-1||!saved.answered))throw Error('本輪進度格式不符');
 if(saved.answered){const q=questionVersion(allowed.get(saved.queue[saved.index]),saved.optionOrder);if(!saved.feedback||saved.feedback.correctOption!==q.correctOption||![q.correctOption,q.wrongOption].includes(saved.feedback.selected)||saved.feedback.correct!==(saved.feedback.selected===q.correctOption))throw Error('已答題目與進度不符');}
 else if(saved.feedback!==null)throw Error('未答題目與進度不符');
 return{...snapshotG1Session(saved),bank,random};
}
