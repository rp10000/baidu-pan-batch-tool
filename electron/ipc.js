import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import { log } from "./diagnostics.js";

const allowedLocalCliCommands = new Set(["--version", "help", "who", "login", "ls", "mkdir", "cd", "upload", "mv", "transfer", "share"]);

export function registerIpc() {
  ipcMain.handle("app:get-version", () => ({
    productName: "盘姬批量助手",
    mode: "windows-desktop",
    userDataPath: app.getPath("userData")
  }));

  ipcMain.handle("local-cli:run", async (_event, command) => runLocalCli(command));
  ipcMain.handle("local-cli:start-login", () => startLocalCliLogin());
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
    const child = spawn("cmd.exe", ["/d", "/k", `"${cliPath}" login`], {
      detached: true,
      shell: false,
      stdio: "ignore",
      windowsHide: false
    });
    child.unref();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "failed to open local cli login window" };
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
  return spawnLocalCli(cliPath, validation.args, validation.timeoutMs);
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
