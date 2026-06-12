import { describe, expect, it } from "vitest";
import { parseShareLinks } from "./shareParser";

describe("parseShareLinks Baidu standard text", () => {
  it("extracts one link and pwd code from a standard Baidu share paragraph", () => {
    const inputs = parseShareLinks(`
通过网盘分享的文件：
链接: https://pan.baidu.com/s/1GosxMsrCpZrAo85ZcYIRCQ?pwd=d6ea 提取码: d6ea 复制这段内容后打开百度网盘手机App，操作更方便哦
--来自百度网盘超级会员v9的分享
`);

    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({
      url: "https://pan.baidu.com/s/1GosxMsrCpZrAo85ZcYIRCQ?pwd=d6ea",
      extractCode: "d6ea",
      explicitExtractCode: "d6ea",
      codeConflict: false,
      valid: true,
      duplicate: false
    });
  });

  it("supports bare pan.baidu.com links and next-line extraction codes", () => {
    const inputs = parseShareLinks(`
pan.baidu.com/s/1bareLink?pwd=8q2m
提取码 9abc
链接：https://pan.baidu.com/s/1another
提取码：Z7xK
`);

    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toMatchObject({
      url: "https://pan.baidu.com/s/1bareLink?pwd=8q2m",
      extractCode: "8q2m"
    });
    expect(inputs[1]).toMatchObject({
      url: "https://pan.baidu.com/s/1another",
      extractCode: "Z7xK"
    });
  });

  it("prefers pwd when explicit extraction code conflicts", () => {
    const inputs = parseShareLinks("链接: https://pan.baidu.com/s/1abc?pwd=d6ea 提取码: 1234");

    expect(inputs[0]).toMatchObject({
      extractCode: "d6ea",
      explicitExtractCode: "1234",
      codeConflict: true
    });
  });
});

