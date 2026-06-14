import { expect, test } from "@playwright/test";

const sampleLinks = [
  "通过网盘分享的文件：编号9011",
  "链接: https://pan.baidu.com/s/abc123?pwd=A7K9 提取码: A7K9"
].join("\n");

test("task processing keeps original files and uses local cli share result", async ({ page }) => {
  const commands: string[][] = [];
  await page.addInitScript(() => {
    (window as typeof window & { panjieDesktop?: Record<string, unknown> }).panjieDesktop = {
      inspectLocalCli: async () => ({
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
      }),
      getLocalCliCommandLog: async () => ({ cliPath: "C:/tools/BaiduPCS-Go.exe", entries: [] }),
      localCliRun: async (command: { args: string[] }) => {
        const args = command.args;
        const head = args[0];
        if (head === "ls") {
          return {
            exitCode: 0,
            stdout: "文件(目录)\n公司年会学校新年晚会节目单word中秋国庆圣诞庆典word模板可编辑.docx",
            stderr: ""
          };
        }
        if (head === "share") {
          return {
            exitCode: 0,
            stdout: "分享成功\n链接: https://pan.baidu.com/s/1fakeLocalCliShare?pwd=6b41\n提取码: 6b41\n有效期: 永久",
            stderr: ""
          };
        }
        return { exitCode: 0, stdout: "ok", stderr: "" };
      }
    };
  });
  await page.exposeFunction("__recordCommand", (args: string[]) => commands.push(args));

  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /任务处理/ }).click();
  await expect(page.getByRole("heading", { name: "任务处理" })).toBeVisible();
  await expect(page.getByRole("button", { name: /开始原样转存/ })).toBeVisible();
  await page.locator("#share-input").fill(sampleLinks);
  await expect(page.getByLabel("链接识别统计")).toContainText("有效链接");
  await page.screenshot({ path: "artifacts/screenshots/original-transfer-mode.png", fullPage: true });

  await page.getByRole("button", { name: /开始原样转存/ }).click();

  const dialog = page.getByRole("dialog", { name: "任务结果弹窗" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("原样转存完成");
  await expect(dialog).toContainText("公司年会学校新年晚会节目单word中秋国庆圣诞庆典word模板可编辑");
  await expect(dialog).toContainText("新分享链接");
  await expect(dialog).toContainText("提取码：6b41");
  await expect(dialog.getByRole("button", { name: "复制分享信息" })).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "打开链接验证" })).toBeEnabled();
  await expect(dialog.getByRole("button", { name: /复制可转发文案|复制完整可转发文案/ })).toHaveCount(0);
  await page.screenshot({ path: "artifacts/screenshots/batch-result-modal-desktop.png", fullPage: true });
  await dialog.getByRole("button", { name: "完成" }).click();

  await nav.getByRole("button", { name: /资源归档/ }).click();
  await expect(page.getByRole("heading", { name: "资源归档" })).toBeVisible();
  await expect(page.locator("body")).toContainText("文档模板");
  await expect(page.locator("body")).toContainText("盘姬资源库/转存记录");
});

test("detection mode stays explicit and does not expose hidden scan page", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');
  await expect(nav.getByRole("button", { name: /扫描检查/ })).toHaveCount(0);
  await expect(nav.getByRole("button", { name: /分享导出/ })).toHaveCount(0);

  await nav.getByRole("button", { name: /任务处理/ }).click();
  await page.locator("#share-input").fill(sampleLinks);
  await page.getByRole("button", { name: /检测清理/ }).click();
  await expect(page.locator("body")).toContainText("按需检查");
  await page.screenshot({ path: "artifacts/screenshots/final-batch-scan-options.png", fullPage: true });
});
