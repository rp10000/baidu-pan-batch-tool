import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatOAuthPreflightReport, runOAuthPreflight } from "../../scripts/oauth-preflight.mjs";

function createWorkspace() {
  const root = mkdtempSync(join(tmpdir(), "panjie-oauth-prep-"));
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, ".env.local.example"), "BAIDU_APP_KEY=\n", "utf8");
  writeFileSync(join(root, "docs", "user-input-required.md"), "# required\n", "utf8");
  writeFileSync(join(root, "docs", "test-assets-prep-checklist.md"), "# assets\n", "utf8");
  return root;
}

describe("oauth preflight", () => {
  it("marks the report incomplete when .env.local is missing", () => {
    const result = runOAuthPreflight({ repoRoot: createWorkspace(), writeReport: false });

    expect(result.status).toBe("incomplete");
    expect(result.missing).toContain(".env.local");
    expect(result.fields.BAIDU_APP_KEY).toBe("missing");
  });

  it("redacts configured secrets and test share data in the report", () => {
    const root = createWorkspace();
    writeFileSync(
      join(root, ".env.local"),
      [
        "BAIDU_APP_KEY=app-key-12345",
        "BAIDU_APP_SECRET=secret-67890",
        "BAIDU_REDIRECT_URI=http://127.0.0.1:53682/oauth/callback?debug=true",
        "BAIDU_OAUTH_SCOPE=basic,netdisk",
        "BAIDU_OAUTH_FORCE_LOGIN=1",
        "PANJIE_TEST_REMOTE_ROOT=盘姬测试",
        "PANJIE_TEST_CREATE_FOLDER=false",
        "PANJIE_TEST_CREATE_SHARE=false",
        "TEST_SHARE_URL=https://pan.baidu.com/s/1abcdef?pwd=A7K9",
        "TEST_SHARE_EXTRACT_CODE=A7K9"
      ].join("\n"),
      "utf8"
    );

    const result = runOAuthPreflight({ repoRoot: root, writeReport: false });
    const report = formatOAuthPreflightReport(result);

    expect(result.status).toBe("ready");
    expect(result.fields.BAIDU_APP_KEY).toBe("configured_redacted");
    expect(result.callbackMode).toBe("loopback");
    expect(report).toContain("BAIDU_APP_KEY: configured_redacted");
    expect(report).toContain("TEST_SHARE_URL: configured_redacted");
    expect(report).not.toContain("app-key-12345");
    expect(report).not.toContain("secret-67890");
    expect(report).not.toContain("pan.baidu.com/s/");
    expect(report).not.toContain("A7K9");
    expect(report).not.toContain("debug=true");
  });

  it("detects dangerous local files without reading their contents into the report", () => {
    const root = createWorkspace();
    writeFileSync(join(root, ".env.local"), "BAIDU_REDIRECT_URI=oob\n", "utf8");
    writeFileSync(join(root, "token.json"), "do-not-print-this", "utf8");
    writeFileSync(join(root, "ck.txt"), "do-not-print-this-either", "utf8");

    const result = runOAuthPreflight({ repoRoot: root, writeReport: false });
    const report = formatOAuthPreflightReport(result);

    expect(result.status).toBe("blocked");
    expect(result.dangerousFiles).toEqual(["token.json", "ck.txt"]);
    expect(report).toContain("token.json");
    expect(report).toContain("ck.txt");
    expect(report).not.toContain("do-not-print-this");
  });
});
