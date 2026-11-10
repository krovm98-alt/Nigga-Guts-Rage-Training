const { test, expect } = require("@playwright/test");
test("trial is prefilled without a button and effort changes the suggested work load", async ({ page }) => {
  await page.goto("index.html");
  await page.evaluate(() => {
    const row = (w, e=2) => ({w:String(w),r:"8",e,d:true});
    localStorage.setItem("ddx_history_v1", JSON.stringify([{
      id:"stable-test",kind:"push",start:1000,end:2000,exercises:[{
        id:"dbbench",exerciseId:"db_bench",name:"Жим",
        rows:[row(12),row(21),row(21),row(21)]
      }]
    }]));
  });
  await page.goto("push.html");
  const card = page.locator("#ex-dbbench");
  await card.locator(".ex-head").click();
  const weights=card.locator("input.iw");
  await expect(weights.nth(0)).toHaveValue("12");
  await expect(weights.nth(1)).toHaveValue("");
  await expect(card.getByRole("button",{name:"Применить пробный вес"})).toHaveCount(0);
  await weights.nth(0).fill("14");
  await card.locator("button.eff").nth(0).click();
  await card.locator("button.ok").nth(0).click();
  await expect(card.locator(".cal")).toContainText("14 кг × 8");
  const apply=card.getByRole("button",{name:"Применить рабочий вес"});
  await expect(apply).toBeVisible();
  page.once("dialog", d=>d.accept());
  await apply.click();
  await expect(weights.nth(1)).toHaveValue("21");
  await card.locator("button.eff").nth(0).click();
  await card.locator("button.eff").nth(0).click();
  await card.locator("button.eff").nth(0).click();
  await expect(card.locator(".cal")).toContainText("рабочий ориентир снижен");
  await weights.nth(1).fill("20,5");
  await page.reload();
  await expect(weights.nth(0)).toHaveValue("14");
  await expect(weights.nth(1)).toHaveValue("20,5");
  await expect(card.getByRole("button",{name:"Применить пробный вес"})).toHaveCount(0);
});
test("bloodstorm SVG droplets move, lightning branches render at all Android widths and background pauses", async ({
  page,
}) => {
  await page.goto("index.html");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const width of [320, 360, 390, 412]) {
    await page.setViewportSize({ width, height: 780 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const svg = page.locator(".blood-drips").first();
    await expect(svg).toBeVisible();
    expect(
      await svg.evaluate((e) => e.getBoundingClientRect().height),
    ).toBeGreaterThan(40);
    await page.evaluate(() => {
      document.querySelector(".falling-drop").getAnimations()[0].currentTime =
        4300;
      document.querySelector(".bolt-left").getAnimations()[0].currentTime = 260;
    });
    expect(
      await page
        .locator(".bolt-left")
        .evaluate((e) => Number(getComputedStyle(e).opacity)),
    ).toBeGreaterThan(0.4);
    await page.screenshot({ path: `/tmp/bloodstorm-${width}.png` });
  }
  const drop = page.locator(".falling-drop").first();
  const frames = await drop.evaluate((e) => {
    const a = e.getAnimations()[0];
    a.pause();
    a.currentTime = 4000;
    const first = getComputedStyle(e).transform;
    a.currentTime = 5000;
    return [first, getComputedStyle(e).transform];
  });
  expect(frames[0]).not.toBe(frames[1]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await drop.evaluate((e) => getComputedStyle(e).animationName)).toBe(
    "none",
  );
  await page.screenshot({ path: "/tmp/bloodstorm-reduced.png" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(
    await page
      .locator(".viscous-drip")
      .first()
      .evaluate((e) => getComputedStyle(e).animationPlayState),
  ).toBe("paused");
});
