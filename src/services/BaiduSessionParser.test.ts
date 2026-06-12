import { describe, expect, it } from "vitest";
import { parseBaiduSessionInput } from "./BaiduSessionParser";

describe("BaiduSessionParser", () => {
  it("recognizes field-specific raw BDUSS and STOKEN values", () => {
    expect(parseBaiduSessionInput("rawBDUSSValue1234", "bduss")).toMatchObject({
      hasBDUSS: true,
      hasSTOKEN: false,
      loginMethod: "partial"
    });
    expect(parseBaiduSessionInput("rawSTOKENValue5678", "stoken")).toMatchObject({
      hasBDUSS: false,
      hasSTOKEN: true,
      loginMethod: "partial"
    });
  });

  it("recognizes named values without exposing originals in the preview", () => {
    const result = parseBaiduSessionInput("BDUSS: fakeBDUSSValue1234\nSTOKEN: fakeSTOKENValue5678");
    expect(result.hasBDUSS).toBe(true);
    expect(result.hasSTOKEN).toBe(true);
    expect(result.loginMethod).toBe("bduss_stoken");
    expect(result.redactedPreview.bduss).toBe("fake...1234");
    expect(JSON.stringify(result.redactedPreview)).not.toContain("fakeBDUSSValue1234");
  });

  it("recognizes complete cookie strings", () => {
    const result = parseBaiduSessionInput("BDUSS=fakeBDUSSValue1234; STOKEN=fakeSTOKENValue5678; BAIDUID=fake");
    expect(result.hasCookie).toBe(true);
    expect(result.hasBDUSS).toBe(true);
    expect(result.hasSTOKEN).toBe(true);
    expect(result.redactedPreview.cookie).toBe("<redacted-cookie>");
  });

  it("recognizes JSON payloads", () => {
    const result = parseBaiduSessionInput(JSON.stringify({ BDUSS: "fakeBDUSSValue1234", STOKEN: "fakeSTOKENValue5678" }));
    expect(result.loginMethod).toBe("bduss_stoken");
  });
});
