import { describe, expect, it } from "vitest";
import { buildLocalCliRuntimeSnapshot, isLoggedInAccount, parseWhoOutput } from "./LocalCliRuntimeService";

describe("LocalCliRuntimeService", () => {
  it("treats uid 0 and empty username as not logged in even when who exits zero", () => {
    const snapshot = buildLocalCliRuntimeSnapshot({
      bridgeOnline: true,
      cliPath: "BaiduPCS-Go.exe",
      version: { exitCode: 0, stdout: "BaiduPCS-Go version v4.0.1", stderr: "" },
      who: { exitCode: 0, stdout: "当前帐号 uid: 0, 用户名: , 性别: , 年龄: 0.0", stderr: "" },
      quota: { exitCode: 1, stdout: "", stderr: "代码: 31045, 消息: user not exists" },
      rootList: { exitCode: 1, stdout: "", stderr: "请尝试重新登录" }
    });

    expect(snapshot.cliInstalled).toBe(true);
    expect(snapshot.loginState).toBe("not_logged_in");
    expect(snapshot.message).toContain("未登录");
  });

  it("requires a valid uid and username or quota before marking logged in", () => {
    expect(isLoggedInAccount({ uid: "10001" })).toBe(false);
    expect(isLoggedInAccount({ uid: "10001", username: "masked" })).toBe(true);
    expect(isLoggedInAccount({ uid: "10001", quotaTotal: "2 TB" }, { exitCode: 0 })).toBe(true);
    expect(isLoggedInAccount({ uid: "0", username: "masked" })).toBe(false);
  });

  it("preserves embedded cli source in runtime snapshots", () => {
    const snapshot = buildLocalCliRuntimeSnapshot({
      bridgeOnline: true,
      cliPath: "C:/Program Files/Panjie/resources/bin/BaiduPCS-Go/BaiduPCS-Go.exe",
      cliSource: "embedded",
      version: { exitCode: 0, stdout: "BaiduPCS-Go version v4.0.1", stderr: "" },
      who: { exitCode: 1, stdout: "", stderr: "not logged in" },
      quota: { exitCode: 1, stdout: "", stderr: "not logged in" },
      rootList: { exitCode: 1, stdout: "", stderr: "not logged in" }
    });

    expect(snapshot.cliSource).toBe("embedded");
    expect(snapshot.cliInstalled).toBe(true);
  });

  it("parses Chinese and English account names", () => {
    expect(parseWhoOutput("当前帐号 uid: 12345, 用户名: demo_user, 性别: ")).toMatchObject({
      uid: "12345",
      username: "demo_user"
    });
    expect(parseWhoOutput("uid: 12345, username: masked")).toMatchObject({
      uid: "12345",
      username: "masked"
    });
  });
});
