import { describe, expect, it } from "vitest";
import { ensureRemoteDir } from "./RemoteDirectoryService";

describe("ensureRemoteDir", () => {
  it("treats an existing remote directory as success", async () => {
    const result = await ensureRemoteDir("/盘姬测试/panjie/raw/task-1", {
      async list() {
        return { ok: true, kind: "directory", entries: [] };
      },
      async mkdir() {
        throw new Error("mkdir should not run");
      }
    });

    expect(result).toEqual({ ok: true, status: "already_exists" });
  });

  it("confirms mkdir code 31061 as an existing directory", async () => {
    let listCount = 0;
    const result = await ensureRemoteDir("/盘姬测试/panjie/raw/task-1", {
      async list() {
        listCount += 1;
        return listCount === 1
          ? { ok: false, error: "not found" }
          : { ok: true, kind: "directory", entries: [] };
      },
      async mkdir() {
        return { ok: false, error: "文件已存在, code: 31061" };
      }
    });

    expect(result).toEqual({ ok: true, status: "already_exists" });
  });

  it("rejects a path conflict with a file", async () => {
    const result = await ensureRemoteDir("/盘姬测试/panjie/raw/task-1", {
      async list() {
        return { ok: true, kind: "file", entries: [] };
      },
      async mkdir() {
        return { ok: true };
      }
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("path_conflict_file");
  });
});
