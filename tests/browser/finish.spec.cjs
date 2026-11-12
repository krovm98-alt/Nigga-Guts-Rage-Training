const {test,expect}=require("@playwright/test");
test.beforeEach(async ({context})=>{
 await context.addInitScript(()=>localStorage.setItem("ddx_seed_second_month_v1",'{"version":1}'));
});
test("finish archives automatically and renders progress, next workout inherits safe goal",async({page})=>{
 await page.goto("push.html");
 const card=page.locator("#ex-dbbench");
 await card.locator(".ex-head").click();
 const weights=card.locator("input.iw");
 for(let i=1;i<=3;i++){
  await weights.nth(i).fill("21");
  await card.locator("input.ir").nth(i).fill("8");
  for(let k=0;k<3;k++)await card.locator("button.eff").nth(i).click();
  await card.locator("button.ok").nth(i).click();
 }
 await page.getByRole("button",{name:"ЗАВЕРШИТЬ ТРЕНИРОВКУ"}).click();
 await expect(page.locator("#scrFinal")).toBeVisible();
 await expect(page.locator("#nextPlan")).toContainText("ТРЕНИРОВКА СОХРАНЕНА");
 await expect(page.locator("#nextPlan")).toContainText("21 кг × 9");
 await expect(page.locator('#scrFinal button[onclick="copyReport()"]')).toHaveCount(1);
 expect(await page.evaluate(()=>DDXStore.history().length)).toBe(1);
 await page.reload();
 expect(await page.evaluate(()=>DDXStore.history().length)).toBe(1);
 await page.getByRole("button",{name:"НОВАЯ ТРЕНИРОВКА"}).click();
 await page.waitForURL("**/push.html");
 await expect(page.locator("#ex-dbbench input.iw").nth(1)).toHaveValue("21");
 await expect(page.locator("#ex-dbbench input.ir").nth(1)).toHaveValue("9");
});
