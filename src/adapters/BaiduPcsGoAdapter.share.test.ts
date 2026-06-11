import { describe, expect, it } from "vitest";
import { BaiduPcsGoAdapter } from "./BaiduPcsGoAdapter";
import { parseBaiduShareOutput } from "./GenericBaiduCliAdapter";
import type { LocalCliCommand, LocalCliCommandResult, LocalCliCommandRunner } from "../services/LocalCliCommandRunner";

class FakeShareRunner implements LocalCliCommandRunner {
  constructor(private readonly output: LocalCliCommandResult) {}

  async run(command: LocalCliCommand): Promise<LocalCliCommandResult> {
    if (command.args[0] !== "share") {
      return { exitCode: 0, stdout: "ok", stderr: "" };
    }
    return this.output;
  }
}

describe("BaiduPcsGoAdapter share parsing", () => {
  it("parses a standard share link and extract code", async () => {
    const adapter = new BaiduPcsGoAdapter(new FakeShareRunner({
      exitCode: 0,
      stdout: [
        "分享成功",
        "链接: https://pan.baidu.com/s/1unitfake?pwd=9abc",
        "提取码: 9abc"
      ].join("\n"),
      stderr: ""
    }));

    const result = await adapter.createShareLink({ remotePaths: ["/盘姬测试/ok"], periodDays: 7 });

    expect(result).toMatchObject({
      ok: true,
      source: "local_cli",
      shareUrl: "https://pan.baidu.com/s/1unitfake?pwd=9abc",
      extractCode: "9abc",
      verified: true
    });
  });

  it("fails when command output contains no usable link", async () => {
    const adapter = new BaiduPcsGoAdapter(new FakeShareRunner({
      exitCode: 0,
      stdout: "BaiduPCS-Go share set help text only",
      stderr: ""
    }));

    const result = await adapter.createShareLink({ remotePaths: ["/盘姬测试/help"], periodDays: 7 });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("未解析到真实分享链接");
  });

  it("fails when output contains an error even with exit code zero", async () => {
    const adapter = new BaiduPcsGoAdapter(new FakeShareRunner({
      exitCode: 0,
      stdout: "创建分享链接失败: 远端服务器返回错误, 代码: 2",
      stderr: ""
    }));

    const result = await adapter.createShareLink({ remotePaths: ["/盘姬测试/fail"], periodDays: 7 });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("百度服务端拒绝创建分享");
  });

  it("keeps the parser independent for multi-line Chinese output", () => {
    expect(parseBaiduShareOutput("分享成功\n分享链接：https://pan.baidu.com/s/1multi\n提取码：a1B2")).toMatchObject({
      shareUrl: "https://pan.baidu.com/s/1multi",
      extractCode: "a1B2",
      failed: false
    });
  });
});
