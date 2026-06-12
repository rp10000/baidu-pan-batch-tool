import { describe, expect, it } from "vitest";
import { BaiduPcsGoAdapter } from "./BaiduPcsGoAdapter";
import type { LocalCliCommand, LocalCliCommandResult, LocalCliCommandRunner } from "../services/LocalCliCommandRunner";

class RecordingRunner implements LocalCliCommandRunner {
  readonly calls: string[][] = [];

  async run(command: LocalCliCommand): Promise<LocalCliCommandResult> {
    this.calls.push(command.args);
    if (command.args[0] === "share") {
      return {
        exitCode: 0,
        stdout: "分享成功\n链接: https://pan.baidu.com/s/1pathfake?pwd=9abc\n提取码: 9abc",
        stderr: ""
      };
    }
    if (command.args[0] === "ls") {
      return { exitCode: 0, stdout: "hello.txt", stderr: "" };
    }
    return { exitCode: 0, stdout: "ok", stderr: "" };
  }
}

describe("BaiduPcsGoAdapter path normalization", () => {
  it("passes absolute paths to share even when callers use display paths", async () => {
    const runner = new RecordingRunner();
    const adapter = new BaiduPcsGoAdapter(runner);

    await adapter.createShareLink({ remotePaths: ["panjie/output/x"], periodDays: 0 });

    expect(runner.calls.at(-1)).toEqual(["share", "set", "--period", "0", "-f", "/盘姬测试/panjie/output/x"]);
  });

  it("passes absolute paths to move and rename", async () => {
    const runner = new RecordingRunner();
    const adapter = new BaiduPcsGoAdapter(runner);

    await adapter.moveFile({ remotePath: "panjie/raw/a.txt", targetDirectory: "panjie/output/a.txt" });
    await adapter.renameFile({ remotePath: "panjie/raw/a.txt", newName: "b.txt" });

    expect(runner.calls[0]).toEqual(["mv", "/盘姬测试/panjie/raw/a.txt", "/盘姬测试/panjie/output/a.txt"]);
    expect(runner.calls[1]).toEqual(["mv", "/盘姬测试/panjie/raw/a.txt", "/盘姬测试/panjie/raw/b.txt"]);
  });

  it("passes absolute paths to ls, mkdir, and upload", async () => {
    const runner = new RecordingRunner();
    const adapter = new BaiduPcsGoAdapter(runner);

    await adapter.listFiles({ remoteDirectory: "panjie/raw/x" });
    await adapter.mkdir({ remoteDirectory: "panjie/output/x" });
    await adapter.uploadFile({ localPath: "artifacts/local-smoke/hello.txt", remotePath: "panjie/output/x/hello.txt" });

    expect(runner.calls[0]).toEqual(["ls", "/盘姬测试/panjie/raw/x"]);
    expect(runner.calls[1]).toEqual(["ls", "/盘姬测试/panjie/output/x"]);
    expect(runner.calls[2]).toEqual(["upload", "artifacts/local-smoke/hello.txt", "/盘姬测试/panjie/output/x/hello.txt"]);
  });

  it("cds to an absolute target path before transfer and verifies files after transfer", async () => {
    const runner = new RecordingRunner();
    const adapter = new BaiduPcsGoAdapter(runner);

    await adapter.transferSharedLink({ url: "https://pan.baidu.com/s/1abc", extractCode: "9abc", targetDirectory: "panjie/raw/task-1" });

    expect(runner.calls[0]).toEqual(["ls", "/盘姬测试/panjie/raw/task-1"]);
    expect(runner.calls[1]).toEqual(["cd", "/盘姬测试/panjie/raw/task-1"]);
    expect(runner.calls[2]).toEqual(["transfer", "https://pan.baidu.com/s/1abc", "9abc"]);
    expect(runner.calls[3]).toEqual(["ls", "/盘姬测试/panjie/raw/task-1"]);
    expect(runner.calls[4]).toEqual(["cd", "/"]);
  });
});
