import { describe, expect, it } from "vitest";
import { formatSmokeReport, redactSensitiveText } from "../../scripts/bdpan-smoke.mjs";

describe("bdpan smoke report", () => {
  it("redacts share links, extract codes, and token-like fields", () => {
    const raw = [
      "url=https://pan.baidu.com/s/1abcdef?pwd=A7K9",
      "提取码: A7K9",
      `field=${"access" + "_token"}`
    ].join("\n");

    const redacted = redactSensitiveText(raw);

    expect(redacted).not.toContain("https://pan.baidu.com/s/1abcdef");
    expect(redacted).not.toContain("A7K9");
    expect(redacted).not.toContain("access" + "_token");
    expect(redacted).toContain("<redacted-share-url>");
    expect(redacted).toContain("<redacted-code>");
    expect(redacted).toContain("<redacted-field>");
  });

  it("formats skipped transfer without writing raw credentials", () => {
    const report = formatSmokeReport({
      generatedAt: "2026-06-10T14:00:00.000Z",
      environment: {
        wslAvailable: true,
        distro: "docker-desktop",
        node: "missing",
        npm: "missing",
        npx: "missing",
        bdpanPath: "",
        loginStatus: "unverified"
      },
      checks: [
        { name: "whoami", status: "fail", message: "bdpan unavailable" },
        { name: "transfer", status: "skipped", message: "TEST_SHARE_URL not provided" }
      ],
      hasTestShare: false,
      notes: ["WSL has no Node/npm/npx."]
    });

    expect(report).toContain("transfer | skipped");
    expect(report).toContain("shareUrl: <redacted>");
    expect(report).toContain("pwd: <redacted>");
    expect(report).not.toContain("pan.baidu.com/s/");
  });
});
