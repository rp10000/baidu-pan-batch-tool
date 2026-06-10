import type { ScanOptions } from "../domain/scanOptions";
import { detectTextRisks, type RiskFinding } from "../domain/riskTypes";

export interface TextScanInput {
  fileId: string;
  filePath: string;
  content: string;
  options: ScanOptions;
}

export interface TextScanResult {
  findings: RiskFinding[];
  skippedReason?: "scan_disabled" | "text_scan_disabled";
}

export class RiskScanService {
  async scanTextFile(input: TextScanInput): Promise<TextScanResult> {
    if (!input.options.enabled) {
      return { findings: [], skippedReason: "scan_disabled" };
    }
    if (!input.options.scanTextFiles) {
      return { findings: [], skippedReason: "text_scan_disabled" };
    }

    const findings = detectTextRisks({
      fileId: input.fileId,
      filePath: input.filePath,
      content: input.content
    }).filter((finding) => {
      if (["phone", "email", "wechat", "qq"].includes(finding.riskType)) return input.options.checkContactInfo;
      if (finding.riskType === "external_traffic_word" || finding.riskType === "url") return input.options.checkTrafficWords;
      return true;
    });

    return { findings };
  }
}
