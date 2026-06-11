export interface BaiduPcsLoginMethodSupport {
  bduss: boolean;
  stoken: boolean;
  cookies: boolean;
}

export function parseBaiduPcsLoginHelp(helpText: string): BaiduPcsLoginMethodSupport {
  const text = String(helpText ?? "").toLowerCase();
  return {
    bduss: /(?:--|-)?bduss\b/.test(text),
    stoken: /(?:--|-)?stoken\b/.test(text),
    cookies: /(?:--|-)?cookies?\b/.test(text)
  };
}
