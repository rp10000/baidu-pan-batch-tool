import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = resolve(repoRoot, "tools", "baidu-cli", "BaiduPCS-Go", "BaiduPCS-Go-v4.0.1-windows-x64", "BaiduPCS-Go.exe");
const localHello = resolve(repoRoot, "artifacts", "local-smoke", "share-real-hello.txt");

if (!existsSync(cliPath)) {
  console.log("share: fail");
  console.log("reason: cli_not_found");
  process.exit(0);
}

mkdirSync(dirname(localHello), { recursive: true });
writeFileSync(localHello, "panjie share real smoke\n", "utf8");

const ts = timestampForPath(new Date());
const remoteDir = `/盘姬测试/panjie-share-smoke-${ts}`;

run(["mkdir", "/盘姬测试"]);
run(["mkdir", remoteDir]);
run(["upload", localHello, `${remoteDir}/hello.txt`]);
const share = run(["share", "set", "--period", "7", "-f", remoteDir]);
const parsed = parseShareOutput(`${share.stdout}\n${share.stderr}`);
const valid = validateShare(parsed);

console.log(`share: ${valid ? "pass" : "fail"}`);
console.log(`link_format: ${valid ? "valid" : "invalid"}`);
console.log(`extract_code: ${parsed.extractCode ? "present" : "missing"}`);
console.log(`message: ${valid ? "generated_redacted" : classifyError(`${share.stdout}\n${share.stderr}`)}`);

function run(args) {
  const result = spawnSync(cliPath, args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 180000
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function parseShareOutput(output) {
  const text = String(output || "");
  const shareUrl = text.match(/https?:\/\/pan\.baidu\.com\/s\/[^\s)'"<>，。；;]+/i)?.[0] ?? "";
  const extractCode = (shareUrl ? new URL(shareUrl).searchParams.get("pwd") ?? "" : "") ||
    text.match(/(?:提取码|提取密码|密码|pwd|code)\s*[:：=]?\s*([A-Za-z0-9]{4,})/i)?.[1] ||
    "";
  return { shareUrl, extractCode };
}

function validateShare(parsed) {
  if (!parsed.shareUrl) return false;
  if (/(xxx|example|mock|redacted|\*{3,})/i.test(parsed.shareUrl)) return false;
  try {
    const url = new URL(parsed.shareUrl);
    return url.hostname === "pan.baidu.com" && parsed.extractCode.length > 0;
  } catch {
    return false;
  }
}

function classifyError(output) {
  const text = String(output || "");
  if (/失败|错误|error|failed/i.test(text)) return "cli_share_failed_redacted";
  if (!/https?:\/\/pan\.baidu\.com\/s\//i.test(text)) return "no_share_url_returned";
  return "unknown";
}

function timestampForPath(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
