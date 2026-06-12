import { describe, expect, it } from "vitest";
import { BdpanCliAdapter } from "./BdpanCliAdapter";
import type { BdpanCommand, BdpanCommandResult, BdpanCommandRunner } from "../services/BdpanCommandRunner";

class FakeRunner implements BdpanCommandRunner {
  readonly commands: BdpanCommand[] = [];
  private queue: BdpanCommandResult[];

  constructor(results: BdpanCommandResult[]) {
    this.queue = [...results];
  }

  async run(command: BdpanCommand): Promise<BdpanCommandResult> {
    this.commands.push(command);
    return this.queue.shift() ?? { exitCode: 0, stdout: "{\"status\":\"ok\"}", stderr: "" };
  }
}

describe("BdpanCliAdapter", () => {
  it("maps transfer, list, mkdir, rename, move, and share to bdpan commands", async () => {
    const runner = new FakeRunner([
      { exitCode: 0, stdout: "{\"status\":\"success\",\"remote_path\":\"panjie/raw/task-1\",\"file_count\":2}", stderr: "" },
      {
        exitCode: 0,
        stdout:
          "[{\"fs_id\":1,\"path\":\"我的应用数据/bdpan/panjie/raw/task-1/a.pdf\",\"server_filename\":\"a.pdf\",\"size\":12,\"isdir\":false}]",
        stderr: ""
      },
      { exitCode: 0, stdout: "{\"status\":\"ok\"}", stderr: "" },
      { exitCode: 0, stdout: "{\"status\":\"ok\"}", stderr: "" },
      { exitCode: 0, stdout: "{\"status\":\"ok\"}", stderr: "" },
      { exitCode: 0, stdout: "{\"link\":\"https://pan.baidu.com/s/1new\",\"pwd\":\"A7K9\",\"period\":0}", stderr: "" }
    ]);
    const adapter = new BdpanCliAdapter(runner);

    await adapter.transferSharedLink({
      url: "https://pan.baidu.com/s/1abc",
      extractCode: "A7K9",
      targetDirectory: "panjie/raw/task-1"
    });
    await adapter.listFiles({ remoteDirectory: "panjie/raw/task-1" });
    await adapter.mkdir({ remoteDirectory: "panjie/output/task-1/文档" });
    await adapter.renameFile({ remotePath: "panjie/raw/task-1/a.pdf", newName: "文档_001.pdf" });
    await adapter.moveFile({ remotePath: "panjie/raw/task-1/文档_001.pdf", targetDirectory: "panjie/output/task-1/文档" });
    await adapter.createShareLink({ remotePaths: ["panjie/output/task-1"], periodDays: 0 });

    expect(runner.commands.map((command) => [command.subcommand, ...command.args])).toEqual([
      ["transfer", "https://pan.baidu.com/s/1abc", "-p", "A7K9", "-d", "panjie/raw/task-1", "--json"],
      ["ls", "panjie/raw/task-1", "--json"],
      ["mkdir", "panjie/output/task-1/文档", "--json"],
      ["rename", "panjie/raw/task-1/a.pdf", "文档_001.pdf", "--json"],
      ["mv", "panjie/raw/task-1/文档_001.pdf", "panjie/output/task-1/文档", "--json"],
      ["share", "panjie/output/task-1", "--period", "0", "--json"]
    ]);
  });

  it("does not fake share success when the share capability is unavailable", async () => {
    const runner = new FakeRunner([{ exitCode: 1, stdout: "", stderr: "share service requires paid capability" }]);
    const adapter = new BdpanCliAdapter(runner);

    await expect(adapter.createShareLink({ remotePaths: ["panjie/output/task-1"], periodDays: 0 })).resolves.toEqual({
      ok: false,
      error: "分享接口不可用 / 需开通"
    });
  });

  it("normalizes bdpan display paths before later command use", async () => {
    const runner = new FakeRunner([
      {
        exitCode: 0,
        stdout:
          "[{\"fs_id\":1,\"path\":\"我的应用数据/bdpan/panjie/raw/task-1/a.pdf\",\"server_filename\":\"a.pdf\",\"size\":12,\"isdir\":false}]",
        stderr: ""
      }
    ]);
    const adapter = new BdpanCliAdapter(runner);

    const files = await adapter.listFiles({ remoteDirectory: "panjie/raw/task-1" });

    expect(files[0]?.path).toBe("panjie/raw/task-1/a.pdf");
  });
});
