import { describe, expect, it } from "vitest";
import { classifyShareFailure, hasCliBusinessError, isInvalidWhoOutput } from "./ShareFailureClassifier";

describe("ShareFailureClassifier", () => {
  it("classifies Baidu server code 2", () => {
    expect(classifyShareFailure("创建分享链接失败: 远端服务器返回错误, 代码: 2").type).toBe("remote_server_code_2");
    expect(classifyShareFailure("创建分享链接失败: 远端服务器返回错误, 代码: 2").message).toBe("百度服务端拒绝创建分享，代码 2");
  });

  it("classifies login expiration outputs", () => {
    expect(classifyShareFailure("代码: -6, 消息: 请重新登录").type).toBe("login_required");
    expect(classifyShareFailure("代码: 31045, 消息: user not exists").type).toBe("login_required");
  });

  it("classifies common path and directory failures", () => {
    expect(classifyShareFailure("not absolute path").type).toBe("path_not_absolute");
    expect(classifyShareFailure("文件或目录不存在").type).toBe("path_not_found");
    expect(classifyShareFailure("目录为空").type).toBe("empty_directory");
    expect(classifyShareFailure("当前版本不支持分享目录").type).toBe("unsupported_directory_share");
    expect(classifyShareFailure("分享链接转存到网盘失败: 文件重复").type).toBe("duplicate_file");
    expect(classifyShareFailure("创建分享链接失败：missing_extract_code").type).toBe("missing_extract_code");
  });

  it("detects CLI semantic failure even when exit code is zero", () => {
    expect(hasCliBusinessError("获取目录失败: 远端服务器返回错误, 代码: 31045")).toBe(true);
    expect(hasCliBusinessError("ok")).toBe(false);
  });

  it("rejects BaiduPCS-Go who output with empty uid account", () => {
    expect(isInvalidWhoOutput("当前帐号 uid: 0, 用户名: , 性别: , 年龄: 0.0")).toBe(true);
    expect(isInvalidWhoOutput("uid: 123456\n用户名: 已脱敏")).toBe(false);
  });
});
