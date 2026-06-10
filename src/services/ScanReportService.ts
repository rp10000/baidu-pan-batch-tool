import type { RiskFinding } from "../domain/riskTypes";

export class ScanReportService {
  toMarkdown(findings: RiskFinding[]): string {
    const lines = ["# 扫描报告", "", "| 文件 | 风险 | 内容 | 置信度 |", "| --- | --- | --- | --- |"];
    findings.forEach((finding) => {
      lines.push(`| ${finding.filePath} | ${finding.label} | ${finding.contentRedacted} | ${finding.confidence}% |`);
    });
    return `${lines.join("\n")}\n`;
  }
}
