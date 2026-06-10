import { describe, expect, it } from "vitest";
import { redactSensitive } from "./redaction";

describe("redactSensitive", () => {
  it("removes secrets from logs and exported errors", () => {
    const redacted = redactSensitive(
      "access_token=abc123 refresh_token=r456 password=secret cookie: BDUSS=xyz"
    );

    expect(redacted).not.toContain("abc123");
    expect(redacted).not.toContain("r456");
    expect(redacted).not.toContain("secret");
    expect(redacted).not.toContain("BDUSS=xyz");
    expect(redacted).toContain("[REDACTED_ACCESS_TOKEN]");
    expect(redacted).toContain("[REDACTED_REFRESH_TOKEN]");
    expect(redacted).toContain("[REDACTED_PASSWORD]");
    expect(redacted).toContain("[REDACTED_COOKIE]");
  });
});
