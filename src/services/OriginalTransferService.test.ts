import { describe, expect, it } from "vitest";
import type { StorageAdapter, StorageCapabilities } from "../adapters/StorageAdapter";
import { defaultFastScanOptions } from "../domain/scanOptions";
import type { ProcessingOptions } from "../domain/types";
import { OriginalTransferService } from "./OriginalTransferService";

const options: ProcessingOptions = {
  transferMode: "original",
  mergeLinks: false,
  autoClassify: false,
  autoTransfer: true,
  scanWatermark: false,
  scanTrafficContent: false,
  autoRemoveWatermark: false,
  removeTrafficFields: false,
  autoCreateShareCode: true,
  autoRenameFiles: false,
  renameRule: "{分类}_{日期}_{序号}",
  targetDirectory: "盘姬测试/panjie/raw/{taskId}",
  scanOptions: defaultFastScanOptions(),
  shareTiming: "share_immediately",
  shareTemplate: { type: "xiaohongshu_virtual", title: "资料包" }
};

const capabilities: StorageCapabilities = {
  checkLogin: "supported",
  transferSharedLink: "supported",
  listFiles: "supported",
  createDirectory: "supported",
  renameFile: "supported",
  moveFile: "supported",
  downloadFile: "supported",
  uploadFile: "supported",
  createShareLink: "supported"
};

describe("OriginalTransferService", () => {
  it("transfers to raw directory, keeps names unchanged, and shares the raw directory", async () => {
    const calls: string[] = [];
    const adapter = makeAdapter(calls, {
      ok: true,
      source: "local_cli",
      shareUrl: "https://pan.baidu.com/s/1original?pwd=d6ea",
      extractCode: "d6ea",
      verified: true,
      redactedForLog: "<redacted-share-url>"
    });

    const task = await new OriginalTransferService(adapter, { delayMs: 0 }).createAndRunTask(
      "链接: https://pan.baidu.com/s/1input?pwd=d6ea 提取码: d6ea",
      options
    );

    expect(task.status).toBe("completed");
    expect(task.options.transferMode).toBe("original");
    expect(task.summary.classifiedFiles).toBe(0);
    expect(task.summary.renamedFiles).toBe(0);
    expect(task.processedFiles[0]).toMatchObject({
      originalName: "hello.txt",
      newName: "hello.txt",
      category: "原样转存"
    });
    expect(calls.some((call) => call.startsWith("rename:"))).toBe(false);
    expect(calls.some((call) => call.startsWith("mv:"))).toBe(false);
    const shareCall = calls.find((call) => call.startsWith("share:"));
    expect(shareCall).toContain("/raw/");
    expect(shareCall).not.toContain("/output/");
    expect(task.shareResult?.shareUrl).toBe("https://pan.baidu.com/s/1original?pwd=d6ea");
    expect(task.shareMessage).toContain("网盘链接：https://pan.baidu.com/s/1original?pwd=d6ea");
  });

  it("does not create a share for an empty raw directory", async () => {
    const calls: string[] = [];
    const adapter = makeAdapter(calls, {
      ok: true,
      source: "local_cli",
      shareUrl: "https://pan.baidu.com/s/1should-not-run",
      extractCode: "d6ea",
      verified: true,
      redactedForLog: "<redacted-share-url>"
    }, []);

    const task = await new OriginalTransferService(adapter, { delayMs: 0 }).createAndRunTask(
      "https://pan.baidu.com/s/1input?pwd=d6ea",
      options
    );

    expect(task.status).toBe("failed");
    expect(task.shareResult).toBeUndefined();
    expect(task.shareError).toContain("输出目录为空");
    expect(calls.some((call) => call.startsWith("share:"))).toBe(false);
  });
});

function makeAdapter(
  calls: string[],
  share: Awaited<ReturnType<StorageAdapter["createShareLink"]>>,
  files = [{ id: "1", name: "hello.txt", size: 1, isDirectory: false }]
): StorageAdapter {
  return {
    mode: "windows_local_cli",
    async getCapabilities() {
      return capabilities;
    },
    async checkConnection() {
      return { ok: true, message: "ok" };
    },
    async transferSharedLink(input) {
      calls.push(`transfer:${input.targetDirectory}`);
      return { ok: true, remotePath: input.targetDirectory, fileCount: files.length };
    },
    async listFiles(input) {
      calls.push(`ls:${input.remoteDirectory}`);
      return files.map((file) => ({
        ...file,
        path: `${input.remoteDirectory}/${file.name}`
      }));
    },
    async mkdir(input) {
      calls.push(`mkdir:${input.remoteDirectory}`);
      return { ok: true };
    },
    async renameFile(input) {
      calls.push(`rename:${input.remotePath}`);
      return { ok: true };
    },
    async moveFile(input) {
      calls.push(`mv:${input.remotePath}`);
      return { ok: true };
    },
    async downloadFile() {
      return { ok: true };
    },
    async uploadFile() {
      return { ok: true };
    },
    async createShareLink(input) {
      calls.push(`share:${input.remotePaths.join("|")}`);
      return share;
    }
  };
}

