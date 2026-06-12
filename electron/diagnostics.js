import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

let logFilePath;

export function initDiagnostics() {
  const requestedDir = process.env.PANJIE_ELECTRON_LOG_DIR;
  const logDir = requestedDir || path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  logFilePath = path.join(logDir, "electron-runtime.log");
  fs.writeFileSync(logFilePath, "", "utf8");
  log("startup", {
    isPackaged: app.isPackaged,
    appPath: app.getAppPath(),
    resourcesPath: process.resourcesPath,
    cwd: process.cwd()
  });
  return logFilePath;
}

export function log(event, data = {}) {
  const line = `${new Date().toISOString()} ${event} ${JSON.stringify(redactObject(data))}\n`;
  if (logFilePath) {
    fs.appendFileSync(logFilePath, line, "utf8");
  }
}

export function getLogFilePath() {
  return logFilePath;
}

function redactObject(value) {
  if (typeof value === "string") {
    return redact(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactObject);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactObject(item)]));
  }
  return value;
}

function redact(value) {
  return String(value ?? "")
    .replace(/https?:\/\/pan\.baidu\.com\/s\/[^\s)'"<>]+/gi, "<redacted-share-url>")
    .replace(/(?:提取码|提取密码|extract\s*code|pwd)\s*[:：=]?\s*[A-Za-z0-9]{4,}/gi, "extractCode: <redacted>")
    .replace(/(?:BDUSS|STOKEN|BAIDUID|access[_-]?token|refresh[_-]?token|cookie)\s*[:=]\s*[^\s;]+/gi, "<redacted-auth-field>");
}
