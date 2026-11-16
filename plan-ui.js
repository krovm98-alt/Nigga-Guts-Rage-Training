(function () {
  const panel=document.createElement('section'); panel.className='notice plan-panel';
  document.getElementById('list').before(panel);
  const total=document.createElement('p');
  total.textContent='План: '+EX.filter(e=>e.type==='sets'&&!S.ex[e.id].skip).reduce((n,e)=>n+S.ex[e.id].rows.length-1,0)+' рабочих подходов · цель: 2 повтора в запасе';
  panel.append(total);
  if(KIND!=='custom') return;
  const title=document.createElement('input'); title.maxLength=100; title.placeholder='Название тренировки'; title.setAttribute('aria-label','Название тренировки'); title.value=S.name||'Своя тренировка';
  title.onchange=()=>{S.name=title.value.trim()||'Своя тренировка';save();}; panel.append(title);
  document.querySelector('h1').textContent=S.name||'СВОЯ ТРЕНИРОВКА';
  function button(text,action) {const b=document.createElement('button');b.textContent=text;b.onclick=action;panel.append(b);return b;}
  function appendPlan(plan,name) {
    if(S.end) {toast('Начни новую тренировку');return;}
    for(const [exerciseId,count,reps] of plan) {
      if(EX.some(e=>DDXCatalog.identity(e)===exerciseId)) continue;
      const x=DDXCatalog.get(exerciseId); if(!x) continue;
      const id='extra_'+crypto.randomUUID();
      const st={rows:[{w:'',r:'8',e:0,d:false}],n:'',t:[],why:[],alt:-1,custom:'',skip:false,side:false};
      AdaptivePlan.resize(st,count,reps);
      SessionProgression.prefill({exerciseId},st);
      // Carry progression within the explicitly chosen rep range.
      st.rows.slice(1).forEach(r=>r.r=String(Math.max(st.repMin,Math.min(st.repMax,Number(r.r)))));
      S.ex[id]=st;
      EX.push(catalogDescriptor({sessionExerciseId:id,slotId:null,exerciseId,added:true},st));
    }
    S.name=name||title.value; S.cards=layoutCards();
    if(save()) location.reload();
  }
  const options=document.createElement('details');options.className='plan-editor';
  const summary=document.createElement('summary');summary.textContent='Добавить упражнения из шаблона';options.append(summary);panel.append(options);
  for(const kind of ['push','pull','legs']) {
    const b=button('Добавить '+kind.toUpperCase(),()=>appendPlan(AdaptivePlan.templates[kind].map(id=>[id,3,String(DDXCatalog.get(id).reps)])));
    options.append(b);
  }
  options.append(button('Push + Legs · 18 подходов',()=>appendPlan(AdaptivePlan.example,'Push + Legs')));
  button('Начать тренировку',()=>{if(!EX.some(e=>e.type==='sets')) {toast('Добавь силовые упражнения');return;}ensureStart();toast('Тренировка начата');});
  const helper=document.createElement('details');helper.open=new URLSearchParams(location.search).has('compensate');
  const heading=document.createElement('summary');heading.textContent='Компенсировать пропущенную тренировку';helper.append(heading);panel.append(helper);
  function select(label,values) {const l=document.createElement('label');l.textContent=label;const s=document.createElement('select');s.setAttribute('aria-label',label);for(const [v,t] of values){const o=document.createElement('option');o.value=v;o.textContent=t;s.append(o);}l.append(s);helper.append(l);return s;}
  const days=['push','pull','legs'].map(k=>[k,k.toUpperCase()]);
  const main=select('Основная тренировка',days),missed=select('Пропущенная тренировка',days);missed.value='legs';
  const priority=select('Приоритет',[['main','Основная тренировка'],['balanced','Сбалансированная'],['missed','Пропущенная группа']]);
  const choices=document.createElement('div'); helper.append(choices);
  function draw(){choices.replaceChildren();for(const id of AdaptivePlan.templates[missed.value]){const l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.value=id;l.append(c,DDXCatalog.get(id).name);choices.append(l);}}
  missed.onchange=draw;draw();
  const preview=document.createElement('p');helper.append(preview);let proposed=null;
  helper.append(button('Предложить план',()=>{
    if(S.start || EX.some(e=>e.type==='sets')) {toast('Для предложения нужен пустой план Custom');return;}
    const ids=[...choices.querySelectorAll('input:checked')].map(c=>c.value);
    if(main.value===missed.value || !ids.length){toast('Выбери другой день и упражнения для переноса');return;}
    proposed=AdaptivePlan.combined(main.value,ids,priority.value);
    preview.textContent=proposed.map(([id,n])=>DDXCatalog.get(id).name+' × '+n).join('; ')+' · Итого '+proposed.reduce((n,x)=>n+x[1],0)+' рабочих подходов. После добавления план можно изменить.';
  }));
  for(const s of [main,missed,priority])s.addEventListener('change',()=>{proposed=null;preview.textContent='';});
  choices.addEventListener('change',()=>{proposed=null;preview.textContent='';});
  helper.append(button('Добавить предложенный план',()=>{if(proposed)appendPlan(proposed,main.value.toUpperCase()+' + '+missed.value.toUpperCase());}));
})();
