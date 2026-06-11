import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("panjieDesktop", {
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  localCliRun: (command) => ipcRenderer.invoke("local-cli:run", command)
});
