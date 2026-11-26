const {test} = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
function setup() {
  const data = {};
  const c = {window:{},localStorage:{
    getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=v}
  }};
  vm.createContext(c);
  for(const f of ["catalog","storage","exercise-weight-estimator","session-progression"]) {
    vm.runInContext(fs.readFileSync(f+".js","utf8"),c);
    Object.assign(c,c.window);
  }
  return {c,data};
}
function history(c,id,weight,effort=4) {
  const x=c.DDXCatalog.get(id),r={type:"working",w:String(weight),r:"8",e:effort,d:true};
  return [{id:"h1",kind:"push",start:Date.now()-86400000,end:Date.now()-86000000,
    exercises:[{id,exerciseId:id,name:x.name,unit:x.unit,equipment:x.equipment,rows:[r,{...r},{...r}]}]}];
}
test("hard last set is a visible observed working load, never a progression approval",()=>{
  const {c}=setup(),h=history(c,"pec_deck",54,5);
  const e=c.ExerciseEstimator.estimateWorkingWeight({exerciseId:"pec_deck",history:h});
  assert.equal(e.estimatedWeight,54);
  assert.equal(e.confidence,"low");
  assert.equal(e.requiresCalibration,false);
});
test("unseen same-unit same-group machine receives conservative labelled starting weight",()=>{
  const {c}=setup(),h=history(c,"chest_press",41,2);
  const id=c.DDXCatalog.items.find(x=>x.group==="Грудь" && x.equipmentType===c.DDXCatalog.get("chest_press").equipmentType &&
    x.unit===c.DDXCatalog.get("chest_press").unit && x.id!=="chest_press" && !h[0].exercises.some(e=>e.exerciseId===x.id)).id;
  const e=c.ExerciseEstimator.estimateWorkingWeight({exerciseId:id,history:h});
  assert.equal(e.confidence,"low");
  assert.ok(e.estimatedWeight>0&&e.estimatedWeight<41);
  assert.match(e.reason,/ПРОБНЫЙ ОРИЕНТИР/);
});
test("saved draft receives only missing weights; manual or completed rows stay unchanged",()=>{
  const {c,data}=setup(),h=history(c,"pec_deck",54,4);
  data[c.DDXStore.HKEY]=JSON.stringify(h);
  const st={rows:[
    {type:"working",w:"",r:"10",d:false,e:0},
    {type:"working",w:"44",r:"10",d:false,e:0,manualWeight:true},
    {type:"working",w:"",r:"10",d:false,e:0}
  ],repMin:10,trialEnabled:false};
  assert.equal(c.SessionProgression.prefill({exerciseId:"pec_deck"},st),true);
  assert.equal(st.rows[0].w,"54");
  assert.equal(st.rows[1].w,"44");
  assert.equal(st.rows[2].w,"54");
});
