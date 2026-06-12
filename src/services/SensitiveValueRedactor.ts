export function redactSecretValue(value: string | undefined, fallback = "<redacted>"): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length <= 8) return fallback;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

export function redactCookieString(value: string | undefined): string {
  return String(value ?? "").trim() ? "<redacted-cookie>" : "";
}

export function redactAuthText(value: string | undefined): string {
  return String(value ?? "")
    .replace(/(--?cookies\s+)[^\r\n]+/gi, "$1<redacted-cookie>")
    .replace(/(BDUSS\s*[:=]\s*)([^;\s]+)/gi, "$1<redacted>")
    .replace(/(STOKEN\s*[:=]\s*)([^;\s]+)/gi, "$1<redacted>")
    .replace(/(PTOKEN\s*[:=]\s*)([^;\s]+)/gi, "$1<redacted>")
    .replace(/(BAIDUID\s*[:=]\s*)([^;\s]+)/gi, "$1<redacted>")
    .replace(/(--(?:bduss|stoken)\s+)([^\s]+)/gi, "$1<redacted>")
    .replace(/(-(?:bduss|stoken)\s+)([^\s]+)/gi, "$1<redacted>")
    .replace(/((?:cookie|authorization)\s*[:=]\s*)([^;\r\n]+)/gi, "$1<redacted>");
}
