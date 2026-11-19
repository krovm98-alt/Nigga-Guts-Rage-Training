const { test, expect } = require("@playwright/test");
test.beforeEach(async ({ context }) =>
  context.addInitScript(() =>
    localStorage.setItem("ddx_seed_second_month_v1", '{"version":1}'),
  ),
);
test("default working rows, optional trial, DOM-preserving order and reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("push.html");
  expect(
    await page.evaluate(() => S.ex.dbbench.rows.map((r) => r.type)),
  ).toEqual(["working", "working", "working"]);
  await page.locator("#ex-dbbench .ex-head").click();
  await page.locator("#ex-dbbench input.iw").first().fill("21");
  await page.locator("#ex-dbbench .plan-editor summary").click();
  await page.getByLabel("Пробный подход", { exact: true }).first().check();
  expect(await page.evaluate(() => DDXStore.trialRow(S.ex.dbbench).type)).toBe(
    "trial",
  );
  await page.getByLabel("Пробный подход", { exact: true }).first().uncheck();
  await expect(page.locator("#ex-dbbench input.iw")).toHaveCount(3);
  await page.evaluate(() => {
    window.savedCard = document.querySelector("#ex-dbbench");
    S.rest = { end: Date.now() + 90000, label: "test" };
    save();
  });
  await page.getByRole("button", { name: "УПРАЖНЕНИЯ", exact: true }).click();
  await page.getByRole("button", { name: "ИЗМЕНИТЬ ПОРЯДОК" }).click();
  await page
    .locator('.jump-row[data-id="dbbench"]')
    .getByRole("button", { name: /Ниже:/ })
    .click();
  expect(
    await page.evaluate(
      () => window.savedCard === document.querySelector("#ex-dbbench"),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => DDXStore.plannedRows(S.ex.dbbench)[0].w),
  ).toBe("21");
  expect(await page.evaluate(() => S.rest.label)).toBe("test");
  const order = await page.evaluate(() => EX.map((e) => e.id));
  await page.reload();
  expect(await page.evaluate(() => EX.map((e) => e.id))).toEqual(order);
  expect(errors).toEqual([]);
});
test("catalog filters and favorites, sheet fits narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("custom.html");
  await page
    .getByRole("button", { name: "Добавить упражнение", exact: true })
    .click();
  await page.getByLabel("Поиск по названию").fill("Жим штанги лёжа");
  const chosen = page.getByRole("button", { name: /Выбрать:/ });
  await expect(chosen).toHaveCount(1);
  await page.getByRole("button", { name: "☆ В избранное" }).click();
  await page.getByLabel("Избранное").check();
  await expect(chosen).toHaveCount(1);
  await chosen.click();
  await expect
    .poll(() => page.evaluate(() => EX.filter((e) => e.type === "sets").length))
    .toBe(1);
  await page.getByRole("button", { name: "УПРАЖНЕНИЯ", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/library-v2-320.png" });
});
test("completed trial can be retained or cancellation leaves it enabled; new variation calibrates", async ({
  page,
}) => {
  await page.goto("custom.html");
  await page
    .getByRole("button", { name: "Добавить упражнение", exact: true })
    .click();
  await page.getByLabel("Поиск по названию").fill("Жим штанги лёжа");
  await page
    .getByRole("button", { name: "Выбрать: Жим штанги лёжа", exact: true })
    .click();
  const card = page.locator(".ex").filter({
    has: page.getByRole("heading", { name: "Жим штанги лёжа", exact: true }),
  });
  await expect(card).toBeVisible();
  await card.locator(".ex-head").click();
  await card
    .getByRole("button", { name: "Проверить вес пробным подходом" })
    .click();
  await card.locator("input.iw").first().fill("40");
  await card.locator("button.eff").first().click();
  await card.locator("button.ok").first().click();
  await expect(card.locator(".cal")).toContainText("40 кг");
  page.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "Применить рабочий вес" }).click();
  await expect(card.locator("input.iw").nth(1)).toHaveValue("40");
  await card.locator(".plan-editor summary").click();
  const toggle = card.getByLabel("Пробный подход", { exact: true });
  page.once("dialog", (d) => d.dismiss());
  await toggle.click();
  await expect(toggle).toBeChecked();
  page.once("dialog", (d) => d.accept());
  await toggle.uncheck();
  expect(
    await page.evaluate(
      () =>
        DDXStore.trialRow(
          S.ex[EX.find((e) => e.exerciseId === "barbell_bench").id],
        ).d,
    ),
  ).toBe(true);
  await expect(card.locator("input.iw")).toHaveCount(3);
});
test("touch pointer drag retains completed values and custom does not modify base", async ({
  page,
}) => {
  await page.goto("push.html");
  const base = await page.evaluate(() => EX.map((e) => e.id));
  await page.goto("custom.html");
  await page
    .getByText("Добавить упражнения из шаблона", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Добавить PUSH", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => (typeof EX === "undefined" ? 0 : EX.length)),
    )
    .toBeGreaterThan(2);
  await page.evaluate(() => {
    const r = DDXStore.plannedRows(S.ex[EX[1].id])[0];
    Object.assign(r, { w: "21", r: "8", e: 2, d: true });
    save();
  });
  const before = await page.evaluate(() => EX.map((e) => e.id));
  await page.getByRole("button", { name: "УПРАЖНЕНИЯ", exact: true }).click();
  await page.getByRole("button", { name: "ИЗМЕНИТЬ ПОРЯДОК" }).click();
  const handles = page.locator(".drag-handle"),
    from = await handles.nth(1).boundingBox(),
    to = await handles.nth(2).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x + 10, y: from.y + 10 }],
  });
  for (let i = 1; i <= 6; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + 10 + ((to.x - from.x) * i) / 6,
          y: from.y + 10 + ((to.y - from.y) * i) / 6,
        },
      ],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const after = await page.evaluate(() => EX.map((e) => e.id));
  expect(after[2]).toBe(before[1]);
  expect(
    await page.evaluate((id) => DDXStore.plannedRows(S.ex[id])[0].d, before[1]),
  ).toBe(true);
  await page.reload();
  expect(await page.evaluate(() => EX.map((e) => e.id))).toEqual(after);
  await page.goto("push.html");
  expect(await page.evaluate(() => EX.map((e) => e.id))).toEqual(base);
});
test("history correction backs up, changes canonical exercise and excludes skipped row", async ({
  page,
}) => {
  await page.goto("index.html");
  await page.evaluate(() => {
    const row = { type: "working", w: "40", r: "8", e: 2, d: true };
    localStorage.setItem(
      DDXStore.HKEY,
      JSON.stringify([
        {
          id: "correction",
          kind: "custom",
          start: Date.now() - 100000,
          end: Date.now() - 1000,
          exercises: [
            {
              id: "test",
              exerciseId: "smith_bench",
              name: "Смит",
              rows: [{ ...row, type: "trial" }, row, { ...row }],
            },
          ],
        },
      ]),
    );
  });
  await page.reload();
  await page.locator(".session > summary").click();
  await page.getByRole("button", { name: "ИЗМЕНИТЬ ПОДХОДЫ" }).click();
  await page.getByLabel("Фактическое упражнение").selectOption("barbell_bench");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Удалить ошибочную пробу" }).click();
  await page.getByLabel("Пропустить подход", { exact: true }).last().check();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "СОХРАНИТЬ ИЗМЕНЕНИЯ" }).click();
  expect(
    await page.evaluate(() => DDXStore.history()[0].exercises[0].exerciseId),
  ).toBe("barbell_bench");
  expect(
    await page.evaluate(() => DDXStore.metrics(DDXStore.history()[0]).work),
  ).toBe(1);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) =>
        k.startsWith("ddx_history_revision_"),
      ),
    ),
  ).toBe(true);
});
test("default-off confirmed history, working status and jump focus preserve timer offline", async ({
  page,
  context,
}) => {
  await page.goto("index.html");
  await page.evaluate(() => {
    const r = { type: "working", w: "21", r: "8", e: 2, d: true };
    localStorage.setItem(
      DDXStore.HKEY,
      JSON.stringify([
        {
          id: "recent",
          kind: "custom",
          start: Date.now() - 100000,
          end: Date.now() - 1000,
          exercises: [
            {
              id: "bench",
              exerciseId: "db_bench",
              name: "Жим",
              rows: [r, r, r],
            },
          ],
        },
      ]),
    );
  });
  await page.goto("push.html");
  await page.locator("#ex-dbbench .ex-head").click();
  await expect(page.locator("#ex-dbbench input.iw").first()).toHaveValue("21");
  await expect(page.locator("#ex-dbbench .cal")).toContainText("высокая");
  await page.locator("#ex-dbbench button.eff").first().click();
  await page.locator("#ex-dbbench button.ok").first().click();
  const rest = await page.evaluate(() => JSON.stringify(S.rest));
  await page.getByRole("button", { name: "УПРАЖНЕНИЯ", exact: true }).click();
  await expect(page.locator('.jump-row[data-id="dbbench"]')).toContainText(
    "1/3",
  );
  for (const width of [320, 360, 390, 412]) {
    await page.setViewportSize({ width, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.locator('.jump-row[data-id="dbbench"] button').first().click();
  await expect(page.locator("#ex-dbbench .ex-head")).toBeFocused();
  expect(await page.evaluate(() => JSON.stringify(S.rest))).toBe(rest);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "УПРАЖНЕНИЯ", exact: true }).click();
  await expect(page.locator('.jump-row[data-id="dbbench"]')).toContainText(
    "1/3",
  );
  await page.screenshot({ path: "/tmp/library-v2-offline.png" });
});
