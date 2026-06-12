import type { LocalCliAdapter, LocalCliCapabilities, LocalCliDetection, LocalCliLoginMode, LocalCliRiskLevel, LocalCliStatus } from "./LocalCliAdapter";
import type { RemoteFile, StorageCapabilities } from "./StorageAdapter";
import type { LocalCliCommandRunner } from "../services/LocalCliCommandRunner";
import { normalizeCliError, redactCliOutput } from "../services/LocalCliCommandRunner";
import { assertCliAbsolutePath, toCliAbsolutePath, toDisplayPath } from "../services/RemotePathService";
import { classifyShareFailure, hasCliBusinessError } from "../services/ShareFailureClassifier";
import { verifyShareResult } from "../services/ShareVerificationService";
import { buildLocalCliRuntimeSnapshot } from "../services/LocalCliRuntimeService";
import { ensureRemoteDir } from "../services/RemoteDirectoryService";

interface GenericBaiduCliProfile {
  name: string;
  loginMode: LocalCliLoginMode;
  riskLevel: LocalCliRiskLevel;
  capabilities: LocalCliCapabilities;
  commands: {
    version: string[];
    help: string[];
    login: string[];
    who: string[];
    ls: (dir: string) => string[];
    mkdir: (dir: string) => string[];
    cd: (dir: string) => string[];
    upload: (localPath: string, remotePath: string) => string[];
    move: (remotePath: string, targetPath: string) => string[];
    transfer: (url: string, extractCode?: string) => string[];
    share: (remotePaths: string[], periodDays: 0 | 1 | 7 | 30) => string[];
    shareList: () => string[];
  };
}

export class GenericBaiduCliAdapter implements LocalCliAdapter {
  mode = "windows_local_cli" as const;
  name: string;
  loginMode: LocalCliLoginMode;
  riskLevel: LocalCliRiskLevel;

  constructor(
    protected readonly runner: LocalCliCommandRunner,
    protected readonly profile: GenericBaiduCliProfile
  ) {
    this.name = profile.name;
    this.loginMode = profile.loginMode;
    this.riskLevel = profile.riskLevel;
  }

  async checkInstalled(): Promise<LocalCliDetection> {
    const version = await this.getVersion();
    if (!version) {
      return {
        status: "not_detected",
        name: this.name,
        loginMode: this.loginMode,
        requiresManualCookie: this.loginMode === "manual_cookie",
        riskLevel: this.riskLevel,
        message: "未检测到 Windows 本地百度网盘 CLI"
      };
    }
    return {
      status: "detected",
      name: this.name,
      version,
      loginMode: this.loginMode,
      requiresManualCookie: this.loginMode === "manual_cookie",
      riskLevel: this.riskLevel,
      message: "已检测到 Windows 本地 CLI"
    };
  }

  async getVersion(): Promise<string | undefined> {
    const result = await this.runner.run({ args: this.profile.commands.version, timeoutMs: 5000 });
    if (result.exitCode !== 0) return undefined;
    return firstLine(result.stdout);
  }

  async login(): Promise<{ ok: boolean; status: LocalCliStatus; error?: string }> {
    const result = await this.runner.run({ args: this.profile.commands.login, timeoutMs: 120000 });
    if (result.exitCode === 0) return { ok: true, status: "logged_in" };
    const error = normalizeCliError(result.stderr || result.stdout);
    return {
      ok: false,
      status: error.includes("手动凭据") ? "manual_cookie_mode" : "manual_auth_required",
      error
    };
  }

  async checkLogin(): Promise<{ ok: boolean; status: LocalCliStatus; displayName?: string; message: string }> {
    const [who, quota] = await Promise.all([
      this.runner.run({ args: this.profile.commands.who, timeoutMs: 10000 }),
      this.runner.run({ args: ["quota"], timeoutMs: 10000 })
    ]);
    const runtime = buildLocalCliRuntimeSnapshot({
      bridgeOnline: true,
      cliPath: this.name,
      version: { exitCode: 0, stdout: this.name, stderr: "" },
      who,
      quota
    });
    if (runtime.loginState === "logged_in") {
      return {
        ok: true,
        status: "logged_in",
        displayName: runtime.account.username ?? "已登录",
        message: "Windows 本地 CLI 已登录"
      };
    }
    return { ok: false, status: "not_logged_in", message: normalizeCliError(runtime.message) };
  }

  async checkConnection(): Promise<{ ok: boolean; displayName?: string; message: string }> {
    const installed = await this.checkInstalled();
    if (installed.status === "not_detected") return { ok: false, message: installed.message };
    const login = await this.checkLogin();
    return { ok: login.ok, displayName: login.displayName, message: login.message };
  }

  async getCapabilities(): Promise<StorageCapabilities> {
    const { jsonOutput, ...storageCapabilities } = this.profile.capabilities;
    return storageCapabilities;
  }

  async getLocalCapabilities(): Promise<LocalCliCapabilities> {
    return this.profile.capabilities;
  }

  async transferSharedLink(input: { url: string; extractCode?: string; targetDirectory: string }) {
    if (this.profile.capabilities.transferSharedLink !== "supported") {
      return { ok: false, error: "当前 CLI 不支持分享链接转存" };
    }
    const targetDirectory = assertCliAbsolutePath(toCliAbsolutePath(input.targetDirectory));
    const ensured = await ensureRemoteDir(targetDirectory, {
      list: (path) => this.probeRemoteDirectory(path),
      mkdir: (path) => this.mkdirRemoteDirectory(path)
    });
    if (!ensured.ok) {
      return { ok: false, error: ensured.error ?? "mkdir_failed" };
    }

    const cd = await this.runner.run({ args: this.profile.commands.cd(targetDirectory), timeoutMs: 30000 });
    if (isFailedResult(cd)) {
      return { ok: false, error: normalizeCliError(cd.stderr || cd.stdout) };
    }

    try {
      const result = await this.runner.run({ args: this.profile.commands.transfer(input.url, input.extractCode), timeoutMs: 120000 });
      if (isFailedResult(result)) {
        return { ok: false, error: normalizeCliError(result.stderr || result.stdout) };
      }

      const transferredFiles = await this.probeRemoteDirectory(targetDirectory);
      if (!transferredFiles.ok) {
        return { ok: false, error: normalizeCliError(transferredFiles.error ?? "transfer_list_failed") };
      }
      const fileCount = transferredFiles.entries?.length ?? 0;
      if (fileCount <= 0) {
        return { ok: false, error: "transfer_empty" };
      }

      return {
        ok: true,
        remotePath: toDisplayPath(targetDirectory),
        fileCount,
        raw: redactCliOutput(result.stdout)
      };
    } finally {
      await this.runner.run({ args: this.profile.commands.cd("/"), timeoutMs: 30000 });
    }
  }

  async listFiles(input: { remoteDirectory: string }): Promise<RemoteFile[]> {
    const remoteDirectory = assertCliAbsolutePath(toCliAbsolutePath(input.remoteDirectory));
    const result = await this.probeRemoteDirectory(remoteDirectory);
    return result.ok ? result.entries ?? [] : [];
  }

  async mkdir(input: { remoteDirectory: string }): Promise<{ ok: boolean; error?: string }> {
    const remoteDirectory = assertCliAbsolutePath(toCliAbsolutePath(input.remoteDirectory));
    const ensured = await ensureRemoteDir(remoteDirectory, {
      list: (path) => this.probeRemoteDirectory(path),
      mkdir: (path) => this.mkdirRemoteDirectory(path)
    });
    return ensured.ok ? { ok: true } : { ok: false, error: ensured.error };
  }

  async renameFile(input: { remotePath: string; newName: string }): Promise<{ ok: boolean; error?: string }> {
    const remotePath = assertCliAbsolutePath(toCliAbsolutePath(input.remotePath));
    const targetPath = assertCliAbsolutePath(`${dirname(remotePath)}/${input.newName}`.replace(/\/+/g, "/"));
    return this.moveFile({ remotePath, targetDirectory: targetPath });
  }

  async moveFile(input: { remotePath: string; targetDirectory: string }): Promise<{ ok: boolean; error?: string }> {
    const remotePath = assertCliAbsolutePath(toCliAbsolutePath(input.remotePath));
    const targetDirectory = assertCliAbsolutePath(toCliAbsolutePath(input.targetDirectory));
    return this.okResult(await this.runner.run({ args: this.profile.commands.move(remotePath, targetDirectory), timeoutMs: 30000 }));
  }

  async downloadFile(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: "当前阶段未启用真实下载" };
  }

  async uploadFile(input: { localPath: string; remotePath: string }): Promise<{ ok: boolean; error?: string }> {
    const remotePath = assertCliAbsolutePath(toCliAbsolutePath(input.remotePath));
    return this.okResult(await this.runner.run({ args: this.profile.commands.upload(input.localPath, remotePath), timeoutMs: 120000 }));
  }

  async createShareLink(input: { remotePaths: string[]; periodDays: 0 | 1 | 7 | 30 }) {
    if (this.profile.capabilities.createShareLink !== "supported") {
      return { ok: false, error: "当前 CLI 不支持创建分享链接" };
    }
    const remotePaths = input.remotePaths.map((remotePath) => assertCliAbsolutePath(toCliAbsolutePath(remotePath)));
    const result = await this.runner.run({ args: this.profile.commands.share(remotePaths, input.periodDays), timeoutMs: 60000 });
    const parsed = parseBaiduShareOutput(`${result.stdout}\n${result.stderr}`);
    const listFallback = !parsed.shareUrl || parsed.failed || isFailedResult(result)
      ? parseBaiduShareOutput(await this.readShareListOutput())
      : undefined;
    const best = listFallback?.shareUrl && !listFallback.failed ? listFallback : parsed;
    if (isFailedResult(result) && !best.shareUrl) {
      return { ok: false, error: classifyShareFailure(result.stderr || result.stdout).message };
    }
    if (!best.shareUrl || best.failed) {
      return { ok: false, error: best.error || classifyShareFailure(result.stdout || result.stderr, "no_share_link_in_output").message };
    }

    const verification = verifyShareResult({
      source: "local_cli",
      shareUrl: best.shareUrl,
      extractCode: best.extractCode
    });
    if (verification !== "format_valid") {
      return { ok: false, error: `创建分享链接失败：${verification}` };
    }

    return {
      ok: true,
      source: "local_cli" as const,
      shareUrl: best.shareUrl,
      extractCode: best.extractCode,
      expireAt: best.expireAt,
      verified: true,
      redactedForLog: "<redacted-share-url>",
      periodDays: input.periodDays
    };
  }

  private async readShareListOutput(): Promise<string> {
    const result = await this.runner.run({ args: this.profile.commands.shareList(), timeoutMs: 60000 });
    return `${result.stdout}\n${result.stderr}`;
  }

  private okResult(result: { exitCode: number; stdout: string; stderr: string }) {
    return !isFailedResult(result) ? { ok: true } : { ok: false, error: normalizeCliError(result.stderr || result.stdout) };
  }

  private async probeRemoteDirectory(remoteDirectory: string) {
    const result = await this.runner.run({ args: this.profile.commands.ls(remoteDirectory), timeoutMs: 30000 });
    if (isFailedResult(result)) {
      return { ok: false, error: normalizeCliError(result.stderr || result.stdout) };
    }
    return {
      ok: true,
      kind: "directory" as const,
      entries: parsePlainFileList(result.stdout, toDisplayPath(remoteDirectory))
    };
  }

  private async mkdirRemoteDirectory(remoteDirectory: string) {
    const result = await this.runner.run({ args: this.profile.commands.mkdir(remoteDirectory), timeoutMs: 30000 });
    return !isFailedResult(result)
      ? { ok: true }
      : { ok: false, error: normalizeCliError(result.stderr || result.stdout) };
  }
}

function isFailedResult(result: { exitCode: number; stdout: string; stderr: string }): boolean {
  return result.exitCode !== 0 || hasCliBusinessError(`${result.stdout}\n${result.stderr}`);
}

function firstLine(value: string): string | undefined {
  return value.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
}

function dirname(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index <= 0 ? "/" : normalized.slice(0, index);
}

function parsePlainFileList(output: string, basePath: string): RemoteFile[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("----"))
    .map((line, index) => {
      const name = line.split(/\s+/).pop() ?? `file-${index + 1}`;
      return {
        id: `${basePath}-${index}`,
        name,
        path: `${basePath.replace(/\/$/, "")}/${name}`,
        size: 0,
        isDirectory: line.includes("<dir>") || line.includes("目录")
      };
    });
}

export type { GenericBaiduCliProfile };

export function parseBaiduShareOutput(output: string): {
  shareUrl?: string;
  extractCode?: string;
  expireAt?: string;
  failed: boolean;
  error?: string;
} {
  const text = String(output || "");
  const shareUrl =
    text.match(/https?:\/\/pan\.baidu\.com\/s\/[^\s)'"<>，。；;]+/i)?.[0] ??
    text.match(/https?:\/\/yun\.baidu\.com\/s\/[^\s)'"<>，。；;]+/i)?.[0];
  const codeFromUrl = shareUrl ? new URL(shareUrl).searchParams.get("pwd") ?? undefined : undefined;
  const extractCode = codeFromUrl ?? text.match(/(?:提取码|提取密码|密码|pwd|code)\s*[:：=]?\s*([A-Za-z0-9]{4,})/i)?.[1];
  const expireAt = text.match(/(?:有效期|过期时间|expire)\s*[:：=]?\s*([0-9-]{8,10}|永久|0)/i)?.[1];
  const failed = /失败|错误|error|failed|errno|errcode/i.test(text);
  const failure = classifyShareFailure(text, "no_share_link_in_output");
  return {
    shareUrl,
    extractCode,
    expireAt,
    failed,
    error: failed ? failure.message : undefined
  };
}
