import { expect, test } from "@playwright/test";

test("original transfer uses UI input, disables scan defaults, and shares the raw directory", async ({ page }) => {
  await page.addInitScript(() => {
    const commands: string[][] = [];
    let rawDirCreated = false;
    let transferDone = false;
    const rawDirPattern = /\/盘姬资源库\/转存记录\/\d{4}-\d{2}-\d{2}\/AI绘画教程资料包/;

    Object.assign(window, {
      __panjieCliCommands: commands,
      panjieDesktop: {
        inspectLocalCli: async () => ({
          bridgeOnline: true,
          cliInstalled: true,
          cliPath: "C:/Program Files/Panjie/bin/BaiduPCS-Go.exe",
          cliSource: "embedded",
          cliVersion: "BaiduPCS-Go v4.0.1",
          loginState: "logged_in",
          account: { uid: "123456", username: "tester", quotaTotal: "2TB", quotaUsed: "1GB" },
          rootListOk: true,
          quotaOk: true,
          loginMethod: "existing",
          message: "BaiduPCS-Go logged in"
        }),
        localCliRun: async (command: { args: string[] }) => {
          const args = command.args;
          commands.push(args);
          const [name, target] = args;

          if (name === "ls" && rawDirPattern.test(target ?? "")) {
            if (!rawDirCreated) return { exitCode: 1, stdout: "", stderr: "not found" };
            return transferDone
              ? { exitCode: 0, stdout: "hello.txt\n", stderr: "" }
              : { exitCode: 0, stdout: "", stderr: "" };
          }
          if (name === "mkdir" && rawDirPattern.test(target ?? "")) {
            rawDirCreated = true;
            return { exitCode: 0, stdout: "mkdir ok", stderr: "" };
          }
          if (name === "cd") return { exitCode: 0, stdout: "", stderr: "" };
          if (name === "transfer") {
            transferDone = true;
            return { exitCode: 0, stdout: "transfer success", stderr: "" };
          }
          if (name === "share") {
            return {
              exitCode: 0,
              stdout: "https://pan.baidu.com/s/1syntheticResult?pwd=9abc\n",
              stderr: ""
            };
          }
          return { exitCode: 0, stdout: "", stderr: "" };
        }
      }
    });
  });

  await page.goto("/");
  await page.locator(".nav-btn").nth(1).click();
  await expect(page.locator("#share-input")).toHaveValue("");
  await expect(page.locator(".scan-option-grid")).toHaveCount(0);

  await page.locator("#share-input").fill([
    "通过网盘分享的文件：AI绘画教程资料包",
    "链接: https://pan.baidu.com/s/1syntheticInput?pwd=z9x8 提取码: z9x8 复制这段内容后打开百度网盘手机App，操作更方便哦",
    "--来自百度网盘超级会员v9的分享"
  ].join("\n"));

  await page.locator(".page-actions .primary-btn").click();
  const dialog = page.getByRole("dialog").first();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("https://pan.baidu.com/s/1syntheticResult?pwd=9abc");
  await page.screenshot({ path: "artifacts/screenshots/original-transfer-result-or-real-error.png", fullPage: true });

  const commands = await page.evaluate(() => (window as typeof window & { __panjieCliCommands: string[][] }).__panjieCliCommands);
  expect(commands).toContainEqual(["transfer", "https://pan.baidu.com/s/1syntheticInput?pwd=z9x8", "z9x8"]);
  const shareCommand = commands.find((args) => args[0] === "share");
  expect(shareCommand?.join(" ")).toContain("/盘姬资源库/转存记录/");
  expect(shareCommand?.join(" ")).toContain("AI绘画教程资料包");
  expect(shareCommand?.join(" ")).not.toContain("/output/");
});
