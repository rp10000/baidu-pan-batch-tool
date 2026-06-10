import { ipcMain } from "electron";

export function registerIpc() {
  ipcMain.handle("app:get-version", () => ({
    productName: "盘姬批量助手",
    mode: "windows-desktop"
  }));
}
