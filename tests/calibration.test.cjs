const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
function setup() {
  const c = { window: {}, localStorage: { getItem: () => null } };
  vm.createContext(c);
  for (const f of ["catalog", "storage", "weight-calibration"]) {
    vm.runInContext(fs.readFileSync(f + ".js", "utf8"), c);
    Object.assign(c, c.window);
  }
  return c;
}
const row = (w, r = 8, e = 2, d = true) => ({
  w: String(w),
  r: String(r),
  e,
  d,
});
const history = () => [
  {
    id: "past",
    kind: "push",
    start: 1000,
    end: 2000,
    exercises: [
      {
        id: "dbbench",
        exerciseId: "db_bench",
        name: "Жим",
        rows: [row(12), row(21), row(21), row(21)],
      },
    ],
  },
];
const state = () => ({
  rows: [
    row(14),
    row("", 8, 0, false),
    row("", 8, 0, false),
    row("", 8, 0, false),
  ],
});
test("actual 14 kg trial uses compatible historical 12 kg trial and repeats 21 without multiplier", () => {
  const c = setup(),
    r = c.WeightCalibration.evaluate("db_bench", state(), history());
  assert.equal(r.trial.weight, 12);
  assert.equal(r.work.weight, 21);
  assert.match(r.work.reason, /14 кг/);
  assert.equal(r.work.sets, 3);
});
test("weak probe, poor effort, pain, ambiguity and unstable history never escalate", () => {
  for (const change of [
    (s) => (s.rows[0].w = "5"),
    (s) => (s.rows[0].r = "2"),
    (s) => (s.rows[0].e = 6),
    (s) => (s.rows[0].e = 0),
    (s) => (s.n = "дискомфорт"),
    (s) => (s.side = true),
    (s) => (s.rows[0].d = false),
  ]) {
    const c = setup(),
      s = state();
    change(s);
    assert.equal(
      c.WeightCalibration.evaluate("db_bench", s, history()).work.weight,
      null,
    );
  }
  const c = setup(),
    h = history();
  h[0].exercises[0].rows[2].w = "19";
  assert.equal(
    c.WeightCalibration.evaluate("db_bench", state(), h).work.weight,
    null,
  );
});
test("trial apply changes only trial; work apply preserves completed and manually edited rows", () => {
  const c = setup(),
    s = state();
  s.rows[0].d = false;
  let r = c.WeightCalibration.evaluate("db_bench", s, history());
  c.WeightCalibration.apply(s, r, "trial");
  assert.equal(s.rows[0].w, "12");
  assert.equal(s.rows[1].w, "");
  s.rows[0].d = true;
  s.rows[0].e = 2;
  r = c.WeightCalibration.evaluate("db_bench", s, history());
  s.rows[1] = row(20);
  s.rows[2].w = "19";
  s.rows[2].manualWeight = true;
  c.WeightCalibration.apply(s, r, "work");
  assert.equal(s.rows[0].w, "12");
  assert.equal(s.rows[1].w, "20");
  assert.equal(s.rows[2].w, "19");
  assert.equal(s.rows[3].w, "21");
  assert.equal(s.calibration.work.exerciseId, "db_bench");
});
test("unknown and uncertain catalog weights stay manual; all catalog entries are handled", () => {
  const c = setup();
  for (const x of c.DDXCatalog.items)
    assert.ok(c.WeightCalibration.evaluate(x.id, state(), []).work.reason);
  for (const id of [
    "unknown",
    "rope_pushdown",
    "lateral_delt_machine",
    "seated_leg_curl",
  ])
    assert.equal(
      c.WeightCalibration.evaluate(id, state(), []).work.weight,
      null,
    );
  const s = state(),
    r = c.WeightCalibration.evaluate("smith_bench", s, []);
  assert.equal(r.source, "Подтверждённый исходный ориентир");
  assert.equal(r.work.weight, null);
});

test("hard final set keeps a conservative trial hint without enabling working load", () => {
  const c = setup(), h = history();
  h[0].exercises[0].rows[3].e = 4;
  const result = c.WeightCalibration.evaluate("db_bench", state(), h);
  assert.equal(result.trial.weight, 12);
  assert.equal(result.trial.reps, 8);
  assert.equal(result.work.weight, null);
});
test("unstable dip history still suggests a cautious trial without trusting 106.5 kg", () => {
  const c = setup(), h = history();
  h[0].exercises[0] = {
    id: "dip", exerciseId: "dip_machine", name: "Дип-тренажёр",
    rows: [row(79, 8, 3), row(106.5, 8, 4), row(106.5, 7, 6), row(79, 8, 6)],
  };
  const result = c.WeightCalibration.evaluate("dip_machine", state(), h);
  assert.equal(result.trial.weight, 60);
  assert.equal(result.work.weight, null);
});
test("unknown exercise or current pain must not suggest trial weights", () => {
  const c = setup();
  assert.equal(c.WeightCalibration.evaluate("unknown", state(), []).trial.weight, null);
  const st = state(); st.n = "боль";
  assert.equal(c.WeightCalibration.evaluate("db_bench", st, history()).trial.weight, null);
});
test("do not suggest a trial heavier than the smallest completed recent load", () => {
  const c = setup(), h = history();
  h[0].exercises[0].rows[3].w = "10";
  assert.equal(c.WeightCalibration.evaluate("db_bench", state(), h).trial.weight, null);
});
