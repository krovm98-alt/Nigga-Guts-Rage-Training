const { test, expect } = require("@playwright/test");
test("animated header and local analysis work at 320px, reduced motion, restore and offline", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("index.html");
  await expect(page.locator(".blood-lightning")).toBeVisible();
  await expect(page.locator(".blood-drips")).toHaveCount(2);
  expect(
    await page
      .locator(".viscous-drip")
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("viscous-flow");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".viscous-drip")
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  expect(
    await page
      .locator(".header-lightning")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  await page.locator(".session>summary").click();
  await page.locator(".workout-analysis>summary").click();
  for (const name of [
    "Что хорошо",
    "На что обратить внимание",
    "Что делать дальше",
  ])
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  await expect(page.locator(".workout-analysis")).toContainText(
    "Дип-тренажёр: не повышай",
  );
  await expect(page.locator(".workout-analysis")).toContainText("Вес менялся");
  await page.screenshot({
    path: "/tmp/blood-analysis-320.png",
    fullPage: true,
  });
  const before = await page.locator(".workout-analysis").innerText();
  await page.evaluate(() => {
    const b = allData();
    DDXStore.restore(b);
    show();
  });
  await page.locator(".session>summary").click();
  await page.locator(".workout-analysis>summary").click();
  expect(await page.locator(".workout-analysis").innerText()).toBe(before);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".workout-analysis")).toHaveCount(1);
  await page.locator(".session>summary").click();
  await page.locator(".workout-analysis>summary").click();
  await expect(page.locator(".workout-analysis")).toContainText(
    "Локальный разбор",
  );
});
