import { expect, test } from "@playwright/test";

const sampleLinks = [
  "https://pan.example.com/s/abc123 A7K9",
  "https://pan.example.com/s/def456 提取码: B3L2",
  "https://pan.example.com/s/ghi789 密码 9K2P"
].join("\n");

test("fast batch processing skips scan and shares the same task across pages", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /批量处理/ }).click();
  await expect(page.getByRole("button", { name: /开始快速处理/ })).toBeVisible();
  await expect(page.getByText("未勾选扫描时不会下载文件样本")).toBeVisible();
  await page.locator("#share-input").fill(sampleLinks);
  await page.screenshot({ path: "artifacts/screenshots/final-batch-fast-mode.png", fullPage: true });

  await expect(page.getByLabel("链接识别统计")).toContainText("有效链接");
  await page.getByRole("button", { name: /开始快速处理/ }).click();

  const dialog = page.getByRole("dialog", { name: "任务完成弹窗" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("新分享链接");
  await expect(dialog).toContainText("提取码");
  await expect(dialog).toContainText("扫描未启用");
  await expect(dialog).toContainText("视频课程_");
  await page.screenshot({ path: "artifacts/screenshots/final-task-result-modal.png", fullPage: true });
  await page.screenshot({ path: "artifacts/screenshots/batch-result-modal-desktop.png", fullPage: true });

  await dialog.getByRole("button", { name: "复制分享信息" }).first().click();
  await expect(page.locator(".toast")).toContainText("已复制分享链接和提取码");
  await dialog.getByRole("button", { name: "完成" }).click();

  await nav.getByRole("button", { name: /分享导出/ }).click();
  await expect(page.getByRole("heading", { name: "分享导出" })).toBeVisible();
  await expect(page.getByLabel("新分享链接")).toHaveValue(/https:\/\/pan\.baidu\.com\/s\/mock-/);
  await expect(page.getByLabel("风险扫描")).toHaveValue("未启用风险扫描");
  await page.screenshot({ path: "artifacts/screenshots/final-share-export.png", fullPage: true });

  await nav.getByRole("button", { name: /扫描检查/ }).click();
  await expect(page.getByRole("heading", { name: "扫描检查" })).toBeVisible();
  await expect(page.locator("body")).toContainText("当前任务未启用扫描");

  expect(errors).toEqual([]);
});

test("scan options run only after user selects standard scan", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /批量处理/ }).click();
  await page.locator("#share-input").fill(sampleLinks);

  await page.getByRole("button", { name: /标准检查模式/ }).click();
  await expect(page.getByRole("button", { name: /开始处理并检查/ })).toBeVisible();
  await page.getByRole("button", { name: /生成清理副本/ }).click();
  await page.screenshot({ path: "artifacts/screenshots/final-batch-scan-options.png", fullPage: true });

  await page.getByRole("button", { name: /开始处理并检查/ }).click();
  const dialog = page.getByRole("dialog", { name: "任务完成弹窗" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("清理副本");
  await page.screenshot({ path: "artifacts/screenshots/final-cleaned-copy.png", fullPage: true });
  await dialog.getByRole("button", { name: "完成" }).click();

  await nav.getByRole("button", { name: /扫描检查/ }).click();
  await expect(page.getByRole("heading", { name: "扫描检查" })).toBeVisible();
  await expect(page.locator("body")).toContainText("二维码");
  await expect(page.locator("body")).toContainText("手机号");
  await page.screenshot({ path: "artifacts/screenshots/final-scan-check.png", fullPage: true });
});
