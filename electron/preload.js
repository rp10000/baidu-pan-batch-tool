import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("panjieDesktop", {
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  localCliRun: (command) => ipcRenderer.invoke("local-cli:run", command),
  inspectLocalCli: () => ipcRenderer.invoke("local-cli:inspect"),
  getLocalCliCommandLog: () => ipcRenderer.invoke("local-cli:get-command-log"),
  openBaiduLoginPage: () => ipcRenderer.invoke("auth:open-login-page"),
  probeBaiduLoginMethod: () => ipcRenderer.invoke("auth:probe-login-method"),
  importBaiduSession: (payload) => ipcRenderer.invoke("auth:import-session", payload),
  clearBaiduSession: () => ipcRenderer.invoke("auth:clear-session"),
  checkDependencies: () => ipcRenderer.invoke("system:check-dependencies"),
  installScanRuntime: () => ipcRenderer.invoke("scan-runtime:install"),
  clearCache: () => ipcRenderer.invoke("cache:clear")
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
