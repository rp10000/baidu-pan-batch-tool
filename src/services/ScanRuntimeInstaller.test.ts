import { describe, expect, it } from "vitest";
import { planScanRuntimeInstall } from "./ScanRuntimeInstaller";

describe("ScanRuntimeInstaller", () => {
  it("blocks installation when Python is missing", () => {
    expect(planScanRuntimeInstall({ pythonFound: false, tesseractFound: false, ffmpegFound: false, wingetFound: true })).toEqual({
      canRun: false,
      status: "python_required",
      steps: [],
      message: "需要先安装 Python 3.10+"
    });
  });

  it("plans automatic runtime installation when Python and winget are available", () => {
    expect(planScanRuntimeInstall({ pythonFound: true, tesseractFound: false, ffmpegFound: false, wingetFound: true })).toMatchObject({
      canRun: true,
      status: "ready_to_install",
      steps: ["create_venv", "install_python_scan_packages", "install_tesseract_with_winget", "install_ffmpeg_with_winget"]
    });
  });

  it("marks system dependency gaps as manual when winget is unavailable", () => {
    expect(planScanRuntimeInstall({ pythonFound: true, tesseractFound: false, ffmpegFound: true, wingetFound: false })).toMatchObject({
      canRun: true,
      status: "manual_dependency_required",
      steps: ["create_venv", "install_python_scan_packages", "manual_tesseract_required"]
    });
  });
});
