import { describe, expect, it } from "vitest";
import { CleanCopyService } from "./CleanCopyService";

describe("CleanCopyService", () => {
  it("creates a text clean copy without mutating original content", () => {
    const service = new CleanCopyService();
    const original = "第一行\n访问 https://example.com\n电话 13812345678\n保留内容";
    const result = service.cleanText(original);

    expect(original).toContain("https://example.com");
    expect(result.cleanedContent).not.toContain("https://example.com");
    expect(result.cleanedContent).toContain("保留内容");
    expect(result.strategy).toBe("remove_risk_lines");
  });
});
