export interface ShareImport {
  id: string;
  url: string;
  normalizedUrl: string;
  extractionCode?: string;
  note?: string;
  rawLine: string;
  line: number;
}

export interface ImportError {
  line: number;
  rawLine: string;
  reason: "missing_baidu_pan_url";
}

export interface DuplicateImport {
  normalizedUrl: string;
  firstLine: number;
  duplicateLine: number;
}

export interface ParseShareImportsResult {
  items: ShareImport[];
  errors: ImportError[];
  duplicates: DuplicateImport[];
}

const BAIDU_PAN_URL_RE = /https?:\/\/(?:pan|yun)\.baidu\.com\/[^\s，,；;]+/i;
const EXTRACTION_CODE_RE = /(?:提取码|密码|访问码|code|pwd)\s*[：:\s]*([a-z0-9]{4})/i;
const NOTE_RE = /(?:备注|note)\s*[：:\s]*([^，,；;]+)/i;

export function parseShareImports(input: string): ParseShareImportsResult {
  const items: ShareImport[] = [];
  const errors: ImportError[] = [];
  const duplicates: DuplicateImport[] = [];
  const seen = new Map<string, number>();

  input.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const text = rawLine.trim();

    if (!text) {
      return;
    }

    const urlMatch = text.match(BAIDU_PAN_URL_RE);
    if (!urlMatch) {
      errors.push({ line, rawLine, reason: "missing_baidu_pan_url" });
      return;
    }

    const url = stripTrailingPunctuation(urlMatch[0]);
    const normalizedUrl = normalizeShareUrl(url);
    const firstLine = seen.get(normalizedUrl);

    if (firstLine) {
      duplicates.push({ normalizedUrl, firstLine, duplicateLine: line });
      return;
    }

    seen.set(normalizedUrl, line);
    items.push({
      id: `import-${line}-${hashString(normalizedUrl)}`,
      url,
      normalizedUrl,
      extractionCode: extractCode(text),
      note: extractNote(text),
      rawLine,
      line
    });
  });

  return { items, errors, duplicates };
}

function normalizeShareUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.searchParams.sort();
  return parsed.toString().replace(/\/$/, "");
}

function stripTrailingPunctuation(url: string): string {
  return url.replace(/[。；;，,]+$/u, "");
}

function extractCode(text: string): string | undefined {
  const explicit = text.match(EXTRACTION_CODE_RE)?.[1];
  if (explicit) {
    return explicit.toLowerCase();
  }

  const afterUrl = text.replace(BAIDU_PAN_URL_RE, "");
  const loose = afterUrl.match(/\b([a-z0-9]{4})\b/i)?.[1];
  return loose?.toLowerCase();
}

function extractNote(text: string): string | undefined {
  const note = text.match(NOTE_RE)?.[1]?.trim();
  return note || undefined;
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}
