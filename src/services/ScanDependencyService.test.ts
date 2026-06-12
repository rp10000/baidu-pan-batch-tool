import { describe, expect, it } from "vitest";
import { defaultDeepScanOptions, defaultFastScanOptions, defaultStandardScanOptions } from "../domain/scanOptions";
import { ScanDependencyService } from "./ScanDependencyService";

describe("ScanDependencyService", () => {
  it("does not require scan dependencies in fast mode", () => {
    expect(new ScanDependencyService().inspect(defaultFastScanOptions())).toEqual({
      ocrModel: "not_required",
      qrEngine: "not_required",
      ffmpeg: "not_required"
    });
  });

  it("requires OCR and QR only for standard checks", () => {
    expect(new ScanDependencyService().inspect(defaultStandardScanOptions())).toEqual({
      ocrModel: "missing",
      qrEngine: "available",
      ffmpeg: "not_required"
    });
  });

  it("requires ffmpeg only when video scan is enabled", () => {
    expect(new ScanDependencyService().inspect(defaultDeepScanOptions())).toEqual({
      ocrModel: "missing",
      qrEngine: "available",
      ffmpeg: "missing"
    });
  });
});
