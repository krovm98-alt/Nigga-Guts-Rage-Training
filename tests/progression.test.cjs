const {test}=require("node:test"), assert=require("node:assert/strict"), vm=require("node:vm"),fs=require("node:fs");
function setup(){
 const data={};
 const c={window:{},localStorage:{
  getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v;}},
  document:{createElement:()=>({setAttribute(){}}),body:{prepend(){}}}};
 vm.createContext(c);
 for(const file of ["catalog","storage","seed-workout","session-progression"]){
   vm.runInContext(fs.readFileSync(file+".js","utf8"),c);
   Object.assign(c,c.window);
 }
 return {c,data};
}
test("finishing a workout yields next reps at the same load, never promotes mixed dip weights",()=>{
 const {c}=setup(),s=c.WorkoutSeed.record();
 const goals=c.SessionProgression.evaluate(s,[]);
 const bench=goals.find(g=>g.exerciseId==="db_bench");
 assert.equal(bench.proposedWeight,21);
 assert.equal(bench.proposedReps,9);
 assert.equal(bench.approved,true);
 const dip=goals.find(g=>g.exerciseId==="dip_machine");
 assert.equal(dip.approved,false);
 assert.equal(dip.proposedWeight,null);
 assert.match(dip.reason,/Разные веса/);
});
test("saving next session plan and prefill touches only empty working rows",()=>{
 const {c}=setup(),s=c.WorkoutSeed.record();
 const goals=c.SessionProgression.evaluate(s,[]);
 c.SessionProgression.store(s,goals);
 const rows=[{w:"12",r:"8",e:0,d:false},
   {w:"",r:"8",e:0,d:false},
   {w:"20",r:"8",e:0,d:false,manualWeight:true},
   {w:"",r:"8",e:0,d:false}];
 const st={rows,side:false,skip:false};
 assert.equal(c.SessionProgression.prefill({id:"dbbench"},st),true);
 assert.equal(rows[0].w,"12");
 assert.equal(rows[1].w,"21");
 assert.equal(rows[1].r,"9");
 assert.equal(rows[2].w,"20");
 assert.equal(rows[3].w,"21");
 assert.equal(c.SessionProgression.prefill({id:"dbbench"},st),false);
});
test("higher weights require a separate approval, stored plan never mutates history",()=>{
 const {c}=setup(),s=c.WorkoutSeed.record();
 const e=s.exercises.find(e=>e.exerciseId==="incline_db_bench");
 e.rows.slice(1).forEach(r=>{r.r="10";r.e=2;});
 const before=JSON.stringify(s);
 const goals=c.SessionProgression.evaluate(s,[]);
 const inc=goals.find(g=>g.exerciseId==="incline_db_bench");
 assert.equal(inc.kind,"ceiling");
 assert.equal(inc.proposedWeight,22);
 assert.equal(inc.approved,false);
 c.SessionProgression.store(s,goals);
 assert.equal(c.SessionProgression.read().incline_db_bench,undefined);
 inc.approved=true;
 c.SessionProgression.store(s,goals);
 assert.equal(c.SessionProgression.read().incline_db_bench.weight,22);
 assert.equal(JSON.stringify(s),before);
});
test("fatigue, pain and incomplete sets never create automatic weight increases",()=>{
 const {c}=setup(),s=c.WorkoutSeed.record();
 const bench=s.exercises.find(e=>e.exerciseId==="db_bench");
 bench.rows[1].e=6;
 assert.equal(c.SessionProgression.evaluate(s,[]).find(g=>g.exerciseId==="db_bench").approved,false);
 bench.rows[1].e=2;bench.notes="дискомфорт";
 assert.equal(c.SessionProgression.evaluate(s,[]).find(g=>g.exerciseId==="db_bench").approved,false);
 bench.notes="";bench.rows[2].d=false;
 assert.equal(c.SessionProgression.evaluate(s,[]).find(g=>g.exerciseId==="db_bench").approved,false);
});

test("older completed workout automatically provides safe next goal without needing a past finish screen",()=>{
 const {c}=setup();
 // The November 9 archive is already in storage, as for an Android user
 // who completed a session before upgrading this feature.
 assert.equal(c.SessionProgression.read().db_bench,undefined);
 const rows=[{w:"12",r:"8",e:0,d:false},
   {w:"",r:"8",e:0,d:false},
   {w:"",r:"8",e:0,d:false},
   {w:"",r:"8",e:0,d:false}];
 assert.equal(c.SessionProgression.prefill({id:"dbbench"},{rows,side:false,skip:false}),true);
 assert.equal(rows[1].w,"21");
 assert.equal(rows[1].r,"9");
});
