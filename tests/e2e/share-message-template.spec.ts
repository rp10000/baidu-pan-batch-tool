import { expect, test } from "@playwright/test";

test("share message template preview uses Xiaohongshu virtual delivery format", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await useMockMode(page, nav);
  await nav.getByRole("button", { name: /批量处理/ }).click();

  await page.getByLabel("标题").fill("店铺资料包");
  await expect(page.locator(".share-message-preview")).toContainText("生成分享链接后将自动生成发送文案。");
  await page.locator("#share-input").fill("https://pan.baidu.com/s/1template?pwd=d6ea");
  await page.getByRole("button", { name: /开始原样转存/ }).click();
  const dialog = page.getByRole("dialog", { name: "任务结果弹窗" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "完成" }).click();

  await expect(page.locator(".share-message-preview")).toContainText("【店铺资料包】");
  await expect(page.locator(".share-message-preview")).toContainText("网盘链接：");
  await expect(page.locator(".share-message-preview")).toContainText("提取码：");
  await page.screenshot({ path: "artifacts/screenshots/share-template-xiaohongshu.png", fullPage: true });
});

async function useMockMode(page: import("@playwright/test").Page, nav: import("@playwright/test").Locator) {
  await nav.getByRole("button", { name: /设置中心/ }).click();
  await page.getByText("展开高级调试").click();
  await page.getByRole("button", { name: /Mock 演示模式/ }).click();
}

