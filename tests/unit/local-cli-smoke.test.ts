import { describe, expect, it } from "vitest";
import { BaiduPcsGoAdapter } from "../../src/adapters/BaiduPcsGoAdapter";
import { runLocalCliSmoke } from "../../src/services/LocalCliSmokeService";
import type { LocalCliCommand, LocalCliCommandResult, LocalCliCommandRunner } from "../../src/services/LocalCliCommandRunner";

class FakeLocalCliRunner implements LocalCliCommandRunner {
  constructor(private readonly scenario: "missing" | "manual_cookie" | "not_logged_in" | "unsupported" | "complete") {}

  async run(command: LocalCliCommand): Promise<LocalCliCommandResult> {
    if (this.scenario === "missing") {
      return { exitCode: 127, stdout: "", stderr: "not found" };
    }
    if (command.args.includes("--version")) {
      return { exitCode: 0, stdout: "BaiduPCS-Go version v4.0.1", stderr: "" };
    }
    if (command.args[0] === "help") {
      return { exitCode: 0, stdout: "login ls mkdir upload mv share transfer quota", stderr: "" };
    }
    if (command.args[0] === "login" && this.scenario === "manual_cookie") {
      return { exitCode: 2, stdout: "", stderr: "manual cookie required" };
    }
    if (command.args[0] === "who" && this.scenario === "not_logged_in") {
      return { exitCode: 1, stdout: "", stderr: "未登录" };
    }
    if (command.args[0] === "transfer" && this.scenario === "unsupported") {
      return { exitCode: 3, stdout: "", stderr: "unsupported transfer" };
    }
    if (command.args[0] === "share" && this.scenario === "unsupported") {
      return { exitCode: 3, stdout: "", stderr: "unsupported share" };
    }
    if (command.args[0] === "share") {
      return {
        exitCode: 0,
        stdout: "分享链接: https://pan.baidu.com/s/1fake-smoke-share?pwd=9abc\n提取码: 9abc",
        stderr: ""
      };
    }
    return { exitCode: 0, stdout: "ok", stderr: "" };
  }
}

describe("local cli smoke service", () => {
  it("reports cli missing without throwing", async () => {
    const result = await runLocalCliSmoke(new BaiduPcsGoAdapter(new FakeLocalCliRunner("missing")));

    expect(result.status).toBe("diagnostic");
    expect(result.checks.find((item) => item.name === "version")?.status).toBe("fail");
  });

  it("marks manual credential cli as high risk manual only", async () => {
    const result = await runLocalCliSmoke(new BaiduPcsGoAdapter(new FakeLocalCliRunner("manual_cookie")), { tryLogin: true });

    expect(result.status).toBe("manual_auth_required");
    expect(result.riskLevel).toBe("high_manual_cookie_only");
  });

  it("reports unsupported transfer and share without fake success", async () => {
    const adapter = new BaiduPcsGoAdapter(new FakeLocalCliRunner("unsupported"));
    const transfer = await adapter.transferSharedLink({ url: "https://example.invalid/share", extractCode: "0000", targetDirectory: "盘姬测试" });
    const share = await adapter.createShareLink({ remotePaths: ["盘姬测试/file.txt"], periodDays: 7 });

    expect(transfer.ok).toBe(false);
    expect(transfer.error).toContain("不支持");
    expect(share.ok).toBe(false);
    expect(share.error).toContain("不支持");
  });

  it("runs a fake complete smoke flow", async () => {
    const result = await runLocalCliSmoke(new BaiduPcsGoAdapter(new FakeLocalCliRunner("complete")), {
      hasTestShare: true,
      tryLogin: false
    });

    expect(result.status).toBe("pass");
    expect(result.checks.map((item) => item.status)).not.toContain("fail");
    expect(result.checks.find((item) => item.name === "share")?.status).toBe("pass");
  });
});
