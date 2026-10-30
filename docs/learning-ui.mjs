import {filterWorks,splitText} from './engine.mjs';
export function representativeText(work,max=18){
 const segments=work.segments??splitText(work),headers=new Set(['子曰','孔子曰','曾子曰','子貢問曰','召門弟子曰','詩云']),segment=segments.find(s=>!headers.has(s.text));if(!segment)return '';
 const raw=segment.raw.replace(/^[\n「『]+/u,''),start=work.text.indexOf(segment.raw)+segment.raw.length-raw.length,rest=work.text.slice(start);let sentence=rest.match(/^[^。？！]+[。？！]?[」』]*/u)?.[0]??rest;if(sentence.replace(/[\p{P}\s]/gu,'').length<4){const remaining=rest.slice(sentence.length);sentence+=remaining.match(/^[^。？！]+[。？！]?[」』]*/u)?.[0]??'';}
 let excerpt=sentence;if([...sentence].length>max){const clauses=sentence.match(/[^，。？！；]+[，。？！；]?[」』]*/gu)??[sentence];excerpt=clauses[0];for(const clause of clauses.slice(1)){if([...excerpt,...clause].length>max)break;excerpt+=clause;}}
 excerpt=excerpt.replace(/[」』]+$/u,'');return excerpt+(excerpt===work.text?'':'……');
}
export function chapterNeighbors(group,id){const chapters=filterWorks(group.children??[]),index=chapters.findIndex(w=>w.id===id);return {index,total:chapters.length,previous:index>0?chapters[index-1]:null,next:index>=0&&index<chapters.length-1?chapters[index+1]:null};}
