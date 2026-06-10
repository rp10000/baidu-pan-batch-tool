import { describe, expect, it } from "vitest";
import { resolveActiveStorageMode } from "./StorageCapabilityService";

describe("resolveActiveStorageMode", () => {
  it("falls back to mock when bdpan wsl is requested but not connected", () => {
    expect(
      resolveActiveStorageMode({
        requestedMode: "bdpan_wsl",
        connectionOk: false,
        message: "bdpan CLI 未安装或 WSL 内不可用"
      })
    ).toEqual({
      activeMode: "mock",
      message: "bdpan CLI 未安装或 WSL 内不可用；bdpan WSL 高级模式不可用，当前回退 Mock"
    });
  });

  it("keeps Windows native official mode active while capabilities are unverified", () => {
    expect(
      resolveActiveStorageMode({
        requestedMode: "windows_native_official",
        connectionOk: false,
        message: "Windows 原生官方能力待验证"
      })
    ).toEqual({
      activeMode: "windows_native_official",
      message: "Windows 原生官方能力待验证"
    });
  });
});
