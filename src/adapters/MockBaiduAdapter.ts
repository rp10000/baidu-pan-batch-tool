import type { RemoteFile, StorageAdapter, StorageCapabilities } from "./StorageAdapter";

export class MockBaiduAdapter implements StorageAdapter {
  readonly mode = "mock" as const;

  async getCapabilities(): Promise<StorageCapabilities> {
    return {
      checkLogin: "mock_only",
      transferSharedLink: "mock_only",
      listFiles: "mock_only",
      createDirectory: "mock_only",
      renameFile: "mock_only",
      moveFile: "mock_only",
      downloadFile: "mock_only",
      uploadFile: "mock_only",
      createShareLink: "mock_only"
    };
  }

  async checkConnection(): Promise<{ ok: boolean; displayName?: string; message: string }> {
    return { ok: true, displayName: "Mock", message: "Mock 演示模式，不会真实转存" };
  }

  async transferSharedLink(input: {
    targetDirectory: string;
  }): Promise<{ ok: boolean; remotePath?: string; fileCount?: number }> {
    return { ok: true, remotePath: input.targetDirectory, fileCount: 5 };
  }

  async listFiles(input: { remoteDirectory: string }): Promise<RemoteFile[]> {
    return [
      { id: "mock-1", name: "课程先导片.mp4", path: `${input.remoteDirectory}/课程先导片.mp4`, size: 120, isDirectory: false },
      { id: "mock-2", name: "资料讲义.pdf", path: `${input.remoteDirectory}/资料讲义.pdf`, size: 80, isDirectory: false }
    ];
  }

  async mkdir(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async renameFile(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async moveFile(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async downloadFile(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async uploadFile(): Promise<{ ok: boolean }> {
    return { ok: true };
  }

  async createShareLink(input: {
    remotePaths: string[];
    periodDays: 0 | 1 | 7 | 30;
  }): Promise<{
    ok: boolean;
    source?: "mock";
    shareUrl?: string;
    extractCode?: string;
    verified?: boolean;
    redactedForLog?: string;
    periodDays?: number;
  }> {
    const idPart = input.remotePaths.join("-").replaceAll("/", "-").slice(0, 8) || "empty";
    return {
      ok: true,
      source: "mock",
      shareUrl: `https://pan.baidu.com/s/mock-${idPart}`,
      extractCode: "A7K9",
      verified: false,
      redactedForLog: "<mock-share-url>",
      periodDays: input.periodDays
    };
  }
}
