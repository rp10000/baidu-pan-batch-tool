import { capabilitiesForMode } from "./adapterMode";
import { PendingStorageAdapter } from "./PendingStorageAdapter";

export class WindowsNativeAdapter extends PendingStorageAdapter {
  constructor() {
    super(
      "windows_native_official",
      capabilitiesForMode("windows_native_official"),
      "Windows 原生官方能力待验证：分享链接转存尚未确认"
    );
  }
}
