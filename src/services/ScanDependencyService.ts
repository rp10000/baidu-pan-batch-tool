import type { ScanOptions } from "../domain/scanOptions";
import { shouldCheckFfmpeg, shouldCheckOcrModel, shouldCheckQr } from "../domain/scanOptions";

export interface ScanDependencyStatus {
  ocrModel: "not_required" | "missing" | "installed";
  qrEngine: "not_required" | "available";
  ffmpeg: "not_required" | "missing" | "available";
}

export class ScanDependencyService {
  inspect(options: ScanOptions): ScanDependencyStatus {
    return {
      ocrModel: shouldCheckOcrModel(options) ? "missing" : "not_required",
      qrEngine: shouldCheckQr(options) ? "available" : "not_required",
      ffmpeg: shouldCheckFfmpeg(options) ? "missing" : "not_required"
    };
  }
}
