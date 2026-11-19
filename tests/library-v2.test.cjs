const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
function setup() {
  const data = {},
    c = {
      window: {},
      localStorage: {
        getItem: (k) => data[k] ?? null,
        setItem: (k, v) => (data[k] = v),
      },
    };
  vm.createContext(c);
  for (const f of [
    "catalog",
    "storage",
    "exercise-weight-estimator",
    "adaptive-plan",
  ]) {
    vm.runInContext(fs.readFileSync(f + ".js", "utf8"), c);
    Object.assign(c, c.window);
  }
  return { c, data };
}
test("explicit first working row counts, skips excluded, legacy unchanged", () => {
  const { c } = setup(),
    r = { w: "20", r: "8", e: 2, d: true },
    legacy = { rows: [r, r, r, r] },
    snapshot = JSON.stringify(legacy);
  assert.equal(c.DDXStore.workRows(legacy).length, 3);
  assert.equal(JSON.stringify(legacy), snapshot);
  assert.equal(
    c.DDXStore.workRows({
      rows: [
        { ...r, type: "working" },
        { ...r, type: "working", skipped: true },
      ],
    }).length,
    1,
  );
});
test("catalog metadata exists without fabricated results for additions", () => {
  const { c } = setup();
  assert.equal(c.DDXCatalog.items.length, 78);
  for (const x of c.DDXCatalog.items) {
    assert.ok(x.technique);
    assert.ok(x.equipmentType);
    assert.ok(x.repRange.length === 2);
    assert.ok(Array.isArray(x.compatibleExerciseIds));
  }
  assert.equal(c.DDXCatalog.get("barbell_bench").weight, null);
});
test("estimator uses exact recent history, manual reference, never machine transfer", () => {
  const { c } = setup(),
    row = { type: "working", w: "21", r: "8", e: 2, d: true },
    now = Date.now(),
    history = [
      {
        id: "test",
        kind: "push",
        start: now - 100000,
        end: now - 1000,
        exercises: [
          { id: "dbbench", exerciseId: "db_bench", rows: [row, row, row] },
        ],
      },
    ];
  let r = c.ExerciseEstimator.estimateWorkingWeight({
    exerciseId: "db_bench",
    history,
    now,
  });
  assert.equal(r.estimatedWeight, 21);
  assert.equal(r.confidence, "high");
  assert.equal(r.requiresCalibration, false);
  r = c.ExerciseEstimator.estimateWorkingWeight({
    exerciseId: "smith_bench",
    history,
    now,
  });
  assert.equal(r.estimatedWeight, null);
  assert.equal(r.requiresCalibration, true);
  r = c.ExerciseEstimator.estimateWorkingWeight({
    exerciseId: "db_bench",
    history,
    now: now + 90 * 86400000,
  });
  assert.equal(r.estimatedWeight, null);
  const x = c.DDXCatalog.get("barbell_bench");
  c.ExerciseEstimator.updatePreference(x.id, {
    reference: { weight: 40, equipment: x.equipment, unit: x.unit },
  });
  r = c.ExerciseEstimator.estimateWorkingWeight({ exerciseId: x.id });
  assert.equal(r.estimatedWeight, 40);
  assert.equal(r.confidence, "medium");
});
test("typed draft migration preserves hidden completed trial, and backup fields survive restore", () => {
  const { c, data } = setup(),
    draft = {
      ex: {
        test: {
          trialEnabled: false,
          rows: [
            { type: "trial", w: "10", r: "8", e: 2, d: true },
            { type: "working", w: "20", r: "8", e: 2, d: true, skipped: true },
          ],
        },
      },
    };
  const migrated = c.DDXStore.migrateState(draft);
  assert.equal(migrated.ex.test.trialEnabled, false);
  assert.equal(migrated.ex.test.rows[0].type, "trial");
  assert.equal(migrated.ex.test.rows[1].skipped, true);
  const prefs = '{"barbell_bench":{"trialEnabled":false,"favorite":true}}';
  c.DDXStore.restore({
    format: "ddx-training-backup",
    version: 1,
    storage: {
      ddx_custom_v4: JSON.stringify(migrated),
      ddx_exercise_preferences_v1: prefs,
    },
  });
  assert.equal(data.ddx_exercise_preferences_v1, prefs);
  assert.equal(JSON.parse(data.ddx_custom_v4).ex.test.rows[1].type, "working");
});
test("explicit new trial can repeat observed weight without inventing an increase", () => {
  const { c } = setup();
  vm.runInContext(fs.readFileSync("weight-calibration.js", "utf8"), c);
  const st = {
    trialEnabled: true,
    repMin: 8,
    rows: [
      { type: "trial", w: "40", r: "8", e: 2, d: true },
      { type: "working", w: "", r: "8", e: 0, d: false },
    ],
  };
  const result = c.window.WeightCalibration.evaluate("barbell_bench", st, []);
  assert.equal(result.work.weight, 40);
  assert.match(result.work.confidence, /низкая/);
  st.rows[0].e = 6;
  assert.equal(
    c.window.WeightCalibration.evaluate("barbell_bench", st, []).work.weight,
    null,
  );
});

test('current fatigue overrides saved reference',()=>{const {c}=setup(),x=c.DDXCatalog.get('barbell_bench');c.ExerciseEstimator.updatePreference(x.id,{reference:{weight:40,unit:x.unit,equipment:x.equipment}});const result=c.ExerciseEstimator.estimateWorkingWeight({exerciseId:x.id,recentPerformance:{effort:5}});assert.equal(result.estimatedWeight,null);assert.equal(result.requiresCalibration,true);});
