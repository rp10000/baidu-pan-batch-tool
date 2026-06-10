const REDACTION_RULES: Array<[RegExp, string]> = [
  [/\baccess_token\s*[:=]\s*([^\s&;,]+)/gi, "access_token=[REDACTED_ACCESS_TOKEN]"],
  [/\brefresh_token\s*[:=]\s*([^\s&;,]+)/gi, "refresh_token=[REDACTED_REFRESH_TOKEN]"],
  [/\bpassword\s*[:=]\s*([^\s&;,]+)/gi, "password=[REDACTED_PASSWORD]"],
  [/\bpwd\s*[:=]\s*([^\s&;,]+)/gi, "pwd=[REDACTED_PASSWORD]"],
  [/\bcookie\s*[:=]\s*[^\r\n]+/gi, "cookie=[REDACTED_COOKIE]"],
  [/\bAuthorization\s*:\s*Bearer\s+[^\s]+/gi, "Authorization: Bearer [REDACTED_ACCESS_TOKEN]"],
  [/\bBDUSS\s*=\s*[^\s&;,]+/gi, "BDUSS=[REDACTED_COOKIE]"]
];

export function redactSensitive(value: string): string {
  return REDACTION_RULES.reduce((output, [pattern, replacement]) => {
    return output.replace(pattern, replacement);
  }, value);
}
