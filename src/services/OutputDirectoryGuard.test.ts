import { describe, expect, it } from "vitest";
import { assertNonEmptyFinalShareDirectory, resolveFinalShareTarget } from "./OutputDirectoryGuard";

describe("OutputDirectoryGuard", () => {
  it("uses raw directory for original transfer", () => {
    const target = resolveFinalShareTarget({
      mode: "original",
      rawPath: "盘姬测试/panjie/raw/task-1",
      rawFileCount: 2,
      outputPath: "盘姬测试/panjie/output/task-1",
      outputFileCount: 0
    });

    expect(target).toEqual({ path: "盘姬测试/panjie/raw/task-1", fileCount: 2 });
  });

  it("blocks empty final share directories", () => {
    expect(() => assertNonEmptyFinalShareDirectory("盘姬测试/panjie/raw/empty", 0)).toThrow("输出目录为空");
    expect(() => resolveFinalShareTarget({
      mode: "scan_clean",
      rawPath: "盘姬测试/panjie/raw/task-1",
      rawFileCount: 0,
      cleanedPath: "盘姬测试/panjie/clean/task-1",
      cleanedFileCount: 0
    })).toThrow("输出目录为空");
  });

  it("uses cleaned copy only when it exists", () => {
    const target = resolveFinalShareTarget({
      mode: "scan_clean",
      rawPath: "盘姬测试/panjie/raw/task-1",
      rawFileCount: 2,
      outputPath: "盘姬测试/panjie/output/task-1",
      outputFileCount: 2,
      cleanedPath: "盘姬测试/panjie/clean/task-1",
      cleanedFileCount: 1
    });

    expect(target).toEqual({ path: "盘姬测试/panjie/clean/task-1", fileCount: 1 });
  });
});

