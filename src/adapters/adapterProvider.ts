import { BaiduMcpNativeAdapter } from "./BaiduMcpNativeAdapter";
import { BaiduSdkAdapter } from "./BaiduSdkAdapter";
import { BdpanWslAdapter } from "./BdpanWslAdapter";
import { MockBaiduAdapter } from "./MockBaiduAdapter";
import { WindowsNativeAdapter } from "./WindowsNativeAdapter";
import type { AdapterMode, StorageAdapter } from "./StorageAdapter";
import { LocalBridgeBdpanCommandRunner } from "../services/BdpanCommandRunner";

export function createStorageAdapter(mode: AdapterMode): StorageAdapter {
  if (mode === "windows_native_official") {
    return new WindowsNativeAdapter();
  }
  if (mode === "bdpan_wsl") {
    return new BdpanWslAdapter(new LocalBridgeBdpanCommandRunner());
  }
  if (mode === "baidu_mcp") {
    return new BaiduMcpNativeAdapter();
  }
  if (mode === "baidu_sdk") {
    return new BaiduSdkAdapter();
  }
  return new MockBaiduAdapter();
}
