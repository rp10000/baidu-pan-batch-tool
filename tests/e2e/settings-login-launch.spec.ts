import { expect, test } from "@playwright/test";

test("login launch shows success only after desktop IPC reports the terminal opened", async ({ page }) => {
  await installDesktopApi(page, {
    cliInstalled: true,
    loginResult: { ok: true, message: "visible login terminal opened" }
  });
  await openSettings(page);

  await page.getByRole("button", { name: "打开登录终端" }).click();

  await expect(page.getByText("已打开可见登录终端")).toBeVisible();
  await expect(page.getByText("打开登录终端失败")).toHaveCount(0);
});

test("login launch displays the real IPC error and does not show success", async ({ page }) => {
  await installDesktopApi(page, {
    cliInstalled: true,
    loginResult: { ok: false, error: "Windows 找不到文件 'BaiduPCS-Go.exe'" }
  });
  await openSettings(page);

  await page.getByRole("button", { name: "打开登录终端" }).click();

  await expect(page.getByText("打开登录终端失败：Windows 找不到文件 'BaiduPCS-Go.exe'")).toBeVisible();
  await expect(page.getByText("已打开可见登录终端")).toHaveCount(0);
});

test("login launch is disabled when embedded CLI is missing", async ({ page }) => {
  await installDesktopApi(page, {
    cliInstalled: false,
    loginResult: { ok: false, error: "内置 CLI 缺失" }
  });
  await openSettings(page);

  const loginButton = page.getByRole("button", { name: "打开登录终端" });
  await expect(loginButton).toBeDisabled();
  await expect(page.getByText("内置 CLI 缺失，请重新安装客户端或运行 prepare:embedded-cli。")).toBeVisible();
});

async function installDesktopApi(
  page: import("@playwright/test").Page,
  options: {
    cliInstalled: boolean;
    loginResult: { ok: boolean; error?: string; message?: string };
  }
) {
  await page.addInitScript((initOptions) => {
    (window as typeof window & { panjieDesktop?: Record<string, unknown> }).panjieDesktop = {
      inspectLocalCli: async () => ({
        bridgeOnline: true,
        cliInstalled: initOptions.cliInstalled,
        cliPath: initOptions.cliInstalled ? "C:/Program Files/Panjie/resources/bin/BaiduPCS-Go/BaiduPCS-Go.exe" : "",
        cliSource: initOptions.cliInstalled ? "embedded" : "missing",
        cliVersion: initOptions.cliInstalled ? "BaiduPCS-Go version v4.0.1" : "",
        loginState: initOptions.cliInstalled ? "not_logged_in" : "not_installed",
        account: initOptions.cliInstalled ? { uid: "0" } : {},
        rootListOk: false,
        message: initOptions.cliInstalled ? "BaiduPCS-Go 未登录或登录已失效" : "未检测到 BaiduPCS-Go"
      }),
      startLocalCliLogin: async () => initOptions.loginResult,
      getLocalCliCommandLog: async () => ({
        cliPath: initOptions.cliInstalled ? "C:/Program Files/Panjie/resources/bin/BaiduPCS-Go/BaiduPCS-Go.exe" : "",
        entries: []
      })
    };
  }, options);
}

async function openSettings(page: import("@playwright/test").Page) {
  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /设置中心/ }).click();
  await page.getByRole("heading", { name: "设置中心" }).waitFor();
}
