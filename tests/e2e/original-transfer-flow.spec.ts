import { expect, test } from "@playwright/test";

test("standard Baidu share text parses as one original transfer input", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await useMockMode(page, nav);
  await nav.getByRole("button", { name: /批量处理/ }).click();

  await page.locator("#share-input").fill(`通过网盘分享的文件：
链接: https://pan.baidu.com/s/1GosxMsrCpZrAo85ZcYIRCQ?pwd=d6ea 提取码: d6ea 复制这段内容后打开百度网盘手机App，操作更方便哦
--来自百度网盘超级会员v9的分享`);

  const stats = page.getByLabel("链接识别统计");
  await expect(stats).toContainText("总链接数 1");
  await expect(stats).toContainText("有效链接 1");
  await expect(stats).toContainText("无效链接 0");
  await expect(page.getByRole("button", { name: /开始原样转存/ })).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/parser-baidu-standard-text.png", fullPage: true });
});

async function useMockMode(page: import("@playwright/test").Page, nav: import("@playwright/test").Locator) {
  await nav.getByRole("button", { name: /设置中心/ }).click();
  await page.getByText("展开高级调试").click();
  await page.getByRole("button", { name: /Mock 演示模式/ }).click();
}

