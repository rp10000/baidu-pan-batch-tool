import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
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
  ipcMain.handle("local-cli:start-login", () => startLocalCliLogin());
  ipcMain.handle("local-cli:get-command-log", () => ({
    cliPath: resolveBaiduPcsGoPath() ?? "",
    entries: commandHistory.slice(-30)
  }));
  ipcMain.handle("system:check-dependencies", () => checkDependencies());
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
    const args = ["/d", "/k", `"${cliPath}" login`];
    const child = spawn("cmd.exe", args, {
      detached: true,
      shell: false,
      stdio: "ignore",
      windowsHide: false
    });
    child.unref();
    recordCommandLog({
      args: ["login"],
      exitCode: 0,
      stdout: `opened visible login window, pid=${child.pid ?? "unknown"}`,
      stderr: ""
    });
    return { ok: true, pid: child.pid };
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to open local cli login window";
    recordCommandLog({ args: ["login"], exitCode: 127, stdout: "", stderr: message });
    return { ok: false, error: message };
  }
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
    const child = spawn(executablePath, args, {
      shell: false,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ exitCode: 124, stdout, stderr: "local cli command timed out" });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ exitCode: 127, stdout, stderr: error.message });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode: exitCode ?? 1, stdout, stderr });
    });
  });
}

function checkDependencies() {
  const baiduPath = resolveBaiduPcsGoPath();
  const tesseractPath = findExecutable(["tesseract.exe", "tesseract"]);
  const ffmpegPath = findExecutable(["ffmpeg.exe", "ffmpeg"]);
  const pythonPath = findExecutable(["python.exe", "python"]);
  const opencv = pythonPath
    ? runExecutable(pythonPath, ["-c", "import cv2; print(cv2.__version__)"], 10000)
    : { exitCode: 127, stdout: "", stderr: "python executable not found" };

  return {
    checkedAt: new Date().toISOString(),
    items: [
      dependencyItem("BaiduPCS-Go", baiduPath, baiduPath ? runExecutable(baiduPath, ["--version"], 5000) : missing("BaiduPCS-Go executable not found")),
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
      dependencyItem("OpenCV", pythonPath ? "python cv2" : "", opencv)
    ]
  };
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

function clearAppCache() {
  const userData = app.getPath("userData");
  const targets = ["Cache", "Code Cache", "GPUCache", "DawnCache", "blob_storage"].map((name) => path.join(userData, name));
  let filesDeleted = 0;
  let bytesFreed = 0;
  const errors = [];

  for (const target of targets) {
    const resolved = path.resolve(target);
    if (!resolved.startsWith(path.resolve(userData))) {
      errors.push(`refused path outside userData: ${target}`);
      continue;
    }
    if (!fs.existsSync(resolved)) continue;
    const usage = measurePath(resolved);
    filesDeleted += usage.files;
    bytesFreed += usage.bytes;
    try {
      fs.rmSync(resolved, { recursive: true, force: true });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `failed to remove ${target}`);
    }
  }

  return {
    ok: errors.length === 0,
    userDataPath: userData,
    filesDeleted,
    bytesFreed,
    errors
  };
}

function measurePath(target) {
  let files = 0;
  let bytes = 0;
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(current)) {
        stack.push(path.join(current, child));
      }
    } else {
      files += 1;
      bytes += stat.size;
    }
  }
  return { files, bytes };
}

function recordCommandLog(entry) {
  commandHistory.push({
    id: `${Date.now()}-${commandHistory.length}`,
    createdAt: new Date().toISOString(),
    command: `BaiduPCS-Go ${entry.args.map(quoteArg).join(" ")}`,
    stdout: trimLog(entry.stdout),
    stderr: trimLog(entry.stderr),
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
