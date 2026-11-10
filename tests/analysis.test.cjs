const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
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
  for (const f of ["catalog", "storage", "seed-workout", "workout-analysis"]) {
    vm.runInContext(fs.readFileSync(f + ".js", "utf8"), c);
    Object.assign(c, c.window);
  }
  return c;
}
test("seed analysis derives volume, instability, effort, skips, replacements and milestone without writes", () => {
  const c = setup(),
    s = c.WorkoutSeed.record(),
    before = JSON.stringify(s);
  const a = c.WorkoutAnalysis.analyzeWorkout(s, [s]);
  assert.match(a.summary, /18.*2/);
  assert.match(a.good.join(" "), /второго месяца/);
  assert.match(a.good.join(" "), /21 кг/);
  assert.match(a.attention.join(" "), /Вес менялся/);
  assert.match(a.attention.join(" "), /Пропущено.*1/);
  assert.match(a.attention.join(" "), /Замен упражнений: 3/);
  assert.match(a.next.join(" "), /Дип-тренажёр: не повышай/);
  assert.equal(JSON.stringify(s), before);
});
test("pain, incomplete sets and ambiguous units block progression", () => {
  for (const change of [
    (e) => (e.notes = "боль"),
    (e) => (e.rows[2].d = false),
    (e) => (e.rows[1].e = 6),
    (e) => (e.side = true),
    (e) => (e.rows[1].w = "25"),
  ]) {
    const c = setup(),
      s = c.WorkoutSeed.record();
    s.exercises = [s.exercises[1]];
    s.exercises[0].rows.forEach((r) => (r.e = 2));
    change(s.exercises[0]);
    const a = c.WorkoutAnalysis.analyzeWorkout(s, []);
    assert.match(a.next.join(" "), /не повышай/);
    assert.doesNotMatch(a.next.join(" "), /попробуй добавить/);
  }
});
test("only earlier matching units compare; empty and invalid histories are safe", () => {
  const c = setup(),
    s = c.WorkoutSeed.record(),
    old = JSON.parse(JSON.stringify(s));
  old.id = "earlier";
  old.start -= 100000;
  old.exercises[1].rows[1].w = "15";
  const before = JSON.stringify([s, old]);
  const a = c.WorkoutAnalysis.analyzeWorkout(s, [s, old]);
  assert.match(a.good.join(" "), /условный объём/);
  assert.equal(JSON.stringify([s, old]), before);
  assert.doesNotMatch(
    JSON.stringify(c.WorkoutAnalysis.analyzeWorkout(old, [s])),
    /условный объём/,
  );
  assert.match(c.WorkoutAnalysis.analyzeWorkout(null, []).summary, /Мало/);
});
