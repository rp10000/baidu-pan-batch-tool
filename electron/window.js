import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserWindow } from "electron";
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

  if (process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return window;
}
