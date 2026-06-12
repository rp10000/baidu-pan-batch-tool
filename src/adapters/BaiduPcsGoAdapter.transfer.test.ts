import { describe, expect, it } from "vitest";
import { BaiduPcsGoAdapter } from "./BaiduPcsGoAdapter";
import type { LocalCliCommand, LocalCliCommandResult, LocalCliCommandRunner } from "../services/LocalCliCommandRunner";

describe("BaiduPcsGoAdapter transfer", () => {
  it("ensures the target dir, cd's into it, transfers, and verifies files", async () => {
    const calls: string[][] = [];
    let lsCount = 0;
    const adapter = new BaiduPcsGoAdapter(makeRunner(calls, async (command) => {
      const [name, path] = command.args;
      if (name === "ls" && path === "/盘姬测试/panjie/raw/task-1") {
        lsCount += 1;
        return lsCount === 1 ? fail("not found") : ok("hello.txt\n");
      }
      if (name === "mkdir") return fail("文件已存在, code: 31061");
      if (name === "cd") return ok("");
      if (name === "transfer") return ok("transfer success");
      return ok("");
    }));

    const result = await adapter.transferSharedLink({
      url: "https://pan.baidu.com/s/1synthetic?pwd=z9x8",
      extractCode: "z9x8",
      targetDirectory: "盘姬测试/panjie/raw/task-1"
    });

    expect(result).toMatchObject({ ok: true, fileCount: 1, remotePath: "盘姬测试/panjie/raw/task-1" });
    expect(calls).toEqual([
      ["ls", "/盘姬测试/panjie/raw/task-1"],
      ["mkdir", "/盘姬测试/panjie/raw/task-1"],
      ["ls", "/盘姬测试/panjie/raw/task-1"],
      ["cd", "/盘姬测试/panjie/raw/task-1"],
      ["transfer", "https://pan.baidu.com/s/1synthetic?pwd=z9x8", "z9x8"],
      ["ls", "/盘姬测试/panjie/raw/task-1"],
      ["cd", "/"]
    ]);
  });

  it("fails transfer when the target directory is still empty after transfer", async () => {
    const calls: string[][] = [];
    const adapter = new BaiduPcsGoAdapter(makeRunner(calls, async (command) => {
      if (command.args[0] === "ls") return ok("");
      if (command.args[0] === "cd") return ok("");
      if (command.args[0] === "transfer") return ok("transfer success");
      return ok("");
    }));

    const result = await adapter.transferSharedLink({
      url: "https://pan.baidu.com/s/1synthetic?pwd=z9x8",
      extractCode: "z9x8",
      targetDirectory: "/盘姬测试/panjie/raw/task-empty"
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("transfer_empty");
  });
});

function makeRunner(
  calls: string[][],
  handler: (command: LocalCliCommand) => Promise<LocalCliCommandResult>
): LocalCliCommandRunner {
  return {
    async run(command) {
      calls.push(command.args);
      return handler(command);
    }
  };
}

function ok(stdout: string): LocalCliCommandResult {
  return { exitCode: 0, stdout, stderr: "" };
}

function fail(stderr: string): LocalCliCommandResult {
  return { exitCode: 1, stdout: "", stderr };
}
