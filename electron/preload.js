import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("panjieDesktop", {
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  localCliRun: (command) => ipcRenderer.invoke("local-cli:run", command),
  startLocalCliLogin: () => ipcRenderer.invoke("local-cli:start-login")
});

contextBridge.exposeInMainWorld("panjieDraft", {
  read: () => ipcRenderer.invoke("draft:read"),
  write: (draft) => ipcRenderer.invoke("draft:write", draft)
});

contextBridge.exposeInMainWorld("panjieWindow", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized")
});
