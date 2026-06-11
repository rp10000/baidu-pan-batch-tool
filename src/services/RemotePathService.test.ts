import { describe, expect, it } from "vitest";
import {
  assertCliAbsolutePath,
  joinRemotePath,
  normalizeRemotePath,
  toCliAbsolutePath,
  toDisplayPath
} from "./RemotePathService";

describe("RemotePathService", () => {
  it("converts panjie relative paths to BaiduPCS-Go absolute paths", () => {
    expect(toCliAbsolutePath("panjie/output/x")).toBe("/盘姬测试/panjie/output/x");
  });

  it("keeps already absolute panjie test paths without duplicating the root", () => {
    expect(toCliAbsolutePath("/盘姬测试/panjie/output/x")).toBe("/盘姬测试/panjie/output/x");
    expect(toCliAbsolutePath("盘姬测试/panjie/output/x")).toBe("/盘姬测试/panjie/output/x");
  });

  it("normalizes and joins remote path segments", () => {
    expect(normalizeRemotePath("\\盘姬测试//panjie/output/")).toBe("/盘姬测试/panjie/output");
    expect(joinRemotePath("盘姬测试", "panjie", "output", "x")).toBe("盘姬测试/panjie/output/x");
  });

  it("keeps display paths relative to the visible pan root", () => {
    expect(toDisplayPath("/盘姬测试/panjie/output/x")).toBe("盘姬测试/panjie/output/x");
  });

  it("rejects relative CLI execution paths", () => {
    expect(() => assertCliAbsolutePath("panjie/output/x")).toThrow("绝对网盘路径");
    expect(assertCliAbsolutePath("/盘姬测试/panjie/output/x")).toBe("/盘姬测试/panjie/output/x");
  });
});
