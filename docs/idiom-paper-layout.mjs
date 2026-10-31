import {A4,wrapText} from './paper-layout.mjs';
const margin=36,width=A4.width-72,bottom=788;
export function planIdiomPaper(batch,kind,measure){
 if(!['questions','answers'].includes(kind))throw Error('卷別錯誤');const pages=[];let page,y;
 const text=(s,x,y,size=14,bold=false)=>({type:'text',text:s,x,y,size,bold});
 const label=batch.lessons.map(l=>`${l.academicYear} G${l.grade} ${l.code}`).join('、');
 function newPage(){page={commands:[text('小小國學所｜成語練習卷'+(kind==='answers'?'・答案卷':''),margin,40,17,true)],blocks:[]};pages.push(page);y=62;for(const line of wrapText(label,width,11,measure)){page.commands.push(text(line,margin,y,11));y+=16;}if(kind==='questions'){page.commands.push(text('姓名：________________　日期：________________',margin,y+6,12));y+=29;page.commands.push(text(pages.length===1?'請將成語選項編號填入空格，每個選項使用一次。':'（續頁）成語選項請參閱本卷第 1 頁。',margin,y,11));y+=23;}}
 function place(commands,height,question){if(height>bottom-y){newPage();}if(height>bottom-y)throw Error('單題過長，無法以清楚字級完整放在一頁；未產生試卷。');page.blocks.push({question,y,height});page.commands.push(...commands.map(c=>({...c,x:c.x+margin,y:c.y+y})));y+=height;}
 newPage();
 if(kind==='questions'){const commands=[];let oy=0;commands.push(text('成語選項',0,oy,14,true));oy+=23;const col=width/3;for(let i=0;i<batch.options.length;i+=3){let rh=0;for(let j=0;j<3&&i+j<batch.options.length;j++){const o=batch.options[i+j],lines=wrapText(`${o.number}. ${o.term}`,col-12,14,measure);lines.forEach((line,k)=>commands.push(text(line,j*col,oy+k*22,14)));rh=Math.max(rh,lines.length*22);}oy+=rh+5;}oy+=10;const firstLines=wrapText('1. '+batch.questions[0].text.replace('＿＿＿＿','（　　　　）'),width,15,measure).length;if(y+oy+firstLines*25+16>bottom)throw Error('選項區過長，無法與第一題同頁；請減少課次。');place(commands,oy,null);}
 for(const q of batch.questions){const value=kind==='questions'?`${q.number}. ${q.text.replace('＿＿＿＿','（　　　　）')}`:`${q.number}. ${q.answerNumber}　${q.term}`;const size=kind==='questions'?15:13,leading=kind==='questions'?25:21;const lines=wrapText(value,width,size,measure);place(lines.map((s,i)=>text(s,0,i*leading,size)),lines.length*leading+(kind==='answers'?2:15),q.number);}
 pages.forEach((p,i)=>p.commands.push(text(`第 ${i+1} 頁／共 ${pages.length} 頁`,margin,817,10)));return {kind,pages};
}
