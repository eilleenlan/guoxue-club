// 僅供 G1 本機試排；不加入年級清單、正式題庫或孩子的學習紀錄。
// 第一題保持已驗收版本；其餘依媽媽提供的教材照片轉錄，特殊確認另記。
export const previewCards=Object.freeze([
 {text:'弟子規',readings:['ㄉㄧˋ','ㄗˇ','ㄍㄨㄟ']},
 {text:'聖人訓',readings:['ㄕㄥˋ','ㄖㄣˊ','ㄒㄩㄣˋ']},
 {text:'首孝弟',readings:['ㄕㄡˇ','ㄒㄧㄠˋ','ㄊㄧˋ']},
 {text:'次謹信',readings:['ㄘˋ','ㄐㄧㄣˇ','ㄒㄧㄣˋ']}
].map(card=>Object.freeze({...card,readings:Object.freeze(card.readings)})));

export const previewWork=Object.freeze({
 id:'g1-dizigui-preview-1',title:'弟子規',author:'',category:'prose',tags:['G1'],
 // 標點只作為共用引擎的片段分隔；卡片文字保持教材三字原貌。
 text:previewCards.map(card=>card.text).join('，')+'。',practiceMode:'full',status:'verified',
 review:{confirmedBy:'媽媽本次施工單及第（1）段教材圖片',confirmedAt:'2026-11-26'}
});

const freezeCards=cards=>Object.freeze(cards.map(([text,readings])=>Object.freeze({text,readings:readings?Object.freeze(readings):null})));
const entry=(number,section,cards,sourceStatus='awaiting-source')=>{
 const frozen=freezeCards(cards),id=number===1?previewWork.id:'g1-dizigui-preview-'+number;
 return Object.freeze({number,section,id,cards:frozen,sourceStatus,
  work:Object.freeze({...previewWork,id,text:frozen.map(c=>c.text).join('，')+'。',
   review:{confirmedBy:'媽媽第二階段施工單原文（注音核對狀態另列）',confirmedAt:'2026-11-27'}})});
};
export const diziguiBank=Object.freeze([
 Object.freeze({number:1,section:1,id:previewWork.id,cards:previewCards,work:previewWork,sourceStatus:'textbook-transcribed'}),
 entry(2,1,[['汎愛眾',['ㄈㄢˋ','ㄞˋ','ㄓㄨㄥˋ']],['而親仁',['ㄦˊ','ㄑㄧㄣ','ㄖㄣˊ']],['有餘力',['ㄧㄡˇ','ㄩˊ','ㄌㄧˋ']],['則學文',['ㄗㄜˊ','ㄒㄩㄝˊ','ㄨㄣˊ']]],'textbook-transcribed'),
 entry(3,2,[['父母呼',['ㄈㄨˋ','ㄇㄨˇ','ㄏㄨ']],['應勿緩',['ㄧㄥˋ','ㄨˋ','ㄏㄨㄢˇ']],['父母命',['ㄈㄨˋ','ㄇㄨˇ','ㄇㄧㄥˋ']],['行勿懶',['ㄒㄧㄥˊ','ㄨˋ','ㄌㄢˇ']]],'textbook-transcribed'),
 entry(4,2,[['父母教',['ㄈㄨˋ','ㄇㄨˇ','ㄐㄧㄠˋ']],['須敬聽',['ㄒㄩ','ㄐㄧㄥˋ','ㄊㄧㄥ']],['父母責',['ㄈㄨˋ','ㄇㄨˇ','ㄗㄜˊ']],['須順承',['ㄒㄩ','ㄕㄨㄣˋ','ㄔㄥˊ']]],'textbook-transcribed'),
 entry(5,3,[['冬則溫',['ㄉㄨㄥ','ㄗㄜˊ','ㄨㄣ']],['夏則凊',['ㄒㄧㄚˋ','ㄗㄜˊ','ㄐㄧㄥˋ']],['晨則省',['ㄔㄣˊ','ㄗㄜˊ','ㄒㄧㄥˇ']],['昏則定',['ㄏㄨㄣ','ㄗㄜˊ','ㄉㄧㄥˋ']]],'textbook-transcribed'),
 entry(6,3,[['出必告',['ㄔㄨ','ㄅㄧˋ','ㄍㄠˋ']],['反必面',['ㄈㄢˇ','ㄅㄧˋ','ㄇㄧㄢˋ']],['居有常',['ㄐㄩ','ㄧㄡˇ','ㄔㄤˊ']],['業無變',['ㄧㄝˋ','ㄨˊ','ㄅㄧㄢˋ']]],'textbook-transcribed'),
 entry(7,4,[['事雖小',['ㄕˋ','ㄙㄨㄟ','ㄒㄧㄠˇ']],['勿擅為',['ㄨˋ','ㄕㄢˋ','ㄨㄟˊ']],['苟擅為',['ㄍㄡˇ','ㄕㄢˋ','ㄨㄟˊ']],['子道虧',['ㄗˇ','ㄉㄠˋ','ㄎㄨㄟ']]],'textbook-transcribed'),
 entry(8,4,[['物雖小',['ㄨˋ','ㄙㄨㄟ','ㄒㄧㄠˇ']],['勿私藏',['ㄨˋ','ㄙ','ㄘㄤˊ']],['苟私藏',['ㄍㄡˇ','ㄙ','ㄘㄤˊ']],['親心傷',['ㄑㄧㄣ','ㄒㄧㄣ','ㄕㄤ']]],'textbook-transcribed'),
 entry(9,5,[['親所好',['ㄑㄧㄣ','ㄙㄨㄛˇ','ㄏㄠˋ']],['力為具',['ㄌㄧˋ','ㄨㄟˋ','ㄐㄩˋ']],['親所惡',['ㄑㄧㄣ','ㄙㄨㄛˇ','ㄨˋ']],['謹為去',['ㄐㄧㄣˇ','ㄨㄟˋ','ㄑㄩˋ']]],'textbook-transcribed'),
 entry(10,5,[['身有傷',['ㄕㄣ','ㄧㄡˇ','ㄕㄤ']],['貽親憂',['ㄧˊ','ㄑㄧㄣ','ㄧㄡ']],['德有傷',['ㄉㄜˊ','ㄧㄡˇ','ㄕㄤ']],['貽親羞',['ㄧˊ','ㄑㄧㄣ','ㄒㄧㄡ']]],'textbook-transcribed')
]);

export const textbookImageSources=Object.freeze({
 1:'codex-clipboard-a81aae24-9c9e-438d-9fb0-db9bd73611fa.png',
 2:'codex-clipboard-1a50fe18-b025-4bcb-98b4-7cc586f99006.png',
 3:'codex-clipboard-c85f6a1e-2ea0-45a0-b667-fe467eb3ea10.png',
 4:'codex-clipboard-7c2b9b13-50a7-4374-ab64-8d2585936e41.png',
 5:'codex-clipboard-aca27962-a240-41c8-933e-68da2dca30f9.png'
});
export const sourceQuestions=Object.freeze([]);
export const sourceConfirmations=Object.freeze([
 Object.freeze({question:5,phrase:'夏則凊',character:'凊',reading:'ㄐㄧㄥˋ',radical:'冫',
  evidence:'媽媽本次明確確認及放大教材圖；原小圖難辨，放大後確認冫部。',
  image:'codex-clipboard-98766af7-95b5-4103-9d8a-2643c0abf271.png'})
]);

export const sectionLabels=Object.freeze([
 '第（1）段：弟子規～則學文','第（2）段：父母呼～須順承',
 '第（3）段：冬則溫～業無變','第（4）段：事雖小～親心傷',
 '第（5）段：親所好～貽親羞'
]);
