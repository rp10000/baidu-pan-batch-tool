import { capabilitiesForMode } from "./adapterMode";
import { PendingStorageAdapter } from "./PendingStorageAdapter";

export class BaiduMcpNativeAdapter extends PendingStorageAdapter {
  constructor() {
    super("baidu_mcp", capabilitiesForMode("baidu_mcp"), "百度网盘 MCP 本地桌面接入待实现");
  }
}
