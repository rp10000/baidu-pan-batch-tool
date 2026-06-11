import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundledCliPath = resolve(
  repoRoot,
  "tools",
  "baidu-cli",
  "BaiduPCS-Go",
  "BaiduPCS-Go-v4.0.1-windows-x64",
  "BaiduPCS-Go.exe"
);
const localHello = resolve(repoRoot, "artifacts", "local-smoke", "share-real-hello.txt");
const testRoot = "/\u76d8\u59ec\u6d4b\u8bd5";

const cliPath = findCli();
if (!cliPath) {
  console.log("share: fail");
  console.log("reason: cli_not_found");
  process.exit(0);
}

const login = inspectLogin();
if (!login.loggedIn) {
  console.log("share: fail");
  console.log("link_format: invalid");
  console.log("extract_code: missing");
  console.log("message: login_required");
  process.exit(0);
}

mkdirSync(dirname(localHello), { recursive: true });
writeFileSync(localHello, "panjie share real smoke\n", "utf8");

const ts = timestampForPath(new Date());
const remoteDir = `${testRoot}/panjie-share-smoke-${ts}`;

run(["mkdir", testRoot]);
run(["mkdir", remoteDir]);
run(["upload", localHello, `${remoteDir}/hello.txt`]);

const share = run(["share", "set", "--period", "7", "-f", remoteDir]);
const shareOutput = `${share.stdout}\n${share.stderr}`;
const parsed = parseShareOutput(shareOutput);
const valid = validateShare(parsed);
const message = valid ? "generated_redacted" : classifyError(shareOutput);

console.log(`share: ${valid ? "pass" : "fail"}`);
console.log(`link_format: ${valid ? "valid" : "invalid"}`);
console.log(`extract_code: ${parsed.extractCode ? "present" : "missing"}`);
console.log(`message: ${message}`);

if (message === "cli_path_not_absolute") {
  process.exit(1);
}

function findCli() {
  const where = spawnSync("where.exe", ["BaiduPCS-Go"], { encoding: "utf8", windowsHide: true });
  const found = where.status === 0 ? firstLine(where.stdout) : "";
  if (found) return found;
  return existsSync(bundledCliPath) ? bundledCliPath : "";
}

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

function inspectLogin() {
  const who = run(["who"]);
  const quota = run(["quota"]);
  const rootList = run(["ls", "/"]);
  const text = `${who.stdout}\n${who.stderr}\n${quota.stdout}\n${quota.stderr}\n${rootList.stdout}\n${rootList.stderr}`;
  const uid = text.match(/\buid\s*[:：]\s*([0-9]+)/i)?.[1];
  const username =
    text.match(/用户名\s*[:：]\s*([^,\r\n]*)/)?.[1]?.trim() ||
    text.match(/\busername\s*[:：]\s*([^,\r\n]*)/i)?.[1]?.trim();
  const quotaOk = quota.status === 0 && !/31045|user not exists|登录状态过期|请重新登录/i.test(`${quota.stdout}\n${quota.stderr}`);
  return {
    loggedIn: Boolean(uid && uid !== "0" && (username || quotaOk))
  };
}

function parseShareOutput(output) {
  const text = String(output || "");
  const shareUrl = text.match(/https?:\/\/pan\.baidu\.com\/s\/[^\s)'"<>，。；;]+/i)?.[0] ?? "";
  const extractCode =
    (shareUrl ? new URL(shareUrl).searchParams.get("pwd") ?? "" : "") ||
    text.match(/(?:提取码|提取密码|密码|pwd|code)\s*[:：]?\s*([A-Za-z0-9]{4,})/i)?.[1] ||
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
  if (/not absolute path/i.test(text)) return "cli_path_not_absolute";
  if (/(?:代码|code)\s*[:：]\s*2\b/i.test(text)) return "remote_server_code_2";
  if (/\b(?:31045|-6)\b|请重新登录|登录状态过期|user not exists|uid\s*[:：]\s*0\b|login/i.test(text)) {
    return "login_required";
  }
  if (/empty/i.test(text)) return "empty_directory";
  if (/unsupported/i.test(text)) return "unsupported";
  if (/(?:error|failed|fail|错误|失败)/i.test(text)) return "cli_share_failed_redacted";
  if (!/https?:\/\/pan\.baidu\.com\/s\//i.test(text)) return "no_share_url_returned";
  return "unknown";
}

function firstLine(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

function timestampForPath(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
