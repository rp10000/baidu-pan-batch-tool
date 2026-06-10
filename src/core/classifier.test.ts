import { describe, expect, it } from "vitest";
import { classifyRemoteFile, createDefaultClassificationRules } from "./classifier";

describe("classifyRemoteFile", () => {
  const rules = createDefaultClassificationRules();

  it.each([
    ["合同模板.pdf", "documents"],
    ["封面图.PNG", "images"],
    ["培训视频.mp4", "videos"],
    ["课程资料.zip", "archives"],
    ["setup.exe", "software"],
    ["录音.m4a", "audio"]
  ])("classifies %s as %s", (name, expected) => {
    expect(classifyRemoteFile({ name, isDir: false, size: 1024 }, rules).category).toBe(expected);
  });

  it("uses keyword rules before extension rules", () => {
    expect(classifyRemoteFile({ name: "AI课程资料.pdf", isDir: false, size: 100 }, rules).category).toBe("courses");
  });

  it("falls back to uncategorized when no rule matches", () => {
    expect(classifyRemoteFile({ name: "unknown.bin", isDir: false, size: 100 }, rules).category).toBe("uncategorized");
  });
});
