export type RiskType =
  | "qrcode"
  | "phone"
  | "email"
  | "url"
  | "wechat"
  | "qq"
  | "external_traffic_word"
  | "text_watermark"
  | "image_watermark"
  | "corner_overlay"
  | "unknown_suspicious"
  | "watermark";

export interface RiskFinding {
  id: string;
  fileId: string;
  filePath: string;
  fileType: string;
  riskType: RiskType;
  label: string;
  contentRedacted: string;
  confidence: number;
  pageNumber?: number;
  frameTime?: number;
  bbox?: [number, number, number, number];
  suggestedAction: "ignore" | "review" | "clean_copy";
  status: "pending" | "ignored" | "marked" | "cleaned";
}

const trafficWords = ["扫码", "加微信", "进群", "公众号", "联系我", "VX", "QQ群"];

export function detectTextRisks(input: { fileId: string; filePath: string; content: string }): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const patterns: Array<[RiskType, string, RegExp]> = [
    ["phone", "手机号", /1[3-9]\d{9}/g],
    ["email", "邮箱", /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
    ["url", "URL", /https?:\/\/[^\s]+/gi],
    ["wechat", "微信号", /\b(?:vx|wechat|微信)[:：\s-]*[A-Za-z][A-Za-z0-9_-]{5,19}\b/gi],
    ["qq", "QQ号", /\bQQ[:：\s-]*[1-9][0-9]{4,11}\b/gi]
  ];

  for (const [riskType, label, pattern] of patterns) {
    for (const match of input.content.matchAll(pattern)) {
      findings.push(toFinding(input, riskType, label, redactRiskContent(match[0]), 92));
    }
  }

  for (const word of trafficWords) {
    if (input.content.includes(word)) {
      findings.push(toFinding(input, "external_traffic_word", "引流词", word, 86));
    }
  }

  return findings;
}

function toFinding(
  input: { fileId: string; filePath: string },
  riskType: RiskType,
  label: string,
  contentRedacted: string,
  confidence: number
): RiskFinding {
  return {
    id: `${input.fileId}-${riskType}-${contentRedacted}`.replace(/\W+/g, "-"),
    fileId: input.fileId,
    filePath: input.filePath,
    fileType: input.filePath.split(".").pop()?.toLowerCase() ?? "unknown",
    riskType,
    label,
    contentRedacted,
    confidence,
    suggestedAction: "review",
    status: "pending"
  };
}

export function redactRiskContent(value: string): string {
  return value
    .replace(/1[3-9]\d{7}(\d{2})/g, "1********$1")
    .replace(/([A-Z0-9._%+-]{2})[A-Z0-9._%+-]*(@[A-Z0-9.-]+\.[A-Z]{2,})/gi, "$1***$2")
    .replace(/https?:\/\/[^\s]+/gi, "<redacted-url>")
    .replace(/\bQQ[:：\s-]*([1-9])[0-9]{2,}([0-9]{2})\b/gi, "QQ:$1***$2");
}
