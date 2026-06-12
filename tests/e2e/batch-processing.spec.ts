import { expect, test } from "@playwright/test";

const sampleLinks = [
  "链接: https://pan.baidu.com/s/abc123?pwd=A7K9 提取码: A7K9",
  "https://pan.baidu.com/s/def456 提取码: B3L2",
  "https://pan.baidu.com/s/ghi789 密码 9K2P"
].join("\n");

test("original transfer mode skips scan and generates message preview across pages", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await useMockMode(page, nav);
  await nav.getByRole("button", { name: /批量处理/ }).click();
  await expect(page.getByRole("button", { name: /开始原样转存/ })).toBeVisible();
  await expect(page.getByText("原样转存不会下载文件样本")).toBeVisible();
  await expect(page.getByRole("button", { name: "原样转存", exact: true })).toBeVisible();
  await page.locator("#share-input").fill(sampleLinks);
  await page.screenshot({ path: "artifacts/screenshots/original-transfer-mode.png", fullPage: true });

  await expect(page.getByLabel("链接识别统计")).toContainText("有效链接");
  await page.getByRole("button", { name: /开始原样转存/ }).click();

  const dialog = page.getByRole("dialog", { name: "任务结果弹窗" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Mock 演示链接");
  await expect(dialog).toContainText("不可真实访问");
  await expect(dialog).toContainText("扫描未启用，原样转存");
  await expect(dialog).toContainText("课程先导片.mp4");
  await page.screenshot({ path: "artifacts/screenshots/task-result-original-transfer.png", fullPage: true });
  await page.screenshot({ path: "artifacts/screenshots/batch-result-modal-desktop.png", fullPage: true });

  const mockCopyButtons = dialog.getByRole("button", { name: "复制分享信息" });
  await expect(mockCopyButtons.first()).toBeDisabled();
  await expect(mockCopyButtons.last()).toBeDisabled();
  await dialog.getByRole("button", { name: "完成" }).click();

  await nav.getByRole("button", { name: /分享导出/ }).click();
  await expect(page.getByRole("heading", { name: "分享导出" })).toBeVisible();
  await expect(page.getByLabel("新分享链接")).toHaveValue(/https:\/\/pan\.baidu\.com\/s\/mock-/);
  await expect(page.getByLabel("结果来源")).toHaveValue("Mock 演示链接，不可真实访问");
  await expect(page.getByLabel("风险扫描")).toHaveValue("未启用风险扫描");
  await expect(page.getByLabel("发送文案")).toHaveValue(/网盘链接：/);
  await page.screenshot({ path: "artifacts/screenshots/share-export-message-text.png", fullPage: true });

  await nav.getByRole("button", { name: /扫描检查/ }).click();
  await expect(page.getByRole("heading", { name: "扫描检查" })).toBeVisible();
  await expect(page.locator("body")).toContainText("当前任务未启用扫描");

  expect(errors).toEqual([]);
});

test("scan options run only after user selects detection mode", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await useMockMode(page, nav);
  await nav.getByRole("button", { name: /批量处理/ }).click();
  await page.locator("#share-input").fill(sampleLinks);

  await page.getByRole("button", { name: /检测清理/ }).click();
  await expect(page.getByRole("button", { name: /开始检测处理/ })).toBeVisible();
  await page.getByRole("button", { name: /生成清理副本/ }).click();
  await page.screenshot({ path: "artifacts/screenshots/final-batch-scan-options.png", fullPage: true });

  await page.getByRole("button", { name: /开始检测处理/ }).click();
  const dialog = page.getByRole("dialog", { name: "任务结果弹窗" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("deep 扫描按需执行");
  await page.screenshot({ path: "artifacts/screenshots/final-cleaned-copy.png", fullPage: true });
  await dialog.getByRole("button", { name: "完成" }).click();

  await nav.getByRole("button", { name: /扫描检查/ }).click();
  await expect(page.getByRole("heading", { name: "扫描检查" })).toBeVisible();
  await expect(page.locator("body")).toContainText("二维码");
  await expect(page.locator("body")).toContainText("手机号");
  await page.screenshot({ path: "artifacts/screenshots/final-scan-check.png", fullPage: true });
});

async function useMockMode(page: import("@playwright/test").Page, nav: import("@playwright/test").Locator) {
  await nav.getByRole("button", { name: /设置中心/ }).click();
  await page.getByText("展开高级调试").click();
  await page.getByRole("button", { name: /Mock 演示模式/ }).click();
}
