const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
function setup() {
  const data = {};
  const c = {
    window: {},
    localStorage: {
      getItem: (k) => data[k] ?? null,
      setItem: (k, v) => (data[k] = v),
    },
    document: {
      createElement: () => ({ setAttribute() {} }),
      body: { prepend() {} },
    },
  };
  vm.createContext(c);
  for (const f of ["catalog", "storage", "seed-workout"]) {
    vm.runInContext(fs.readFileSync(f + ".js", "utf8"), c);
    Object.assign(c, c.window);
  }
  return { c, data };
}
test("historical seed preserves existing sessions, is idempotent and has exact metrics", () => {
  const { c, data } = setup();
  const first = c.DDXStore.history()[0];
  assert.equal(c.DDXStore.metrics(first).work, 18);
  assert.equal(c.DDXStore.metrics(first).kk, 2);
  assert.equal(first.end - first.start, 4195000);
  assert.equal(c.WorkoutSeed.seed(), false);
  delete data[c.WorkoutSeed.MARKER];
  c.WorkoutSeed.seed();
  assert.equal(c.DDXStore.history().length, 1);
  data.ddx_history_v1 = JSON.stringify([{ ...first, id: "user-existing" }]);
  delete data[c.WorkoutSeed.MARKER];
  c.WorkoutSeed.seed();
  assert.equal(c.DDXStore.history()[0].id, "user-existing");
  assert.equal(c.DDXStore.history().length, 1);
});
test("seed maps replacements, skips shoulder and blocks unstable dip recommendation", () => {
  const { c } = setup();
  const s = c.DDXStore.history()[0];
  assert.equal(
    s.exercises.find((e) => e.id === "lateral").exerciseId,
    "dip_machine",
  );
  assert.equal(
    s.exercises.find((e) => e.id === "abs").exerciseId,
    "rope_pushdown",
  );
  assert.equal(s.exercises.find((e) => e.id === "shoulder").skipped, true);
  assert.equal(c.DDXCatalog.reliable("dip_machine").weight, null);
  assert.match(c.DDXCatalog.reliable("dip_machine").reason, /Вес менялся/);
  assert.equal(
    s.exercises.some((e) => e.exerciseId === "ab_machine"),
    false,
  );
});
test("corrupt history and failed writes are not overwritten or marked complete", () => {
  const { c, data } = setup();
  delete data[c.WorkoutSeed.MARKER];
  data.ddx_history_v1 = "{";
  assert.throws(() => c.WorkoutSeed.seed());
  assert.equal(data.ddx_history_v1, "{");
  assert.equal(data[c.WorkoutSeed.MARKER], undefined);
  data.ddx_history_v1 = "[]";
  c.localStorage.setItem = () => {
    throw Error("quota");
  };
  assert.throws(() => c.WorkoutSeed.seed());
  assert.equal(data.ddx_history_v1, "[]");
});
test('unrelated history survives seed and exported marker prevents re-import after restore',()=>{
 const {c,data}=setup();const old={...c.WorkoutSeed.record(),id:'unrelated',report:'Другая тренировка',start:1000,end:4196000};data.ddx_history_v1=JSON.stringify([old]);delete data[c.WorkoutSeed.MARKER];c.WorkoutSeed.seed();assert.equal(c.DDXStore.history().length,2);assert.equal(c.DDXStore.history()[0].id,'unrelated');const backup={format:'ddx-training-backup',version:1,storage:{...data}};for(const key of Object.keys(data))delete data[key];c.DDXStore.restore(backup);c.WorkoutSeed.seed();assert.equal(c.DDXStore.history().length,2);
});
