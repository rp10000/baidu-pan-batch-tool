import type { BaiduPcsLoginMethodSupport } from "./BaiduPcsLoginMethodProbe";
import { redactAuthText } from "./SensitiveValueRedactor";

export type BaiduSessionImportMode = "bduss_stoken" | "cookie";

export interface BaiduSessionImportInput {
  mode: BaiduSessionImportMode;
  bduss?: string;
  stoken?: string;
  cookie?: string;
  capabilities: BaiduPcsLoginMethodSupport;
}

export interface BaiduSessionImportPlan {
  ok: boolean;
  mode: BaiduSessionImportMode;
  args: string[];
  redactedCommand: string;
  error?: string;
}

export function createBaiduSessionImportPlan(input: BaiduSessionImportInput): BaiduSessionImportPlan {
  if (input.mode === "bduss_stoken") {
    if (!input.bduss?.trim()) return failedPlan(input.mode, "缺少 BDUSS");
    if (!input.stoken?.trim()) return failedPlan(input.mode, "缺少 STOKEN");
    if (!input.capabilities.bduss || !input.capabilities.stoken) return failedPlan(input.mode, "当前 BaiduPCS-Go 不支持 BDUSS+STOKEN 导入");
    const args = ["login", "--bduss", input.bduss.trim(), "--stoken", input.stoken.trim()];
    return {
      ok: true,
      mode: input.mode,
      args,
      redactedCommand: redactAuthText(`BaiduPCS-Go ${args.join(" ")}`)
    };
  }

  if (!input.cookie?.trim()) return failedPlan(input.mode, "缺少完整 Cookie");
  if (!input.capabilities.cookies) return failedPlan(input.mode, "当前 BaiduPCS-Go 不支持完整 Cookie 导入");
  const args = ["login", "--cookies", input.cookie.trim()];
  return {
    ok: true,
    mode: input.mode,
    args,
    redactedCommand: redactAuthText(`BaiduPCS-Go ${args.join(" ")}`)
  };
}

function failedPlan(mode: BaiduSessionImportMode, error: string): BaiduSessionImportPlan {
  return {
    ok: false,
    mode,
    args: [],
    redactedCommand: "",
    error
  };
}
