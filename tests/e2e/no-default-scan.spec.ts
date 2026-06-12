import { expect, test } from "@playwright/test";

test("default batch page is original transfer without scan or file changes", async ({ page }) => {
  await page.goto("/");
  await page.locator(".nav-btn").nth(1).click();

  await expect(page.locator("#share-input")).toBeVisible();
  await expect(page.locator(".mode-card").filter({ hasText: /默认模式|榛樿妯″紡/ })).toHaveClass(/active/);
  await expect(page.getByRole("button", { name: /内容分类|自动分类|鑷姩鍒嗙被/ })).not.toHaveClass(/checked/);
  await expect(page.getByRole("button", { name: /自动重命名|鑷姩閲嶅懡鍚/ })).not.toHaveClass(/checked/);
  await expect(page.locator(".scan-option-grid")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/screenshots/original-transfer-default-clean.png", fullPage: true });
});
