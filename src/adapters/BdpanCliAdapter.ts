import type { RemoteFile, StorageAdapter, StorageCapabilities } from "./StorageAdapter";
import { DEFAULT_STORAGE_CAPABILITIES } from "./StorageAdapter";
import type { BdpanCommandRunner } from "../services/BdpanCommandRunner";
import { normalizeBdpanResult } from "../services/BdpanCommandRunner";

interface BdpanListItem {
  fs_id?: number | string;
  path?: string;
  server_filename?: string;
  filename?: string;
  size?: number;
  isdir?: boolean;
  category?: number | string;
}

export class BdpanCliAdapter implements StorageAdapter {
  readonly mode = "bdpan_cli" as const;

  constructor(private readonly runner: BdpanCommandRunner) {}

  async getCapabilities(): Promise<StorageCapabilities> {
    const connection = await this.checkConnection();
    if (!connection.ok) {
      const status = connection.message.includes("未登录") ? "login_required" : "wsl_required";
      return {
        ...DEFAULT_STORAGE_CAPABILITIES,
        checkLogin: status,
        transferSharedLink: status,
        listFiles: status,
        createDirectory: status,
        renameFile: status,
        moveFile: status,
        downloadFile: status,
        uploadFile: status,
        createShareLink: status
      };
    }

    return {
      checkLogin: "supported",
      transferSharedLink: "supported",
      listFiles: "supported",
      createDirectory: "supported",
      renameFile: "supported",
      moveFile: "supported",
      downloadFile: "supported",
      uploadFile: "supported",
      createShareLink: "unknown"
    };
  }

  async checkConnection(): Promise<{ ok: boolean; displayName?: string; message: string }> {
    const result = normalizeBdpanResult(await this.runner.run({ subcommand: "whoami", args: ["--json"] }));
    if (!result.ok) {
      return { ok: false, message: result.error ?? "bdpan 不可用" };
    }

    const data = isRecord(result.data) ? result.data : {};
    return {
      ok: true,
      displayName: asString(data.username) ?? asString(data.displayName),
      message: "bdpan CLI 已连接"
    };
  }

  async transferSharedLink(input: {
    url: string;
    extractCode?: string;
    targetDirectory: string;
  }): Promise<{ ok: boolean; remotePath?: string; fileCount?: number; raw?: unknown; error?: string }> {
    const args = ["transfer", input.url];
    if (input.extractCode) {
      args.push("-p", input.extractCode);
    }
    args.push("-d", input.targetDirectory, "--json");

    const result = normalizeBdpanResult(await this.runner.run({ subcommand: args[0], args: args.slice(1) }));
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const data = isRecord(result.data) ? result.data : {};
    return {
      ok: true,
      remotePath: asString(data.remote_path) ?? input.targetDirectory,
      fileCount: asNumber(data.file_count),
      raw: result.data ?? result.raw
    };
  }

  async listFiles(input: { remoteDirectory: string }): Promise<RemoteFile[]> {
    const result = normalizeBdpanResult(
      await this.runner.run({ subcommand: "ls", args: [input.remoteDirectory, "--json"] })
    );
    if (!result.ok || !Array.isArray(result.data)) {
      return [];
    }

    return result.data.map((item, index) => toRemoteFile(item as BdpanListItem, index));
  }

  async mkdir(input: { remoteDirectory: string }): Promise<{ ok: boolean; error?: string }> {
    return this.simpleCommand("mkdir", [input.remoteDirectory, "--json"]);
  }

  async renameFile(input: { remotePath: string; newName: string }): Promise<{ ok: boolean; error?: string }> {
    return this.simpleCommand("rename", [input.remotePath, input.newName, "--json"]);
  }

  async moveFile(input: { remotePath: string; targetDirectory: string }): Promise<{ ok: boolean; error?: string }> {
    return this.simpleCommand("mv", [input.remotePath, input.targetDirectory, "--json"]);
  }

  async downloadFile(input: { remotePath: string; localPath: string }): Promise<{ ok: boolean; error?: string }> {
    return this.simpleCommand("download", [input.remotePath, input.localPath, "--json"]);
  }

  async uploadFile(input: { localPath: string; remotePath: string }): Promise<{ ok: boolean; error?: string }> {
    return this.simpleCommand("upload", [input.localPath, input.remotePath, "--json"]);
  }

  async createShareLink(input: {
    remotePaths: string[];
    periodDays: 0 | 1 | 7 | 30;
  }): Promise<{ ok: boolean; shareUrl?: string; extractCode?: string; periodDays?: number; error?: string }> {
    const result = normalizeBdpanResult(
      await this.runner.run({
        subcommand: "share",
        args: [...input.remotePaths, "--period", String(input.periodDays), "--json"]
      })
    );
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const data = isRecord(result.data) ? result.data : {};
    return {
      ok: true,
      shareUrl: asString(data.link),
      extractCode: asString(data.pwd),
      periodDays: asNumber(data.period) ?? input.periodDays
    };
  }

  private async simpleCommand(subcommand: string, args: string[]): Promise<{ ok: boolean; error?: string }> {
    const result = normalizeBdpanResult(await this.runner.run({ subcommand, args }));
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }
}

function toRemoteFile(item: BdpanListItem, index: number): RemoteFile {
  const name = item.server_filename ?? item.filename ?? `未命名-${index + 1}`;
  return {
    id: String(item.fs_id ?? `${index + 1}`),
    name,
    path: normalizeCommandPath(item.path ?? name),
    size: item.size ?? 0,
    isDirectory: Boolean(item.isdir),
    category: typeof item.category === "string" ? item.category : undefined
  };
}

function normalizeCommandPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  const prefixes = ["apps/bdpan/", "apps/", "我的应用数据/bdpan/", "我的应用数据/"];
  const prefix = prefixes.find((item) => normalized.startsWith(item));
  return prefix ? normalized.slice(prefix.length) : normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}
