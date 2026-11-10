const { test, expect } = require("@playwright/test");
test("real workout appears once in history and analytics with clean branding at 320px and offline", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("index.html");
  await expect(page.locator("h1")).toContainText("NIGGA");
  await expect(page.locator("#count")).toHaveText("1");
  await page.locator(".session summary").click();
  await expect(page.locator("#history")).toContainText("Начало второго месяца");
  await expect(page.locator("#history")).toContainText("106.5×7");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.locator("#count")).toHaveText("1");
  await page.goto("analytics.html");
  expect(await page.locator("#exercise option").count()).toBe(6);
  await page.goto("push.html");
  await page.locator("#ex-dbbench .ex-head").click();
  expect(await page.locator("body").innerText()).not.toMatch(
    /DDX|решил Семён/i,
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.goto("index.html");
  await expect(page.locator("#count")).toHaveText("1");
  await page.goto("analytics.html");
  expect(await page.locator("#exercise option").count()).toBe(6);
});
