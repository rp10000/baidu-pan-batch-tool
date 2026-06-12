export type ScanMode = "off" | "standard" | "deep";
export type ShareTiming = "share_immediately" | "share_after_scan_passed";

export interface ScanOptions {
  enabled: boolean;
  mode: ScanMode;
  checkQrCode: boolean;
  checkOcrText: boolean;
  checkContactInfo: boolean;
  checkTrafficWords: boolean;
  checkWatermark: boolean;
  createCleanCopy: boolean;
  scanImages: boolean;
  scanPdf: boolean;
  scanVideo: boolean;
  scanTextFiles: boolean;
  maxImageCount: number;
  maxPdfPages: number;
  maxVideoFrames: number;
  videoFrameIntervalSec: number;
  maxFileSizeMb: number;
  samplePerFolder: number;
  runInBackground: boolean;
}

export function defaultFastScanOptions(): ScanOptions {
  return {
    enabled: false,
    mode: "off",
    checkQrCode: false,
    checkOcrText: false,
    checkContactInfo: false,
    checkTrafficWords: false,
    checkWatermark: false,
    createCleanCopy: false,
    scanImages: false,
    scanPdf: false,
    scanVideo: false,
    scanTextFiles: false,
    maxImageCount: 0,
    maxPdfPages: 0,
    maxVideoFrames: 0,
    videoFrameIntervalSec: 0,
    maxFileSizeMb: 0,
    samplePerFolder: 0,
    runInBackground: false
  };
}

export function defaultStandardScanOptions(): ScanOptions {
  return {
    enabled: true,
    mode: "standard",
    checkQrCode: true,
    checkOcrText: true,
    checkContactInfo: true,
    checkTrafficWords: true,
    checkWatermark: false,
    createCleanCopy: false,
    scanImages: true,
    scanPdf: true,
    scanVideo: false,
    scanTextFiles: true,
    maxImageCount: 100,
    maxPdfPages: 3,
    maxVideoFrames: 0,
    videoFrameIntervalSec: 0,
    maxFileSizeMb: 20,
    samplePerFolder: 10,
    runInBackground: true
  };
}

export function defaultDeepScanOptions(): ScanOptions {
  return {
    enabled: true,
    mode: "deep",
    checkQrCode: true,
    checkOcrText: true,
    checkContactInfo: true,
    checkTrafficWords: true,
    checkWatermark: true,
    createCleanCopy: false,
    scanImages: true,
    scanPdf: true,
    scanVideo: true,
    scanTextFiles: true,
    maxImageCount: 1000,
    maxPdfPages: 20,
    maxVideoFrames: 30,
    videoFrameIntervalSec: 5,
    maxFileSizeMb: 200,
    samplePerFolder: 100,
    runInBackground: true
  };
}

export function scanModeLabel(mode: ScanMode): string {
  return mode === "off" ? "快速转存" : mode === "standard" ? "标准检查" : "深度扫描";
}

export function shouldCheckOcrModel(options: ScanOptions): boolean {
  return options.enabled && (options.checkOcrText || options.checkWatermark);
}

export function shouldCheckFfmpeg(options: ScanOptions): boolean {
  return options.enabled && options.scanVideo;
}

export function shouldCheckQr(options: ScanOptions): boolean {
  return options.enabled && options.checkQrCode;
}
