export interface LoginScriptInput {
  cliPath: string;
}

export function createBaiduPcsLoginScript(input: LoginScriptInput): string {
  const cliPath = input.cliPath.replace(/"/g, '""');
  const cliDir = dirname(input.cliPath).replace(/"/g, '""');
  return [
    "@echo off",
    "chcp 65001 >nul",
    "title BaiduPCS-Go 登录",
    "echo 正在启动 BaiduPCS-Go 登录...",
    "echo.",
    `cd /d "${cliDir}"`,
    `"${cliPath}" login`,
    "echo.",
    "echo 登录流程结束。请回到盘姬批量助手点击“重新检测”。",
    "pause",
    ""
  ].join("\r\n");
}

export function buildLoginStartArgs(loginScriptPath: string): string[] {
  const escapedScriptPath = loginScriptPath.replace(/'/g, "''");
  return [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', '${escapedScriptPath}') -WindowStyle Normal`
  ];
}

function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index <= 0 ? "." : filePath.slice(0, index);
}
