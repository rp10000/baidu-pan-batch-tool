import { BdpanCliAdapter } from "./BdpanCliAdapter";
import { BaiduMcpAdapter } from "./BaiduMcpAdapter";
import { MockBaiduAdapter } from "./MockBaiduAdapter";
import type { AdapterMode, StorageAdapter } from "./StorageAdapter";
import { LocalBridgeBdpanCommandRunner } from "../services/BdpanCommandRunner";

export function createStorageAdapter(mode: AdapterMode): StorageAdapter {
  if (mode === "bdpan_cli") {
    return new BdpanCliAdapter(new LocalBridgeBdpanCommandRunner());
  }
  if (mode === "baidu_mcp") {
    return new BaiduMcpAdapter();
  }
  return new MockBaiduAdapter();
}
