import { classifyShareFailure } from "./ShareFailureClassifier";

export interface LocalCliCommand {
  args: string[];
  timeoutMs?: number;
}

export interface LocalCliCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

export interface LocalCliCommandRunner {
  run(command: LocalCliCommand): Promise<LocalCliCommandResult>;
}

export class LocalCliBridgeCommandRunner implements LocalCliCommandRunner {
  constructor(private readonly endpoint = "http://127.0.0.1:17633/local-cli/run") {}

  async run(command: LocalCliCommand): Promise<LocalCliCommandResult> {
    const desktopApi = getDesktopApi();
    if (desktopApi?.localCliRun) {
      return desktopApi.localCliRun(command);
    }

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command)
      });
      if (!response.ok) {
        return { exitCode: response.status, stdout: "", stderr: `local cli bridge returned ${response.status}` };
      }
      return (await response.json()) as LocalCliCommandResult;
    } catch {
      return { exitCode: 127, stdout: "", stderr: "local cli bridge unavailable" };
    }
  }
}

function getDesktopApi(): { localCliRun?: (command: LocalCliCommand) => Promise<LocalCliCommandResult> } | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & { panjieDesktop?: { localCliRun?: (command: LocalCliCommand) => Promise<LocalCliCommandResult> } }).panjieDesktop;
}

export function redactCliOutput(value: string): string {
  return String(value ?? "")
    .replace(/https?:\/\/pan\.baidu\.com\/s\/[^\s)]+/gi, "<redacted-share-url>")
    .replace(/(?:提取码|extract\s*code|pwd)\s*[:：=]?\s*[A-Za-z0-9]{4,}/gi, "extractCode: <redacted>")
    .replace(/(?:BDUSS|STOKEN|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[^\s;]+/gi, "<redacted-auth-field>");
}

export function normalizeCliError(value: string): string {
  const text = redactCliOutput(value).trim();
  const lower = text.toLowerCase();
  if (lower.includes("not found") || lower.includes("not recognized") || lower.includes("enoent")) {
    return "未检测到 Windows 本地百度网盘 CLI";
  }
  if (lower.includes("unsupported transfer")) {
    return "当前 CLI 不支持分享链接转存";
  }
  if (lower.includes("unsupported share")) {
    return "当前 CLI 不支持创建分享链接";
  }
  if (lower.includes("manual") && lower.includes("cookie")) {
    return "当前 CLI 需要手动凭据模式";
  }
  if (lower.includes("not absolute path")) {
    return "路径错误：CLI 需要绝对网盘路径";
  }
  if (lower.includes("login") || text.includes("未登录") || text.includes("请重新登录") || text.includes("登录状态过期") || lower.includes("user not exists")) {
    return "BaiduPCS-Go 登录已失效，请重新登录";
  }
  const shareFailure = classifyShareFailure(text);
  if (shareFailure.type !== "unknown") return shareFailure.message;
  return text || "Windows 本地 CLI 执行失败";
}
