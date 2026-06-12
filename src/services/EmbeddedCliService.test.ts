import { describe, expect, it } from "vitest";
import { cliSourceLabel, resolveEmbeddedBaiduPcsGoPath } from "./EmbeddedCliService";

describe("EmbeddedCliService", () => {
  it("prioritizes packaged embedded BaiduPCS-Go before development tools paths", () => {
    const candidates = resolveEmbeddedBaiduPcsGoPath({
      resourcesPath: "C:/Program Files/Panjie/resources",
      appPath: "C:/Program Files/Panjie/resources/app.asar",
      cwd: "D:/repo"
    });

    expect(candidates[0]).toEqual({
      path: "C:/Program Files/Panjie/resources/bin/BaiduPCS-Go/BaiduPCS-Go.exe",
      source: "embedded"
    });
    expect(candidates.at(-1)?.path).toContain("tools/baidu-cli/BaiduPCS-Go");
  });

  it("labels cli sources for the settings UI", () => {
    expect(cliSourceLabel("embedded")).toBe("应用内置");
    expect(cliSourceLabel("path")).toBe("系统 PATH");
    expect(cliSourceLabel("missing")).toBe("缺失");
  });
});
