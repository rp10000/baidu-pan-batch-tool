import { describe, expect, it } from "vitest";
import { exportTasksToCsv } from "./exporter";

describe("exportTasksToCsv", () => {
  it("exports Chinese CSV with BOM and omits task error details", () => {
    const csv = exportTasksToCsv([
      {
        id: "task-1",
        sourceUrl: "https://pan.baidu.com/s/1abc",
        extractionCode: "12zx",
        status: "failed",
        targetPath: "/资料/文档",
        category: "documents",
        createdAt: "2026-06-10T00:00:00.000Z",
        updatedAt: "2026-06-10T00:00:00.000Z",
        error: "upstream rejected the request"
      }
    ]);

    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain("原链接");
    expect(csv).toContain("https://pan.baidu.com/s/1abc");
    expect(csv).not.toContain("upstream rejected the request");
    expect(csv).toContain("已省略");
  });
});
