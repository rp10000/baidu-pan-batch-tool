import { expect, test } from "@playwright/test";

test("share message template stays as preview without duplicate copy button", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /任务处理/ }).click();

  await page.getByLabel("标题").fill("店铺资料包");
  await expect(page.locator(".share-message-preview")).toContainText("生成分享链接后将自动生成可转发文案");
  await expect(page.getByRole("button", { name: /复制可转发文案|复制完整可转发文案/ })).toHaveCount(0);
  await page.screenshot({ path: "artifacts/screenshots/share-template-xiaohongshu.png", fullPage: true });
});
