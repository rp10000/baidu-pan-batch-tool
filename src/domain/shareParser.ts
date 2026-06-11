import type { ShareInput } from "./types";

const URL_RE = /https?:\/\/[^\s，,；;。]+/gi;
const EXPLICIT_CODE_RE = /(?:提取码|密码)\s*[：:\s]*([a-z0-9]{4})/i;

export function parseShareLinks(rawText: string): ShareInput[] {
  const seen = new Set<string>();
  const inputs: ShareInput[] = [];

  rawText
    .split(/\r?\n/)
    .map((rawLine) => rawLine.trim())
    .filter(Boolean)
    .forEach((rawLine) => {
      const explicitCode = rawLine.match(EXPLICIT_CODE_RE)?.[1]?.toUpperCase();
      const urlMatches = [...rawLine.matchAll(URL_RE)];

      if (urlMatches.length === 0) {
        if (explicitCode && inputs.length > 0) {
          const last = inputs.at(-1);
          if (last && last.valid && !last.extractCode) {
            last.extractCode = explicitCode;
            last.rawLine = `${last.rawLine}\n${rawLine}`;
          }
          return;
        }
        if (shouldIgnoreMetadataLine(rawLine)) {
          return;
        }
        inputs.push({
          id: `share-${inputs.length + 1}`,
          rawLine,
          url: "",
          valid: false,
          duplicate: false,
          error: "未识别到有效链接"
        });
        return;
      }

      for (const match of urlMatches) {
        const url = stripTrailingPunctuation(match[0]);
        const normalizedUrl = normalizeUrl(url);
        if (!normalizedUrl) {
          inputs.push({
            id: `share-${inputs.length + 1}`,
            rawLine,
            url,
            valid: false,
            duplicate: false,
            error: "链接格式无效"
          });
          continue;
        }

        const duplicate = seen.has(normalizedUrl);
        if (!duplicate) {
          seen.add(normalizedUrl);
        }

        inputs.push({
          id: `share-${inputs.length + 1}`,
          rawLine,
          url,
          extractCode: extractCode(rawLine, url),
          valid: true,
          duplicate
        });
      }
    });

  return inputs;
}

function normalizeUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function stripTrailingPunctuation(url: string): string {
  return url.replace(/[。；;，,)）]+$/u, "");
}

function extractCode(text: string, url: string): string | undefined {
  const codeFromUrl = codeFromQuery(url);
  if (codeFromUrl) {
    return codeFromUrl;
  }

  const explicitCode = text.match(EXPLICIT_CODE_RE)?.[1];
  if (explicitCode) {
    return explicitCode.toUpperCase();
  }

  const afterUrl = text.slice(text.indexOf(url) + url.length);
  return afterUrl.match(/(?:^|[\s，,；;：:])([a-z0-9]{4})(?=$|[\s，,；;。])/i)?.[1]?.toUpperCase();
}

function codeFromQuery(url: string): string | undefined {
  try {
    const code = new URL(url).searchParams.get("pwd");
    return code && /^[a-z0-9]{4}$/i.test(code) ? code.toUpperCase() : undefined;
  } catch {
    return undefined;
  }
}

function shouldIgnoreMetadataLine(line: string): boolean {
  return /百度网盘|网盘手机App|复制这段内容|打开百度网盘|分享的文件|链接[:：]\s*$/i.test(line);
}
