import { expect, test } from "@playwright/test";

const pages = [
  { nav: "任务工作台", heading: "任务工作台", screenshot: "workbench-desktop.png" },
  { nav: "批量处理", heading: "批量处理", screenshot: "batch-processing-desktop.png" },
  { nav: "扫描检查", heading: "扫描检查", screenshot: "scan-check-desktop.png" },
  { nav: "资源归档", heading: "资源归档", screenshot: "archive-desktop.png" },
  { nav: "分享导出", heading: "分享导出", screenshot: "share-export-desktop.png" },
  { nav: "设置中心", heading: "设置中心", screenshot: "settings-desktop.png" }
];

test("six pages switch without console errors and desktop screenshots are generated", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');

  for (const item of pages) {
    await nav.getByRole("button", { name: new RegExp(item.nav) }).click();
    await expect(page.getByRole("heading", { name: item.heading })).toBeVisible();
    await page.screenshot({ path: `artifacts/screenshots/${item.screenshot}`, fullPage: true });
  }

  expect(errors).toEqual([]);
});

test("mobile viewport has no page-level horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator('nav[aria-label="主导航"]').getByRole("button", { name: /批量处理/ }).click();
  await expect(page.getByRole("heading", { name: "批量处理" })).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/mobile.png", fullPage: true });

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasOverflow).toBe(false);
});

test("settings page shows oauth preparation card", async ({ page }) => {
  await page.goto("/");
  await page.locator('nav[aria-label="主导航"]').getByRole("button", { name: /设置中心/ }).click();

  await expect(page.getByRole("heading", { name: "设置中心" })).toBeVisible();
  await expect(page.getByText("百度网盘 OAuth 准备状态")).toBeVisible();
  await expect(page.getByText("App Key：未填写")).toBeVisible();
  await expect(page.getByRole("button", { name: "运行准备检查" })).toBeVisible();

  await page.screenshot({ path: "artifacts/screenshots/oauth-prep-settings-card.png", fullPage: true });
});
