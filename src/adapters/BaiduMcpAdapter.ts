import type { RemoteFile, StorageAdapter, StorageCapabilities } from "./StorageAdapter";

const capabilities: StorageCapabilities = {
  checkLogin: "unknown",
  transferSharedLink: "unsupported",
  listFiles: "supported",
  createDirectory: "supported",
  renameFile: "supported",
  moveFile: "supported",
  downloadFile: "unsupported",
  uploadFile: "supported",
  createShareLink: "unknown"
};

export class BaiduMcpAdapter implements StorageAdapter {
  readonly mode = "baidu_mcp" as const;

  async getCapabilities(): Promise<StorageCapabilities> {
    return capabilities;
  }

  async checkConnection(): Promise<{ ok: boolean; message: string }> {
    return { ok: false, message: "MCP 模式尚未接入本地桌面桥" };
  }

  async transferSharedLink(): Promise<{ ok: boolean; error: string }> {
    return { ok: false, error: "MCP 当前不作为分享转存主通道" };
  }

  async listFiles(): Promise<RemoteFile[]> {
    return [];
  }

  async mkdir(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: "MCP 尚未接入" };
  }

  async renameFile(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: "MCP 尚未接入" };
  }

  async moveFile(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: "MCP 尚未接入" };
  }

  async downloadFile(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: "MCP 尚未接入" };
  }

  async uploadFile(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: "MCP 尚未接入" };
  }

  async createShareLink(): Promise<{ ok: boolean; error: string }> {
    return { ok: false, error: "MCP 分享能力待接入" };
  }
}
