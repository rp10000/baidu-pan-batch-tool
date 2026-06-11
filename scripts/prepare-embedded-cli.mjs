import { existsSync } from "node:fs";
import { resolve } from "node:path";

const cliPath = resolve(
  process.cwd(),
  "tools",
  "baidu-cli",
  "BaiduPCS-Go",
  "BaiduPCS-Go-v4.0.1-windows-x64",
  "BaiduPCS-Go.exe"
);

if (!existsSync(cliPath)) {
  console.error("缺少本地 BaiduPCS-Go 资源，无法打包 Windows 客户端。");
  console.error(`请先准备：${cliPath}`);
  console.error("建议：重新运行 Windows 本地 CLI 发现/下载流程，或把 BaiduPCS-Go v4.0.1 windows-x64 解压到上述目录。");
  process.exit(1);
}

console.log(`embedded BaiduPCS-Go ready: ${cliPath}`);
