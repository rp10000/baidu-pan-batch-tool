import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow, ipcMain, session } from "electron";
import { log } from "./diagnostics.js";

const allowedLocalCliCommands = new Set(["--version", "help", "who", "login", "quota", "ls", "mkdir", "cd", "upload", "mv", "transfer", "share"]);
const commandHistory = [];

export function registerIpc() {
  ipcMain.handle("app:get-version", () => ({
    productName: "盘姬批量助手",
    mode: "windows-desktop",
    userDataPath: app.getPath("userData")
  }));

  ipcMain.handle("local-cli:run", async (_event, command) => runLocalCli(command));
  ipcMain.handle("local-cli:inspect", () => inspectLocalCliRuntime());
  ipcMain.handle("local-cli:start-login", () => startLocalCliLogin());
  ipcMain.handle("local-cli:get-command-log", () => ({
    cliPath: resolveBaiduPcsGoPath() ?? "",
    entries: commandHistory.slice(-30)
  }));
  ipcMain.handle("system:check-dependencies", () => checkDependencies());
  ipcMain.handle("scan-runtime:install", () => installScanRuntime());
  ipcMain.handle("cache:clear", () => clearAppCache());
  ipcMain.handle("draft:read", () => readDraft());
  ipcMain.handle("draft:write", (_event, draft) => writeDraft(draft));
  ipcMain.handle("window:minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.handle("window:toggle-maximize", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return false;
    if (window.isMaximized()) {
      window.unmaximize();
      return false;
    }
    window.maximize();
    return true;
  });
  ipcMain.handle("window:close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
  ipcMain.handle("window:is-maximized", (event) => Boolean(BrowserWindow.fromWebContents(event.sender)?.isMaximized()));
}

function draftPath() {
  return path.join(app.getPath("userData"), "draft.local.json");
}

function readDraft() {
  try {
    const filePath = draftPath();
    if (!fs.existsSync(filePath)) return undefined;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

function writeDraft(draft) {
  try {
    const filePath = draftPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(draft, null, 2), "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "draft write failed" };
  }
}

function startLocalCliLogin() {
  const cliPath = resolveBaiduPcsGoPath();
  if (!cliPath) {
    return { ok: false, error: "BaiduPCS-Go executable not found" };
  }

  log("local-cli-login-window", { command: "login" });
  try {
    const startedAt = new Date().toISOString();
    const command = `start "BaiduPCS-Go 登录" cmd.exe /k ""${escapeCmd(cliPath)}" login"`;
    const result = spawnSync("cmd.exe", ["/d", "/c", command], {
      encoding: "utf8",
      windowsHide: false
    });
    const finishedAt = new Date().toISOString();
    const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
    const exitCode = result.status ?? (result.error ? 127 : 0);
    if (exitCode !== 0) {
      const message = result.stderr || result.stdout || result.error?.message || "failed to open local cli login window";
      recordCommandLog({ args: ["login"], exitCode, stdout: result.stdout || "", stderr: message, startedAt, finishedAt, durationMs });
      return { ok: false, error: message };
    }
    recordCommandLog({
      args: ["login"],
      exitCode: 0,
      stdout: "visible login terminal opened",
      stderr: "",
      startedAt,
      finishedAt,
      durationMs
    });
    return { ok: true, message: "visible login terminal opened" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to open local cli login window";
    recordCommandLog({ args: ["login"], exitCode: 127, stdout: "", stderr: message });
    return { ok: false, error: message };
  }
}

async function inspectLocalCliRuntime() {
  const cliPath = resolveBaiduPcsGoPath();
  if (!cliPath) {
    return buildRuntimeSnapshot({
      bridgeOnline: true,
      cliPath: "",
      version: { exitCode: 127, stdout: "", stderr: "BaiduPCS-Go executable not found" }
    });
  }

  const [version, who, quota, rootList] = await Promise.all([
    spawnLocalCli(cliPath, ["--version"], 5000),
    spawnLocalCli(cliPath, ["who"], 10000),
    spawnLocalCli(cliPath, ["quota"], 10000),
    spawnLocalCli(cliPath, ["ls", "/"], 20000)
  ]);
  recordCommandLog({ args: ["--version"], ...version });
  recordCommandLog({ args: ["who"], ...who });
  recordCommandLog({ args: ["quota"], ...quota });
  recordCommandLog({ args: ["ls", "/"], ...rootList });
  return buildRuntimeSnapshot({ bridgeOnline: true, cliPath, version, who, quota, rootList });
}

function runLocalCli(command) {
  const validation = validateCommand(command);
  if (!validation.ok) {
    return { exitCode: 2, stdout: "", stderr: validation.error };
  }

  const cliPath = resolveBaiduPcsGoPath();
  if (!cliPath) {
    return { exitCode: 127, stdout: "", stderr: "BaiduPCS-Go executable not found" };
  }

  log("local-cli-run", { command: validation.args[0], argCount: validation.args.length });
  return spawnLocalCli(cliPath, validation.args, validation.timeoutMs).then((result) => {
    recordCommandLog({ args: validation.args, ...result });
    return result;
  });
}

function validateCommand(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.args)) {
    return { ok: false, error: "invalid local cli command" };
  }
  if (!value.args.every((item) => typeof item === "string")) {
    return { ok: false, error: "invalid local cli args" };
  }
  if (value.args.length === 0 || !allowedLocalCliCommands.has(value.args[0])) {
    return { ok: false, error: "local cli command not allowed" };
  }
  if (value.args.some((arg) => /BDUSS|STOKEN|BAIDUID|cookie|token/i.test(arg))) {
    return { ok: false, error: "credential-like argument rejected" };
  }
  return {
    ok: true,
    args: value.args,
    timeoutMs: Math.min(Number(value.timeoutMs) || 120000, 180000)
  };
}

function resolveBaiduPcsGoPath() {
  const candidates = [
    path.join(process.resourcesPath, "tools", "baidu-cli", "BaiduPCS-Go", "BaiduPCS-Go-v4.0.1-windows-x64", "BaiduPCS-Go.exe"),
    path.join(app.getAppPath(), "tools", "baidu-cli", "BaiduPCS-Go", "BaiduPCS-Go-v4.0.1-windows-x64", "BaiduPCS-Go.exe"),
    path.join(process.cwd(), "tools", "baidu-cli", "BaiduPCS-Go", "BaiduPCS-Go-v4.0.1-windows-x64", "BaiduPCS-Go.exe")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function spawnLocalCli(executablePath, args, timeoutMs) {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const child = spawn(executablePath, args, {
      shell: false,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      const finishedAt = new Date().toISOString();
      resolve({ exitCode: 124, stdout, stderr: "local cli command timed out", startedAt, finishedAt, durationMs: diffMs(startedAt, finishedAt) });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      const finishedAt = new Date().toISOString();
      resolve({ exitCode: 127, stdout, stderr: error.message, startedAt, finishedAt, durationMs: diffMs(startedAt, finishedAt) });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      const finishedAt = new Date().toISOString();
      resolve({ exitCode: exitCode ?? 1, stdout, stderr, startedAt, finishedAt, durationMs: diffMs(startedAt, finishedAt) });
    });
  });
}

function checkDependencies() {
  const baiduPath = resolveBaiduPcsGoPath();
  const tesseractPath = findExecutable(["tesseract.exe", "tesseract"]);
  const ffmpegPath = findExecutable(["ffmpeg.exe", "ffmpeg"]);
  const python = findPython();
  const opencv = python.path
    ? runExecutable(python.path, [...python.prefixArgs, "-c", "import cv2; print(cv2.__version__)"], 10000)
    : { exitCode: 127, stdout: "", stderr: "Python executable not found" };

  return {
    checkedAt: new Date().toISOString(),
    items: [
      dependencyItem("BaiduPCS-Go", baiduPath, baiduPath ? runExecutable(baiduPath, ["--version"], 5000) : missing("BaiduPCS-Go executable not found")),
      dependencyItem("Python", python.path, python.path ? runExecutable(python.path, [...python.prefixArgs, "--version"], 5000) : missing("Python executable not found")),
      dependencyItem("Tesseract", tesseractPath, tesseractPath ? runExecutable(tesseractPath, ["--version"], 5000) : missing("tesseract executable not found")),
      dependencyItem("FFmpeg", ffmpegPath, ffmpegPath ? runExecutable(ffmpegPath, ["-version"], 5000) : missing("ffmpeg executable not found")),
      {
        name: "Node Runtime",
        status: "found",
        path: process.execPath,
        version: process.version,
        exitCode: 0,
        stdout: process.version,
        stderr: ""
      },
      dependencyItem("OpenCV", python.path ? `${python.path} cv2` : "", opencv)
    ]
  };
}

function installScanRuntime() {
  const startedAt = new Date().toISOString();
  const logs = [];
  const python = findPython();
  if (!python.path) {
    return {
      ok: false,
      status: "python_required",
      startedAt,
      finishedAt: new Date().toISOString(),
      logs: ["未检测到 Python。请先安装 Python 3.10+，再重新安装扫描运行时。"]
    };
  }

  const runtimeDir = path.join(app.getPath("userData"), "scan-runtime");
  const venvDir = path.join(runtimeDir, ".venv");
  fs.mkdirSync(runtimeDir, { recursive: true });

  const steps = [
    {
      label: "创建 Python 虚拟环境",
      run: () => runExecutable(python.path, [...python.prefixArgs, "-m", "venv", venvDir], 180000)
    },
    {
      label: "升级 pip",
      run: () => runExecutable(venvPythonPath(venvDir), ["-m", "pip", "install", "--upgrade", "pip"], 180000)
    },
    {
      label: "安装 OpenCV / Pillow / NumPy",
      run: () => runExecutable(venvPythonPath(venvDir), ["-m", "pip", "install", "opencv-python", "pillow", "numpy"], 600000)
    }
  ];

  for (const step of steps) {
    const result = step.run();
    logs.push(stepLog(step.label, result));
    if (result.exitCode !== 0) {
      return {
        ok: false,
        status: "failed",
        runtimeDir,
        startedAt,
        finishedAt: new Date().toISOString(),
        logs
      };
    }
  }

  const wingetPath = findExecutable(["winget.exe", "winget"]);
  const tesseractPath = findExecutable(["tesseract.exe", "tesseract"]);
  const ffmpegPath = findExecutable(["ffmpeg.exe", "ffmpeg"]);
  if (wingetPath && !tesseractPath) {
    logs.push(stepLog("安装 Tesseract", runExecutable(wingetPath, ["install", "--id", "UB-Mannheim.TesseractOCR", "--silent", "--accept-package-agreements", "--accept-source-agreements"], 600000)));
  }
  if (wingetPath && !ffmpegPath) {
    logs.push(stepLog("安装 FFmpeg", runExecutable(wingetPath, ["install", "--id", "Gyan.FFmpeg", "--silent", "--accept-package-agreements", "--accept-source-agreements"], 600000)));
  }
  if (!wingetPath && (!tesseractPath || !ffmpegPath)) {
    logs.push("未检测到 winget，Tesseract / FFmpeg 需用户手动安装后重新检查依赖。");
  }

  return {
    ok: true,
    status: "installed",
    runtimeDir,
    startedAt,
    finishedAt: new Date().toISOString(),
    logs
  };
}

function stepLog(label, result) {
  const output = redactForLog(`${result.stdout}\n${result.stderr}`).trim();
  return `${label}: exitCode=${result.exitCode}${output ? `\n${trimLog(output)}` : ""}`;
}

function venvPythonPath(venvDir) {
  return path.join(venvDir, "Scripts", "python.exe");
}

function missing(message) {
  return { exitCode: 127, stdout: "", stderr: message };
}

function dependencyItem(name, executablePath, result) {
  const output = `${result.stdout}\n${result.stderr}`.trim();
  return {
    name,
    status: result.exitCode === 0 ? "found" : "missing",
    path: executablePath || "",
    version: firstLine(output),
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

function findExecutable(names) {
  for (const name of names) {
    const result = spawnSyncUtf8("where.exe", [name], 5000);
    if (result.exitCode === 0) {
      const found = firstLine(result.stdout);
      if (found && fs.existsSync(found)) return found;
    }
  }
  return "";
}

function findPython() {
  const pythonPath = findExecutable(["python.exe", "python", "python3"]);
  if (pythonPath) return { path: pythonPath, prefixArgs: [] };
  const pyLauncher = findExecutable(["py.exe", "py"]);
  if (pyLauncher) return { path: pyLauncher, prefixArgs: ["-3"] };
  return { path: "", prefixArgs: [] };
}

function runExecutable(executablePath, args, timeoutMs) {
  return spawnSyncUtf8(executablePath, args, timeoutMs);
}

function spawnSyncUtf8(executablePath, args, timeoutMs) {
  const result = spawnSync(executablePath, args, {
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true
  });
  return {
    exitCode: result.error?.message.includes("ETIMEDOUT") ? 124 : result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

async function clearAppCache() {
  const userData = app.getPath("userData");
  const targets = ["Cache", "Code Cache", "GPUCache", "DawnCache", "blob_storage"].map((name) => path.join(userData, name));
  let filesDeleted = 0;
  let bytesFreed = 0;
  const errors = [];
  const skipped = [];

  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ["appcache", "shadercache", "serviceworkers", "cachestorage"]
    });
  } catch (error) {
    skipped.push(error instanceof Error ? error.message : "Electron session cache clear skipped");
  }

  for (const target of targets) {
    const resolved = path.resolve(target);
    if (!resolved.startsWith(path.resolve(userData))) {
      errors.push(`refused path outside userData: ${target}`);
      continue;
    }
    if (!fs.existsSync(resolved)) continue;
    const usage = removePathSkippingLocked(resolved);
    filesDeleted += usage.filesDeleted;
    bytesFreed += usage.bytesFreed;
    skipped.push(...usage.skipped);
  }

  return {
    ok: errors.length === 0,
    userDataPath: userData,
    filesDeleted,
    bytesFreed,
    errors,
    skipped
  };
}

function recordCommandLog(entry) {
  const createdAt = entry.finishedAt ?? new Date().toISOString();
  commandHistory.push({
    id: `${Date.now()}-${commandHistory.length}`,
    createdAt,
    startedAt: entry.startedAt ?? createdAt,
    finishedAt: entry.finishedAt ?? createdAt,
    durationMs: entry.durationMs ?? 0,
    command: redactForLog(`BaiduPCS-Go ${entry.args.map(quoteArg).join(" ")}`),
    stdout: trimLog(redactForLog(entry.stdout)),
    stderr: trimLog(redactForLog(entry.stderr)),
    exitCode: entry.exitCode
  });
  while (commandHistory.length > 50) commandHistory.shift();
}

function quoteArg(value) {
  return /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

function trimLog(value) {
  const text = String(value ?? "");
  return text.length > 12000 ? `${text.slice(0, 12000)}\n...<truncated>` : text;
}

function firstLine(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}

function buildRuntimeSnapshot(input) {
  const versionText = `${input.version?.stdout ?? ""}\n${input.version?.stderr ?? ""}`;
  const whoText = `${input.who?.stdout ?? ""}\n${input.who?.stderr ?? ""}`;
  const quotaText = `${input.quota?.stdout ?? ""}\n${input.quota?.stderr ?? ""}`;
  const rootText = `${input.rootList?.stdout ?? ""}\n${input.rootList?.stderr ?? ""}`;
  const account = { ...parseWhoOutput(whoText), ...parseQuotaOutput(quotaText) };
  const cliInstalled = Boolean(input.cliPath) || input.version?.exitCode === 0;
  const rootListOk = input.rootList?.exitCode === 0 && !containsLoginFailure(rootText);
  const loginState = determineLoginState({ cliInstalled, account, quota: input.quota, text: `${whoText}\n${quotaText}` });
  return {
    bridgeOnline: Boolean(input.bridgeOnline),
    cliInstalled,
    cliPath: input.cliPath ?? "",
    cliVersion: firstLine(versionText),
    loginState,
    account,
    rootListOk,
    message: runtimeMessage(loginState, cliInstalled, Boolean(input.bridgeOnline), `${whoText}\n${quotaText}\n${rootText}`)
  };
}

function parseWhoOutput(value) {
  const uid = value.match(/\buid\s*[:：]\s*([0-9]+)/i)?.[1]?.trim();
  const username =
    value.match(/用户名\s*[:：]\s*([^,\r\n]*)/)?.[1]?.trim() ||
    value.match(/\busername\s*[:：]\s*([^,\r\n]*)/i)?.[1]?.trim() ||
    value.match(/\bname\s*[:：]\s*([^,\r\n]*)/i)?.[1]?.trim();
  return {
    uid: uid || undefined,
    username: username || undefined
  };
}

function parseQuotaOutput(value) {
  if (!value || containsLoginFailure(value)) return {};
  const quotaTotal =
    value.match(/(?:总容量|总空间|total|quota)\D{0,24}([\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB))/i)?.[1] ||
    value.match(/容量\D{0,24}([\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB))/i)?.[1];
  const quotaUsed =
    value.match(/(?:已用|使用|used)\D{0,24}([\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB))/i)?.[1] ||
    value.match(/([\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB))\s*\/\s*[\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB)/i)?.[1];
  return {
    quotaTotal: quotaTotal?.trim(),
    quotaUsed: quotaUsed?.trim()
  };
}

function determineLoginState(input) {
  if (!input.cliInstalled) return "not_installed";
  const uidValid = Boolean(input.account.uid && input.account.uid !== "0");
  const identityValid = Boolean(input.account.username || (input.quota?.exitCode === 0 && (input.account.quotaTotal || input.account.quotaUsed)));
  if (uidValid && identityValid) return "logged_in";
  if (containsLoginFailure(input.text) || input.account.uid === "0") return "not_logged_in";
  return "unknown";
}

function runtimeMessage(state, cliInstalled, bridgeOnline, evidence) {
  if (!bridgeOnline) return "桌面 IPC 未连接";
  if (!cliInstalled) return "未检测到 BaiduPCS-Go";
  if (state === "logged_in") return "BaiduPCS-Go 已登录";
  if (state === "not_logged_in") {
    return /31045|登录状态过期|请尝试重新登录|user not exists|uid\s*[:：]\s*0\b|用户名\s*[:：]\s*(?:,|$)/i.test(evidence)
      ? "BaiduPCS-Go 未登录或登录已失效"
      : "BaiduPCS-Go 未登录";
  }
  return "BaiduPCS-Go 登录状态未确认";
}

function containsLoginFailure(value) {
  return /31045|登录状态过期|请尝试重新登录|user not exists|uid\s*[:：]\s*0\b|用户名\s*[:：]\s*(?:,|$)|未登录/i.test(String(value ?? ""));
}

function removePathSkippingLocked(target) {
  const result = { filesDeleted: 0, bytesFreed: 0, skipped: [] };
  removeRecursive(target, result);
  return result;
}

function removeRecursive(target, result) {
  if (!fs.existsSync(target)) return;
  let stat;
  try {
    stat = fs.statSync(target);
  } catch (error) {
    result.skipped.push(skipMessage(target, error));
    return;
  }
  if (stat.isDirectory()) {
    let children = [];
    try {
      children = fs.readdirSync(target);
    } catch (error) {
      result.skipped.push(skipMessage(target, error));
      return;
    }
    for (const child of children) {
      removeRecursive(path.join(target, child), result);
    }
    try {
      fs.rmSync(target, { force: true, recursive: false });
    } catch {
      // Non-empty or locked cache directories can remain after file cleanup.
    }
    return;
  }
  try {
    fs.rmSync(target, { force: true });
    result.filesDeleted += 1;
    result.bytesFreed += stat.size;
  } catch (error) {
    result.skipped.push(skipMessage(target, error));
  }
}

function skipMessage(target, error) {
  const code = error && typeof error === "object" && "code" in error ? error.code : "SKIPPED";
  return `${code}: ${path.basename(target)}`;
}

function redactForLog(value) {
  return String(value ?? "")
    .replace(/https?:\/\/pan\.baidu\.com\/s\/[^\s)'"<>，。；;]+/gi, "<redacted-share-url>")
    .replace(/(?:提取码|提取密码|pwd|code)\s*[:：=]?\s*[A-Za-z0-9]{4,}/gi, "extractCode: <redacted>")
    .replace(/(?:BDUSS|STOKEN|PTOKEN|BAIDUID|authorization)\s*[:：=]\s*[^\s;]+/gi, "<redacted-auth-field>");
}

function diffMs(startedAt, finishedAt) {
  return Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime());
}

function escapeCmd(value) {
  return String(value).replace(/"/g, '""');
}
