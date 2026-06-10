import { describe, expect, it } from "vitest";
import { ADAPTER_MODE_OPTIONS, CAPABILITY_MATRIX, getAdapterModeMeta } from "./adapterMode";

describe("adapter modes", () => {
  it("puts Windows native official mode first and marks bdpan as advanced", () => {
    expect(ADAPTER_MODE_OPTIONS.map((mode) => mode.mode)).toEqual([
      "windows_native_official",
      "windows_local_cli",
      "baidu_mcp",
      "baidu_sdk",
      "bdpan_wsl",
      "mock"
    ]);
    expect(getAdapterModeMeta("windows_native_official").badge).toBe("推荐");
    expect(getAdapterModeMeta("bdpan_wsl").badge).toBe("高级");
    expect(getAdapterModeMeta("mock").badge).toBe("演示");
  });

  it("keeps share-link transfer unverified in native modes and wsl-only in bdpan mode", () => {
    expect(CAPABILITY_MATRIX.transferSharedLink.windows_native_official).toBe("needs_official_verification");
    expect(CAPABILITY_MATRIX.transferSharedLink.baidu_mcp).toBe("needs_official_verification");
    expect(CAPABILITY_MATRIX.transferSharedLink.baidu_sdk).toBe("needs_official_verification");
    expect(CAPABILITY_MATRIX.transferSharedLink.bdpan_wsl).toBe("wsl_only");
    expect(CAPABILITY_MATRIX.transferSharedLink.mock).toBe("mock_only");
  });
});
