import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = resolve(repoRoot, "docs", "windows-cli-smoke-report.md");
const localHelloPath = resolve(repoRoot, "artifacts", "local-smoke", "hello.txt");
const downloadedBaiduPcsGo = resolve(
  repoRoot,
  "tools",
  "baidu-cli",
  "BaiduPCS-Go",
  "BaiduPCS-Go-v4.0.1-windows-x64",
  "BaiduPCS-Go.exe"
);

const candidates = [
  { name: "BaiduPCS-Go", commands: ["BaiduPCS-Go", "baidupcs-go"], bundledPath: downloadedBaiduPcsGo },
  { name: "BaiduPan-cli", commands: ["BaiduPan-cli", "baidupan-cli"] },
  { name: "baidu-pcs-cli-rs", commands: ["baidu-pcs-cli-rs"] },
  { name: "bypy", commands: ["bypy"] },
  { name: "bdpan", commands: ["bdpan"] }
];

export function runLocalCliSmoke(argv = process.argv.slice(2)) {
  const requestedRelogin = argv.includes("--relogin");
  const confirmedRelogin = argv.includes("--confirm-relogin");
  const detected = discoverCli();
  const checks = [];
  let status = "diagnostic";
  let version = "";
  let loginStatus = "not_detected";
  let riskLevel = detected?.name === "BaiduPCS-Go" ? "medium" : "unknown";
  let cliConfigDir = "unknown";

  if (!detected) {
    checks.push({ name: "detect", status: "fail", message: "no local CLI detected" });
    const report = formatReport({ detected, version, loginStatus, cliConfigDir, riskLevel, status, checks });
    writeReport(report);
    console.log(report);
    return 0;
  }

  checks.push({ name: "detect", status: "pass", message: `${detected.name} detected` });
  const versionResult = runCli(detected.path, ["--version"], 5000);
  version = firstLine(versionResult.stdout) || "unknown";
  checks.push({ name: "version", status: versionResult.exitCode === 0 ? "pass" : "fail", message: versionResult.exitCode === 0 ? version : "version failed" });

  const envResult = runCli(detected.path, ["env"], 5000);
  cliConfigDir = envResult.exitCode === 0 ? summarizeConfigDir(envResult.rawStdout) : "unknown";
  checks.push({
    name: "config",
    status: envResult.exitCode === 0 ? "pass" : "skipped",
    message: envResult.exitCode === 0 ? "BaiduPCS-Go 自身配置目录，未读取浏览器凭据" : "env command unavailable"
  });

  const help = runCli(detected.path, ["help"], 5000);
  const helpText = `${help.stdout}\n${help.stderr}`;
  const supportsTransfer = /transfer/i.test(helpText);
  const supportsShare = /share/i.test(helpText);
  checks.push({ name: "help", status: help.exitCode === 0 ? "pass" : "fail", message: summarizeCapabilities(helpText) });

  if (requestedRelogin && !confirmedRelogin) {
    checks.push({ name: "relogin", status: "manual_auth_required", message: "需要用户确认 --confirm-relogin；未退出当前登录态" });
    status = "manual_auth_required";
    const report = formatReport({ detected, version, loginStatus: "relogin_confirmation_required", cliConfigDir, riskLevel, status, checks });
    writeReport(report);
    console.log(report);
    return 0;
  }

  if (requestedRelogin && confirmedRelogin) {
    const loginAttempt = runCli(detected.path, ["login"], 120000);
    checks.push({
      name: "login",
      status: loginAttempt.exitCode === 0 ? "pass" : "manual_auth_required",
      message: loginAttempt.exitCode === 0 ? "login command completed" : classifyCliError(loginAttempt.stderr || loginAttempt.stdout)
    });
  }

  const who = runCli(detected.path, ["who"], 10000);
  if (who.exitCode === 0) {
    loginStatus = "logged_in";
    checks.push({ name: "whoami", status: "pass", message: "logged_in_redacted" });
  } else {
    loginStatus = "manual_auth_required";
    checks.push({ name: "whoami", status: "manual_auth_required", message: "manual_auth_required" });
  }

  if (loginStatus !== "logged_in") {
    checks.push({ name: "mkdir", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "upload", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "rename", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "mv", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "transfer", status: "blocked_missing_test_share", message: "not_logged_in" });
    checks.push({ name: "share", status: supportsShare ? "skipped" : "fail", message: supportsShare ? "not_logged_in" : "unsupported" });
    status = "manual_auth_required";
  } else {
    mkdirSync(dirname(localHelloPath), { recursive: true });
    writeFileSync(localHelloPath, "hello from panjie local cli smoke\n", "utf8");
    const ts = timestampForPath(new Date());
    const root = "/盘姬测试";
    const smokeDir = `${root}/panjie-smoke-${ts}`;
    const docDir = `${smokeDir}/文档`;
    const transferDir = `${root}/panjie-transfer-smoke-${ts}`;

    checks.push(runCliCheck(detected.path, "ls", ["ls", root]));
    checks.push(runCliCheck(detected.path, "mkdir", ["mkdir", smokeDir]));
    checks.push(runCliCheck(detected.path, "upload", ["upload", localHelloPath, `${smokeDir}/hello.txt`]));
    checks.push(runCliCheck(detected.path, "rename", ["mv", `${smokeDir}/hello.txt`, `${smokeDir}/盘姬测试_001.txt`]));
    checks.push(runCliCheck(detected.path, "mkdir category", ["mkdir", docDir]));
    checks.push(runCliCheck(detected.path, "mv", ["mv", `${smokeDir}/盘姬测试_001.txt`, `${docDir}/盘姬测试_001.txt`]));

    const shareCheck = supportsShare ? runShareCheck(detected.path, smokeDir) : { check: { name: "share", status: "fail", message: "unsupported" } };
    checks.push(shareCheck.check);
    checks.push(runTransferCheck({
      cliPath: detected.path,
      supportsTransfer,
      transferDir,
      inMemoryShare: shareCheck.share
    }));
    status = checks.some((item) => item.status === "fail" || item.status === "blocked_missing_test_share" || item.status === "same_account_transfer_unsupported")
      ? "diagnostic"
      : "pass";
  }

  const report = formatReport({ detected, version, loginStatus, cliConfigDir, riskLevel, status, checks });
  writeReport(report);
  console.log(report);
  return 0;
}

function discoverCli() {
  for (const candidate of candidates) {
    for (const command of candidate.commands) {
      const found = where(command);
      if (found) return { name: candidate.name, path: found };
    }
    if (candidate.bundledPath && existsSync(candidate.bundledPath)) {
      return { name: candidate.name, path: candidate.bundledPath };
    }
  }
  return undefined;
}

function where(command) {
  const result = spawnSync("where.exe", [command], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return "";
  return firstLine(result.stdout) || "";
}

function runShareCheck(cliPath, remotePath) {
  const result = runCli(cliPath, ["share", "set", "--period", "7", "-f", remotePath], 120000);
  const share = result.exitCode === 0 ? extractShareData(result.rawStdout || result.rawStderr) : undefined;
  const failedOutput = /失败|错误|error|failed/i.test(result.rawStdout || result.rawStderr);
  return {
    check: {
      name: "share",
      status: result.exitCode === 0 && share?.url && !failedOutput ? "pass" : "fail",
      message: result.exitCode === 0 && share?.url && !failedOutput ? "generated_redacted" : classifyCliError(result.stderr || result.stdout)
    },
    share: result.exitCode === 0 && !failedOutput ? share : undefined
  };
}

function runTransferCheck({ cliPath, supportsTransfer, transferDir, inMemoryShare }) {
  if (!supportsTransfer) {
    return { name: "transfer", status: "fail", message: "unsupported" };
  }

  const envShare = process.env.TEST_SHARE_URL
    ? { url: process.env.TEST_SHARE_URL, extractCode: process.env.TEST_SHARE_EXTRACT_CODE || process.env.TEST_SHARE_PWD || "" }
    : undefined;
  const share = envShare ?? inMemoryShare;

  if (!share?.url) {
    return { name: "transfer", status: "blocked_missing_test_share", message: "no env test share and generated share was not parseable" };
  }

  const mkdir = runCli(cliPath, ["mkdir", transferDir], 60000);
  if (mkdir.exitCode !== 0) {
    return { name: "transfer", status: "fail", message: `mkdir target failed: ${classifyCliError(mkdir.stderr || mkdir.stdout)}` };
  }

  const cd = runCli(cliPath, ["cd", transferDir], 60000);
  if (cd.exitCode !== 0) {
    return { name: "transfer", status: "fail", message: `cd target failed: ${classifyCliError(cd.stderr || cd.stdout)}` };
  }

  const transferArgs = ["transfer", share.url];
  if (share.extractCode) transferArgs.push(share.extractCode);
  const transfer = runCli(cliPath, transferArgs, 180000);
  runCli(cliPath, ["cd", "/"], 30000);

  if (transfer.exitCode !== 0) {
    const message = classifyTransferError(transfer.stderr || transfer.stdout);
    return { name: "transfer", status: message === "same_account_transfer_unsupported" ? "same_account_transfer_unsupported" : "fail", message };
  }

  const ls = runCli(cliPath, ["ls", transferDir], 60000);
  return {
    name: "transfer",
    status: ls.exitCode === 0 ? "pass" : "fail",
    message: ls.exitCode === 0 ? (envShare ? "env_test_share_passed" : "in_memory_self_share_passed") : classifyCliError(ls.stderr || ls.stdout)
  };
}

function runCliCheck(cliPath, name, args) {
  const result = runCli(cliPath, args, 120000);
  return {
    name,
    status: result.exitCode === 0 ? "pass" : "fail",
    message: result.exitCode === 0 ? "ok" : classifyCliError(result.stderr || result.stdout)
  };
}

function runCli(cliPath, args, timeoutMs) {
  const result = spawnSync(cliPath, args, {
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true
  });
  return {
    exitCode: result.error?.message.includes("ETIMEDOUT") ? 124 : result.status ?? 1,
    stdout: redact(result.stdout || ""),
    stderr: redact(result.stderr || ""),
    rawStdout: result.stdout || "",
    rawStderr: result.stderr || "",
    timedOut: Boolean(result.error?.message.includes("ETIMEDOUT"))
  };
}

function formatReport(input) {
  const lines = [
    "# Windows Local CLI Smoke Report",
    "",
    `generatedAt: ${new Date().toISOString()}`,
    `status: ${input.status}`,
    "",
    "## CLI",
    "",
    `- detected: ${input.detected ? "true" : "false"}`,
    `- name: ${input.detected?.name ?? "none"}`,
    `- path: ${input.detected ? redactPath(input.detected.path) : "none"}`,
    `- version: ${input.version || "unknown"}`,
    `- loginStatus: ${input.loginStatus}`,
    "- loginStateSource: BaiduPCS-Go local config, not browser credentials",
    `- configDir: ${input.cliConfigDir}`,
    `- riskLevel: ${input.riskLevel}`,
    "- testRoot: 盘姬测试",
    "",
    "## Safety",
    "",
    "- chromeCookieRead: false",
    "- ckOrBdussRead: false",
    "- browserUserDataRead: false",
    "- networkCapture: false",
    "- destructiveDelete: false",
    "",
    "## Checks",
    "",
    "| check | status | message |",
    "| --- | --- | --- |"
  ];
  for (const check of input.checks) {
    lines.push(`| ${check.name} | ${check.status} | ${redact(check.message)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function writeReport(report) {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report, "utf8");
}

function classifyCliError(value) {
  const lower = value.toLowerCase();
  if (lower.includes("unsupported")) return "unsupported";
  if (lower.includes("login") || value.includes("未登录")) return "not_logged_in";
  if (lower.includes("timeout")) return "timeout";
  return "failed";
}

function classifyTransferError(value) {
  const lower = String(value || "").toLowerCase();
  if (lower.includes("unsupported")) return "unsupported";
  if (lower.includes("same account") || value.includes("自己") || value.includes("相同账号")) return "same_account_transfer_unsupported";
  if (lower.includes("login") || value.includes("未登录")) return "not_logged_in";
  return classifyCliError(value);
}

function summarizeCapabilities(text) {
  const lower = text.toLowerCase();
  const items = ["login", "ls", "mkdir", "upload", "mv", "transfer", "share"].filter((item) => lower.includes(item));
  return items.join(", ") || "unknown";
}

function summarizeConfigDir(value) {
  if (!value) return "unknown";
  if (/BaiduPCS-Go/i.test(value)) return "%APPDATA%/BaiduPCS-Go";
  return "local CLI config";
}

function extractShareData(value) {
  const text = String(value || "");
  const url = text.match(/https?:\/\/pan\.baidu\.com\/s\/[^\s)'"<>]+/i)?.[0];
  if (!url) return undefined;
  const extractCode =
    text.match(/(?:提取码|提取密码|密码|pwd)\s*[:：=]?\s*([A-Za-z0-9]{4,})/i)?.[1] ??
    url.match(/[?&]pwd=([A-Za-z0-9]{4,})/i)?.[1] ??
    "";
  return { url, extractCode };
}

function firstLine(value) {
  return String(value || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean);
}

function timestampForPath(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function redactPath(value) {
  return String(value ?? "")
    .replace(repoRoot, "<repo>")
    .replace(/C:\\Users\\[^\\]+/gi, "%USERPROFILE%");
}

function redact(value) {
  return String(value ?? "")
    .replace(/https?:\/\/pan\.baidu\.com\/s\/[^\s)]+/gi, "<redacted-share-url>")
    .replace(/(?:提取码|提取密码|extract\s*code|pwd|TEST_SHARE_EXTRACT_CODE|TEST_SHARE_PWD)\s*[:：=]?\s*[A-Za-z0-9]{4,}/gi, "extractCode: <redacted>")
    .replace(/(?:BDUSS|STOKEN|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[^\s;]+/gi, "<redacted-auth-field>");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runLocalCliSmoke());
}
