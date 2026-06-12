import { expect, test } from "@playwright/test";

test("default batch page is original transfer without scan or file changes", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /批量处理/ }).click();

  await expect(page.getByRole("button", { name: /开始原样转存|请先连接百度网盘/ })).toBeVisible();
  await expect(page.getByText("原样转存不会下载文件样本")).toBeVisible();
  await expect(page.locator(".mode-card").filter({ hasText: "默认模式" })).toHaveClass(/active/);
  await expect(page.getByRole("button", { name: /自动分类/ })).not.toHaveClass(/checked/);
  await expect(page.getByRole("button", { name: /自动重命名/ })).not.toHaveClass(/checked/);
  await expect(page.getByRole("button", { name: /检查二维码/ })).not.toHaveClass(/checked/);
  await page.screenshot({ path: "artifacts/screenshots/no-empty-share-guard.png", fullPage: true });
});
