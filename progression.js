/* DDX v2: history-derived, conservative double progression */
(function(){'use strict';
const read=()=>{try{const h=JSON.parse(localStorage.getItem('ddx_history_v1')||'[]');return Array.isArray(h)?h:[]}catch{return[]}};
const num=v=>{const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null};
const upper=e=>/икр|разгибан|сгибан|дельт|мах|сведен|гипер|шраг|пресс/i.test(e.name)?12:10;
const step=e=>/гантел/i.test(e.name)?2:/штанг|присед/i.test(e.name)?2.5:5;
function recommend(e,st){
 const sessions=read().filter(x=>x.kind&&Array.isArray(x.exercises)).sort((a,b)=>(b.start||0)-(a.start||0));
 const last=sessions.flatMap(s=>s.exercises.filter(x=>x.id===e.id&&!x.skipped&&!x.replacement).map(x=>({s,x})))[0];
 if(!last)return null;
 const rows=(last.x.rows||[]).slice(1).filter(r=>r.d&&num(r.w)!=null&&num(r.r)!=null&&num(r.w)>0&&num(r.r)>0);
 if(rows.length!==3)return {text:'Предыдущая тренировка заполнена не полностью. Сохраняем базовую нагрузку.'};
 const w=num(rows[0].w);if(!rows.every(r=>Math.abs(num(r.w)-w)<0.001))return {text:'В прошлый раз рабочий вес менялся внутри упражнения. Повтори с единым весом.'};
 const rmin=Math.min(...rows.map(r=>num(r.r)));const rmax=Math.max(...rows.map(r=>num(r.r)));
 const efforts=rows.map(r=>Number(r.e));const failure=efforts.some(x=>x>=5||!Number.isInteger(x));const pain=(last.x.notes||'').match(/боль|дискомфорт/i);
 const ceiling=upper(e),inc=step(e);let weight=w,reps=Math.min(ceiling,Math.max(8,rmin));let reason='';
 if(pain){reason='В прошлый раз отмечен дискомфорт: не повышай нагрузку до его устранения.'}
 else if(failure||rmin<8){reason='Была высокая сложность или меньше 8 повторений: закрепи технику и повтори вес.'}
 else if(rmin>=ceiling&&efforts.every(x=>x>0&&x<=4)){weight=w+inc;reps=8;reason='Все три подхода достигли верхней границы без отказа: следующий шаг веса.'}
 else if(rmin<ceiling){reps=Math.min(ceiling,rmin+1);reason='Сохрани вес и добавь по одному повторению, если техника позволяет.'}
 else {reason='Не повышай вес до трёх чистых подходов с запасом минимум 2 повтора.'}
 return {weight,reps,text:`${weight} кг × ${reps} × 3. ${reason} Основа: ${new Date(last.s.start).toLocaleDateString('ru-RU')}, ${w} кг × ${rmin}–${rmax}.`};
}
window.DDXProgress={recommend,history:read};
})();
