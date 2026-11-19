// Regression scenarios below explicitly opt into the pre-V2 trial workflow.
const fs = require("node:fs"),
  vm = require("node:vm");
const c = { window: {} };
vm.createContext(c);
vm.runInContext(fs.readFileSync("catalog.js", "utf8"), c);
const ids = c.window.DDXCatalog.items.map((x) => x.id);
module.exports = (test) =>
  test.beforeEach(async ({ context }) =>
    context.addInitScript((ids) => {
      if (!localStorage.getItem("ddx_exercise_preferences_v1"))
        localStorage.setItem(
          "ddx_exercise_preferences_v1",
          JSON.stringify(
            Object.fromEntries(ids.map((id) => [id, { trialEnabled: true }])),
          ),
        );
    }, ids),
  );
