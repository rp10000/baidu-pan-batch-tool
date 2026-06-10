import { describe, expect, it } from "vitest";
import { defaultDeepScanOptions, defaultFastScanOptions, defaultStandardScanOptions, shouldCheckFfmpeg, shouldCheckOcrModel } from "./scanOptions";

describe("scan options defaults", () => {
  it("keeps fast mode scan-free", () => {
    const options = defaultFastScanOptions();

    expect(options.enabled).toBe(false);
    expect(options.mode).toBe("off");
    expect(options.checkOcrText).toBe(false);
    expect(options.checkQrCode).toBe(false);
    expect(options.scanVideo).toBe(false);
    expect(shouldCheckOcrModel(options)).toBe(false);
    expect(shouldCheckFfmpeg(options)).toBe(false);
  });

  it("limits standard mode to lightweight samples", () => {
    const options = defaultStandardScanOptions();

    expect(options.enabled).toBe(true);
    expect(options.mode).toBe("standard");
    expect(options.maxPdfPages).toBe(3);
    expect(options.maxFileSizeMb).toBe(20);
    expect(options.scanVideo).toBe(false);
    expect(options.samplePerFolder).toBe(10);
  });

  it("enables deep scan limits and video checks explicitly", () => {
    const options = defaultDeepScanOptions();

    expect(options.enabled).toBe(true);
    expect(options.mode).toBe("deep");
    expect(options.checkWatermark).toBe(true);
    expect(options.scanVideo).toBe(true);
    expect(options.maxVideoFrames).toBe(30);
    expect(shouldCheckOcrModel(options)).toBe(true);
    expect(shouldCheckFfmpeg(options)).toBe(true);
  });
});
