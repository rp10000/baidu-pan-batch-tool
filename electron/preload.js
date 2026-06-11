import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("panjieDesktop", {
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  localCliRun: (command) => ipcRenderer.invoke("local-cli:run", command)
});

contextBridge.exposeInMainWorld("panjieWindow", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized")
});
