const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
function setup() {
  const c = { window: {}, localStorage: { getItem: () => null } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync("catalog.js", "utf8"), c);
  return c.window.DDXCatalog;
}
test("all 34 explicitly listed DDX exercises have unique stable identities and seven groups", () => {
  const c = setup();
  assert.equal(c.items.length, 34);
  assert.equal(new Set(c.items.map((x) => x.id)).size, 34);
  assert.equal(new Set(c.items.map((x) => x.group)).size, 7);
});
test("uncertain and ranged data never become confirmed weights", () => {
  const c = setup();
  for (const id of [
    "rope_pushdown",
    "ez_preacher",
    "seated_leg_curl",
    "seated_leg_extension",
    "lateral_delt_machine",
  ]) {
    assert.equal(c.get(id).weight, null);
    assert.equal(c.get(id).requiresConfirmation, true);
  }
  assert.equal(c.get("dip_machine").weight, 100);
  assert.equal(c.get("pendulum_squat").reference, "60×6");
  assert.equal(c.get("pendulum_squat").reps, 8);
});
test("legacy identities separate replacements and preserve unknown exercises", () => {
  const c = setup();
  assert.equal(c.identity({ id: "dbbench" }), "db_bench");
  assert.equal(
    c.identity({ id: "dbbench", replacement: "Жим лёжа в Смите" }),
    "smith_bench",
  );
  assert.equal(c.identity({ id: "unknown" }), "legacy:unknown");
  assert.equal(
    c.identity({ id: "dbbench", replacement: "Мой жим" }),
    "legacy-replacement:Мой жим",
  );
  assert.equal(
    c.identity({ id: "x", exerciseId: "smith_bench" }),
    "smith_bench",
  );
});
test("real history drives canonical progression across days without touching source history", () => {
  const row = { w: "52.5", r: "8", e: 2, d: true };
  const record = {
    id: "s",
    kind: "pull",
    start: 1000,
    end: 2000,
    exercises: [
      {
        id: "other-slot",
        exerciseId: "smith_bench",
        name: "Жим лёжа в Смите",
        rows: [row, row, row, row],
      },
    ],
  };
  const raw = JSON.stringify([record]);
  const c = {
    window: {},
    localStorage: { getItem: () => raw },
    document: { body: { dataset: { kind: "push" } } },
    console,
  };
  vm.createContext(c);
  for (const file of ["catalog", "storage", "progression"]) {
    vm.runInContext(fs.readFileSync(file + ".js", "utf8"), c);
    Object.assign(c, c.window);
  }
  assert.equal(
    c.DDXProgress.recommend({
      id: "dbbench",
      exerciseId: "smith_bench",
      workR: 8,
    }).weight,
    52.5,
  );
  assert.equal(
    c.DDXProgress.recommend({ id: "dbbench", workR: 8 }).weight,
    undefined,
  );
  assert.equal(c.DDXCatalog.latest("smith_bench").s.kind, "pull");
  assert.equal(c.localStorage.getItem(), raw);
});
