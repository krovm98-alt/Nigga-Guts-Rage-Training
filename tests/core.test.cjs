const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
function setup() {
  const data = {};
  const storage = {
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => (data[k] = v),
    removeItem: (k) => delete data[k],
  };
  const c = {
    window: {},
    localStorage: storage,
    document: { body: { dataset: { kind: "push" } } },
    console,
    Date,
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync("storage.js", "utf8"), c);
  c.DDXStore = c.window.DDXStore;
  vm.runInContext(fs.readFileSync("progression.js", "utf8"), c);
  return { store: c.DDXStore, progress: c.window.DDXProgress, storage, data };
}
const row = (w = "20", r = "10", e = 3, d = true) => ({ w, r, e, d });
const session = () => ({
  id: "one",
  kind: "push",
  start: 1000,
  end: 2000,
  exercises: [
    {
      id: "press",
      name: "Жим гантелей",
      notes: "",
      rows: [row("10"), row(), row(), row()],
    },
  ],
});
test("double progression adds reps before weight and never guesses equipment step", () => {
  const { store, progress, storage } = setup();
  const s = session();
  s.exercises[0].rows.slice(1).forEach((r) => (r.r = "8"));
  storage.setItem(store.HKEY, JSON.stringify([s]));
  let rec = progress.recommend({ id: "press", workR: 10 });
  assert.equal(rec.weight, 20);
  assert.equal(rec.reps, 9);
  storage.setItem(store.HKEY, JSON.stringify([session()]));
  rec = progress.recommend({ id: "press", workR: 10 });
  assert.equal(rec.weight, undefined);
  assert.match(rec.text, /минимальный доступный шаг/);
});
test("pain, missing effort, incomplete, mixed weight and skipped records never raise weight", () => {
  for (const mutate of [
    (s) => (s.exercises[0].notes = "болит плечо"),
    (s) => (s.exercises[0].rows[1].e = 0),
    (s) => (s.exercises[0].rows[1].e = 4),
    (s) => (s.exercises[0].rows[1].d = false),
    (s) => (s.exercises[0].rows[1].w = "25"),
    (s) => (s.exercises[0].skipped = true),
    (s) => (s.exercises[0].tags = ["колено чувствуется"]),
  ]) {
    const { store, progress, storage } = setup(),
      s = session();
    mutate(s);
    storage.setItem(store.HKEY, JSON.stringify([s]));
    const rec = progress.recommend({ id: "press", workR: 10 });
    assert.ok(rec.weight === undefined || rec.weight <= 20);
  }
});
test("analytics excludes warmups, skips, blanks and accepts decimal comma", () => {
  const { store } = setup();
  const s = session();
  s.exercises[0].rows[1].w = "20,5";
  assert.equal(store.metrics(s).volume, 605);
  s.exercises[0].rows[2].w = "";
  assert.equal(store.metrics(s).work, 2);
  s.exercises[0].skipped = true;
  assert.equal(store.metrics(s).work, 0);
});
test("v1 backups merge by id and retain old history; repeated restore is idempotent", () => {
  const { store, storage } = setup(),
    s = session();
  storage.setItem(store.HKEY, JSON.stringify([s]));
  const other = { ...session(), id: "two" };
  const backup = {
    format: "ddx-training-backup",
    version: 1,
    storage: { [store.HKEY]: JSON.stringify([other]) },
  };
  store.restore(backup);
  store.restore(backup);
  assert.equal(store.history().length, 2);
});
test("corrupt JSON, schema, future version rejected before writes", () => {
  const { store, storage } = setup();
  storage.setItem(store.HKEY, JSON.stringify([session()]));
  const before = storage.getItem(store.HKEY);
  for (const b of [
    { format: "ddx-training-backup", version: 2, storage: {} },
    {
      format: "ddx-training-backup",
      version: 1,
      storage: { ddx_history_v1: "{" },
    },
    {
      format: "ddx-training-backup",
      version: 1,
      storage: { ddx_history_v1: '[{"id":"x","start":1}]' },
    },
  ])
    assert.throws(() => store.restore(b));
  assert.equal(storage.getItem(store.HKEY), before);
});
test("corrupt stored history is preserved, not replaced with empty array", () => {
  const { store, storage } = setup();
  storage.setItem(store.HKEY, "{");
  assert.throws(store.history);
  assert.equal(storage.getItem(store.HKEY), "{");
});
test("restore rolls back writes when quota is exceeded", () => {
  const { store, storage } = setup();
  const initial = JSON.stringify([session()]);
  storage.setItem(store.HKEY, initial);
  const base = storage.setItem;
  storage.setItem = (k, v) => {
    if (k.includes("push_v4")) throw Error("quota");
    base(k, v);
  };
  const b = {
    format: "ddx-training-backup",
    version: 1,
    storage: {
      ddx_history_v1: JSON.stringify([{ ...session(), id: "two" }]),
      ddx_push_v4_2026: JSON.stringify({ ex: {} }),
    },
  };
  assert.throws(() => store.restore(b), /отменены/);
  assert.equal(storage.getItem(store.HKEY), initial);
});
test("legacy extra settings survive import without being interpreted", () => {
  const { store, storage } = setup();
  store.restore({
    format: "ddx-training-backup",
    version: 1,
    storage: { ddx_legacy_preferences: '{"theme":"dark"}' },
  });
  assert.equal(storage.getItem("ddx_legacy_preferences"), '{"theme":"dark"}');
});
test("v2 draft migration fills optional metadata and preserves recorded values", () => {
  const { store } = setup();
  const old = {
    start: 1000,
    end: null,
    ex: {
      press: { rows: [row("10", "8", 0, false), row("22", "9", 3, true)] },
    },
  };
  const migrated = store.migrateState(old);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.ex.press.rows[1].w, "22");
  assert.equal(migrated.ex.press.rows[1].d, true);
  assert.equal(migrated.ex.press.alt, -1);
  assert.equal(old.ex.press.alt, undefined);
  assert.throws(() => store.migrateState({ ex: { press: { rows: [null] } } }));
});
