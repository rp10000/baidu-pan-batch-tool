import { describe, expect, it } from "vitest";
import { defaultFastScanOptions, defaultStandardScanOptions } from "../domain/scanOptions";
import { RiskScanService } from "./RiskScanService";

describe("RiskScanService", () => {
  it("does not scan when scan options are off", async () => {
    const result = await new RiskScanService().scanTextFile({
      fileId: "1",
      filePath: "traffic-text.txt",
      content: "加微信 abc123 访问 https://example.com",
      options: defaultFastScanOptions()
    });

    expect(result.findings).toEqual([]);
    expect(result.skippedReason).toBe("scan_disabled");
  });

  it("detects contact and traffic risks only when enabled", async () => {
    const result = await new RiskScanService().scanTextFile({
      fileId: "1",
      filePath: "traffic-text.txt",
      content: "联系我 13812345678，邮箱 demo@example.com，加微信 abc123",
      options: defaultStandardScanOptions()
    });

    expect(result.findings.map((finding) => finding.riskType)).toEqual(
      expect.arrayContaining(["phone", "email", "external_traffic_word"])
    );
    expect(result.findings.every((finding) => !finding.contentRedacted.includes("13812345678"))).toBe(true);
  });
});
