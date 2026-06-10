import { describe, expect, it } from "vitest";
import { resolveActiveStorageMode } from "./StorageCapabilityService";

describe("resolveActiveStorageMode", () => {
  it("falls back to mock when bdpan cli is requested but not connected", () => {
    expect(
      resolveActiveStorageMode({
        requestedMode: "bdpan_cli",
        connectionOk: false,
        message: "bdpan CLI 未安装或 WSL 内不可用"
      })
    ).toEqual({
      activeMode: "mock",
      message: "bdpan CLI 未安装或 WSL 内不可用；当前回退 Mock"
    });
  });

  it("keeps bdpan cli active when connection is ok", () => {
    expect(
      resolveActiveStorageMode({
        requestedMode: "bdpan_cli",
        connectionOk: true,
        message: "bdpan CLI 已连接"
      })
    ).toEqual({
      activeMode: "bdpan_cli",
      message: "bdpan CLI 已连接"
    });
  });
});
