export interface ScanRuntimeInstallPlanInput {
  pythonFound: boolean;
  tesseractFound: boolean;
  ffmpegFound: boolean;
  wingetFound: boolean;
}

export interface ScanRuntimeInstallPlan {
  canRun: boolean;
  status: "python_required" | "ready_to_install" | "manual_dependency_required";
  steps: string[];
  message: string;
}

export function planScanRuntimeInstall(input: ScanRuntimeInstallPlanInput): ScanRuntimeInstallPlan {
  if (!input.pythonFound) {
    return {
      canRun: false,
      status: "python_required",
      steps: [],
      message: "需要先安装 Python 3.10+"
    };
  }

  const steps = ["create_venv", "install_python_scan_packages"];
  if (!input.tesseractFound) steps.push(input.wingetFound ? "install_tesseract_with_winget" : "manual_tesseract_required");
  if (!input.ffmpegFound) steps.push(input.wingetFound ? "install_ffmpeg_with_winget" : "manual_ffmpeg_required");

  const requiresManual = steps.some((step) => step.startsWith("manual_"));
  return {
    canRun: true,
    status: requiresManual ? "manual_dependency_required" : "ready_to_install",
    steps,
    message: requiresManual ? "Python 运行时可安装，部分系统依赖需要手动安装" : "可以安装扫描运行时"
  };
}
