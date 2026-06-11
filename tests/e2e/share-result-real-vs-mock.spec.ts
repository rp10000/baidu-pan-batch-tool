import { expect, test } from "@playwright/test";

test("windows local cli failure shows reason instead of fake share link", async ({ page }) => {
  const errors: string[] = [];
  await page.route("http://127.0.0.1:17633/local-cli/run", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ exitCode: 127, stdout: "", stderr: "local cli bridge unavailable" })
    });
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /批量处理/ }).click();
  await expect(page.locator("body")).toContainText("当前接入：Windows 本地 CLI");
  await expect(page.locator("body")).toContainText("分享链接转存还未真实验证");
  await page.screenshot({ path: "artifacts/screenshots/fixed-batch-transfer-status.png", fullPage: true });

  await page.locator("#share-input").fill("https://pan.baidu.com/s/1needsrealcli 1234");
  await page.getByRole("button", { name: /开始快速处理/ }).click();

  const dialog = page.getByRole("dialog", { name: "任务完成弹窗" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("local cli bridge unavailable");
  await expect(dialog).not.toContainText("mock-");
  await expect(dialog).not.toContainText("generated_redacted");
  await expect(dialog).not.toContainText("<redacted");
  await page.screenshot({ path: "artifacts/screenshots/fixed-share-result-real-or-failed.png", fullPage: true });
  await dialog.getByRole("button", { name: "完成" }).click();

  await nav.getByRole("button", { name: /分享导出/ }).click();
  await expect(page.getByRole("heading", { name: "分享导出" })).toBeVisible();
  await expect(page.getByLabel("新分享链接")).toHaveValue("local cli bridge unavailable");
  await expect(page.getByLabel("新分享链接")).not.toHaveValue(/mock-|generated_redacted|redacted/);
  await page.screenshot({ path: "artifacts/screenshots/fixed-share-export-real-or-failed.png", fullPage: true });

  expect(errors).toEqual([]);
});
