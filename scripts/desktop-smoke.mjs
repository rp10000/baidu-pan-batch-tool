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

  await page.screenshot({ path: path.join(screenshotsDir, "fixed-desktop-home.png"), fullPage: true });
  assertNotBlankScreenshot(path.join(screenshotsDir, "fixed-desktop-home.png"));

  await nav.getByRole("button", { name: /批量处理/ }).click();
  await page.getByText("快速转存模式").waitFor({ timeout: 5_000 });
  await page.getByText("检查二维码").waitFor({ timeout: 5_000 });
  await page.getByText("OCR 检查文字").waitFor({ timeout: 5_000 });
  await page.screenshot({ path: path.join(screenshotsDir, "fixed-desktop-batch.png"), fullPage: true });

  await nav.getByRole("button", { name: /设置中心/ }).click();
  await page.getByRole("heading", { name: "Windows 本地 CLI 模式" }).waitFor({ timeout: 5_000 });
  await page.getByText("BaiduPCS-Go v4.0.1").waitFor({ timeout: 5_000 });
  await page.screenshot({ path: path.join(screenshotsDir, "fixed-desktop-settings-cli.png"), fullPage: true });

  if (consoleErrors.length > 0) {
    throw new Error(`renderer console errors: ${consoleErrors.join(" | ")}`);
  }
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
