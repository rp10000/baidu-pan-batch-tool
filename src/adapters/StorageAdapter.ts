import type { AdapterMode, CapabilityStatus } from "./adapterMode";
export type { AdapterMode, CapabilityStatus } from "./adapterMode";

export interface StorageCapabilities {
  checkLogin: CapabilityStatus;
  transferSharedLink: CapabilityStatus;
  listFiles: CapabilityStatus;
  createDirectory: CapabilityStatus;
  renameFile: CapabilityStatus;
  moveFile: CapabilityStatus;
  downloadFile: CapabilityStatus;
  uploadFile: CapabilityStatus;
  createShareLink: CapabilityStatus;
}

export interface RemoteFile {
  id: string;
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  category?: string;
}

export interface StorageAdapter {
  mode: AdapterMode;

  getCapabilities(): Promise<StorageCapabilities>;

  checkConnection(): Promise<{
    ok: boolean;
    displayName?: string;
    message: string;
  }>;

  transferSharedLink(input: {
    url: string;
    extractCode?: string;
    targetDirectory: string;
  }): Promise<{
    ok: boolean;
    remotePath?: string;
    fileCount?: number;
    raw?: unknown;
    error?: string;
  }>;

  listFiles(input: {
    remoteDirectory: string;
  }): Promise<RemoteFile[]>;

  mkdir(input: {
    remoteDirectory: string;
  }): Promise<{ ok: boolean; error?: string }>;

  renameFile(input: {
    remotePath: string;
    newName: string;
  }): Promise<{ ok: boolean; error?: string }>;

  moveFile(input: {
    remotePath: string;
    targetDirectory: string;
  }): Promise<{ ok: boolean; error?: string }>;

  downloadFile(input: {
    remotePath: string;
    localPath: string;
  }): Promise<{ ok: boolean; error?: string }>;

  uploadFile(input: {
    localPath: string;
    remotePath: string;
  }): Promise<{ ok: boolean; error?: string }>;

  createShareLink(input: {
    remotePaths: string[];
    periodDays: 0 | 1 | 7 | 30;
  }): Promise<{
    ok: boolean;
    source?: "mock" | "local_cli" | "manual";
    shareUrl?: string;
    extractCode?: string;
    expireAt?: string;
    verified?: boolean;
    redactedForLog?: string;
    periodDays?: number;
    error?: string;
  }>;
}

export const PANJIE_ROOT = "盘姬测试/panjie";

export const DEFAULT_STORAGE_CAPABILITIES: StorageCapabilities = {
  checkLogin: "needs_official_verification",
  transferSharedLink: "needs_official_verification",
  listFiles: "needs_official_verification",
  createDirectory: "needs_official_verification",
  renameFile: "needs_official_verification",
  moveFile: "needs_official_verification",
  downloadFile: "needs_official_verification",
  uploadFile: "needs_official_verification",
  createShareLink: "needs_official_verification"
};
