import { describe, expect, it } from "vitest";
import { buildBdpanInvocation, normalizeBdpanResult } from "./BdpanCommandRunner";

describe("buildBdpanInvocation", () => {
  it("uses bdpan directly on linux-like platforms", () => {
    expect(
      buildBdpanInvocation({
        platform: "linux",
        subcommand: "transfer",
        args: ["https://pan.baidu.com/s/1abc", "-p", "A7K9", "-d", "panjie/raw/task-1", "--json"]
      })
    ).toEqual({
      command: "bdpan",
      args: ["transfer", "https://pan.baidu.com/s/1abc", "-p", "A7K9", "-d", "panjie/raw/task-1", "--json"],
      usesShell: false
    });
  });

  it("uses wsl.exe with exec on Windows", () => {
    expect(
      buildBdpanInvocation({
        platform: "win32",
        subcommand: "share",
        args: ["panjie/output/task-1", "--period", "0", "--json"]
      })
    ).toEqual({
      command: "wsl.exe",
      args: ["--exec", "bdpan", "share", "panjie/output/task-1", "--period", "0", "--json"],
      usesShell: false
    });
  });
});

describe("normalizeBdpanResult", () => {
  it("parses json stdout", () => {
    expect(normalizeBdpanResult({ exitCode: 0, stdout: "{\"status\":\"ok\"}", stderr: "" })).toEqual({
      ok: true,
      data: { status: "ok" },
      raw: "{\"status\":\"ok\"}"
    });
  });

  it("returns a clean error when a command cannot be found", () => {
    expect(
      normalizeBdpanResult({
        exitCode: 127,
        stdout: "",
        stderr: "bdpan: not found"
      })
    ).toMatchObject({
      ok: false,
      error: "bdpan CLI 未安装或 WSL 内不可用"
    });
  });
});
