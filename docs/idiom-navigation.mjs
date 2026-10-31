export function validateLessonNavigation(registry){
 if(registry?.schemaVersion!==1||!Array.isArray(registry.lessons))throw Error('課次導覽資料格式不正確');
 const keys=new Set();for(const l of registry.lessons){const key=`${l.academicYear}:${l.grade}:${l.code}`;if(!Number.isInteger(l.academicYear)||!Number.isInteger(l.grade)||!/^L[1-9]\d*$/.test(l.code??'')||l.number!==Number(l.code.slice(1))||!['published','candidate'].includes(l.status)||!/^\.\/[a-z0-9-]+\.html$/.test(l.href??'')||keys.has(key))throw Error('課次導覽欄位、網址或重複課次不正確');keys.add(key);}return registry;
}
export function lessonNavigation(registry,current,{preview=false}={}){
 validateLessonNavigation(registry);if(!Number.isInteger(current?.academicYear)||!Number.isInteger(current?.grade)||!/^L[1-9]\d*$/.test(current?.code??''))throw Error('目前課次不正確');
 const published=registry.lessons.filter(l=>l.status==='published'&&l.academicYear===current.academicYear&&l.grade===current.grade).sort((a,b)=>a.number-b.number),number=Number(current.code.slice(1));
 if(!preview&&!published.some(l=>l.code===current.code))throw Error('本課尚未正式發布，不提供正式課次導覽');
 return {previous:published.filter(l=>l.number<number).at(-1)??null,next:published.find(l=>l.number>number)??null};
}

export function shouldConfirmLessonChange(answers,graded){return answers.some(Boolean)&&!graded;}
