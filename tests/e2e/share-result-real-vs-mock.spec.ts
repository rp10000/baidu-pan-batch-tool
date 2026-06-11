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
  await expect(page.locator("body")).toContainText("当前模式");
  await expect(page.locator("body")).toContainText("BaiduPCS-Go 未登录");
  await page.screenshot({ path: "artifacts/screenshots/fixed-batch-transfer-status.png", fullPage: true });

  await page.locator("#share-input").fill("https://pan.baidu.com/s/1needsrealcli 1234");
  await expect(page.getByRole("button", { name: "请先登录 CLI" })).toBeDisabled();
  await expect(page.getByRole("dialog", { name: "任务结果弹窗" })).toHaveCount(0);
  await page.screenshot({ path: "artifacts/screenshots/fixed-share-result-real-or-failed.png", fullPage: true });

  await nav.getByRole("button", { name: /分享导出/ }).click();
  await expect(page.getByRole("heading", { name: "分享导出" })).toBeVisible();
  await expect(page.getByLabel("新分享链接")).toHaveValue("未生成分享链接");
  await expect(page.getByLabel("新分享链接")).not.toHaveValue(/mock-|generated_redacted|redacted/);
  await page.screenshot({ path: "artifacts/screenshots/fixed-share-export-real-or-failed.png", fullPage: true });

  expect(errors).toEqual([]);
});

test("share code 2 is partial completed and copy is disabled", async ({ page }) => {
  await page.route("http://127.0.0.1:17633/local-cli/run", async (route) => {
    const body = route.request().postDataJSON() as { args: string[] };
    const command = body.args[0];
    const response =
      command === "share"
        ? { exitCode: 0, stdout: "创建分享链接失败: 创建分享链接: 遇到错误, 远端服务器返回错误, 代码: 2, 消息: 请稍后再试", stderr: "" }
      : command === "ls"
        ? { exitCode: 0, stdout: "course.mp4", stderr: "" }
      : command === "who"
        ? { exitCode: 0, stdout: "uid: 10001, username: redacted", stderr: "" }
      : command === "quota"
        ? { exitCode: 0, stdout: "总容量: 2 TB\n已用: 1 GB", stderr: "" }
      : { exitCode: 0, stdout: "ok", stderr: "" };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response) });
  });

  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /设置中心/ }).click();
  await page.getByRole("button", { name: "重新检测" }).click();
  await expect(page.getByText("已登录").first()).toBeVisible();
  await nav.getByRole("button", { name: /批量处理/ }).click();
  await page.locator("#share-input").fill("https://pan.baidu.com/s/1partial 1234");
  await page.getByRole("button", { name: /开始快速处理/ }).click();

  const dialog = page.getByRole("dialog", { name: "任务结果弹窗" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("处理完成，分享失败");
  await expect(dialog).toContainText("百度服务端拒绝创建分享，代码 2");
  await expect(dialog).not.toContainText("任务完成");
  await expect(dialog.getByRole("button", { name: "重新创建分享" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "打开输出目录" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "手动分享指引" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "查看失败原因" })).toBeVisible();
  const copyButtons = dialog.getByRole("button", { name: "复制分享信息" });
  await expect(copyButtons.first()).toBeDisabled();
  await expect(copyButtons.last()).toBeDisabled();
  await page.screenshot({ path: "artifacts/screenshots/fix-share-failed-partial.png", fullPage: true });
});
