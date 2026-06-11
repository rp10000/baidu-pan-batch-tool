import { expect, test } from "@playwright/test";

test("settings actions are wired to desktop IPC and update visible state", async ({ page }) => {
  await page.addInitScript(() => {
    const commandEntries: Array<Record<string, unknown>> = [];
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
        message: "BaiduPCS-Go 未登录或登录已失效"
      }),
      startLocalCliLogin: async () => {
        commandEntries.push({
          id: "login",
          createdAt: "2026-06-11T00:00:00.000Z",
          startedAt: "2026-06-11T00:00:00.000Z",
          finishedAt: "2026-06-11T00:00:00.100Z",
          durationMs: 100,
          command: "BaiduPCS-Go login",
          stdout: "visible login terminal opened",
          stderr: "",
          exitCode: 0
        });
        return { ok: true, message: "visible login terminal opened" };
      },
      getLocalCliCommandLog: async () => ({
        cliPath: "C:/tools/BaiduPCS-Go.exe",
        entries: commandEntries
      }),
      checkDependencies: async () => ({
        checkedAt: "2026-06-11T00:00:00.000Z",
        items: [
          { name: "内置 BaiduPCS-Go", status: "found", source: "embedded", category: "core", path: "C:/tools/BaiduPCS-Go.exe", version: "BaiduPCS-Go version v4.0.1", exitCode: 0, stdout: "", stderr: "" },
          { name: "Python", status: "missing", path: "", version: "Python executable not found", exitCode: 127, stdout: "", stderr: "Python executable not found" },
          { name: "Tesseract", status: "missing", path: "", version: "tesseract executable not found", exitCode: 127, stdout: "", stderr: "tesseract executable not found" },
          { name: "FFmpeg", status: "found", path: "C:/ffmpeg/bin/ffmpeg.exe", version: "ffmpeg version 7.0", exitCode: 0, stdout: "ffmpeg version 7.0", stderr: "" },
          { name: "Node Runtime", status: "found", path: "node.exe", version: "v24.12.0", exitCode: 0, stdout: "v24.12.0", stderr: "" },
          { name: "OpenCV", status: "skipped_dependency_missing", path: "", version: "", exitCode: 127, stdout: "", stderr: "需要 Python" },
          { name: "PaddleOCR", status: "skipped_dependency_missing", path: "", version: "", exitCode: 127, stdout: "", stderr: "需要 Python" }
        ]
      }),
      clearCache: async () => ({
        ok: true,
        userDataPath: "C:/Users/ASUS/AppData/Roaming/Panjie",
        filesDeleted: 3,
        bytesFreed: 2048,
        errors: [],
        skipped: ["EPERM: GPUCache"]
      })
    };
  });

  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /设置中心/ }).click();

  await page.getByRole("button", { name: "重新检测" }).click();
  await expect(page.getByText("未登录").first()).toBeVisible();
  await expect(page.getByText("BaiduPCS-Go 未登录或登录已失效")).toBeVisible();
  await expect(page.locator(".api-row").filter({ hasText: "来源" })).toContainText("应用内置");
  await expect(page.getByText("CLI 已登录")).toHaveCount(0);

  await page.getByRole("button", { name: "打开登录终端" }).click();
  await expect(page.getByText("已打开可见登录终端")).toBeVisible();

  await page.getByRole("button", { name: "检查依赖" }).click();
  await expect(page.getByText("Python executable not found").first()).toBeVisible();
  await expect(page.getByText("Node Runtime")).toBeVisible();
  await expect(page.getByText("PaddleOCR").first()).toBeVisible();
  await expect(page.getByText("需要 Python").first()).toBeVisible();

  const ocrInstall = page.getByRole("button", { name: "完整扫描运行时后续提供" });
  await expect(ocrInstall).toBeDisabled();

  await page.getByRole("button", { name: "清理缓存" }).click();
  await expect(page.getByText(/删除文件 3 个，释放 2.00 KB；跳过锁定项 1 个/)).toBeVisible();

  await page.getByText("展开高级调试").click();
  await page.getByRole("button", { name: "刷新执行日志" }).click();
  await expect(page.getByText("执行命令")).toBeVisible();
  await expect(page.getByText("startedAt")).toBeVisible();
  await expect(page.getByText("durationMs")).toBeVisible();
  await expect(page.getByText("visible login terminal opened")).toBeVisible();
  await expect(page.getByRole("button", { name: "复制调试信息" })).toBeVisible();
});
