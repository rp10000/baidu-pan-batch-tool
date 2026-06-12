import { describe, expect, it } from "vitest";
import { redactAuthText, redactCookieString, redactSecretValue } from "./SensitiveValueRedactor";

describe("SensitiveValueRedactor", () => {
  it("keeps only the first and last four characters for secret values", () => {
    expect(redactSecretValue("1234567890abcdef")).toBe("1234...cdef");
  });

  it("redacts complete cookie strings", () => {
    expect(redactCookieString("BDUSS=fake; STOKEN=fake")).toBe("<redacted-cookie>");
  });

  it("redacts auth fields and command arguments from debug text", () => {
    const text = "BaiduPCS-Go login --bduss fakeBDUSSValue --stoken fakeSTOKENValue\nBDUSS: fakeBDUSSValue";
    expect(redactAuthText(text)).not.toContain("fakeBDUSSValue");
    expect(redactAuthText(text)).not.toContain("fakeSTOKENValue");
  });
});
