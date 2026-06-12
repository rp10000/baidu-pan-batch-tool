import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = resolve(repoRoot, "docs", "windows-cli-smoke-report.md");
const localHelloPath = resolve(repoRoot, "artifacts", "local-smoke", "hello.txt");
const bundledBaiduPcsGo = resolve(
  repoRoot,
  "tools",
  "baidu-cli",
  "BaiduPCS-Go",
  "BaiduPCS-Go-v4.0.1-windows-x64",
  "BaiduPCS-Go.exe"
);

const testRoot = "/\u76d8\u59ec\u6d4b\u8bd5";
const docDirName = "\u6587\u6863";
const renamedSmokeFile = "\u76d8\u59ec\u6d4b\u8bd5_001.txt";

const candidates = [
  { name: "BaiduPCS-Go", commands: ["BaiduPCS-Go", "baidupcs-go"], bundledPath: bundledBaiduPcsGo },
  { name: "BaiduPan-cli", commands: ["BaiduPan-cli", "baidupan-cli"] },
  { name: "baidu-pcs-cli-rs", commands: ["baidu-pcs-cli-rs"] },
  { name: "bypy", commands: ["bypy"] },
  { name: "bdpan", commands: ["bdpan"] }
];

export function runLocalCliSmoke(argv = process.argv.slice(2)) {
  const requestedRelogin = argv.includes("--relogin");
  const confirmedRelogin = argv.includes("--confirm-relogin");
  const requestedTransferFromUiDraft = argv.includes("--transfer-from-ui-draft");
  const detected = discoverCli();
  const checks = [];
  let status = "diagnostic";
  let version = "";
  let loginStatus = "not_detected";
  let riskLevel = detected?.name === "BaiduPCS-Go" ? "medium" : "unknown";
  let cliConfigDir = "unknown";

  if (!detected) {
    checks.push({ name: "detect", status: "fail", message: "no local CLI detected" });
    return finish({ detected, version, loginStatus, cliConfigDir, riskLevel, status, checks });
  }

  checks.push({ name: "detect", status: "pass", message: `${detected.name} detected` });

  const versionResult = runCli(detected.path, ["--version"], 5000);
  version = firstLine(versionResult.stdout) || "unknown";
  checks.push({
    name: "version",
    status: isFailedResult(versionResult) ? "fail" : "pass",
    message: isFailedResult(versionResult) ? classifyCliError(outputOf(versionResult)) : version
  });

  const envResult = runCli(detected.path, ["env"], 5000);
  cliConfigDir = isFailedResult(envResult) ? "unknown" : summarizeConfigDir(envResult.rawStdout);
  checks.push({
    name: "config",
    status: isFailedResult(envResult) ? "skipped" : "pass",
    message: isFailedResult(envResult) ? "env command unavailable" : "local CLI config only; browser credentials were not read"
  });

  const help = runCli(detected.path, ["help"], 5000);
  const helpText = outputOf(help);
  const supportsTransfer = /transfer/i.test(helpText);
  const supportsShare = /share/i.test(helpText);
  checks.push({
    name: "help",
    status: isFailedResult(help) ? "fail" : "pass",
    message: summarizeCapabilities(helpText)
  });

  if (requestedRelogin && !confirmedRelogin) {
    checks.push({
      name: "relogin",
      status: "manual_auth_required",
      message: "add --confirm-relogin before running the CLI login command"
    });
    status = "manual_auth_required";
    return finish({
      detected,
      version,
      loginStatus: "relogin_confirmation_required",
      cliConfigDir,
      riskLevel,
      status,
      checks
    });
  }

  if (requestedRelogin && confirmedRelogin) {
    const loginAttempt = runCli(detected.path, ["login"], 120000);
    checks.push({
      name: "login",
      status: isFailedResult(loginAttempt) ? "manual_auth_required" : "pass",
      message: isFailedResult(loginAttempt) ? classifyCliError(outputOf(loginAttempt)) : "login command completed"
    });
  }

  const who = runCli(detected.path, ["who"], 10000);
  if (!isFailedResult(who) && !isInvalidWhoOutput(outputOf(who))) {
    loginStatus = "logged_in";
    checks.push({ name: "whoami", status: "pass", message: "logged_in_redacted" });
  } else {
    loginStatus = "manual_auth_required";
    checks.push({ name: "whoami", status: "manual_auth_required", message: classifyCliError(outputOf(who)) });
  }

  if (loginStatus !== "logged_in") {
    checks.push({ name: "mkdir", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "upload", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "rename", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "mv", status: "skipped", message: "not_logged_in" });
    checks.push({ name: "transfer", status: "blocked_missing_test_share", message: "not_logged_in" });
    checks.push({ name: "share", status: supportsShare ? "skipped" : "fail", message: supportsShare ? "not_logged_in" : "unsupported" });
    status = "manual_auth_required";
    return finish({ detected, version, loginStatus, cliConfigDir, riskLevel, status, checks });
  }

  mkdirSync(dirname(localHelloPath), { recursive: true });
  writeFileSync(localHelloPath, "hello from panjie local cli smoke\n", "utf8");

  const ts = timestampForPath(new Date());
  const smokeDir = `${testRoot}/panjie-smoke-${ts}`;
  const docDir = `${smokeDir}/${docDirName}`;
  const transferDir = `${testRoot}/panjie-transfer-smoke-${ts}`;

  checks.push(runCliCheck(detected.path, "ls", ["ls", testRoot]));
  checks.push(runCliCheck(detected.path, "mkdir", ["mkdir", smokeDir]));
  checks.push(runCliCheck(detected.path, "upload", ["upload", localHelloPath, `${smokeDir}/hello.txt`]));
  checks.push(runCliCheck(detected.path, "rename", ["mv", `${smokeDir}/hello.txt`, `${smokeDir}/${renamedSmokeFile}`]));
  checks.push(runCliCheck(detected.path, "mkdir category", ["mkdir", docDir]));
  checks.push(runCliCheck(detected.path, "mv", ["mv", `${smokeDir}/${renamedSmokeFile}`, `${docDir}/${renamedSmokeFile}`]));

  const shareCheck = supportsShare
    ? runShareCheck(detected.path, smokeDir)
    : { check: { name: "share", status: "fail", message: "unsupported" }, share: undefined };
  checks.push(shareCheck.check);
  checks.push(
    runTransferCheck({
      cliPath: detected.path,
      supportsTransfer,
      transferDir,
      uiDraftShare: requestedTransferFromUiDraft ? readUiDraftShare() : undefined,
      inMemoryShare: shareCheck.share
    })
  );

  status = checks.some((item) => item.status === "fail")
    ? "diagnostic"
    : checks.some((item) => item.status === "blocked_missing_test_share" || item.status === "same_account_transfer_unsupported")
      ? "diagnostic"
      : "pass";

  return finish({ detected, version, loginStatus, cliConfigDir, riskLevel, status, checks });
}

function finish(input) {
  const report = formatReport(input);
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
  const result = runCli(cliPath, ["share", "set", "--period", "0", "-f", remotePath], 120000);
  const failed = isFailedResult(result);
  const share = failed ? undefined : extractShareData(outputOf(result));

  return {
    check: {
      name: "share",
      status: share?.url ? "pass" : "fail",
      message: share?.url ? "generated_redacted" : classifyCliError(outputOf(result))
    },
    share: share?.url ? share : undefined
  };
}

function runTransferCheck({ cliPath, supportsTransfer, transferDir, uiDraftShare, inMemoryShare }) {
  if (!supportsTransfer) {
    return { name: "transfer", status: "fail", message: "unsupported" };
  }

  const envShare = process.env.TEST_SHARE_URL
    ? { url: process.env.TEST_SHARE_URL, extractCode: process.env.TEST_SHARE_EXTRACT_CODE || process.env.TEST_SHARE_PWD || "" }
    : undefined;
  const share = envShare ?? uiDraftShare ?? inMemoryShare;

  if (!share?.url) {
    return { name: "transfer", status: "blocked_missing_test_share", message: "no env/ui draft test share and generated share was not parseable" };
  }

  const ensured = ensureRemoteDir(cliPath, transferDir);
  if (!ensured.ok) {
    return { name: "transfer", status: "fail", message: `mkdir target failed: ${ensured.message}` };
  }

  const cd = runCli(cliPath, ["cd", transferDir], 60000);
  if (isFailedResult(cd)) {
    return { name: "transfer", status: "fail", message: `cd target failed: ${classifyCliError(outputOf(cd))}` };
  }

  const transferArgs = ["transfer", share.url];
  if (share.extractCode) transferArgs.push(share.extractCode);
  const transfer = runCli(cliPath, transferArgs, 180000);
  runCli(cliPath, ["cd", "/"], 30000);

  if (isFailedResult(transfer)) {
    const message = classifyTransferError(outputOf(transfer));
    return { name: "transfer", status: message === "same_account_transfer_unsupported" ? "same_account_transfer_unsupported" : "fail", message };
  }

  const ls = runCli(cliPath, ["ls", transferDir], 60000);
  return {
    name: "transfer",
    status: isFailedResult(ls) ? "fail" : "pass",
    message: isFailedResult(ls)
      ? classifyCliError(outputOf(ls))
      : envShare
        ? "env_test_share_passed"
        : uiDraftShare
          ? "ui_draft_share_passed"
          : "in_memory_self_share_passed"
  };
}

function ensureRemoteDir(cliPath, remoteDir) {
  const before = runCli(cliPath, ["ls", remoteDir], 60000);
  if (!isFailedResult(before)) return { ok: true, status: "already_exists" };

  const mkdir = runCli(cliPath, ["mkdir", remoteDir], 60000);
  if (!isFailedResult(mkdir)) return { ok: true, status: "created" };
  if (!/31061|exists|文件已存在|目录已存在/i.test(outputOf(mkdir))) {
    return { ok: false, message: classifyCliError(outputOf(mkdir)) };
  }

  const after = runCli(cliPath, ["ls", remoteDir], 60000);
  return isFailedResult(after)
    ? { ok: false, message: classifyCliError(outputOf(after)) }
    : { ok: true, status: "already_exists" };
}

function runCliCheck(cliPath, name, args) {
  const result = runCli(cliPath, args, 120000);
  return {
    name,
    status: isFailedResult(result) ? "fail" : "pass",
    message: isFailedResult(result) ? classifyCliError(outputOf(result)) : "ok"
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

function outputOf(result) {
  return `${result.rawStdout || result.stdout || ""}\n${result.rawStderr || result.stderr || ""}`;
}

function isFailedResult(result) {
  return result.exitCode !== 0 || result.timedOut || hasBusinessError(outputOf(result));
}

function hasBusinessError(value) {
  const text = String(value || "");
  return /(?:error|failed|fail|errno|errcode|错误|失败|请重新登录|登录状态过期|user not exists)/i.test(text) ||
    /(?:代码|code)\s*[:：]\s*-?\d+/i.test(text) ||
    /\b(?:31045|-6)\b/.test(text);
}

function isInvalidWhoOutput(value) {
  const text = String(value || "");
  return hasBusinessError(text) ||
    /uid\s*[:：]\s*0\b/i.test(text) ||
    /username\s*[:：]\s*(?:,|\r?\n|$)/i.test(text) ||
    /用户名\s*[:：]\s*(?:,|\r?\n|$)/.test(text);
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
    `- testRoot: ${testRoot}`,
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
  const text = String(value || "");
  if (/not absolute path/i.test(text)) return "cli_path_not_absolute";
  if (/(?:代码|code)\s*[:：]\s*2\b/i.test(text)) return "remote_server_code_2";
  if (/\b(?:31045|-6)\b|请重新登录|登录状态过期|user not exists|uid\s*[:：]\s*0\b|not_logged_in|login/i.test(text)) {
    return "login_required";
  }
  if (/empty/i.test(text)) return "empty_directory";
  if (/unsupported/i.test(text)) return "unsupported";
  if (/timeout/i.test(text)) return "timeout";
  if (!text.trim()) return "failed";
  return "failed";
}

function classifyTransferError(value) {
  const text = String(value || "");
  if (/unsupported/i.test(text)) return "unsupported";
  if (/same account/i.test(text) || /相同账号|自己/.test(text)) return "same_account_transfer_unsupported";
  return classifyCliError(text);
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
    text.match(/(?:提取码|提取密码|密码|pwd|code)\s*[:：]?\s*([A-Za-z0-9]{4,})/i)?.[1] ??
    url.match(/[?&]pwd=([A-Za-z0-9]{4,})/i)?.[1] ??
    "";
  return { url, extractCode };
}

function readUiDraftShare() {
  const appData = process.env.APPDATA;
  if (!appData) return undefined;
  const draftPath = resolve(appData, "baidu-pan-batch-tool", "draft.local.json");
  if (!existsSync(draftPath)) return undefined;
  const raw = readFileSync(draftPath, "utf8");
  const rawInput = extractJsonStringField(raw, "rawInput");
  return extractShareFromText(rawInput);
}

function extractJsonStringField(jsonText, fieldName) {
  const escapedField = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(jsonText || "").match(new RegExp(`"${escapedField}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "s"));
  if (!match) return "";
  try {
    return JSON.parse(`"${match[1]}"`);
  } catch {
    return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

function extractShareFromText(value) {
  const text = String(value || "");
  const url = text.match(/https?:\/\/pan\.baidu\.com\/s\/[^\s，,。；;）)'"<>]+/i)?.[0]?.replace(/[。；;，,）)]+$/u, "");
  if (!url) return undefined;
  const extractCode =
    url.match(/[?&]pwd=([A-Za-z0-9]{4,})/i)?.[1] ??
    text.match(/(?:提取码|提取密码|密码|pwd|code)\s*[:：]?\s*([A-Za-z0-9]{4,})/i)?.[1] ??
    "";
  return { url, extractCode };
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

function redactPath(value) {
  return String(value ?? "")
    .replace(repoRoot, "<repo>")
    .replace(/C:\\Users\\[^\\]+/gi, "%USERPROFILE%");
}

function redact(value) {
  return String(value ?? "")
    .replace(/https?:\/\/pan\.baidu\.com\/s\/[^\s)]+/gi, "<redacted-share-url>")
    .replace(/(?:提取码|提取密码|extract\s*code|pwd|TEST_SHARE_EXTRACT_CODE|TEST_SHARE_PWD)\s*[:：]?\s*[A-Za-z0-9]{4,}/gi, "extractCode: <redacted>")
    .replace(/(?:BDUSS|STOKEN|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[^\s;]+/gi, "<redacted-auth-field>");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runLocalCliSmoke());
}
