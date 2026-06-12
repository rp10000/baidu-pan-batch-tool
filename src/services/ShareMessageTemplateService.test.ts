import { describe, expect, it } from "vitest";
import { generateShareMessage } from "./ShareMessageTemplateService";

describe("ShareMessageTemplateService", () => {
  it("generates the default Xiaohongshu virtual delivery message", () => {
    const message = generateShareMessage({
      task: {
        createdAt: "2026-06-12T04:00:00.000Z",
        finalShareFileCount: 3,
        shareResult: undefined,
        shareTemplateType: "xiaohongshu_virtual",
        resource: {
          title: "AI绘画教程资料包",
          contentCategory: "课程资料",
          contentSummary: "课程资料，共 3 个文件，原样转存，文件名和目录结构保持不变。",
          checkStatus: "unchecked",
          savePath: "盘姬资源库/转存记录/2026-06-12/AI绘画教程资料包",
          classificationConfidence: 0.76,
          classificationSource: "share_text"
        }
      },
      template: { type: "xiaohongshu_virtual", title: "资料包" },
      shareResult: {
        source: "local_cli",
        shareUrl: "https://pan.baidu.com/s/1real?pwd=9abc",
        extractCode: "9abc",
        verified: true,
        redactedForLog: "<redacted-share-url>"
      },
      fileCount: 3
    });

    expect(message).toContain("【AI绘画教程资料包】");
    expect(message).toContain("分类：课程资料");
    expect(message).toContain("内容：课程资料，共 3 个文件");
    expect(message).toContain("网盘链接：https://pan.baidu.com/s/1real?pwd=9abc");
    expect(message).toContain("提取码：9abc");
    expect(message).toContain("有效期：永久有效");
  });

  it("renders custom templates with supported placeholders", () => {
    const message = generateShareMessage({
      template: {
        type: "custom",
        title: "素材",
        storeName: "盘姬小店",
        orderNo: "P001",
        note: "售后补发",
        customTemplate: "{storeName} {orderNo} {title} {contentCategory} {fileCount} {shareUrl} {extractCode} {note}"
      },
      shareResult: {
        source: "local_cli",
        shareUrl: "https://pan.baidu.com/s/1real?pwd=8q2m",
        extractCode: "8q2m",
        verified: true,
        redactedForLog: "<redacted-share-url>"
      },
      fileCount: 5
    });

    expect(message).toBe("盘姬小店 P001 素材 未识别 5 https://pan.baidu.com/s/1real?pwd=8q2m 8q2m 售后补发");
  });
});
