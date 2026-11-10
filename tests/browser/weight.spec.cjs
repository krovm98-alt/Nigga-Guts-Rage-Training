const { test, expect } = require("@playwright/test");
test("explicit confirmation, cancellation, completed rows and manual edits survive reload", async ({
  page,
}) => {
  await page.goto("push.html");
  await page.locator("#ex-dbbench .ex-head").click();
  await page
    .locator("#ex-dbbench")
    .getByText("Заменить упражнение", { exact: true })
    .click();
  await page.getByText("Выбрать: Жим лёжа в Смите", { exact: true }).click();
  await expect(page.locator("#ex-dbbench h3")).toHaveText("Жим лёжа в Смите");
  await page.locator("#ex-dbbench .ex-head").click();
  const rows = page.locator("#ex-dbbench input.iw"),
    apply = page.getByRole("button", { name: "Применить рекомендованный вес" });
  await expect(rows.nth(1)).toHaveValue("");
  page.once("dialog", (d) => d.dismiss());
  await apply.click();
  await expect(rows.nth(1)).toHaveValue("");
  await rows.nth(0).fill("10");
  await rows.nth(1).fill("42,5");
  await page.locator("#ex-dbbench button.ok").nth(1).click();
  page.once("dialog", (d) => d.accept());
  await apply.click();
  await expect(rows.nth(0)).toHaveValue("10");
  await expect(rows.nth(1)).toHaveValue("42,5");
  await expect(rows.nth(2)).toHaveValue("50");
  await rows.nth(2).fill("47,5");
  await page.reload();
  expect(await page.evaluate(() => S.ex.dbbench.rows[2].w)).toBe("47,5");
  expect(await page.evaluate(() => S.ex.dbbench.weightApplication.weight)).toBe(
    50,
  );
});
test("repeat replacement clears applied weight and uncertain sources have no apply button", async ({
  page,
}) => {
  await page.goto("push.html");
  await page.evaluate(() =>
    selectCatalog(
      EX.find((e) => e.id === "dbbench"),
      DDXCatalog.get("smith_bench"),
      3,
    ),
  );
  await page.waitForLoadState();
  await expect(page.locator("#ex-dbbench h3")).toHaveText("Жим лёжа в Смите");
  await page.evaluate(() => {
    S.ex.dbbench.rows[1].w = "50";
    save();
    selectCatalog(
      EX.find((e) => e.id === "dbbench"),
      DDXCatalog.get("seated_leg_curl"),
      3,
    );
  });
  await expect(page.locator("#ex-dbbench h3")).toHaveText("Сгибание ног сидя");
  expect(await page.evaluate(() => S.ex.dbbench.rows[1].w)).toBe("");
  await expect(
    page.locator("#ex-dbbench .weight-recommendation"),
  ).toContainText("Укажи рабочий вес вручную");
  await expect(
    page.locator("#ex-dbbench .weight-recommendation button"),
  ).toHaveCount(0);
});
