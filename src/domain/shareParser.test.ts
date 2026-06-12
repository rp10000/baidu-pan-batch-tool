import { describe, expect, it } from "vitest";
import { parseShareLinks } from "./shareParser";

describe("parseShareLinks", () => {
  it("parses Baidu links, extraction codes, duplicates, blank lines, invalid lines, and Chinese punctuation", () => {
    const inputs = parseShareLinks(`
https://pan.baidu.com/s/abc123
https://pan.baidu.com/s/def456 A7K9
https://pan.baidu.com/s/ghi789 提取码: B3L2
https://pan.baidu.com/s/ghi789 提取码: B3L2

not a url
链接：https://pan.baidu.com/s/cn001，提取码：9K2P
`);

    expect(inputs).toHaveLength(6);
    expect(inputs.filter((input) => input.valid)).toHaveLength(5);
    expect(inputs.filter((input) => input.duplicate)).toHaveLength(1);
    expect(inputs.filter((input) => !input.valid)).toHaveLength(1);
    expect(inputs[0]).toMatchObject({ url: "https://pan.baidu.com/s/abc123", valid: true });
    expect(inputs[1]).toMatchObject({ extractCode: "A7K9", valid: true });
    expect(inputs[2]).toMatchObject({ extractCode: "B3L2", valid: true, duplicate: false });
    expect(inputs[3]).toMatchObject({ extractCode: "B3L2", valid: true, duplicate: true });
    expect(inputs[4]).toMatchObject({ url: "", valid: false, error: "未识别到有效百度网盘链接" });
    expect(inputs[5]).toMatchObject({ url: "https://pan.baidu.com/s/cn001", extractCode: "9K2P" });
  });

  it("groups common Baidu share text into one valid input instead of invalid metadata lines", () => {
    const inputs = parseShareLinks(`
我通过百度网盘分享的文件：课程资料
链接：https://pan.baidu.com/s/1abcDEFghi
提取码：7xYz
复制这段内容后打开百度网盘手机App，操作更方便哦`);

    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({
      url: "https://pan.baidu.com/s/1abcDEFghi",
      extractCode: "7xYz",
      valid: true,
      duplicate: false
    });
  });

  it("extracts codes from pwd query params and keeps clearly invalid free-form lines invalid", () => {
    const inputs = parseShareLinks(`
https://pan.baidu.com/s/1abcDEF?pwd=a1b2
not a url
`);

    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toMatchObject({ extractCode: "a1b2", valid: true });
    expect(inputs[1]).toMatchObject({ valid: false, error: "未识别到有效百度网盘链接" });
  });

  it("ignores non-Baidu share hosts", () => {
    const inputs = parseShareLinks("https://pan.example.com/s/abc123 A7K9");

    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({ valid: false });
  });
});
