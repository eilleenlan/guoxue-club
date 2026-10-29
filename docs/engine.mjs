// Legacy layouts keep comma/period boundaries. New punctuation rules are opt-in.
export function splitText(work) {
  if (typeof work.text !== 'string' || !work.text.length) throw new Error('缺少原文');
  if (work.layout !== undefined && !['poem-lines','prose-paragraphs','passage-lines'].includes(work.layout)) throw new Error('未知的原文版面格式');
  if (work.punctuation !== undefined && work.punctuation!=='classical-dialogue') throw new Error('未知的標點規則');
  const pieces = work.text.match(work.splitAfterColon?/[^，。,.？！；：]+[，。,.？！；：]?[」』]*/gu:work.punctuation==='classical-dialogue'?/[^，。,.？！；]+[，。,.？！；]?[」』]*/gu:/[^，。,.]+[，。,.]?/gu) || [];
  if (pieces.join('') !== work.text) throw new Error('原文無法完整切割');
  let paragraph=0;
  return pieces.map((raw, index) => {
    let content=raw;
    if (work.layout==='prose-paragraphs' && content.startsWith('\n\n')) {paragraph++;content=content.slice(2);}
    else if (work.layout==='poem-lines' && content.startsWith('\n')) content=content.slice(1);
    else if (work.layout==='passage-lines' && content.startsWith('\n\n')) content=content.slice(2);
    let text = content.replace(/[，。,.]$/u, '');
    if(work.punctuation==='classical-dialogue') text=text.replace(/[，。,.？！：「」『』；]/gu,'');
    if(work.layout==='prose-paragraphs') text=text.replace(/[、；]/gu,'');
    if (!text || /[^\p{L}\p{N}]/u.test(text)) throw new Error('含有其他標點、空白或特殊結構，待人工確認');
    return Object.freeze({ id: `${work.id}:${index}`, index, paragraph, raw, text });
  });
}
export function questionLimit(work) {
  const segments=splitText(work),counts=new Map();
  for(const s of segments)counts.set(s.paragraph,(counts.get(s.paragraph)||0)+1);
  return Math.max(...counts.values());
}
export function validateWork(work) {
  if(work.practiceMode!==undefined&&!['full','random-contiguous'].includes(work.practiceMode))throw new Error('未知出題模式');
  if (Array.isArray(work?.children)) throw new Error('作品集合不可直接出題，請選擇子篇目');
  if (!work || !/^[a-z0-9-]+$/.test(work.id) || typeof work.title !== 'string' || !work.title.trim() || typeof work.author !== 'string' || !Array.isArray(work.tags) || !work.tags.every(t=>typeof t==='string') || !['poem','prose'].includes(work.category) || !['demo','pending','verified'].includes(work.status)) throw new Error('篇目欄位不正確');
  if (work.status === 'pending') return { playable:false, reason:'原文待逐字核對' };
  if (work.status === 'demo' && !work.title.includes('DEMO')) throw new Error('測試篇目必須標記 DEMO');
  if (work.status === 'verified' && (!work.review?.confirmedBy || !/^\d{4}-\d{2}-\d{2}$/.test(work.review?.confirmedAt || ''))) throw new Error('正式教材缺少核對紀錄');
  const segments = splitText(work);
  if (segments.length < 2 || questionLimit(work)<2) throw new Error('至少需要同一段落內兩個片段');
  return {playable:true,segments};
}
export function validateCatalog(data) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.works)) throw new Error('不支援的題庫格式');
  const ids = new Set();
  function visit(work) {
    if (!work || typeof work !== 'object') throw new Error('篇目格式不正確');
    if (ids.has(work.id)) throw new Error('篇目 ID 重複');
    ids.add(work.id);
    if (work.children !== undefined) {
      if (!Array.isArray(work.children) || !/^[a-z0-9-]+$/.test(work.id) || typeof work.title !== 'string' || typeof work.author !== 'string' || !['poem','prose'].includes(work.category) || work.children.some(c=>c?.children!==undefined)) throw new Error('作品集合格式不正確，僅支援兩層');
      return {...work,playable:false,children:work.children.map(visit)};
    }
    try { return {...work,...validateWork(work)}; }
    catch (error) { return {...work,playable:false,reason:`待確認：${error.message}`}; }
  }
  return data.works.map(visit);
}
export function filterWorks(works, category='all', query='') {
  const term=query.trim().toLocaleLowerCase();
  return works.filter(w=>(category==='all'||w.category===category) && `${w.title} ${w.author}`.toLocaleLowerCase().includes(term)).sort((a,b)=>(a.sortOrder??Number.MAX_SAFE_INTEGER)-(b.sortOrder??Number.MAX_SAFE_INTEGER));
}
export function shuffle(items, random=Math.random) {
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  if(result.length>1 && result.every((v,i)=>v.id===items[i].id)) result.push(result.shift());
  return result;
}
export function createQuestion(work, count, previousStart=null, random=Math.random) {
  const check=validateWork(work);
  if(!check.playable) throw new Error('教材尚未核對');
  if(work.practiceMode==='full'){
    const answer=Object.freeze([...check.segments]);
    return {type:'sequence',workId:work.id,start:0,answer,options:shuffle(answer,random),requestedCount:answer.length};
  }
  if(work.practiceMode==='random-contiguous'){
    if(!Number.isInteger(count)||count<2||count>questionLimit(work))throw new Error('片段數超出範圍');
    const paragraphs=[...new Set(check.segments.map(s=>s.paragraph))].filter(p=>check.segments.filter(s=>s.paragraph===p).length>=2);
    const paragraph=paragraphs[Math.floor(random()*paragraphs.length)];
    const pool=check.segments.filter(s=>s.paragraph===paragraph),actual=Math.min(count,pool.length);
    const candidates=pool.slice(0,pool.length-actual+1).map(s=>s.index);
    const alternatives=candidates.filter(i=>i!==previousStart);
    const starts=alternatives.length?alternatives:candidates,start=starts[Math.floor(random()*starts.length)];
    const answer=Object.freeze(check.segments.slice(start,start+actual));
    return {type:'sequence',workId:work.id,start,answer,options:shuffle(answer,random),requestedCount:count};
  }
  if(!Number.isInteger(count)||count<2||count>questionLimit(work)) throw new Error('片段數超出範圍');
  const eligible=check.segments.map((s,i)=>i).filter(i=>i+count<=check.segments.length && check.segments[i].paragraph===check.segments[i+count-1].paragraph);
  const starts=eligible.filter(i=>i!==previousStart);
  const candidates=starts.length?starts:eligible;
  const start=candidates[Math.floor(random()*candidates.length)];
  const answer=Object.freeze(check.segments.slice(start,start+count));
  return {type:'sequence',workId:work.id,start,answer,options:shuffle(answer,random)};
}
export function grade(question, selectedIds) {
  const options=new Map(question.options.map(s=>[s.id,s.text]));
  return selectedIds.length===question.answer.length && new Set(selectedIds).size===selectedIds.length && question.answer.every((s,i)=>options.has(selectedIds[i]) && options.get(selectedIds[i])===s.text);
}
