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

export function runLocalCliSmoke() {
  const detected = discoverCli();
  const checks = [];
  let status = "diagnostic";
  let version = "";
  let loginStatus = "not_detected";
  let riskLevel = detected?.name === "BaiduPCS-Go" ? "medium" : "unknown";

  if (!detected) {
    checks.push({ name: "detect", status: "fail", message: "no local CLI detected" });
    const report = formatReport({ detected, version, loginStatus, riskLevel, status, checks });
    writeReport(report);
    console.log(report);
    return 0;
  }

  checks.push({ name: "detect", status: "pass", message: `${detected.name} detected` });
  const versionResult = runCli(detected.path, ["--version"], 5000);
  version = firstLine(versionResult.stdout) || "unknown";
  checks.push({ name: "version", status: versionResult.exitCode === 0 ? "pass" : "fail", message: versionResult.exitCode === 0 ? version : "version failed" });

  const help = runCli(detected.path, ["help"], 5000);
  const helpText = `${help.stdout}\n${help.stderr}`;
  const supportsTransfer = /transfer/i.test(helpText);
  const supportsShare = /share/i.test(helpText);
  checks.push({ name: "help", status: help.exitCode === 0 ? "pass" : "fail", message: summarizeCapabilities(helpText) });

  const who = runCli(detected.path, ["who"], 10000);
  if (who.exitCode === 0) {
    loginStatus = "logged_in";
    checks.push({ name: "whoami", status: "pass", message: "logged_in_redacted" });
  } else {
    loginStatus = "manual_auth_required";
    checks.push({ name: "whoami", status: "manual_auth_required", message: "manual_auth_required" });
    const loginAttempt = runCli(detected.path, ["login"], 8000);
    if (loginAttempt.timedOut || loginAttempt.exitCode !== 0) {
      checks.push({ name: "login", status: "manual_auth_required", message: "manual_auth_required" });
    } else {
      checks.push({ name: "login", status: "pass", message: "login command completed" });
    }
  }

  if (loginStatus !== "logged_in") {
    checks.push({ name: "mkdir", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "upload", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "rename", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "mv", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "transfer", status: "skipped_missing_test_share", message: "not_logged_in" });
    checks.push({ name: "share", status: supportsShare ? "skipped" : "fail", message: supportsShare ? "not_logged_in" : "unsupported" });
    status = "manual_auth_required";
  } else {
    mkdirSync(dirname(localHelloPath), { recursive: true });
    writeFileSync(localHelloPath, "hello from panjie local cli smoke\n", "utf8");
    const ts = timestampForPath(new Date());
    const root = "/盘姬测试";
    const smokeDir = `${root}/panjie-smoke-${ts}`;
    const docDir = `${smokeDir}/文档`;
    checks.push(runCliCheck(detected.path, "ls", ["ls", root]));
    checks.push(runCliCheck(detected.path, "mkdir", ["mkdir", smokeDir]));
    checks.push(runCliCheck(detected.path, "upload", ["upload", localHelloPath, `${smokeDir}/hello.txt`]));
    checks.push(runCliCheck(detected.path, "rename", ["mv", `${smokeDir}/hello.txt`, `${smokeDir}/盘姬测试_001.txt`]));
    checks.push(runCliCheck(detected.path, "mkdir category", ["mkdir", docDir]));
    checks.push(runCliCheck(detected.path, "mv", ["mv", `${smokeDir}/盘姬测试_001.txt`, `${docDir}/盘姬测试_001.txt`]));
    checks.push({ name: "transfer", status: "skipped_missing_test_share", message: supportsTransfer ? "missing user test share" : "unsupported" });
    checks.push(supportsShare ? runCliCheck(detected.path, "share", ["share", smokeDir], true) : { name: "share", status: "fail", message: "unsupported" });
    status = checks.some((item) => item.status === "fail") ? "diagnostic" : "pass";
  }

  const report = formatReport({ detected, version, loginStatus, riskLevel, status, checks });
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

function runCliCheck(cliPath, name, args, redactShare = false) {
  const result = runCli(cliPath, args, 120000);
  return {
    name,
    status: result.exitCode === 0 ? "pass" : "fail",
    message: result.exitCode === 0 ? (redactShare ? "generated_redacted" : "ok") : classifyCliError(result.stderr || result.stdout)
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
    `- version: ${input.version || "unknown"}`,
    `- loginStatus: ${input.loginStatus}`,
    `- riskLevel: ${input.riskLevel}`,
    "- testRoot: 盘姬测试",
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
  return "failed";
}

function summarizeCapabilities(text) {
  const lower = text.toLowerCase();
  const items = ["login", "ls", "mkdir", "upload", "mv", "transfer", "share"].filter((item) => lower.includes(item));
  return items.join(", ") || "unknown";
}

function firstLine(value) {
  return String(value || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean);
}

function timestampForPath(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function redact(value) {
  return String(value ?? "")
    .replace(/https?:\/\/pan\.baidu\.com\/s\/[^\s)]+/gi, "<redacted-share-url>")
    .replace(/(?:提取码|extract\s*code|pwd)\s*[:：=]?\s*[A-Za-z0-9]{4,}/gi, "extractCode: <redacted>")
    .replace(/(?:BDUSS|STOKEN|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[^\s;]+/gi, "<redacted-auth-field>");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runLocalCliSmoke());
}
