// Disclosure affects only list visibility; selection and practice remain in app.mjs.
let context=null;
export function updateCatalogDisclosure({key,list,collectionTitle,selected,onStart}){
 const catalog=document.getElementById('catalog');let details=document.getElementById('catalog-picker');
 if(!details){details=document.createElement('details');details.id='catalog-picker';details.className='catalog-picker';const summary=document.createElement('summary');summary.id='catalog-summary';catalog.before(details);details.append(summary,catalog);const resume=document.createElement('button');resume.id='catalog-resume';resume.type='button';resume.className='primary';resume.textContent='開始重組練習';details.after(resume);details.addEventListener('toggle',()=>{resume.hidden=details.open||!details.dataset.selected;});}
 const long=list.length>8,current=list.find(w=>w.id===selected?.id&&w.playable),summary=document.getElementById('catalog-summary'),resume=document.getElementById('catalog-resume');
 if(context!==key){details.open=!long;context=key;}
 if(!long)details.open=true;
 details.classList.toggle('compact-list',!long);summary.hidden=!long;
 summary.textContent=(collectionTitle?collectionTitle+'｜選擇章句':'選擇篇目')+' · '+list.length+(collectionTitle?' 則':' 篇')+' · '+(current?'目前：'+current.title:'尚未選擇');
 details.dataset.selected=current?.id??'';resume.hidden=details.open||!current;resume.onclick=()=>{if(current)onStart(current);};
}
