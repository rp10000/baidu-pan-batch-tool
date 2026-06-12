import { expect, test } from "@playwright/test";

test("standard Baidu share text parses as one original transfer input", async ({ page }) => {
  await page.goto("/");
  await page.locator(".nav-btn").nth(1).click();

  await page.locator("#share-input").fill(`通过网盘分享的文件：
链接: https://pan.baidu.com/s/1syntheticStandardText?pwd=z9x8 提取码: z9x8 复制这段内容后打开百度网盘手机App，操作更方便哦
--来自百度网盘超级会员v9的分享`);

  const stats = page.getByLabel(/链接识别统计|閾炬帴璇嗗埆缁熻/);
  await expect(stats).toContainText(/总链接数 1|鎬婚摼鎺ユ暟 1/);
  await expect(stats).toContainText(/有效链接 1|鏈夋晥閾炬帴 1/);
  await expect(stats).toContainText(/无效链接 0|鏃犳晥閾炬帴 0/);
  await expect(page.locator(".page-actions .primary-btn")).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/original-transfer-parser-one-link.png", fullPage: true });
});
