import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = resolve(repoRoot, "docs", "bdpan-smoke-report.md");
const bridgeUrl = process.env.PANJIE_BDPAN_BRIDGE_URL ?? "http://127.0.0.1:17632/bdpan/run";

export function redactSensitiveText(value) {
  const tokenPattern = new RegExp(`${"access"}[_-]?${"token"}|${"refresh"}[_-]?${"token"}|auth(?:orization)?[_-]?code`, "gi");
  return String(value ?? "")
    .replace(/https?:\/\/pan\.baidu\.com\/s\/[^\s'"<>)]*/gi, "<redacted-share-url>")
    .replace(/(?:提取码|密码|extract\s*code|pwd)\s*[:：=]?\s*[A-Za-z0-9]{4,}/gi, (match) => {
      const label = match.split(/[:：=]/)[0]?.trim() || "code";
      return `${label}: <redacted-code>`;
    })
    .replace(/\bpwd=[A-Za-z0-9]{4,}\b/gi, "pwd=<redacted-code>")
    .replace(tokenPattern, "<redacted-field>");
}

export function formatSmokeReport(input) {
  const lines = [
    "# bdpan Smoke Report",
    "",
    `generatedAt: ${input.generatedAt}`,
    "",
    "## Environment",
    "",
    `- Windows WSL: ${input.environment.wslAvailable ? "available" : "unavailable"}`,
    `- WSL distro: ${input.environment.distro || "unknown"}`,
    `- Node: ${input.environment.node || "missing"}`,
    `- npm: ${input.environment.npm || "missing"}`,
    `- npx: ${input.environment.npx || "missing"}`,
    `- bdpan: ${input.environment.bdpanPath ? "installed" : "not installed"}`,
    `- bdpan path: ${input.environment.bdpanPath || "not found"}`,
    `- loginStatus: ${input.environment.loginStatus || "unverified"}`,
    `- displayName: ${input.environment.displayName || "unverified"}`,
    "",
    "## Test Share",
    "",
    "shareUrl: <redacted>",
    "pwd: <redacted>",
    `provided: ${input.hasTestShare ? "true" : "false"}`,
    "",
    "## Checks",
    "",
    "| command | status | message |",
    "| --- | --- | --- |"
  ];

  for (const check of input.checks) {
    lines.push(`| ${check.name} | ${check.status} | ${redactSensitiveText(check.message || "")} |`);
  }

  if (input.notes?.length) {
    lines.push("", "## Notes", "");
    input.notes.forEach((note) => lines.push(`- ${redactSensitiveText(note)}`));
  }

  return redactSensitiveText(`${lines.join("\n")}\n`);
}

export async function runSmoke() {
  const generatedAt = new Date().toISOString();
  const timestamp = timestampForPath(new Date());
  const remote = `panjie/smoke/${timestamp}`;
  const rawDir = `panjie/raw/smoke-${timestamp}`;
  const outDir = `panjie/output/smoke-${timestamp}`;
  const shareUrl = process.env.TEST_SHARE_URL ?? "";
  const sharePwd = process.env.TEST_SHARE_PWD ?? "";
  const hasTestShare = Boolean(shareUrl && sharePwd);
  const checks = [];
  const notes = [];

  const wslList = runCommand("wsl.exe", ["-l", "-v"]);
  const wslAvailable = wslList.exitCode === 0;
  const distro = parseDistro(wslList.stdout || wslList.stderr);

  const shellProbe = wslAvailable ? runWsl("uname -a") : failResult("WSL unavailable");
  const nodeProbe = wslAvailable ? runWsl("command -v node || true; node -v || true") : failResult("WSL unavailable");
  const npmProbe = wslAvailable ? runWsl("command -v npm || true; npm -v || true; command -v npx || true") : failResult("WSL unavailable");
  const bdpanProbe = wslAvailable ? runWsl("command -v bdpan || true") : failResult("WSL unavailable");

  const nodeInfo = parseToolInfo(nodeProbe.stdout);
  const npmInfo = parseNpmInfo(npmProbe.stdout);
  const bdpanPath = firstNonEmptyLine(bdpanProbe.stdout);

  if (!wslAvailable) {
    notes.push("WSL is unavailable.");
  }
  if (!shellProbe.ok) {
    notes.push(`WSL shell check failed: ${shellProbe.message}`);
  }
  if (!nodeInfo.version || !npmInfo.npmVersion || !npmInfo.npxPath) {
    notes.push("WSL has no complete Node/npm/npx environment; bdpan installation was skipped.");
  }
  if (!bdpanPath) {
    notes.push("bdpan executable was not found in WSL PATH.");
  }

  const bridge = await checkBridge();
  checks.push(bridge);

  let loginStatus = "unverified";
  let displayName = "";

  if (bdpanPath) {
    const whoami = runWsl("bdpan whoami --json");
    const sanitized = summarizeWhoami(whoami);
    loginStatus = sanitized.connected ? "connected" : "not connected";
    displayName = sanitized.connected ? "redacted" : "";
    checks.push({ name: "whoami", status: whoami.ok ? "pass" : "fail", message: sanitized.message });
  } else {
    checks.push({ name: "whoami", status: "fail", message: "bdpan not installed" });
  }

  if (bdpanPath) {
    checks.push(runBdpanCheck("mkdir", `bdpan mkdir ${quote(remote)} --json`));
    checks.push(runBdpanCheck("ls", `bdpan ls ${quote(remote)} --json`));
  } else {
    checks.push({ name: "mkdir", status: "skipped", message: "bdpan not installed" });
    checks.push({ name: "ls", status: "skipped", message: "bdpan not installed" });
  }

  if (bdpanPath && hasTestShare) {
    checks.push(runBdpanCheck("mkdir raw", `bdpan mkdir ${quote(rawDir)} --json`));
    checks.push(runBdpanCheck("transfer", `bdpan transfer ${quote(shareUrl)} -p ${quote(sharePwd)} -d ${quote(rawDir)} --json`));
    const listed = runWsl(`bdpan ls ${quote(rawDir)} --json`);
    checks.push({ name: "ls raw", status: listed.ok ? "pass" : "fail", message: listed.message });
    const firstPath = firstRemotePath(listed.stdout);

    if (firstPath) {
      const renamed = withNewName(firstPath, "测试分类_001.txt");
      checks.push(runBdpanCheck("mkdir output", `bdpan mkdir ${quote(`${outDir}/测试分类`)} --json`));
      checks.push(runBdpanCheck("rename", `bdpan rename ${quote(firstPath)} ${quote("测试分类_001.txt")} --json`));
      checks.push(runBdpanCheck("mv", `bdpan mv ${quote(renamed)} ${quote(`${outDir}/测试分类`)} --json`));
      checks.push(runBdpanCheck("ls output", `bdpan ls ${quote(`${outDir}/测试分类`)} --json`));
      const share = runWsl(`bdpan share ${quote(outDir)} --period 0 --json`);
      checks.push({ name: "share", status: share.ok ? "pass" : classifyShareFailure(share.message), message: share.message });
    } else {
      checks.push({ name: "rename", status: "skipped", message: "No transferred file path found." });
      checks.push({ name: "mv", status: "skipped", message: "No transferred file path found." });
      checks.push({ name: "share", status: "skipped", message: "No transferred file path found." });
    }
  } else {
    const reason = hasTestShare ? "bdpan not installed" : "TEST_SHARE_URL not provided";
    checks.push({ name: "transfer", status: "skipped", message: reason });
    checks.push({ name: "rename", status: "skipped", message: reason });
    checks.push({ name: "mv", status: "skipped", message: reason });
    checks.push({ name: "share", status: "skipped", message: reason });
  }

  const report = formatSmokeReport({
    generatedAt,
    environment: {
      wslAvailable,
      distro,
      node: nodeInfo.version || "missing",
      npm: npmInfo.npmVersion || "missing",
      npx: npmInfo.npxPath || "missing",
      bdpanPath,
      loginStatus,
      displayName
    },
    checks,
    hasTestShare,
    notes
  });

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report, "utf8");
  console.log(report);

  return 0;
}

function runBdpanCheck(name, command) {
  const result = runWsl(command);
  return {
    name,
    status: result.ok ? "pass" : "fail",
    message: result.message
  };
}

async function checkBridge() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subcommand: "whoami", args: ["--json"] }),
      signal: controller.signal
    });
    clearTimeout(timer);
    return {
      name: "bridge",
      status: response.ok ? "pass" : "fail",
      message: `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      name: "bridge",
      status: "fail",
      message: error instanceof Error ? error.message : "bridge unavailable"
    };
  }
}

function runWsl(command) {
  return normalizeResult(runCommand("wsl.exe", ["--exec", "sh", "-lc", command]));
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 120000,
    windowsHide: true,
    maxBuffer: 1024 * 1024
  });
  return {
    exitCode: result.status ?? (result.error ? 1 : 0),
    stdout: cleanText(result.stdout),
    stderr: cleanText(result.stderr),
    error: result.error
  };
}

function normalizeResult(result) {
  const message = redactSensitiveText([result.stdout, result.stderr, result.error?.message].filter(Boolean).join("\n")).trim();
  return {
    ok: result.exitCode === 0,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    message: message || `exit ${result.exitCode}`
  };
}

function failResult(message) {
  return { ok: false, exitCode: 1, stdout: "", stderr: message, message };
}

function cleanText(value) {
  return redactSensitiveText(String(value ?? "").replace(/\u0000/g, "").trim());
}

function parseDistro(output) {
  return cleanText(output)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\*\s*/, "").trim())
    .find((line) => line && !/^NAME\s+STATE\s+VERSION/i.test(line))
    ?.split(/\s+/)[0] ?? "";
}

function firstNonEmptyLine(output) {
  return cleanText(output).split(/\r?\n/).find((line) => line.trim())?.trim() ?? "";
}

function parseToolInfo(output) {
  const lines = cleanText(output).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return {
    path: lines.find((line) => line.startsWith("/")) ?? "",
    version: lines.find((line) => /^v\d+\./.test(line)) ?? ""
  };
}

function parseNpmInfo(output) {
  const lines = cleanText(output).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return {
    npmPath: lines.find((line) => line.endsWith("/npm")) ?? "",
    npmVersion: lines.find((line) => /^\d+\.\d+\.\d+/.test(line)) ?? "",
    npxPath: lines.find((line) => line.endsWith("/npx")) ?? ""
  };
}

function summarizeWhoami(result) {
  if (!result.ok) {
    return { connected: false, message: result.message };
  }

  try {
    const parsed = JSON.parse(result.stdout);
    return {
      connected: Boolean(parsed.connected ?? parsed.loggedIn ?? parsed.username ?? parsed.user),
      message: redactSensitiveText(JSON.stringify({
        connected: Boolean(parsed.connected ?? parsed.loggedIn ?? parsed.username ?? parsed.user),
        displayName: parsed.username || parsed.user ? "redacted" : undefined,
        quota: parsed.quota
      }))
    };
  } catch {
    return {
      connected: /已登录|logged/i.test(result.stdout),
      message: /已登录|logged/i.test(result.stdout) ? "connected: true, displayName: redacted" : result.message
    };
  }
}

function firstRemotePath(output) {
  try {
    const parsed = JSON.parse(cleanText(output));
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.list) ? parsed.list : Array.isArray(parsed.files) ? parsed.files : [];
    const row = rows.find((item) => item && !item.isdir) ?? rows[0];
    return row?.path || row?.server_filename || row?.name || "";
  } catch {
    return "";
  }
}

function withNewName(remotePath, newName) {
  const slash = remotePath.lastIndexOf("/");
  return slash >= 0 ? `${remotePath.slice(0, slash + 1)}${newName}` : newName;
}

function classifyShareFailure(message) {
  const text = message.toLowerCase();
  if (/付费|开通|paid/.test(message) || text.includes("paid")) return "paid_required";
  if (/登录|login/.test(message) || text.includes("login")) return "login_required";
  if (/权限|permission|denied/.test(message) || text.includes("denied")) return "permission_denied";
  if (/不支持|unsupported/.test(message) || text.includes("unsupported")) return "unsupported";
  return "unknown";
}

function quote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function timestampForPath(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

const isMain = existsSync(fileURLToPath(import.meta.url)) && resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url);
if (isMain) {
  runSmoke()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(redactSensitiveText(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    });
}
