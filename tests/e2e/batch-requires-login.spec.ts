import { expect, test } from "@playwright/test";

test("batch processing requires Baidu Netdisk connection before real processing", async ({ page }) => {
  await page.addInitScript(() => {
    (window as typeof window & { panjieDesktop?: Record<string, unknown> }).panjieDesktop = {
      inspectLocalCli: async () => ({
        bridgeOnline: true,
        cliInstalled: true,
        cliPath: "C:/tools/BaiduPCS-Go.exe",
        cliSource: "embedded",
        cliVersion: "BaiduPCS-Go version v4.0.1",
        loginState: "not_logged_in",
        account: { uid: "0" },
        rootListOk: false,
        quotaOk: false,
        loginMethod: "none",
        lastCheckedAt: "2026-06-12T00:00:00.000Z",
        message: "登录态失效，请重新导入"
      }),
      probeBaiduLoginMethod: async () => ({ ok: true, supports: { bduss: true, stoken: true, cookies: true } }),
      getLocalCliCommandLog: async () => ({ cliPath: "C:/tools/BaiduPCS-Go.exe", entries: [] })
    };
  });

  await page.goto("/");
  await page.locator('nav[aria-label="主导航"]').getByRole("button", { name: /任务处理/ }).click();
  await page.locator("#share-input").fill("https://pan.baidu.com/s/1needslogin 1234");
  await expect(page.getByRole("button", { name: "请先连接百度网盘" })).toBeDisabled();
  await expect(page.locator(".batch-blocked-notice")).toContainText("登录态失效，请重新导入");
  await page.screenshot({ path: "artifacts/screenshots/batch-login-required.png", fullPage: true });

  await page.getByRole("button", { name: "去设置中心连接" }).click();
  await expect(page.getByRole("heading", { name: "设置中心" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打开百度网盘登录页" })).toBeVisible();
  await expect(page.getByText("粘贴 BDUSS / STOKEN")).toBeVisible();
});
