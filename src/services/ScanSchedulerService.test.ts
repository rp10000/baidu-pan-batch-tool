import { describe, expect, it } from "vitest";
import { defaultFastScanOptions, defaultStandardScanOptions } from "../domain/scanOptions";
import { shouldBlockShareForScan } from "./ScanSchedulerService";

describe("ScanSchedulerService", () => {
  it("does not block sharing in fast mode", () => {
    expect(
      shouldBlockShareForScan({
        options: defaultFastScanOptions(),
        shareTiming: "share_after_scan_passed",
        highRiskCount: 9,
        scanCompleted: false
      })
    ).toBe(false);
  });

  it("shares immediately without waiting for scan", () => {
    expect(
      shouldBlockShareForScan({
        options: defaultStandardScanOptions(),
        shareTiming: "share_immediately",
        highRiskCount: 0,
        scanCompleted: false
      })
    ).toBe(false);
  });

  it("waits for scan completion and high-risk clearance when requested", () => {
    expect(
      shouldBlockShareForScan({
        options: defaultStandardScanOptions(),
        shareTiming: "share_after_scan_passed",
        highRiskCount: 0,
        scanCompleted: false
      })
    ).toBe(true);

    expect(
      shouldBlockShareForScan({
        options: defaultStandardScanOptions(),
        shareTiming: "share_after_scan_passed",
        highRiskCount: 1,
        scanCompleted: true
      })
    ).toBe(true);

    expect(
      shouldBlockShareForScan({
        options: defaultStandardScanOptions(),
        shareTiming: "share_after_scan_passed",
        highRiskCount: 0,
        scanCompleted: true
      })
    ).toBe(false);
  });
});
