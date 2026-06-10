export type BdpanPlatform = "win32" | "linux" | "darwin";

export interface BdpanCommand {
  subcommand: string;
  args: string[];
}

export interface BdpanInvocation {
  command: string;
  args: string[];
  usesShell: false;
}

export interface BdpanCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface NormalizedBdpanResult {
  ok: boolean;
  data?: unknown;
  raw?: string;
  error?: string;
}

export interface BdpanCommandRunner {
  run(command: BdpanCommand): Promise<BdpanCommandResult>;
}

export function buildBdpanInvocation(input: {
  platform: BdpanPlatform;
  subcommand: string;
  args: string[];
}): BdpanInvocation {
  if (input.platform === "win32") {
    return {
      command: "wsl.exe",
      args: ["--exec", "bdpan", input.subcommand, ...input.args],
      usesShell: false
    };
  }

  return {
    command: "bdpan",
    args: [input.subcommand, ...input.args],
    usesShell: false
  };
}

export function normalizeBdpanResult(result: BdpanCommandResult): NormalizedBdpanResult {
  const raw = result.stdout.trim();
  if (result.exitCode !== 0) {
    return {
      ok: false,
      error: normalizeBdpanError(result.stderr || result.stdout)
    };
  }

  if (!raw) {
    return { ok: true, raw };
  }

  try {
    return {
      ok: true,
      data: JSON.parse(raw) as unknown,
      raw
    };
  } catch {
    return {
      ok: true,
      raw
    };
  }
}

export function normalizeBdpanError(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes("not found") || lower.includes("not recognized") || lower.includes("enoent")) {
    return "bdpan CLI 未安装或 WSL 内不可用";
  }
  if (lower.includes("login") || value.includes("未登录") || value.includes("认证")) {
    return "bdpan 未登录";
  }
  if (lower.includes("paid") || value.includes("付费") || value.includes("开通")) {
    return "分享接口不可用 / 需开通";
  }
  return value.trim() || "bdpan 命令执行失败";
}

export class LocalBridgeBdpanCommandRunner implements BdpanCommandRunner {
  constructor(private readonly endpoint = "http://127.0.0.1:17632/bdpan/run") {}

  async run(command: BdpanCommand): Promise<BdpanCommandResult> {
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command)
      });

      if (!response.ok) {
        return {
          exitCode: response.status,
          stdout: "",
          stderr: `本地 bdpan bridge 返回 ${response.status}`
        };
      }

      return (await response.json()) as BdpanCommandResult;
    } catch {
      return {
        exitCode: 127,
        stdout: "",
        stderr: "bdpan bridge unavailable"
      };
    }
  }
}
