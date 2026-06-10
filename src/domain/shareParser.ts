import type { ShareInput } from "./types";

const URL_RE = /https?:\/\/[^\s，,；;。]+/i;
const EXPLICIT_CODE_RE = /(?:提取码|密码)\s*[：:\s]*([a-z0-9]{4})/i;

export function parseShareLinks(rawText: string): ShareInput[] {
  const seen = new Set<string>();

  return rawText
    .split(/\r?\n/)
    .map((rawLine) => rawLine.trim())
    .filter(Boolean)
    .map((rawLine, index) => {
      const id = `share-${index + 1}`;
      const urlMatch = rawLine.match(URL_RE);

      if (!urlMatch) {
        return {
          id,
          rawLine,
          url: "",
          valid: false,
          duplicate: false,
          error: "未识别到有效链接"
        };
      }

      const url = stripTrailingPunctuation(urlMatch[0]);
      const normalizedUrl = normalizeUrl(url);
      if (!normalizedUrl) {
        return {
          id,
          rawLine,
          url,
          valid: false,
          duplicate: false,
          error: "链接格式无效"
        };
      }

      const duplicate = seen.has(normalizedUrl);
      if (!duplicate) {
        seen.add(normalizedUrl);
      }

      return {
        id,
        rawLine,
        url,
        extractCode: extractCode(rawLine, url),
        valid: true,
        duplicate
      };
    });
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
  const explicitCode = text.match(EXPLICIT_CODE_RE)?.[1];
  if (explicitCode) {
    return explicitCode.toUpperCase();
  }

  const afterUrl = text.slice(text.indexOf(url) + url.length);
  return afterUrl.match(/(?:^|[\s，,；;：:])([a-z0-9]{4})(?=$|[\s，,；;。])/i)?.[1]?.toUpperCase();
}
