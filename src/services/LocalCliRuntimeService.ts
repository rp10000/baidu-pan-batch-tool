import type { LocalCliCommandResult } from "./LocalCliCommandRunner";

export type LocalCliLoginState = "unknown" | "not_installed" | "not_logged_in" | "logged_in" | "login_failed";

export interface LocalCliAccountInfo {
  uid?: string;
  username?: string;
  quotaTotal?: string;
  quotaUsed?: string;
}

export interface LocalCliRuntimeSnapshot {
  bridgeOnline: boolean;
  cliInstalled: boolean;
  cliPath: string;
  cliSource?: "embedded" | "user_selected" | "path" | "missing";
  cliVersion: string;
  loginState: LocalCliLoginState;
  account: LocalCliAccountInfo;
  rootListOk: boolean;
  quotaOk?: boolean;
  loginMethod?: "none" | "bduss_stoken" | "cookie" | "existing";
  lastImportedAt?: string;
  lastCheckedAt?: string;
  message: string;
}

export interface LocalCliInspectInput {
  bridgeOnline: boolean;
  cliPath?: string;
  cliSource?: "embedded" | "user_selected" | "path" | "missing";
  version?: Partial<LocalCliCommandResult>;
  who?: Partial<LocalCliCommandResult>;
  quota?: Partial<LocalCliCommandResult>;
  rootList?: Partial<LocalCliCommandResult>;
}

export function buildLocalCliRuntimeSnapshot(input: LocalCliInspectInput): LocalCliRuntimeSnapshot {
  const versionText = commandText(input.version);
  const whoText = commandText(input.who);
  const quotaText = commandText(input.quota);
  const rootText = commandText(input.rootList);
  const cliInstalled = Boolean(input.cliPath) || input.version?.exitCode === 0;
  const account = {
    ...parseWhoOutput(whoText),
    ...parseQuotaOutput(quotaText)
  };
  const rootListOk = input.rootList?.exitCode === 0 && !containsLoginFailure(rootText);
  const loginState = determineLoginState({ cliInstalled, who: input.who, whoText, quota: input.quota, quotaText, account });

  return {
    bridgeOnline: input.bridgeOnline,
    cliInstalled,
    cliPath: input.cliPath ?? "",
    cliSource: input.cliSource ?? (input.cliPath ? "embedded" : "missing"),
    cliVersion: firstLine(versionText),
    loginState,
    account,
    rootListOk,
    message: runtimeMessage(loginState, cliInstalled, input.bridgeOnline, whoText || quotaText || rootText)
  };
}

export function parseWhoOutput(value: string): LocalCliAccountInfo {
  const uid = value.match(/\buid\s*[:：]\s*([0-9]+)/i)?.[1]?.trim();
  const username =
    value.match(/用户名\s*[:：]\s*([^,\r\n]*)/)?.[1]?.trim() ||
    value.match(/\busername\s*[:：]\s*([^,\r\n]*)/i)?.[1]?.trim() ||
    value.match(/\bname\s*[:：]\s*([^,\r\n]*)/i)?.[1]?.trim();
  return {
    uid: uid || undefined,
    username: username || undefined
  };
}

export function parseQuotaOutput(value: string): Pick<LocalCliAccountInfo, "quotaTotal" | "quotaUsed"> {
  if (!value || containsLoginFailure(value)) return {};
  const quotaTotal =
    value.match(/(?:总容量|总空间|total|quota)\D{0,24}([\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB))/i)?.[1] ||
    value.match(/容量\D{0,24}([\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB))/i)?.[1];
  const quotaUsed =
    value.match(/(?:已用|使用|used)\D{0,24}([\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB))/i)?.[1] ||
    value.match(/([\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB))\s*\/\s*[\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB)/i)?.[1];
  return {
    quotaTotal: quotaTotal?.trim(),
    quotaUsed: quotaUsed?.trim()
  };
}

export function isLoggedInAccount(account: LocalCliAccountInfo, quota?: Partial<LocalCliCommandResult>): boolean {
  const uidValid = Boolean(account.uid && account.uid !== "0");
  const identityValid = Boolean(account.username || (quota?.exitCode === 0 && (account.quotaTotal || account.quotaUsed)));
  return uidValid && identityValid;
}

function determineLoginState(input: {
  cliInstalled: boolean;
  who?: Partial<LocalCliCommandResult>;
  whoText: string;
  quota?: Partial<LocalCliCommandResult>;
  quotaText: string;
  account: LocalCliAccountInfo;
}): LocalCliLoginState {
  if (!input.cliInstalled) return "not_installed";
  if (isLoggedInAccount(input.account, input.quota)) return "logged_in";
  if (containsLoginFailure(`${input.whoText}\n${input.quotaText}`)) return "not_logged_in";
  if (input.who?.exitCode === 0 && input.account.uid === "0") return "not_logged_in";
  if (input.who?.exitCode && input.who.exitCode !== 0) return "not_logged_in";
  return "unknown";
}

function runtimeMessage(state: LocalCliLoginState, cliInstalled: boolean, bridgeOnline: boolean, evidence: string): string {
  if (!bridgeOnline) return "桌面 IPC 未连接";
  if (!cliInstalled) return "未检测到 BaiduPCS-Go";
  if (state === "logged_in") return "BaiduPCS-Go 已登录";
  if (state === "not_logged_in") return normalizeLoginMessage(evidence);
  if (state === "login_failed") return "BaiduPCS-Go 登录启动失败";
  return "BaiduPCS-Go 登录状态未确认";
}

function normalizeLoginMessage(value: string): string {
  const text = value.trim();
  if (/31045|登录状态过期|请尝试重新登录|user not exists|uid\s*[:：]\s*0\b|用户名\s*[:：]\s*(?:,|$)/i.test(text)) {
    return "BaiduPCS-Go 未登录或登录已失效";
  }
  return text ? firstLine(text) : "BaiduPCS-Go 未登录";
}

function containsLoginFailure(value: string): boolean {
  return /31045|登录状态过期|请尝试重新登录|user not exists|uid\s*[:：]\s*0\b|用户名\s*[:：]\s*(?:,|$)|未登录/i.test(value);
}

function commandText(result?: Partial<LocalCliCommandResult>): string {
  return `${result?.stdout ?? ""}\n${result?.stderr ?? ""}`.trim();
}

function firstLine(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}
