const { test, expect } = require("@playwright/test");
test("all mobile screens load without JS errors, split and Pages assets work", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const name of ["index", "push", "pull", "legs", "analytics"]) {
    await page.goto(name + ".html");
    await expect(page.locator("body")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.goto("push.html");
  expect(await page.locator("h3").allTextContents()).not.toContain(
    "ДЕЛЬТА-МАШИНА",
  );
  await page.goto("legs.html");
  const titles = await page.locator("h3").allTextContents();
  expect(titles.indexOf("ПРИСЕД СО ШТАНГОЙ")).toBeLessThan(
    titles.indexOf("РУМЫНСКАЯ ТЯГА"),
  );
  expect(errors).toEqual([]);
});
test("autosave, validation, duplicate finish and second same-day workout", async ({
  page,
}) => {
  await page.goto("push.html");
  const first = page
    .locator(".ex")
    .filter({ has: page.locator(".iw") })
    .first();
  await first.locator(".ex-head").click();
  await first.locator(".iw").nth(2).fill("");
  await first.locator(".ok").nth(2).click();
  await expect(first.locator(".row.done")).toHaveCount(0);
  await first.locator(".iw").nth(2).fill("20,5");
  await first.locator(".ir").nth(2).fill("8");
  await first.locator(".ok").nth(2).click();
  await page.reload();
  expect(await page.locator(".row.done").count()).toBe(1);
  await page.evaluate(() => finish());
  await page.evaluate(() => finish());
  expect(await page.evaluate(() => DDXStore.history().length)).toBe(1);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "НОВАЯ ТРЕНИРОВКА" }).click();
  await page.waitForURL("**/push.html");
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => DDXStore.history().length)).toBe(1);
  expect(await page.locator(".row.done").count()).toBe(0);
});
test("offline navigation and reload under repository subdirectory", async ({
  page,
  context,
}) => {
  await page.goto("index.html");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  for (const name of ["push", "pull", "legs", "analytics", "index"]) {
    await page.goto(name + ".html");
    await expect(page.locator("body")).toBeVisible();
    await page.reload();
  }
  await context.setOffline(false);
});
test("custom replacement is text, not HTML", async ({ page }) => {
  await page.goto("push.html");
  await page.locator(".ex-head").nth(1).click();
  await page
    .locator(".ctext")
    .nth(1)
    .fill('<img src=x onerror="window.injected=true">');
  await page.locator(".ctext").nth(1).dispatchEvent("change");
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await expect(page.locator(".altinfo").nth(1).locator("img")).toHaveCount(0);
});
test("invalid import preserves history and gives error", async ({ page }) => {
  await page.goto("index.html");
  await page
    .locator("#import")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from("{"),
    });
  await expect(page.locator("#importStatus")).toContainText("Ошибка");
  expect(
    await page.evaluate(() => localStorage.getItem("ddx_history_v1")),
  ).toBeNull();
});
test("legacy v2 session resumes after midnight, timer survives navigation", async ({
  page,
}) => {
  await page.goto("index.html");
  await page.evaluate(() => {
    localStorage.setItem(
      "ddx_pull_v2_2020-01-01",
      JSON.stringify({
        start: Date.now() - 3600000,
        end: null,
        rest: { end: Date.now() + 90000, label: "Тест отдыха" },
        ex: {},
      }),
    );
  });
  await page.goto("pull.html");
  await expect(page.locator("#restBar")).toHaveClass("on");
  await expect(page.locator("#restL")).toHaveText("Тест отдыха");
  await page.goto("index.html");
  await page.goto("pull.html");
  await expect(page.locator("#restBar")).toHaveClass("on");
  expect(await page.evaluate(() => DDXStore.sessionKey("pull"))).toBe(
    "ddx_pull_v2_2020-01-01",
  );
});
test("export and restore actual session backup; edit history updates analytics", async ({
  page,
}) => {
  await page.goto("push.html");
  await page.locator(".ex-head").nth(1).click();
  await page.locator(".ex").nth(1).locator("button.ok").nth(1).click();
  await page.evaluate(() => finish());
  await page.goto("index.html");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  const path = await download.path();
  await page.evaluate(() => localStorage.clear());
  page.once("dialog", (d) => d.accept());
  await page.locator("#import").setInputFiles(path);
  await expect(page.locator("#count")).toHaveText("1");
  await page.locator("summary").click();
  await page.getByRole("button", { name: "ИЗМЕНИТЬ ПОДХОДЫ" }).click();
  const inputs = page
    .locator("fieldset")
    .nth(1)
    .locator(".edit-row")
    .nth(1)
    .locator("input[type=text]");
  await inputs.nth(0).fill("23");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "СОХРАНИТЬ ИЗМЕНЕНИЯ" }).click();
  expect(
    await page.evaluate(() => DDXStore.history()[0].exercises[1].rows[1].w),
  ).toBe("23");
  await page.goto("push.html");
  await page.goto("analytics.html");
  await expect(page.locator("#stats")).toContainText("23 кг");
});
test("narrow, enlarged fonts and landscape retain horizontal fit", async ({
  page,
}) => {
  await page.goto("push.html");
  for (const width of [320, 800]) {
    await page.setViewportSize({ width, height: width === 800 ? 360 : 700 });
    await page.addStyleTag({ content: "body{font-size:20px}" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({
    path: "test-results/mobile-push.png",
    fullPage: true,
  });
});
test("service worker update waits for confirmation and retains local data", async ({
  page,
}) => {
  await page.request.get("__test_revision?v=1");
  await page.goto("index.html");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(() =>
    localStorage.setItem("ddx_update_probe", "retained"),
  );
  await page.request.get("__test_revision?v=2");
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg.update();
  });
  await expect(
    page.getByRole("button", { name: "Доступна новая версия — обновить" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Доступна новая версия — обновить" })
    .click();
  await page.waitForFunction(async () => {
    const keys = await caches.keys();
    return (
      keys.includes("guts-rage-v5-production-test-2") &&
      !keys.includes("guts-rage-v5-production-test-1")
    );
  });
  expect(
    await page.evaluate(() => localStorage.getItem("ddx_update_probe")),
  ).toBe("retained");
  await page.request.get("__test_revision?v=1");
});
