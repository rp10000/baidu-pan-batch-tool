export type ShareFailureType =
  | "path_not_found"
  | "path_not_absolute"
  | "empty_directory"
  | "unsupported_directory_share"
  | "remote_server_code_2"
  | "duplicate_file"
  | "missing_extract_code"
  | "no_share_link_in_output"
  | "login_required"
  | "permission_or_risk_control"
  | "unknown";

export interface ShareFailureClassification {
  type: ShareFailureType;
  label: string;
  message: string;
}

const labels: Record<ShareFailureType, string> = {
  path_not_found: "路径不存在",
  path_not_absolute: "路径不是绝对网盘路径",
  empty_directory: "目录为空",
  unsupported_directory_share: "当前 CLI 不支持分享该目录",
  remote_server_code_2: "百度服务端拒绝创建分享，代码 2",
  duplicate_file: "目标目录已有同名文件",
  missing_extract_code: "创建分享成功但未返回提取码",
  no_share_link_in_output: "未解析到真实分享链接",
  login_required: "未登录或登录已失效",
  permission_or_risk_control: "权限不足或账号风控限制",
  unknown: "未知分享失败"
};

export function classifyShareFailure(input: string | undefined, fallback: ShareFailureType = "unknown"): ShareFailureClassification {
  const text = String(input ?? "");
  const lower = text.toLowerCase();
  const type = detectShareFailureType(text, lower, fallback);
  return {
    type,
    label: labels[type],
    message: formatShareFailureMessage(type, text)
  };
}

export function detectShareFailureType(text: string, lower = text.toLowerCase(), fallback: ShareFailureType = "unknown"): ShareFailureType {
  if (/not absolute path/i.test(text) || /绝对网盘路径|绝对路径/.test(text)) return "path_not_absolute";
  if (/missing_extract_code|未返回提取码|提取码缺失|没有提取码/i.test(text)) return "missing_extract_code";
  if (/文件重复|duplicate/i.test(text)) return "duplicate_file";
  if (/unsupported share|不支持创建分享|不支持.*分享/i.test(text)) return "unsupported_directory_share";
  if (/请重新登录|登录状态过期|未登录|user not exists|uid:\s*0\b|代码[:：]?\s*-6|代码[:：]?\s*31045/i.test(text)) {
    return "login_required";
  }
  if (/代码[:：]?\s*2\b|code[:：=]?\s*2\b|errno[:：=]?\s*2\b/i.test(text)) return "remote_server_code_2";
  if (/不存在|not found|no such file|path.*not.*exist|文件或目录不存在/i.test(text)) return "path_not_found";
  if (/目录为空|空目录|empty directory|folder is empty/i.test(text)) return "empty_directory";
  if (/不支持.*目录|目录.*不支持|unsupported.*director|cannot share.*director/i.test(text)) return "unsupported_directory_share";
  if (/权限|permission|risk|风控|限制|forbidden|denied/i.test(text)) return "permission_or_risk_control";
  if (/未返回可用分享链接|未解析到真实分享链接|no share link/i.test(text)) return "no_share_link_in_output";
  if (/错误|失败|error|failed|errno|errcode/i.test(lower)) return fallback;
  return fallback;
}

export function hasCliBusinessError(output: string): boolean {
  const text = String(output ?? "");
  return /错误|失败|error|failed|errno|errcode|请重新登录|登录状态过期|user not exists|uid:\s*0\b/i.test(text);
}

export function isInvalidWhoOutput(output: string): boolean {
  const text = String(output ?? "");
  return /uid:\s*0\b/i.test(text) || /用户名:\s*(?:,|$)/.test(text) || hasCliBusinessError(text);
}

function formatShareFailureMessage(type: ShareFailureType, text: string): string {
  if (type === "remote_server_code_2") return labels[type];
  if (type === "login_required") return "BaiduPCS-Go 登录已失效，请重新登录";
  if (type === "missing_extract_code") return labels[type];
  if (type === "duplicate_file") return labels[type];
  if (type === "no_share_link_in_output") return labels[type];
  const cleaned = text.trim();
  return cleaned ? `${labels[type]}：${cleaned}` : labels[type];
}
