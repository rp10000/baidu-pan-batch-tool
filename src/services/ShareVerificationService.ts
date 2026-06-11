import type { ShareResult } from "../domain/types";

export type ShareVerificationStatus =
  | "format_valid"
  | "opened_in_browser"
  | "invalid_format"
  | "redacted_value"
  | "missing_extract_code"
  | "unknown";

const allowedHosts = new Set(["pan.baidu.com", "yun.baidu.com"]);

export function verifyShareResult(result?: Pick<ShareResult, "shareUrl" | "extractCode" | "source">): ShareVerificationStatus {
  if (!result?.shareUrl) return "unknown";
  const lower = result.shareUrl.toLowerCase();
  if (/(xxx|example|mock|redacted|\*{3,})/.test(lower)) return "redacted_value";

  let url: URL;
  try {
    url = new URL(result.shareUrl);
  } catch {
    return "invalid_format";
  }

  if (!allowedHosts.has(url.hostname)) return "invalid_format";
  if (!/^\/s\//.test(url.pathname) && !/^\/share\//.test(url.pathname)) return "invalid_format";
  if (!result.extractCode && !url.searchParams.get("pwd")) return "missing_extract_code";
  return "format_valid";
}

export function openShareLinkForVerification(result?: Pick<ShareResult, "shareUrl" | "extractCode" | "source">): ShareVerificationStatus {
  const status = verifyShareResult(result);
  if (status !== "format_valid") return status;
  if (typeof window === "undefined") return "unknown";
  window.open(result!.shareUrl, "_blank", "noopener,noreferrer");
  return "opened_in_browser";
}
