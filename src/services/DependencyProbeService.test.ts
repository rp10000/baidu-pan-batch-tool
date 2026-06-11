import { describe, expect, it } from "vitest";
import { classifyCommandProbeResult } from "./CommandTimeoutService";
import { createDependencyProbeItem, dependencyStatusText, skippedDependencyProbeItem } from "./DependencyProbeService";

describe("DependencyProbeService", () => {
  it("classifies successful, missing, timed out, and failed commands", () => {
    expect(classifyCommandProbeResult({ executablePath: "BaiduPCS-Go.exe", exitCode: 0 })).toBe("found");
    expect(classifyCommandProbeResult({ executablePath: "", exitCode: 127 })).toBe("missing");
    expect(classifyCommandProbeResult({ executablePath: "ffmpeg.exe", exitCode: 124 })).toBe("timeout");
    expect(classifyCommandProbeResult({ executablePath: "python.exe", exitCode: 1 })).toBe("error");
  });

  it("creates dependency probe items with readable status text", () => {
    const found = createDependencyProbeItem({
      name: "FFmpeg",
      executablePath: "C:/ffmpeg/bin/ffmpeg.exe",
      source: "path",
      category: "recommended",
      exitCode: 0,
      stdout: "ffmpeg version 7.0"
    });

    expect(found.status).toBe("found");
    expect(dependencyStatusText(found)).toBe("ffmpeg version 7.0");

    const missing = createDependencyProbeItem({
      name: "Tesseract",
      category: "scan_runtime",
      stderr: "Tesseract not found"
    });

    expect(missing.status).toBe("missing");
    expect(dependencyStatusText(missing)).toBe("Tesseract not found");
  });

  it("marks OpenCV and PaddleOCR as skipped when Python is missing", () => {
    const opencv = skippedDependencyProbeItem("OpenCV", "需要 Python");

    expect(opencv.status).toBe("skipped_dependency_missing");
    expect(opencv.exitCode).toBe(127);
    expect(dependencyStatusText(opencv)).toBe("需要 Python");
  });
});
