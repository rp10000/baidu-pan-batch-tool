import { redactCookieString, redactSecretValue } from "./SensitiveValueRedactor";

export type BaiduSessionInputHint = "bduss" | "stoken" | "cookie" | "auto";
export type BaiduSessionLoginMethod = "none" | "bduss_stoken" | "cookie" | "partial";

export interface BaiduSessionParseResult {
  hasBDUSS: boolean;
  hasSTOKEN: boolean;
  hasCookie: boolean;
  loginMethod: BaiduSessionLoginMethod;
  redactedPreview: {
    bduss?: string;
    stoken?: string;
    cookie?: string;
  };
}

interface ExtractedSession {
  bduss?: string;
  stoken?: string;
  cookie?: string;
}

export function parseBaiduSessionInput(raw: string, hint: BaiduSessionInputHint = "auto"): BaiduSessionParseResult {
  const extracted = extractSessionValues(raw, hint);
  const hasBDUSS = Boolean(extracted.bduss);
  const hasSTOKEN = Boolean(extracted.stoken);
  const hasCookie = Boolean(extracted.cookie);

  return {
    hasBDUSS,
    hasSTOKEN,
    hasCookie,
    loginMethod: hasBDUSS && hasSTOKEN ? "bduss_stoken" : hasCookie ? "cookie" : hasBDUSS || hasSTOKEN ? "partial" : "none",
    redactedPreview: {
      bduss: extracted.bduss ? redactSecretValue(extracted.bduss) : undefined,
      stoken: extracted.stoken ? redactSecretValue(extracted.stoken) : undefined,
      cookie: extracted.cookie ? redactCookieString(extracted.cookie) : undefined
    }
  };
}

export function extractSessionValues(raw: string, hint: BaiduSessionInputHint = "auto"): ExtractedSession {
  const text = String(raw ?? "").trim();
  if (!text) return {};

  const fromJson = extractFromJson(text);
  const fromNamed = {
    bduss: firstMatch(text, /(?:^|[{\s;,"'])BDUSS\s*[:=]\s*"?([^";,\s}]+)/i),
    stoken: firstMatch(text, /(?:^|[{\s;,"'])STOKEN\s*[:=]\s*"?([^";,\s}]+)/i)
  };
  const cookieLike = /;\s*[A-Za-z0-9_-]+\s*=/.test(text) || /\bBDUSS\s*=/.test(text) || /\bSTOKEN\s*=/.test(text);

  const result: ExtractedSession = {
    bduss: cleanValue(fromJson.bduss ?? fromNamed.bduss),
    stoken: cleanValue(fromJson.stoken ?? fromNamed.stoken),
    cookie: cookieLike ? text : undefined
  };

  if (!result.bduss && hint === "bduss" && isStandaloneSecret(text)) result.bduss = cleanValue(text);
  if (!result.stoken && hint === "stoken" && isStandaloneSecret(text)) result.stoken = cleanValue(text);
  if (!result.cookie && hint === "cookie" && text.includes("=")) result.cookie = text;

  return result;
}

function extractFromJson(text: string): Pick<ExtractedSession, "bduss" | "stoken"> {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      bduss: typeof parsed.BDUSS === "string" ? parsed.BDUSS : undefined,
      stoken: typeof parsed.STOKEN === "string" ? parsed.STOKEN : undefined
    };
  } catch {
    return {};
  }
}

function firstMatch(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1];
}

function cleanValue(value: string | undefined): string | undefined {
  const text = String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
  return text || undefined;
}

function isStandaloneSecret(text: string): boolean {
  return /^[A-Za-z0-9_\-~.%@]+$/.test(text) && text.length >= 8;
}
