import { describe, expect, it } from "vitest";
import { parseShareImports } from "./importParser";

describe("parseShareImports", () => {
  it("extracts share links, extraction codes, notes, and duplicate rows", () => {
    const result = parseShareImports(`
      链接: https://pan.baidu.com/s/1abcDEF 提取码: 12zx 备注: 课程A
      https://pan.baidu.com/share/init?surl=AbCdEF 提取码：abcd
      https://pan.baidu.com/s/1abcDEF 密码 12zx
    `);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      url: "https://pan.baidu.com/s/1abcDEF",
      extractionCode: "12zx",
      note: "课程A"
    });
    expect(result.items[1]).toMatchObject({
      url: "https://pan.baidu.com/share/init?surl=AbCdEF",
      extractionCode: "abcd"
    });
    expect(result.duplicates).toEqual([
      expect.objectContaining({ firstLine: 2, duplicateLine: 4 })
    ]);
    expect(result.errors).toHaveLength(0);
  });

  it("reports invalid rows without creating tasks", () => {
    const result = parseShareImports("这不是网盘链接");

    expect(result.items).toHaveLength(0);
    expect(result.errors).toEqual([
      expect.objectContaining({ line: 1, reason: "missing_baidu_pan_url" })
    ]);
  });
});
