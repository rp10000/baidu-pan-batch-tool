import { describe, expect, it } from "vitest";
import { BaiduPcsGoAdapter } from "./BaiduPcsGoAdapter";
import type { LocalCliCommand, LocalCliCommandResult, LocalCliCommandRunner } from "../services/LocalCliCommandRunner";

class ScenarioRunner implements LocalCliCommandRunner {
  readonly calls: string[][] = [];

  constructor(private readonly handler: (command: LocalCliCommand) => LocalCliCommandResult) {}

  async run(command: LocalCliCommand): Promise<LocalCliCommandResult> {
    this.calls.push(command.args);
    return this.handler(command);
  }
}

function ok(stdout: string): LocalCliCommandResult {
  return { exitCode: 0, stdout, stderr: "" };
}

describe("BaiduPcsGoAdapter share command behavior", () => {
  it("uses share set with absolute paths and parses a real link", async () => {
    const runner = new ScenarioRunner(() => ok("分享链接: https://pan.baidu.com/s/1real?pwd=abcd\n提取码: abcd"));
    const adapter = new BaiduPcsGoAdapter(runner);

    const result = await adapter.createShareLink({ remotePaths: ["panjie/output/task"], periodDays: 7 });

    expect(runner.calls[0]).toEqual(["share", "set", "--period", "7", "-f", "/盘姬测试/panjie/output/task"]);
    expect(result).toMatchObject({ ok: true, shareUrl: "https://pan.baidu.com/s/1real?pwd=abcd", extractCode: "abcd" });
  });

  it("classifies Baidu server code 2 as share failure", async () => {
    const runner = new ScenarioRunner(() => ok("创建分享链接失败: 创建分享链接: 遇到错误, 远端服务器返回错误, 代码: 2"));
    const adapter = new BaiduPcsGoAdapter(runner);

    const result = await adapter.createShareLink({ remotePaths: ["/盘姬测试/panjie/output/task"], periodDays: 7 });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("百度服务端拒绝创建分享，代码 2");
  });

  it("classifies empty directory share failure", async () => {
    const runner = new ScenarioRunner(() => ok("创建分享链接失败: 目录为空"));
    const adapter = new BaiduPcsGoAdapter(runner);

    const result = await adapter.createShareLink({ remotePaths: ["/盘姬测试/panjie/output/empty"], periodDays: 7 });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("目录为空");
  });

  it("fails when share set and share list both contain no link", async () => {
    const runner = new ScenarioRunner(() => ok("分享命令执行完成，但没有输出链接"));
    const adapter = new BaiduPcsGoAdapter(runner);

    const result = await adapter.createShareLink({ remotePaths: ["/盘姬测试/panjie/output/no-link"], periodDays: 7 });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("未解析到真实分享链接");
  });

  it("uses share list as fallback when share set has no parseable link", async () => {
    const runner = new ScenarioRunner((command) => {
      if (command.args.join(" ") === "share list") {
        return ok("已有分享 https://pan.baidu.com/s/1fromlist?pwd=wxyz 提取码: wxyz");
      }
      return ok("创建成功，但链接稍后在列表中显示");
    });
    const adapter = new BaiduPcsGoAdapter(runner);

    const result = await adapter.createShareLink({ remotePaths: ["/盘姬测试/panjie/output/task"], periodDays: 7 });

    expect(runner.calls).toContainEqual(["share", "list"]);
    expect(result).toMatchObject({ ok: true, shareUrl: "https://pan.baidu.com/s/1fromlist?pwd=wxyz", extractCode: "wxyz" });
  });

  it("rejects share command argument errors", async () => {
    const runner = new ScenarioRunner(() => ({ exitCode: 2, stdout: "", stderr: "flag provided but not defined" }));
    const adapter = new BaiduPcsGoAdapter(runner);

    const result = await adapter.createShareLink({ remotePaths: ["/盘姬测试/panjie/output/task"], periodDays: 7 });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("flag provided");
  });
});
