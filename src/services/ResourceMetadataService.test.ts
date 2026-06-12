import { describe, expect, it } from "vitest";
import {
  buildResourceTransferDirectory,
  classifyResource,
  extractResourceTitleFromShareText,
  sanitizeResourceTaskName
} from "./ResourceMetadataService";

describe("ResourceMetadataService", () => {
  it("extracts a Chinese resource title from standard Baidu share text", () => {
    const rawText = [
      "通过网盘分享的文件：AI绘画教程资料包",
      "链接: https://pan.baidu.com/s/1abc123?pwd=9k8m",
      "提取码: 9k8m"
    ].join("\n");

    expect(extractResourceTitleFromShareText(rawText)).toBe("AI绘画教程资料包");
  });

  it("classifies the whole share resource instead of moving individual files", () => {
    const metadata = classifyResource({
      rawText: "通过网盘分享的文件：AI绘画课程训练营",
      files: [
        { name: "第01课-入门.mp4", isDirectory: false },
        { name: "课程讲义.pdf", isDirectory: false }
      ]
    });

    expect(metadata.title).toBe("AI绘画课程训练营");
    expect(metadata.contentCategory).toBe("课程资料");
    expect(metadata.contentSummary).toContain("2 个文件");
    expect(metadata.checkStatus).toBe("unchecked");
  });

  it("builds the formal resource library save path with a safe Chinese task name", () => {
    expect(sanitizeResourceTaskName('AI绘画:课程/资料包?')).toBe("AI绘画课程资料包");
    expect(
      buildResourceTransferDirectory({
        createdAt: "2026-06-12T04:00:00.000Z",
        title: 'AI绘画:课程/资料包?',
        existingNames: ["AI绘画课程资料包"]
      })
    ).toEqual({
      displayPath: "盘姬资源库/转存记录/2026-06-12/AI绘画课程资料包-002",
      cliPath: "/盘姬资源库/转存记录/2026-06-12/AI绘画课程资料包-002",
      title: "AI绘画课程资料包-002"
    });
  });
});
