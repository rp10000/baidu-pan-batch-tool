import { describe, expect, it } from "vitest";
import { parseShareLinks } from "./shareParser";

describe("parseShareLinks", () => {
  it("parses links, extraction codes, duplicates, blank lines, invalid lines, and Chinese punctuation", () => {
    const inputs = parseShareLinks(`
https://pan.example.com/s/abc123
https://pan.example.com/s/def456 A7K9
https://pan.example.com/s/ghi789 提取码: B3L2
https://pan.example.com/s/ghi789 提取码: B3L2

not a url
链接：https://pan.example.com/s/cn001，提取码：9K2P
`);

    expect(inputs).toHaveLength(6);
    expect(inputs.filter((input) => input.valid)).toHaveLength(5);
    expect(inputs.filter((input) => input.duplicate)).toHaveLength(1);
    expect(inputs.filter((input) => !input.valid)).toHaveLength(1);
    expect(inputs[0]).toMatchObject({ url: "https://pan.example.com/s/abc123", valid: true });
    expect(inputs[1]).toMatchObject({ extractCode: "A7K9", valid: true });
    expect(inputs[2]).toMatchObject({ extractCode: "B3L2", valid: true, duplicate: false });
    expect(inputs[3]).toMatchObject({ extractCode: "B3L2", valid: true, duplicate: true });
    expect(inputs[4]).toMatchObject({ url: "", valid: false, error: "未识别到有效链接" });
    expect(inputs[5]).toMatchObject({ url: "https://pan.example.com/s/cn001", extractCode: "9K2P" });
  });
});
