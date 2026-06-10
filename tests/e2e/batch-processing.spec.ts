import { expect, test } from "@playwright/test";

test("batch processing creates a task, shows result modal, and shares the same task across pages", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /批量处理/ }).click();
  await page.locator("#share-input").fill(
    [
      "https://pan.example.com/s/abc123 A7K9",
      "https://pan.example.com/s/def456 提取码: B3L2",
      "https://pan.example.com/s/ghi789 密码 9K2P"
    ].join("\n")
  );

  await expect(page.getByLabel("链接识别统计")).toContainText("有效链接");
  await page.getByRole("button", { name: /开始处理/ }).click();

  const dialog = page.getByRole("dialog", { name: "任务完成弹窗" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("新分享链接");
  await expect(dialog).toContainText("提取码");
  await expect(dialog).toContainText("视频课程_");
  await page.screenshot({ path: "artifacts/screenshots/batch-result-modal-desktop.png", fullPage: true });

  await dialog.getByRole("button", { name: "复制分享信息" }).first().click();
  await expect(page.locator(".toast")).toContainText("已复制分享链接和提取码");
  await dialog.getByRole("button", { name: "完成" }).click();

  await nav.getByRole("button", { name: /分享导出/ }).click();
  await expect(page.getByRole("heading", { name: "分享导出" })).toBeVisible();
  await expect(page.getByLabel("新分享链接")).toHaveValue(/https:\/\/pan\.baidu\.com\/s\/mock-/);
  await expect(page.locator("body")).toContainText("A7K9");

  await nav.getByRole("button", { name: /扫描检查/ }).click();
  await expect(page.getByRole("heading", { name: "扫描检查" })).toBeVisible();
  await expect(page.locator("body")).toContainText("角落水印");

  expect(errors).toEqual([]);
});
