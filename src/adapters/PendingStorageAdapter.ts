import type { AdapterMode } from "./adapterMode";
import type { RemoteFile, StorageAdapter, StorageCapabilities } from "./StorageAdapter";

export class PendingStorageAdapter implements StorageAdapter {
  constructor(
    readonly mode: AdapterMode,
    private readonly capabilities: StorageCapabilities,
    private readonly message: string
  ) {}

  async getCapabilities(): Promise<StorageCapabilities> {
    return this.capabilities;
  }

  async checkConnection(): Promise<{ ok: boolean; message: string }> {
    return { ok: false, message: this.message };
  }

  async transferSharedLink(): Promise<{ ok: boolean; error: string }> {
    return { ok: false, error: "当前模式尚未确认支持分享链接转存" };
  }

  async listFiles(): Promise<RemoteFile[]> {
    return [];
  }

  async mkdir(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: this.message };
  }

  async renameFile(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: this.message };
  }

  async moveFile(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: this.message };
  }

  async downloadFile(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: this.message };
  }

  async uploadFile(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: this.message };
  }

  async createShareLink(): Promise<{ ok: boolean; error: string }> {
    return { ok: false, error: "当前模式尚未确认支持创建分享链接" };
  }
}
