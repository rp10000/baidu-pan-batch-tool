import { expect, test } from "@playwright/test";

test("BDUSS STOKEN import requires confirmation and redacts debug output", async ({ page }) => {
  const imports: Array<Record<string, unknown>> = [];
  await page.addInitScript(() => {
    const importsRef: Array<Record<string, unknown>> = [];
    (window as typeof window & { __imports?: Array<Record<string, unknown>>; panjieDesktop?: Record<string, unknown> }).__imports = importsRef;
    (window as typeof window & { panjieDesktop?: Record<string, unknown> }).panjieDesktop = {
      inspectLocalCli: async () => ({
        bridgeOnline: true,
        cliInstalled: true,
        cliPath: "C:/tools/BaiduPCS-Go.exe",
        cliSource: "embedded",
        cliVersion: "BaiduPCS-Go version v4.0.1",
        loginState: importsRef.length > 0 ? "logged_in" : "not_logged_in",
        account: importsRef.length > 0 ? { uid: "123456", username: "测试账号", quotaTotal: "2 TB", quotaUsed: "1 GB" } : { uid: "0" },
        rootListOk: importsRef.length > 0,
        quotaOk: importsRef.length > 0,
        loginMethod: importsRef.length > 0 ? "bduss_stoken" : "none",
        lastCheckedAt: "2026-06-12T00:00:00.000Z",
        message: importsRef.length > 0 ? "BaiduPCS-Go 已登录" : "BaiduPCS-Go 未登录或登录已失效"
      }),
      probeBaiduLoginMethod: async () => ({
        ok: true,
        supports: { bduss: true, stoken: true, cookies: true }
      }),
      importBaiduSession: async (payload: Record<string, unknown>) => {
        importsRef.push(payload);
        return {
          ok: true,
          loginMethod: "bduss_stoken",
          runtime: {
            bridgeOnline: true,
            cliInstalled: true,
            cliPath: "C:/tools/BaiduPCS-Go.exe",
            cliSource: "embedded",
            cliVersion: "BaiduPCS-Go version v4.0.1",
            loginState: "logged_in",
            account: { uid: "123456", username: "测试账号" },
            rootListOk: true,
            quotaOk: true,
            loginMethod: "bduss_stoken",
            lastCheckedAt: "2026-06-12T00:00:00.000Z",
            message: "BaiduPCS-Go 已登录"
          }
        };
      },
      getLocalCliCommandLog: async () => ({
        cliPath: "C:/tools/BaiduPCS-Go.exe",
        entries: [
          {
            id: "login",
            createdAt: "2026-06-12T00:00:00.000Z",
            command: "BaiduPCS-Go login --bduss <redacted> --stoken <redacted>",
            stdout: "ok",
            stderr: "",
            exitCode: 0
          }
        ]
      })
    };
  });

  await page.goto("/");
  await page.locator('nav[aria-label="主导航"]').getByRole("button", { name: /设置中心/ }).click();
  await page.getByRole("button", { name: "粘贴并导入登录态" }).click();
  await expect(page.getByRole("dialog", { name: "最短登录态获取教程" })).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/bduss-stoken-import-form.png", fullPage: true });

  await expect(page.getByRole("button", { name: "确认导入" })).toBeDisabled();
  await page.getByPlaceholder("粘贴 BDUSS").fill("fakeBDUSSValue1234");
  await expect(page.getByText(/缺少 STOKEN/)).toBeVisible();
  await page.getByPlaceholder("粘贴 STOKEN").fill("fakeSTOKENValue5678");
  await expect(page.getByText(/已识别 fake/)).toHaveCount(2);

  await page.getByRole("button", { name: "确认导入" }).click();
  await expect(page.getByRole("dialog", { name: "确认导入百度网盘登录态" })).toBeVisible();
  expect(await page.evaluate(() => (window as typeof window & { __imports?: unknown[] }).__imports?.length)).toBe(0);
  await page.screenshot({ path: "artifacts/screenshots/import-confirm-redacted.png", fullPage: true });

  await page.getByRole("button", { name: "取消" }).click();
  expect(await page.evaluate(() => (window as typeof window & { __imports?: unknown[] }).__imports?.length)).toBe(0);

  await page.getByRole("button", { name: "确认导入" }).click();
  await page.getByRole("dialog", { name: "确认导入百度网盘登录态" }).getByRole("button", { name: "确认导入" }).click();
  await expect(page.getByText("导入成功")).toBeVisible();
  await expect(page.getByText("BDUSS+STOKEN").first()).toBeVisible();
  await expect(page.getByText("fakeBDUSSValue1234")).toHaveCount(0);
  await expect(page.getByText("fakeSTOKENValue5678")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/screenshots/import-success-redacted.png", fullPage: true });
});
