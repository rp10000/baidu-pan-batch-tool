import type { ShareInput } from "./types";

const BAIDU_SHARE_URL_RE =
  /(?:https?:\/\/)?pan\.baidu\.com\/(?:s\/[^\s，,。；;）)]+|share\/init\?[^\s，,。；;）)]+)/gi;
const EXPLICIT_CODE_RE = /(?:提取码|提取密码|密码|pwd|code)\s*[:：]?\s*([a-z0-9]{4})/i;
const INVALID_LINK_HINT_RE = /(https?:\/\/|pan\.|链接|url|http)/i;

export function parseShareLinks(rawText: string): ShareInput[] {
  const seen = new Set<string>();
  const inputs: ShareInput[] = [];

  rawText
    .split(/\r?\n/)
    .map((rawLine) => rawLine.trim())
    .filter(Boolean)
    .forEach((rawLine) => {
      const explicitCode = findExplicitCode(rawLine);
      const urlMatches = [...rawLine.matchAll(BAIDU_SHARE_URL_RE)];

      if (urlMatches.length === 0) {
        if (explicitCode && attachCodeToPrevious(inputs, rawLine, explicitCode)) return;
        if (shouldIgnoreMetadataLine(rawLine)) return;
        if (INVALID_LINK_HINT_RE.test(rawLine)) {
          inputs.push({
            id: `share-${inputs.length + 1}`,
            rawLine,
            url: "",
            valid: false,
            duplicate: false,
            error: "未识别到有效百度网盘链接"
          });
        }
        return;
      }

      for (const match of urlMatches) {
        const url = stripTrailingPunctuation(match[0]);
        const normalizedUrl = normalizeBaiduShareUrl(url);
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
        if (!duplicate) seen.add(normalizedUrl);

        const codeInfo = extractCode(rawLine, url);
        inputs.push({
          id: `share-${inputs.length + 1}`,
          rawLine,
          url: normalizedUrl,
          extractCode: codeInfo.extractCode,
          explicitExtractCode: codeInfo.explicitExtractCode,
          codeConflict: codeInfo.codeConflict,
          valid: true,
          duplicate
        });
      }
    });

  return inputs;
}

function attachCodeToPrevious(inputs: ShareInput[], rawLine: string, explicitCode: string): boolean {
  const last = inputs.at(-1);
  if (!last || !last.valid || last.extractCode) return false;
  last.extractCode = explicitCode;
  last.explicitExtractCode = explicitCode;
  last.rawLine = `${last.rawLine}\n${rawLine}`;
  return true;
}

function normalizeBaiduShareUrl(url: string): string | undefined {
  const urlWithScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const parsed = new URL(urlWithScheme);
    if (parsed.hostname !== "pan.baidu.com") return undefined;
    if (!parsed.pathname.startsWith("/s/") && parsed.pathname !== "/share/init") return undefined;
    parsed.hash = "";
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function stripTrailingPunctuation(url: string): string {
  return url.replace(/[。；;，,）)]+$/u, "");
}

function findExplicitCode(text: string): string | undefined {
  return text.match(EXPLICIT_CODE_RE)?.[1];
}

function extractCode(
  text: string,
  url: string
): {
  extractCode?: string;
  explicitExtractCode?: string;
  codeConflict?: boolean;
} {
  const explicitExtractCode = findExplicitCode(text);
  const codeFromUrl = codeFromQuery(url);
  if (codeFromUrl) {
    return {
      extractCode: codeFromUrl,
      explicitExtractCode,
      codeConflict: Boolean(explicitExtractCode && explicitExtractCode.toLowerCase() !== codeFromUrl.toLowerCase())
    };
  }

  if (explicitExtractCode) return { extractCode: explicitExtractCode, explicitExtractCode };

  const afterUrl = text.slice(text.indexOf(url) + url.length);
  return {
    extractCode: afterUrl.match(/(?:^|[\s:：，,；;])([a-z0-9]{4})(?=$|[\s，,。；;])/i)?.[1]
  };
}

function codeFromQuery(url: string): string | undefined {
  const urlWithScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const code = new URL(urlWithScheme).searchParams.get("pwd");
    return code && /^[a-z0-9]{4}$/i.test(code) ? code : undefined;
  } catch {
    return undefined;
  }
}

function shouldIgnoreMetadataLine(line: string): boolean {
  return /百度网盘|网盘手机App|复制这段内容|打开百度网盘|分享的文件|来自百度网盘|超级会员/i.test(line);
}
