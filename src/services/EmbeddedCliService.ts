export type CliSource = "embedded" | "user_selected" | "path" | "missing";

export interface CliPathCandidate {
  path: string;
  source: CliSource;
}

export function resolveEmbeddedBaiduPcsGoPath(input: {
  resourcesPath: string;
  appPath: string;
  cwd: string;
}): CliPathCandidate[] {
  return [
    { path: `${input.resourcesPath}/bin/BaiduPCS-Go/BaiduPCS-Go.exe`, source: "embedded" },
    { path: `${input.appPath}/resources/bin/BaiduPCS-Go/BaiduPCS-Go.exe`, source: "embedded" },
    { path: `${input.appPath}/tools/baidu-cli/BaiduPCS-Go/BaiduPCS-Go-v4.0.1-windows-x64/BaiduPCS-Go.exe`, source: "embedded" },
    { path: `${input.cwd}/tools/baidu-cli/BaiduPCS-Go/BaiduPCS-Go-v4.0.1-windows-x64/BaiduPCS-Go.exe`, source: "embedded" }
  ];
}

export function cliSourceLabel(source: CliSource): string {
  const labels: Record<CliSource, string> = {
    embedded: "应用内置",
    user_selected: "用户选择",
    path: "系统 PATH",
    missing: "缺失"
  };
  return labels[source];
}
