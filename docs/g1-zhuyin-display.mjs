// G1 專用直式注音顯示：只處理DOM，不更動讀音、答案或進度。
export function splitG1Zhuyin(reading){
 if(typeof reading!=='string'||!/^(?:˙[ㄅ-ㄩ]{1,3}|[ㄅ-ㄩ]{1,3}[ˊˇˋ]?)$/u.test(reading))throw Error('注音音節格式不符，顯示層不自動更改原注音');
 const tone=reading.match(/[ˊˇˋ˙]/u)?.[0]??'';return{raw:reading,symbols:[...reading.replace(/[ˊˇˋ˙]/gu,'')],tone,neutral:tone==='˙'};
}
export function tokenizeG1Zhuyin(text){
 if(typeof text!=='string')throw Error('注音文字格式不符');const tokens=[],pattern=/˙?[ㄅ-ㄩ]{1,3}[ˊˇˋ]?|[ \t\r\n]+|＿+|[，。！？、；：「」…,.!?;:]/gu;let cursor=0;for(const match of text.matchAll(pattern)){if(match.index!==cursor)throw Error('注音文字含無法顯示的內容，未自動略去');const raw=match[0];tokens.push(/[ㄅ-ㄩ]/u.test(raw)?{type:'syllable',...splitG1Zhuyin(raw)}:{type:/^\s+$/u.test(raw)?'space':raw.startsWith('＿')?'blank':'punctuation',raw});cursor=match.index+raw.length;}if(cursor!==text.length)throw Error('注音文字含無法顯示的內容，未自動略去');return tokens;
}
const element=(tag,className,text)=>{const n=document.createElement(tag);n.className=className;if(text!==undefined)n.textContent=text;return n;};
export function createG1ZhuyinSyllable(reading){
 const parsed=splitG1Zhuyin(reading),unit=element('span','g1-zy-unit'),stack=element('span','g1-zy-stack'+(parsed.neutral?' g1-zy-neutral-stack':''));unit.dataset.reading=reading;unit.setAttribute('role','img');unit.setAttribute('aria-label',reading);stack.setAttribute('aria-hidden','true');
 for(const symbol of parsed.symbols)stack.append(element('span','g1-zy-symbol',symbol));
 if(parsed.tone){const tone=element('span','g1-zy-tone'+(parsed.neutral?' g1-zy-neutral':'')),glyph=element('span','g1-zy-tone-glyph',parsed.tone);tone.append(glyph);stack.append(tone);}unit.append(stack);return unit;
}
export function validateG1WordGroups(text,wordGroups){
 if(!Array.isArray(wordGroups)||!wordGroups.length||wordGroups.some(word=>typeof word!=='string'||!word.trim()))throw Error('詞語分組格式不符');
 const content=s=>tokenizeG1Zhuyin(s).filter(token=>token.type!=='space').map(token=>token.raw).join('');
 if(wordGroups.map(content).join('')!==content(text))throw Error('詞語分組與原注音不符，未更改或略去原文');
 return wordGroups;
}
export function createG1ZhuyinFlow(text,{wordGroups=null}={}){
 const flow=element('span','g1-zy-flow');flow.dataset.reading=text;
 if(wordGroups){flow.classList.add('g1-zy-word-flow');for(const word of validateG1WordGroups(text,wordGroups)){const group=createG1ZhuyinFlow(word);group.classList.add('g1-zy-word');flow.append(group);}return flow;}
 for(const token of tokenizeG1Zhuyin(text)){if(token.type==='space')continue;if(token.type==='syllable'){flow.append(createG1ZhuyinSyllable(token.raw));continue;}const mark=element('span',token.type==='blank'?'g1-zy-blank':'g1-zy-punctuation',token.raw);if(token.type==='punctuation'&&flow.lastElementChild){const previous=flow.lastElementChild;if(previous.classList.contains('g1-zy-punct-group'))previous.append(mark);else{const group=element('span','g1-zy-punct-group');previous.replaceWith(group);group.append(previous,mark);}}else flow.append(mark);}return flow;
}
