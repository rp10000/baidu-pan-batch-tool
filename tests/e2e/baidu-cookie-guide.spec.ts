import { expect, test } from "@playwright/test";

test("settings opens the shortest BDUSS STOKEN guide with six illustrated steps", async ({ page }) => {
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
        message: "BaiduPCS-Go 未登录或登录已失效"
      }),
      probeBaiduLoginMethod: async () => ({
        ok: true,
        supports: { bduss: true, stoken: true, cookies: true }
      }),
      openBaiduLoginPage: async () => ({ ok: true }),
      getLocalCliCommandLog: async () => ({ cliPath: "C:/tools/BaiduPCS-Go.exe", entries: [] })
    };
  });

  await page.goto("/");
  await page.locator('nav[aria-label="主导航"]').getByRole("button", { name: /设置中心/ }).click();
  await expect(page.getByText("百度网盘连接")).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/settings-connect-guide-main.png", fullPage: true });

  await page.getByRole("button", { name: "打开百度网盘登录页" }).click();
  await expect(page.getByText("已打开百度网盘登录页")).toBeVisible();

  await page.getByRole("button", { name: "查看获取教程" }).click();
  const dialog = page.getByRole("dialog", { name: "最短登录态获取教程" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/步骤/)).toHaveCount(6);
  await expect(dialog).toContainText("复制 BDUSS");
  await expect(dialog).toContainText("复制 STOKEN");
  await expect(dialog.getByPlaceholder("粘贴 BDUSS")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "确认导入" })).toHaveCount(0);
  await page.screenshot({ path: "artifacts/screenshots/guide-step-1-login.png", fullPage: true });
  await page.screenshot({ path: "artifacts/screenshots/guide-step-3-cookies.png", fullPage: true });
  await page.screenshot({ path: "artifacts/screenshots/guide-step-4-bduss.png", fullPage: true });
  await page.screenshot({ path: "artifacts/screenshots/guide-step-5-stoken.png", fullPage: true });
});
