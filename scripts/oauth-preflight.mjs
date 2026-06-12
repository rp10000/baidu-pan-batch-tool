import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = resolve(repoRoot, "docs", "oauth-preflight-report.md");

const envFields = [
  "BAIDU_APP_KEY",
  "BAIDU_APP_SECRET",
  "BAIDU_REDIRECT_URI",
  "BAIDU_OAUTH_SCOPE",
  "BAIDU_OAUTH_FORCE_LOGIN",
  "PANJIE_TEST_REMOTE_ROOT",
  "PANJIE_TEST_CREATE_FOLDER",
  "PANJIE_TEST_CREATE_SHARE",
  "TEST_SHARE_URL",
  "TEST_SHARE_EXTRACT_CODE"
];

const coreOAuthFields = ["BAIDU_APP_KEY", "BAIDU_APP_SECRET", "BAIDU_REDIRECT_URI", "BAIDU_OAUTH_SCOPE"];
const redactedFields = new Set(["BAIDU_APP_KEY", "BAIDU_APP_SECRET", "TEST_SHARE_URL", "TEST_SHARE_EXTRACT_CODE"]);
const requiredFiles = [".env.local.example", "docs/user-input-required.md", "docs/test-assets-prep-checklist.md"];
const dangerousFileNames = ["auth.js", "auth.json", "token.json", "ck.txt", "cookies.json", "chrome-cookie.json"];

export function runOAuthPreflight(options = {}) {
  const root = resolve(options.repoRoot ?? repoRoot);
  const envPath = resolve(root, ".env.local");
  const envExists = existsSync(envPath);
  const missing = [];
  const notes = [];
  const fields = Object.fromEntries(envFields.map((field) => [field, "missing"]));
  let callbackMode = "unknown";
  let redirectStatus = "missing";
  let envLocalIgnored = "unknown";

  for (const file of requiredFiles) {
    if (!existsSync(resolve(root, file))) {
      missing.push(file);
    }
  }

  if (!envExists) {
    missing.push(".env.local");
    notes.push(".env.local is missing. Copy .env.local.example to .env.local and fill it locally.");
  } else {
    const parsed = parseEnvFile(readFileSync(envPath, "utf8"));
    for (const field of envFields) {
      if (!Object.prototype.hasOwnProperty.call(parsed, field)) {
        fields[field] = "missing";
      } else if (!String(parsed[field]).trim()) {
        fields[field] = "empty";
      } else {
        fields[field] = redactedFields.has(field) ? "configured_redacted" : "configured";
      }
    }

    const redirectUri = parsed.BAIDU_REDIRECT_URI?.trim() ?? "";
    const redirect = classifyRedirectUri(redirectUri);
    callbackMode = redirect.mode;
    redirectStatus = redirect.status;
    if (redirect.status !== "valid") {
      notes.push("BAIDU_REDIRECT_URI must be a valid URL or oob.");
    }
  }

  envLocalIgnored = checkGitIgnored(root, ".env.local");
  if (envExists && envLocalIgnored === "no") {
    notes.push(".env.local is not ignored by git.");
  }

  const dangerousFiles = dangerousFileNames.filter((file) => existsSync(resolve(root, file)));
  if (dangerousFiles.length > 0) {
    notes.push("Dangerous local auth files were detected. Remove or move them outside the repo.");
  }

  const hasMissingCoreField = coreOAuthFields.some((field) => fields[field] === "missing" || fields[field] === "empty");
  const hasMissingTemplateField = envFields.some((field) => fields[field] === "missing");
  const hasInvalidRedirect = envExists && redirectStatus !== "valid";
  const status = dangerousFiles.length
    ? "blocked"
    : missing.length || hasMissingCoreField || hasMissingTemplateField || hasInvalidRedirect || envLocalIgnored === "no"
      ? "incomplete"
      : "ready";

  const result = {
    generatedAt: new Date().toISOString(),
    status,
    missing,
    fields,
    callbackMode,
    redirectStatus,
    envLocalIgnored,
    dangerousFiles,
    notes
  };

  if (options.writeReport !== false) {
    const outputPath = resolve(root, "docs", "oauth-preflight-report.md");
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, formatOAuthPreflightReport(result), "utf8");
  }

  return result;
}

export function formatOAuthPreflightReport(input) {
  const lines = [
    "# OAuth Preflight Report",
    "",
    `generatedAt: ${input.generatedAt ?? new Date().toISOString()}`,
    `status: ${input.status}`,
    "",
    "## Required Files",
    "",
    `- .env.local: ${input.missing?.includes(".env.local") ? "missing" : "present"}`,
    `- .env.local.example: ${input.missing?.includes(".env.local.example") ? "missing" : "present"}`,
    `- docs/user-input-required.md: ${input.missing?.includes("docs/user-input-required.md") ? "missing" : "present"}`,
    `- docs/test-assets-prep-checklist.md: ${input.missing?.includes("docs/test-assets-prep-checklist.md") ? "missing" : "present"}`,
    "",
    "## Env Field Status",
    ""
  ];

  for (const field of envFields) {
    lines.push(`- ${field}: ${input.fields?.[field] ?? "missing"}`);
  }

  lines.push(
    "",
    "## OAuth Callback",
    "",
    `- redirect_uri: ${input.redirectStatus ?? "missing"}`,
    `- callbackMode: ${input.callbackMode ?? "unknown"}`,
    "",
    "## Git Safety",
    "",
    `- .env.local ignored: ${input.envLocalIgnored ?? "unknown"}`,
    "",
    "## Dangerous Local Files",
    ""
  );

  if (input.dangerousFiles?.length) {
    for (const file of input.dangerousFiles) {
      lines.push(`- ${file}: remove before OAuth work`);
    }
  } else {
    lines.push("- none");
  }

  if (input.notes?.length) {
    lines.push("", "## Notes", "");
    input.notes.forEach((note) => lines.push(`- ${redactReportText(note)}`));
  }

  return redactReportText(`${lines.join("\n")}\n`);
}

function parseEnvFile(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }
  return result;
}

function classifyRedirectUri(value) {
  if (!value) return { status: "missing", mode: "unknown" };
  if (value.toLowerCase() === "oob") return { status: "valid", mode: "oob" };

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { status: "invalid", mode: "unknown" };
    }
    const host = url.hostname.toLowerCase();
    if (host === "127.0.0.1" || host === "localhost") {
      return { status: "valid", mode: "loopback" };
    }
    return { status: "valid", mode: "external" };
  } catch {
    return { status: "invalid", mode: "unknown" };
  }
}

function checkGitIgnored(root, file) {
  const result = spawnSync("git", ["check-ignore", "-q", file], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  });
  if (result.status === 0) return "yes";
  if (result.status === 1) return "no";
  return "unknown";
}

function redactReportText(value) {
  return String(value ?? "")
    .replace(/https?:\/\/pan\.baidu\.com\/s\/[^\s)]+/gi, "<redacted-share-url>")
    .replace(/([?&](?:pwd|code)=)[^&\s]+/gi, "$1<redacted>")
    .replace(/(?:提取码|extract\s*code)\s*[:：=]\s*[A-Za-z0-9]{4,}/gi, "extractCode: <redacted>");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = runOAuthPreflight();
  const report = formatOAuthPreflightReport(result);
  console.log(report);
  process.exit(0);
}
