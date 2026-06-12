import { describe, expect, it } from "vitest";
import { generateShareMessage } from "./ShareMessageTemplateService";

describe("ShareMessageTemplateService", () => {
  it("generates the default Xiaohongshu virtual delivery message", () => {
    const message = generateShareMessage({
      template: { type: "xiaohongshu_virtual", title: "课程资料包" },
      shareResult: {
        source: "local_cli",
        shareUrl: "https://pan.baidu.com/s/1real?pwd=9abc",
        extractCode: "9abc",
        verified: true,
        redactedForLog: "<redacted-share-url>"
      },
      fileCount: 3
    });

    expect(message).toContain("【课程资料包】");
    expect(message).toContain("网盘链接：https://pan.baidu.com/s/1real?pwd=9abc");
    expect(message).toContain("提取码：9abc");
    expect(message).toContain("链接有效期为永久");
  });

  it("renders custom templates with supported placeholders", () => {
    const message = generateShareMessage({
      template: {
        type: "custom",
        title: "素材",
        storeName: "盘姬小店",
        orderNo: "P001",
        note: "售后补发",
        customTemplate: "{storeName} {orderNo} {title} {fileCount} {shareUrl} {extractCode} {note}"
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

    expect(message).toBe("盘姬小店 P001 素材 5 https://pan.baidu.com/s/1real?pwd=8q2m 8q2m 售后补发");
  });
});
