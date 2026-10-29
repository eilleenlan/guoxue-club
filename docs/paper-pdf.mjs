import {A4} from './paper-layout.mjs';
const fontFamily='"Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC", sans-serif';
export function canvasMeasure(){const ctx=document.createElement('canvas').getContext('2d');return (text,size)=>{ctx.font=`${size}px ${fontFamily}`;return ctx.measureText(text).width;};}
export function drawPage(page,canvas,scale=200/72){
  canvas.width=Math.ceil(A4.width*scale);canvas.height=Math.ceil(A4.height*scale);
  const ctx=canvas.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,A4.width,A4.height);ctx.fillStyle='#000';ctx.strokeStyle='#000';ctx.lineWidth=.6;
  for(const c of page.commands){if(c.type==='text'){ctx.font=`${c.bold?'bold ':''}${c.size}px ${fontFamily}`;ctx.fillText(c.text,c.x,c.y);}else if(c.type==='rect')ctx.strokeRect(c.x,c.y,c.width,c.height);else if(c.type==='line'){ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(c.x+c.width,c.y);ctx.stroke();}}
  return canvas;
}
const enc=new TextEncoder();
function encodePDF(images){
  const parts=[],offsets=[0];let length=0;const push=data=>{const bytes=typeof data==='string'?enc.encode(data):data;parts.push(bytes);length+=bytes.length;};
  const object=(id,body)=>{offsets[id]=length;push(`${id} 0 obj\n`);push(body);push('\nendobj\n');};
  push('%PDF-1.4\n%Raster pages\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');
  object(2,`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
  images.forEach((img,i)=>{const id=3+i*3;
    object(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);
    offsets[id+1]=length;push(`${id+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`);push(img.bytes);push('\nendstream\nendobj\n');
    const content=`q\n${A4.width} 0 0 ${A4.height} 0 0 cm\n/Im0 Do\nQ\n`;
    object(id+2,`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream`);
  });
  const xref=length,count=3+images.length*3;push(`xref\n0 ${count}\n0000000000 65535 f \n`);for(let id=1;id<count;id++)push(`${String(offsets[id]).padStart(10,'0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts,{type:'application/pdf'});
}
export async function renderPDF(book,onProgress=()=>{}){
  const canvas=document.createElement('canvas'),images=[];
  for(let i=0;i<book.pages.length;i++){
    drawPage(book.pages[i],canvas);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('此瀏覽器無法輸出頁面影像')),'image/jpeg',.96));
    images.push({width:canvas.width,height:canvas.height,bytes:new Uint8Array(await blob.arrayBuffer())});onProgress(i+1,book.pages.length);
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  canvas.width=canvas.height=1;return encodePDF(images);
}
