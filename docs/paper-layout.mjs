import {circled} from './paper-engine.mjs';
export const A4={width:595.28,height:841.89,margin:36};
const width=A4.width-2*A4.margin,top=100,bottom=790;
export function wrapText(text,maxWidth,size,measure){
  if(maxWidth<=0)throw new Error('排版寬度無效');
  const result=[];for(const paragraph of String(text).split('\n')){let line='';for(const ch of paragraph){if(line&&measure(line+ch,size)>maxWidth){result.push(line);line=ch;}else line+=ch;}result.push(line);}return result;
}
function blockFor(question,kind,measure){
  const commands=[],text=(value,x,y,size=14,bold=false)=>commands.push({type:'text',text:value,x,y,size,bold});
  let y=0;for(const line of wrapText(`${question.number}. ${question.title}`,width,14,measure)){text(line,0,y,14,true);y+=21;}
  if(question.author){text(question.author,0,y,10);y+=17;}
  let columns=1;
  if(kind==='questions'){
    const colWidth=(width-20)/2;
    columns=question.options.every((s,i)=>measure(`${circled(i+1)} ${s.text}`,15)<=colWidth)?2:1;
    const cellWidth=columns===2?colWidth:width;
    for(let i=0;i<question.options.length;i+=columns){
      let rowHeight=0;
      for(let c=0;c<columns&&i+c<question.options.length;c++){
        const option=question.options[i+c],x=c*(cellWidth+20),lines=wrapText(option.text,cellWidth-24,15,measure);
        text(circled(i+c+1),x,y,15);lines.forEach((line,j)=>text(line,x+24,y+j*23,15));rowHeight=Math.max(rowHeight,lines.length*23);
      }y+=rowHeight+6;
    }
    y+=9;text('正確順序：',0,y+18,12);
    const slotsPerRow=Math.floor((width-75)/34);
    for(let i=0;i<question.options.length;i++){const row=Math.floor(i/slotsPerRow),col=i%slotsPerRow;commands.push({type:'rect',x:75+col*34,y:y+row*32,width:29,height:25});}
    y+=Math.ceil(question.options.length/slotsPerRow)*32+12;
  }else{
    for(const line of wrapText('正確編號：'+question.answerNumbers.map(circled).join(' → '),width,13,measure)){text(line,0,y,13,true);y+=21;}
    y+=4;for(const line of wrapText(question.original.replace(/^\n+/u,''),width,14,measure)){text(line,0,y,14);y+=22;}y+=8;
  }
  commands.push({type:'line',x:0,y,width});y+=20;
  return {commands,height:y,columns,question:question.number};
}
export function planBook(batch,kind,measure){
  if(!['questions','answers'].includes(kind))throw new Error('未知卷別');
  const pages=[],index=[];const totalRounds=batch.rounds.length;
  for(const round of batch.rounds){
    const start=pages.length+1;let page,y;
    function newPage(continued=false){
      page={round:round.number,commands:[],blocks:[]};pages.push(page);y=top;
      page.commands.push({type:'text',text:'小小國學所｜古詩文重組練習'+(kind==='answers'?'・答案卷':''),x:36,y:41,size:16,bold:true});
      page.commands.push({type:'text',text:`第 ${round.number} 回／共 ${totalRounds} 回${continued?'（續頁）':''}`,x:36,y:63,size:11});
      page.commands.push({type:'text',text:kind==='questions'?'將選項編號依正確順序填入方格，不用抄寫原文。':'相同文字的選項編號可以互換；以下為一組正確排列。',x:36,y:81,size:10});
    }
    newPage();
    for(const question of round.questions){
      const block=blockFor(question,kind,measure);
      if(block.height>bottom-top)throw new Error(`${question.title} 單題過長，超過一頁可讀範圍；請減少該題片段數，未產生裁切的 PDF。`);
      if(y+block.height>bottom)newPage(true);
      page.blocks.push({question:question.number,y,height:block.height,columns:block.columns});
      page.commands.push(...block.commands.map(c=>({...c,x:c.x+36,y:c.y+y})));y+=block.height;
    }
    index.push({round:round.number,start,end:pages.length});
  }
  pages.forEach((p,i)=>p.commands.push({type:'text',text:`第 ${p.round} 回｜第 ${i+1} 頁／共 ${pages.length} 頁`,x:36,y:815,size:10}));
  return {kind,pages,index};
}
