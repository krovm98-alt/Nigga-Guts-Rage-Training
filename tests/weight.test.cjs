const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
function setup(mutate) {
  const row = () => ({ w: "20,5", r: "8", e: 2, d: true });
  const e = {
    id: "dbbench",
    name: "Жим",
    exerciseId: "db_bench",
    rows: [row(), row(), row(), row()],
  };
  mutate(e);
  const old = {
    id: "old",
    kind: "push",
    start: 1000,
    end: 2000,
    exercises: [
      { id: "dbbench", name: "Жим", rows: [row(), row(), row(), row()] },
    ],
  };
  const c = {
    window: {},
    localStorage: {
      getItem: () =>
        JSON.stringify([
          old,
          { id: "new", kind: "push", start: 3000, end: 4000, exercises: [e] },
        ]),
    },
  };
  vm.createContext(c);
  for (const f of ["catalog", "storage"]) {
    vm.runInContext(fs.readFileSync(f + ".js", "utf8"), c);
    Object.assign(c, c.window);
  }
  return c.DDXCatalog;
}
test("reliable weight uses complete equal decimal weights without doubling", () =>
  assert.equal(setup(() => {}).reliable("db_bench").weight, 20.5));
test("latest unsafe session never falls back to older stable history", () => {
  for (const change of [
    (e) => (e.rows[2].w = "22"),
    (e) => (e.rows[2].d = false),
    (e) => (e.rows[2].e = 5),
    (e) => (e.notes = "болит"),
    (e) => (e.side = true),
    (e) => (e.unit = "другая"),
    (e) => (e.equipment = "другое"),
    (e) => (e.skipped = true),
    (e) => (e.rows[2].r = "0"),
    (e) => (e.rows[2].w = "Infinity"),
  ]) {
    const r = setup(change).reliable("db_bench");
    assert.equal(r.weight, null);
    assert.equal(r.last.s.id, "new");
  }
});
test("mixed weights are shown as facts and never averaged", () => {
  const c = setup((e) => (e.rows[2].w = "22"));
  const r = c.reliable("db_bench");
  assert.match(r.reason, /Вес менялся/);
  assert.match(r.facts, /22×8/);
  assert.equal(r.weight, null);
});
