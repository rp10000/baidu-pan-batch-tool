import { describe, expect, it, vi } from "vitest";
import { openShareLinkForVerification, verifyShareResult } from "./ShareVerificationService";

describe("ShareVerificationService", () => {
  it("accepts valid Baidu share links", () => {
    expect(verifyShareResult({
      source: "local_cli",
      shareUrl: "https://pan.baidu.com/s/1valid?pwd=9abc",
      extractCode: "9abc"
    })).toBe("format_valid");
  });

  it("rejects redacted, mock, example, and malformed values", () => {
    expect(verifyShareResult({ source: "local_cli", shareUrl: "<redacted-share-url>", extractCode: "9abc" })).toBe("redacted_value");
    expect(verifyShareResult({ source: "mock", shareUrl: "https://pan.baidu.com/s/mock-demo", extractCode: "9abc" })).toBe("redacted_value");
    expect(verifyShareResult({ source: "local_cli", shareUrl: "https://example.com/s/1abc", extractCode: "9abc" })).toBe("redacted_value");
    expect(verifyShareResult({ source: "local_cli", shareUrl: "not a url", extractCode: "9abc" })).toBe("invalid_format");
  });

  it("requires an extract code unless the URL embeds one", () => {
    expect(verifyShareResult({ source: "local_cli", shareUrl: "https://pan.baidu.com/s/1valid" })).toBe("missing_extract_code");
    expect(verifyShareResult({ source: "local_cli", shareUrl: "https://pan.baidu.com/s/1valid?pwd=9abc" })).toBe("format_valid");
  });

  it("opens valid links through the browser API only after format validation", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    expect(openShareLinkForVerification({
      source: "local_cli",
      shareUrl: "https://pan.baidu.com/s/1valid?pwd=9abc",
      extractCode: "9abc"
    })).toBe("opened_in_browser");
    expect(open).toHaveBeenCalledOnce();

    expect(openShareLinkForVerification({ source: "mock", shareUrl: "https://pan.baidu.com/s/mock-demo", extractCode: "9abc" })).toBe("redacted_value");
    expect(open).toHaveBeenCalledOnce();

    open.mockRestore();
  });
});
