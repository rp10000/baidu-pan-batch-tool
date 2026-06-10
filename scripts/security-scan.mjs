import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const sourceTargets = ["src", "public", "index.html", "package.json"];
const ignoredExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".svg"]);
const blockedTerms = [
  "document.cookie",
  "localStorage",
  "sessionStorage",
  "access_token",
  "refresh_token",
  "password",
  "passwd",
  "cookie",
  "browser scraping",
  "child_process",
  "shell: true",
  "shell:true",
  "exec(",
  "execFile(",
  "抓包",
  "隐藏接口",
  "账号密码"
];

const findings = [];

for (const target of sourceTargets) {
  if (existsSync(target)) {
    scanPath(target);
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
      : lowerContent.includes(term.toLowerCase());
    if (matched) {
      findings.push(`${path}: ${term}`);
    }
  });
}
