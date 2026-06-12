import { describe, expect, it } from "vitest";
import { parseBaiduPcsLoginHelp } from "./BaiduPcsLoginMethodProbe";

describe("BaiduPcsLoginMethodProbe", () => {
  it("detects supported login flags from BaiduPCS-Go help output", () => {
    expect(parseBaiduPcsLoginHelp("login --bduss value --stoken value --cookies value")).toEqual({
      bduss: true,
      stoken: true,
      cookies: true
    });
  });

  it("returns false for unsupported flags", () => {
    expect(parseBaiduPcsLoginHelp("login account password")).toEqual({
      bduss: false,
      stoken: false,
      cookies: false
    });
  });
});
