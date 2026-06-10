import { describe, expect, it } from "vitest";
import { applyRenameRule } from "./renameRule";

describe("applyRenameRule", () => {
  it("applies Chinese placeholders, pads index, and keeps the original extension", () => {
    expect(
      applyRenameRule({
        originalName: "01.课程先导片.mp4",
        category: "学习资料",
        date: "20240519",
        index: 1,
        rule: "{分类}_{日期}_{序号}"
      })
    ).toBe("学习资料_20240519_001.mp4");
  });

  it("removes Windows filename separators and illegal characters", () => {
    expect(
      applyRenameRule({
        originalName: '课:程/导?入".pdf',
        category: "文档<资料>",
        date: "20260610",
        index: 12,
        rule: "{分类}_{原文件名}_{序号}"
      })
    ).toBe("文档_资料__课_程_导_入__012.pdf");
  });

  it("truncates long filenames while preserving the extension", () => {
    const result = applyRenameRule({
      originalName: `${"很长".repeat(90)}.zip`,
      category: "压缩包",
      date: "20260610",
      index: 2,
      rule: "{分类}_{原文件名}_{日期}_{序号}"
    });

    expect(result.length).toBeLessThanOrEqual(160);
    expect(result.endsWith(".zip")).toBe(true);
  });
});
