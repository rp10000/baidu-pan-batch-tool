import { expect, test } from "@playwright/test";

test("share message template is simple and provides one copy action", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /任务处理/ }).click();

  const templateCard = page.locator(".card").filter({ hasText: "分享文案模板" });
  await expect(templateCard.getByText("模板详情")).toBeVisible();
  await expect(templateCard.getByText("标题")).toHaveCount(0);
  await expect(templateCard.getByText("店铺名")).toHaveCount(0);
  await expect(templateCard.getByText("订单号")).toHaveCount(0);
  await expect(templateCard.getByText("备注")).toHaveCount(0);
  await expect(templateCard.locator("#share-template-detail")).toHaveValue(/【\{title\}】/);
  await expect(page.locator(".share-message-preview")).toContainText("生成分享链接后将自动生成可转发文案");
  await expect(templateCard.getByRole("button", { name: "复制文案" })).toBeVisible();
  await expect(templateCard.getByRole("button", { name: "复制文案" })).toBeDisabled();
  await page.screenshot({ path: "artifacts/screenshots/share-template-xiaohongshu.png", fullPage: true });
});
