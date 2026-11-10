const { test, expect } = require("@playwright/test");
async function replace(page) {
  await page.goto("push.html");
  await page.locator("#ex-dbbench .ex-head").click();
  await page
    .locator("#ex-dbbench")
    .getByRole("button", { name: "Заменить упражнение", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Выбрать: Жим лёжа в Смите", exact: true })
    .click();
  await expect(page.locator("#ex-dbbench h3")).toHaveText("Жим лёжа в Смите");
}
test("replacement persists, archives canonical identity, exports and leaves next plan intact", async ({
  page,
}) => {
  await replace(page);
  await page.reload();
  expect(await page.evaluate(() => S.ex.dbbench.rows[1].w)).toBe("50");
  expect(
    await page.evaluate(() => EX.find((x) => x.id === "dbincline").name),
  ).toBe("Жим гантелей на наклонной");
  await page.locator("#ex-dbbench .ex-head").click();
  await page.locator("#ex-dbbench button.ok").nth(1).click();
  await page
    .locator("#ex-dbbench")
    .getByRole("button", { name: "Заменить упражнение", exact: true })
    .click();
  await expect(page.locator("dialog")).toHaveCount(0);
  await page.evaluate(() => finish());
  expect(
    await page.evaluate(
      () =>
        DDXStore.history()[0].exercises.find((x) => x.id === "dbbench")
          .exerciseId,
    ),
  ).toBe("smith_bench");
  await page.evaluate(() => {
    const backup = {
      format: "ddx-training-backup",
      version: 1,
      storage: Object.fromEntries(
        Object.keys(localStorage)
          .filter((k) => k.startsWith("ddx_"))
          .map((k) => [k, localStorage.getItem(k)]),
      ),
    };
    localStorage.clear();
    DDXStore.restore(backup);
  });
  expect(
    await page.evaluate(
      () =>
        DDXStore.history()[0].exercises.find((x) => x.id === "dbbench")
          .sessionExerciseId,
    ),
  ).toContain("dbbench");
  page.once("dialog", (d) => d.accept());
  await page.evaluate(() => newSession());
  await page.waitForURL("**/push.html");
  await expect(page.locator("#ex-dbbench h3")).toHaveText("ЖИМ ГАНТЕЛЕЙ ЛЁЖА");
});
test("extra exercise, duplicate protection, order, completed deletion protection and history", async ({
  page,
}) => {
  await page.goto("push.html");
  await page
    .getByRole("button", { name: "Добавить упражнение", exact: true })
    .click();
  await page.getByLabel("Число рабочих подходов").fill("2");
  await page
    .getByRole("button", { name: "Выбрать: Грудной тренажёр", exact: true })
    .click();
  const card = page
    .locator(".ex")
    .filter({
      has: page.getByRole("heading", { name: "Грудной тренажёр", exact: true }),
    });
  await card.locator(".ex-head").click();
  await card.getByRole("button", { name: "Переместить выше" }).click();
  await card.locator(".ex-head").click();
  await expect(card.locator("button.ok")).toHaveCount(3);
  await card.locator("button.ok").nth(1).click();
  await card
    .getByRole("button", { name: "Удалить дополнительное упражнение" })
    .click();
  await expect(card).toHaveCount(1);
  await page
    .getByRole("button", { name: "Добавить упражнение", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Выбрать: Грудной тренажёр", exact: true })
    .click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(card).toHaveCount(1);
  await page.evaluate(() => finish());
  expect(
    await page.evaluate(
      () =>
        DDXStore.history()[0].exercises.find(
          (e) => e.exerciseId === "chest_press",
        ).rows.length,
    ),
  ).toBe(3);
});
test("offline catalogue search, uncertainty and 320px keyboard dialog", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("push.html");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Добавить упражнение", exact: true })
    .click();
  await page.getByLabel("Поиск по названию").fill("Сгибание ног сидя");
  await expect(page.locator("dialog article")).toHaveCount(1);
  await expect(page.locator("dialog article")).toContainText(
    "Неподтверждённый",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toHaveCount(0);
});
