import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const sourceTargets = ["src", "electron", "public", "index.html", "package.json"];
const reportTargets = [
  "docs/bdpan-smoke-report.md",
  "docs/oauth-preflight-report.md",
  "docs/windows-cli-smoke-report.md",
  "artifacts/electron-runtime.log"
];
const ignoredExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".svg"]);
const blockedTerms = [
  "document.cookie",
  "localStorage",
  "sessionStorage",
  "browser scraping",
  "child_process",
  "shell: true",
  "shell:true",
  "exec(",
  "execFile(",
  "chrome user data",
  "Login Data",
  "Cookies SQLite",
  "自动提取",
  "提取ck",
  "提取cookie",
  "提取token",
  "access_token=",
  "refresh_token=",
  "BDUSS=",
  "STOKEN=",
  "BAIDUID=",
  "secrets/",
  "auth.json",
  "token.json",
  "抓包",
  "HAR",
  "hidden endpoint",
  "隐藏接口",
  "账号密码"
];

const findings = [];

for (const target of sourceTargets) {
  if (existsSync(target)) {
    scanPath(target);
  }
}

scanGitIndex();

for (const reportTarget of reportTargets) {
  if (existsSync(reportTarget)) {
    scanReport(reportTarget);
  }
}

if (findings.length > 0) {
  console.error("Sensitive implementation terms found:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("No sensitive implementation terms found in source targets.");

function scanPath(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const child of readdirSync(path)) {
      scanPath(join(path, child));
    }
    return;
  }

  if (stat.size > 3 * 1024 * 1024) {
    return;
  }

  if (ignoredExtensions.has(extname(path).toLowerCase())) {
    return;
  }

  const content = readFileSync(path, "utf8");
  const lowerContent = content.toLowerCase();
  blockedTerms.forEach((term) => {
    const matched = /[\u4e00-\u9fff]/u.test(term)
      ? content.includes(term)
      : term === "HAR"
        ? /\bHAR\b/i.test(content)
        : lowerContent.includes(term.toLowerCase());
    if (matched) {
      findings.push(`${path}: ${term}`);
    }
  });

  if (/\.env\.local(?!\.example)/.test(content)) {
    findings.push(`${path}: .env.local`);
  }
}

function scanGitIndex() {
  const result = spawnSync("git", ["ls-files", "--cached"], {
    encoding: "utf8",
    windowsHide: true
  });

  if (result.status !== 0) {
    return;
  }

  const trackedEnvFiles = result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => /^\.env(?:\.|$)/.test(file))
    .filter((file) => file !== ".env.example" && file !== ".env.local.example");

  for (const file of trackedEnvFiles) {
    findings.push(`${file}: env file is tracked by git`);
  }

  const forbiddenTrackedFiles = result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => /(^|\/)(secrets|auth\.json|token\.json)$/.test(file) || file.endsWith("/auth.json") || file.endsWith("/token.json"));

  for (const file of forbiddenTrackedFiles) {
    findings.push(`${file}: forbidden credential file is tracked by git`);
  }
}

function scanReport(path) {
  const content = readFileSync(path, "utf8");
  const checks = [
    { pattern: /https?:\/\/pan\.baidu\.com\/s\/[^\s)]+/i, label: "完整分享链接" },
    { pattern: /\bpwd\s*[:=]\s*(?!<redacted>)[A-Za-z0-9]{4,}/i, label: "真实提取码" },
    { pattern: /提取码\s*[:：]\s*(?!<redacted>)[A-Za-z0-9]{4,}/i, label: "真实提取码" },
    { pattern: /access[_-]?token\s*[:=]|refresh[_-]?token\s*[:=]|authorization[_-]?code\s*[:=]/i, label: "授权字段" },
    { pattern: /BAIDU_APP_SECRET\s*[:=]\s*(?!configured_redacted|empty|missing|<redacted>)[^\s]+/i, label: "真实应用密钥" },
    { pattern: /TEST_SHARE_EXTRACT_CODE\s*[:=]\s*(?!configured_redacted|empty|missing|<redacted>)[A-Za-z0-9]{4,}/i, label: "真实提取码" }
  ];

  checks.forEach((check) => {
    if (check.pattern.test(content)) {
      findings.push(`${path}: ${check.label}`);
    }
  });
}
