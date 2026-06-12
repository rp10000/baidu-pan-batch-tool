import { app, Menu } from "electron";
import { initDiagnostics, log } from "./diagnostics.js";
import { createMainWindow } from "./window.js";
import { registerIpc } from "./ipc.js";

app.setAppUserModelId("com.panjie.batchassistant");

registerIpc();

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const logFilePath = initDiagnostics();
  log("diagnostics-ready", { logFilePath });
  createMainWindow();
  app.on("activate", () => {
    if (app.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
