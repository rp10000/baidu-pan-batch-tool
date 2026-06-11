import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { _electron as electron, chromium } from "playwright";

const repoRoot = process.cwd();
const screenshotsDir = path.join(repoRoot, "artifacts", "screenshots");
const logDir = path.join(repoRoot, "artifacts");
const portableExe = path.join(repoRoot, "release", "盘姬批量助手 0.1.0.exe");
const unpackedExe = path.join(repoRoot, "release", "win-unpacked", "盘姬批量助手.exe");
const exePath = process.env.PANJIE_DESKTOP_EXE || (fs.existsSync(portableExe) ? portableExe : unpackedExe);

fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(logDir, { recursive: true });

if (!fs.existsSync(exePath)) {
  console.error(`desktop smoke failed: exe not found: ${exePath}`);
  process.exit(1);
}

const useElectronProtocol = exePath.includes(`${path.sep}win-unpacked${path.sep}`);
if (useElectronProtocol) {
  await smokeWithElectronProtocol(exePath);
} else {
  await smokePortableWithCdp(exePath);
}

async function smokeWithElectronProtocol(executablePath) {
  const app = await electron.launch({
    executablePath,
    env: {
      ...process.env,
      PANJIE_ELECTRON_LOG_DIR: logDir
    }
  });

  try {
    const page = await app.firstWindow();
    await verifyUi(page);
    await assertRuntimeLogClean();
    console.log(`desktop smoke pass: ${executablePath}`);
  } finally {
    await app.close();
  }
}

async function smokePortableWithCdp(executablePath) {
  const port = Number(process.env.PANJIE_DESKTOP_CDP_PORT || 9333);
  const child = spawn(executablePath, [`--remote-debugging-port=${port}`], {
    env: {
      ...process.env,
      PANJIE_ELECTRON_LOG_DIR: logDir
    },
    windowsHide: true,
    stdio: "ignore"
  });

  let browser;
  let page;
  try {
    await waitForCdp(port);
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    page = await firstCdpPage(browser);
    await verifyUi(page);
    await assertRuntimeLogClean();
    await page.close().catch(() => undefined);
    await wait(1500);
    console.log(`desktop smoke pass: ${executablePath}`);
  } finally {
    await browser?.close().catch(() => undefined);
    await wait(2500);
    if (hasPanjieProcesses()) {
      stopPanjieProcesses();
    }
  }
}

async function verifyUi(page) {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.waitForLoadState("domcontentloaded");
  await page.getByText("盘姬批量助手").waitFor({ timeout: 10_000 });
  await verifyCustomChrome(page);

  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole("button", { name: /批量处理/ }).waitFor({ timeout: 5_000 });
  await nav.getByRole("button", { name: /设置中心/ }).waitFor({ timeout: 5_000 });
  await page.getByText("Windows 本地 CLI").first().waitFor({ timeout: 5_000 });

  const navCount = await nav.locator("button").count();
  if (navCount < 6) {
    throw new Error(`expected at least 6 nav buttons, got ${navCount}`);
  }

  const bodyText = (await page.locator("body").innerText()).trim();
  if (bodyText.length < 100) {
    throw new Error(`body appears blank, text length ${bodyText.length}`);
  }
  if (/File\s+Edit\s+View\s+Window/i.test(bodyText)) {
    throw new Error("default Electron menu text is visible");
  }

  await page.screenshot({ path: path.join(screenshotsDir, "fixed-desktop-home.png"), fullPage: true });
  assertNotBlankScreenshot(path.join(screenshotsDir, "fixed-desktop-home.png"));

  await nav.getByRole("button", { name: /批量处理/ }).click();
  await verifyBatchLayout(page, { width: 1440, height: 900 });
  await verifyDraftPersistence(page, nav);
  await verifyFailureStateAndToast(page);
  await page.screenshot({ path: path.join(screenshotsDir, "fixed-desktop-batch.png"), fullPage: true });
  await page.screenshot({ path: path.join(screenshotsDir, "share-path-fixed-or-error.png"), fullPage: true });

  for (const size of [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 }
  ]) {
    await page.setViewportSize(size);
    await wait(250);
    await verifyBatchLayout(page, size);
    const screenshotPath = path.join(screenshotsDir, `layout-${size.width}x${size.height}-batch.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    assertNotBlankScreenshot(screenshotPath);
  }

  await page.setViewportSize({ width: 1440, height: 900 });

  await nav.getByRole("button", { name: /设置中心/ }).click();
  await verifySettingsSimpleMode(page);
  await page.screenshot({ path: path.join(screenshotsDir, "fixed-desktop-settings-cli.png"), fullPage: true });

  if (consoleErrors.length > 0) {
    throw new Error(`renderer console errors: ${consoleErrors.join(" | ")}`);
  }
}

async function verifyDraftPersistence(page, nav) {
  const draft = [
    "https://pan.baidu.com/s/1desktopDraftA 提取码: a111",
    "https://pan.baidu.com/s/1desktopDraftB 提取码: b222",
    "https://pan.baidu.com/s/1desktopDraftC 提取码: c333"
  ].join("\n");
  const input = page.locator("#share-input");
  await page.getByRole("button", { name: "清空" }).click();
  await input.fill(draft);
  await nav.getByRole("button", { name: /设置中心/ }).click();
  await page.getByRole("heading", { name: "设置中心" }).waitFor({ timeout: 5_000 });
  await nav.getByRole("button", { name: /批量处理/ }).click();
  await input.waitFor({ timeout: 5_000 });
  if ((await input.inputValue()) !== draft) {
    throw new Error("batch draft input was not preserved after page navigation");
  }
  await page.screenshot({ path: path.join(screenshotsDir, "fix-batch-input-persist.png"), fullPage: true });
  await page.getByRole("button", { name: "清空" }).click();
  await nav.getByRole("button", { name: /设置中心/ }).click();
  await nav.getByRole("button", { name: /批量处理/ }).click();
  if ((await input.inputValue()) !== "") {
    throw new Error("batch draft restored sample/input after clear");
  }
  await page.getByRole("button", { name: "恢复示例输入" }).click();
  if (!(await input.inputValue()).includes("https://pan.baidu.com/s/1abcDEF")) {
    throw new Error("restore sample input button did not restore sample");
  }
  await page.getByRole("button", { name: "清空" }).click();
}

async function verifyFailureStateAndToast(page) {
  await installShareCode2FakeCli(page);
  await page.locator("#share-input").fill("https://pan.baidu.com/s/1desktopFailure 1234");
  await page.getByRole("button", { name: /开始快速处理/ }).click();
  const dialog = page.getByRole("dialog", { name: "任务结果弹窗" });
  await dialog.waitFor({ timeout: 30_000 });
  const text = await dialog.innerText();
  if (/任务完成/.test(text)) {
    throw new Error("failure dialog still displays task completed wording");
  }
  const copyButtons = dialog.getByRole("button", { name: "复制分享信息" });
  if (!(await copyButtons.first().isDisabled()) || !(await copyButtons.last().isDisabled())) {
    throw new Error("copy share buttons are enabled while share failed");
  }
  await dialog.getByRole("button", { name: "查看失败原因" }).click();
  const toast = page.locator(".toast.show");
  await toast.waitFor({ timeout: 5_000 });
  const toastBox = await toast.boundingBox();
  const primaryBox = await page.getByRole("button", { name: /开始快速处理|处理中/ }).first().boundingBox();
  if (toastBox && primaryBox && rectanglesOverlap(toastBox, primaryBox)) {
    throw new Error("toast overlaps the primary batch action");
  }
  await page.screenshot({ path: path.join(screenshotsDir, "fix-share-failed-partial.png"), fullPage: true });
  await dialog.getByRole("button", { name: "完成" }).click();
}

async function installShareCode2FakeCli(page) {
  await page.evaluate(() => {
    const api = window.panjieDesktop;
    if (!api || typeof api.localCliRun !== "function") return false;

    api.localCliRun = async (command) => {
      const args = command.args || [];
      const text = args.join(" ");
      if (args[0] === "who") {
        return { exitCode: 0, stdout: "uid: 10001, username: redacted", stderr: "", timedOut: false };
      }
      if (args.includes("--version")) {
        return { exitCode: 0, stdout: "BaiduPCS-Go fake-desktop", stderr: "", timedOut: false };
      }
      if (args[0] === "ls") {
        return { exitCode: 0, stdout: "2026-01-01 00:00:00 1024 course.mp4", stderr: "", timedOut: false };
      }
      if (args[0] === "share" && args[1] === "set") {
        return { exitCode: 0, stdout: "\u8fdc\u7aef\u670d\u52a1\u5668\u8fd4\u56de\u9519\u8bef\uff0c\u4ee3\u7801: 2", stderr: "", timedOut: false };
      }
      if (args[0] === "share" && args[1] === "list") {
        return { exitCode: 0, stdout: "", stderr: "", timedOut: false };
      }
      if (/mkdir|cd|transfer|mv|upload/.test(text)) {
        return { exitCode: 0, stdout: "ok", stderr: "", timedOut: false };
      }
      return { exitCode: 0, stdout: "ok", stderr: "", timedOut: false };
    };
    return true;
  }).catch(() => false);
}

async function verifySettingsSimpleMode(page) {
  await page.getByRole("heading", { name: "设置中心" }).waitFor({ timeout: 5_000 });
  await page.getByText("百度网盘连接").waitFor({ timeout: 5_000 });
  await page.getByText("处理默认值").waitFor({ timeout: 5_000 });
  await page.getByText("扫描配置").waitFor({ timeout: 5_000 });
  await page.getByText("数据与缓存").waitFor({ timeout: 5_000 });
  await page.getByText("关于").waitFor({ timeout: 5_000 });
  await page.getByRole("button", { name: "重新检测" }).click();
  await page.getByText("用户名").waitFor({ timeout: 10_000 });
  await page.getByText("容量 / 已用").waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "检查依赖" }).click();
  await page.getByText("Node Runtime").waitFor({ timeout: 10_000 });
  await page.getByText("BaiduPCS-Go", { exact: true }).first().waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: "清理缓存" }).click();
  await page.getByText(/删除文件 \d+ 个，释放/).waitFor({ timeout: 10_000 });
  const disconnectedButtons = page.getByRole("button", { name: "功能未接线" });
  if ((await disconnectedButtons.count()) < 2) {
    throw new Error("settings page should show unimplemented buttons as disabled 功能未接线");
  }
  for (let index = 0; index < await disconnectedButtons.count(); index += 1) {
    if (!(await disconnectedButtons.nth(index).isDisabled())) {
      throw new Error("功能未接线 button is not disabled");
    }
  }
  if (await page.getByText("能力矩阵").isVisible()) {
    throw new Error("advanced debug is expanded by default");
  }
  await page.screenshot({ path: path.join(screenshotsDir, "settings-simple.png"), fullPage: true });
  await page.getByText("展开高级调试").click();
  await page.getByRole("button", { name: "刷新执行日志" }).click();
  await page.getByText("执行命令").waitFor({ timeout: 5_000 });
  await page.getByText("stdout").waitFor({ timeout: 5_000 });
  await page.getByText("stderr").waitFor({ timeout: 5_000 });
  await page.getByText("exitCode").waitFor({ timeout: 5_000 });
  await page.getByText("能力矩阵").waitFor({ timeout: 5_000 });
  await page.screenshot({ path: path.join(screenshotsDir, "settings-advanced-expanded.png"), fullPage: true });
}

function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function verifyCustomChrome(page) {
  const titlebar = page.locator('[data-testid="custom-titlebar"]');
  await titlebar.waitFor({ timeout: 5_000 });
  await page.getByText("盘姬 · 批量助手").waitFor({ timeout: 5_000 });
  await page.getByLabel("最小化窗口").waitFor({ timeout: 5_000 });
  await page.getByLabel("最大化或还原窗口").waitFor({ timeout: 5_000 });
  await page.getByLabel("关闭窗口").waitFor({ timeout: 5_000 });

  const screenshotPath = path.join(screenshotsDir, "custom-titlebar.png");
  await titlebar.screenshot({ path: screenshotPath });
  assertNotBlankScreenshot(screenshotPath);
}

async function verifyBatchLayout(page, size) {
  await page.evaluate(() => {
    document.querySelector(".page-stage")?.scrollTo(0, 0);
    document.querySelector(".batch-left")?.scrollTo(0, 0);
    document.querySelector(".batch-right")?.scrollTo(0, 0);
  });
  await page.getByRole("heading", { name: "批量处理" }).waitFor({ timeout: 5_000 });
  await page.getByText("快速转存模式").waitFor({ timeout: 5_000 });
  await page.getByText("检查二维码").waitFor({ timeout: 5_000 });
  await page.getByText("OCR 检查文字").waitFor({ timeout: 5_000 });
  await page.getByText("任务流水线").waitFor({ timeout: 5_000 });
  await page.getByText("分享链接转存还未真实验证").waitFor({ timeout: 5_000 });

  const startButton = page.getByRole("button", { name: /开始快速处理|开始处理并检查|开始深度处理/ }).first();
  await startButton.waitFor({ state: "visible", timeout: 5_000 });

  const layout = await page.evaluate(() => {
    const body = document.body;
    const doc = document.documentElement;
    const button = [...document.querySelectorAll("button")].find((item) =>
      /开始快速处理|开始处理并检查|开始深度处理/.test(item.textContent ?? "")
    );
    const scanOption = [...document.querySelectorAll("button")].find((item) =>
      /检查二维码/.test(item.textContent ?? "")
    );
    const resultCard = [...document.querySelectorAll(".card")].find((item) =>
      /任务流水线|结果预览|分享链接转存还未真实验证/.test(item.textContent ?? "")
    );
    const buttonRect = button?.getBoundingClientRect();
    const scanRect = scanOption?.getBoundingClientRect();
    const cardRect = resultCard?.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: Math.max(body.scrollWidth, doc.scrollWidth),
      bodyScrollHeight: Math.max(body.scrollHeight, doc.scrollHeight),
      buttonRect: buttonRect
        ? {
            left: buttonRect.left,
            right: buttonRect.right,
            top: buttonRect.top,
            bottom: buttonRect.bottom
          }
        : null,
      scanRect: scanRect
        ? {
            left: scanRect.left,
            right: scanRect.right,
            top: scanRect.top,
            bottom: scanRect.bottom
          }
        : null,
      cardRect: cardRect
        ? {
            left: cardRect.left,
            right: cardRect.right,
            top: cardRect.top,
            bottom: cardRect.bottom
          }
        : null
    };
  });

  if (layout.scrollWidth > layout.viewportWidth + 2) {
    throw new Error(
      `batch page has horizontal overflow at ${size.width}x${size.height}: ${layout.scrollWidth} > ${layout.viewportWidth}`
    );
  }
  if (layout.bodyScrollHeight > layout.viewportHeight + 120) {
    throw new Error(
      `body scroll height is too large at ${size.width}x${size.height}: ${layout.bodyScrollHeight} > ${layout.viewportHeight}`
    );
  }
  if (!isRectVisible(layout.buttonRect, layout.viewportWidth, layout.viewportHeight)) {
    throw new Error(`batch primary action is not visible at ${size.width}x${size.height}`);
  }
  if (!isRectVisible(layout.scanRect, layout.viewportWidth, layout.viewportHeight)) {
    throw new Error(`batch on-demand scan options are not visible at ${size.width}x${size.height}`);
  }
  if (!isRectVisible(layout.cardRect, layout.viewportWidth, layout.viewportHeight)) {
    throw new Error(`batch result card is not visible at ${size.width}x${size.height}`);
  }
}

function isRectVisible(rect, viewportWidth, viewportHeight) {
  if (!rect) return false;
  return rect.right > 0 && rect.left < viewportWidth && rect.bottom > 0 && rect.top < viewportHeight;
}

async function firstCdpPage(browser) {
  for (let index = 0; index < 50; index += 1) {
    const pages = browser.contexts().flatMap((context) => context.pages());
    const page = pages.find((item) => item.url().includes("index.html")) ?? pages[0];
    if (page) return page;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("No CDP page found for packaged desktop app");
}

async function waitForCdp(port) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) return;
    } catch {
      // Wait until Electron opens the debugging endpoint.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for CDP port ${port}`);
}

async function assertRuntimeLogClean() {
  const logPath = path.join(logDir, "electron-runtime.log");
  if (!fs.existsSync(logPath)) return;
  const log = fs.readFileSync(logPath, "utf8");
  if (/console-message.*(?:ERR_|error|failed)/i.test(log)) {
    throw new Error(`runtime log contains renderer error: ${logPath}`);
  }
  if (/render-process-gone.*crashed/i.test(log)) {
    throw new Error(`runtime log contains renderer crash: ${logPath}`);
  }
  if (/not absolute path/i.test(log)) {
    throw new Error(`runtime log still contains BaiduPCS-Go absolute path failure: ${logPath}`);
  }
}

function assertNotBlankScreenshot(filePath) {
  const buffer = fs.readFileSync(filePath);
  const uniqueBytes = new Set(buffer.subarray(0, Math.min(buffer.length, 4096)));
  if (uniqueBytes.size < 16) {
    throw new Error(`screenshot appears blank: ${filePath}`);
  }
}

function stopPanjieProcesses() {
  spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "Get-Process | Where-Object { $_.ProcessName -like '*盘姬*' } | ForEach-Object { Stop-Process -Id $_.Id -Force }"
    ],
    { windowsHide: true, stdio: "ignore" }
  );
}

function hasPanjieProcesses() {
  const result = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "(Get-Process | Where-Object { $_.ProcessName -like '*盘姬*' } | Measure-Object).Count"
    ],
    { windowsHide: true, encoding: "utf8" }
  );
  return Number(result.stdout.trim()) > 0;
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
