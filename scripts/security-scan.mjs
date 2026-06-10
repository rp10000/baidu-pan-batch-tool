import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const runtimeTargets = ["exports", "logs", "tmp"];
const secretPatterns = [
  /access_token\s*[:=]\s*(?!\[REDACTED_ACCESS_TOKEN\])\S+/i,
  /refresh_token\s*[:=]\s*(?!\[REDACTED_REFRESH_TOKEN\])\S+/i,
  /password\s*[:=]\s*(?!\[REDACTED_PASSWORD\])\S+/i,
  /cookie\s*[:=]\s*(?!\[REDACTED_COOKIE\])\S+/i,
  /BDUSS\s*=\s*(?!\[REDACTED_COOKIE\])\S+/i
];

const findings = [];

for (const target of runtimeTargets) {
  if (existsSync(target)) {
    scanPath(target);
  }
}

if (findings.length > 0) {
  console.error("Sensitive runtime data found:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("No sensitive runtime data found in exports/logs/tmp.");

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

  const content = readFileSync(path, "utf8");
  secretPatterns.forEach((pattern) => {
    if (pattern.test(content)) {
      findings.push(path);
    }
  });
}
