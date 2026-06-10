import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { app, BrowserWindow } from "electron";
import { log } from "./diagnostics.js";
import { defaultWebPreferences } from "./security.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: "#071225",
    title: "盘姬批量助手",
    webPreferences: {
      ...defaultWebPreferences,
      preload: path.join(__dirname, "preload.js")
    }
  });

  attachDiagnostics(window);

  if (process.env.VITE_DEV_SERVER_URL) {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    log("load-url", { isPackaged: app.isPackaged, dirname: __dirname, url: devUrl });
    window.loadURL(devUrl);
  } else {
    const indexPath = path.join(app.getAppPath(), "dist", "index.html");
    const assetsPath = path.join(app.getAppPath(), "dist", "assets");
    log("load-file", {
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath,
      dirname: __dirname,
      indexPath,
      indexExists: fs.existsSync(indexPath),
      assetsPath,
      assetsExists: fs.existsSync(assetsPath)
    });
    window.loadFile(indexPath);
  }

  return window;
}

function attachDiagnostics(window) {
  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    log("did-fail-load", { errorCode, errorDescription, validatedURL });
  });
  window.webContents.on("did-finish-load", () => {
    log("did-finish-load", { url: window.webContents.getURL() });
  });
  window.webContents.on("dom-ready", () => {
    log("dom-ready", { url: window.webContents.getURL() });
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    log("render-process-gone", details);
  });
  window.on("unresponsive", () => {
    log("unresponsive");
  });
  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    log("console-message", { level, message, line, sourceId });
  });
  window.webContents.on("preload-error", (_event, preloadPath, error) => {
    log("preload-error", { preloadPath, message: error.message, stack: error.stack });
  });
}
