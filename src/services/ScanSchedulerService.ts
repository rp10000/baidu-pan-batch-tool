import type { ScanOptions, ShareTiming } from "../domain/scanOptions";

export function shouldBlockShareForScan(input: {
  options: ScanOptions;
  shareTiming: ShareTiming;
  highRiskCount: number;
  scanCompleted: boolean;
}): boolean {
  if (!input.options.enabled) return false;
  if (input.shareTiming !== "share_after_scan_passed") return false;
  if (!input.scanCompleted) return true;
  return input.highRiskCount > 0;
}
