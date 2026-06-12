import { describe, expect, it } from "vitest";
import type { StorageAdapter, StorageCapabilities } from "../adapters/StorageAdapter";
import { defaultFastScanOptions } from "../domain/scanOptions";
import type { ProcessingOptions } from "../domain/types";
import { LocalCliProcessingService } from "./LocalCliProcessingService";

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
  targetDirectory: "盘姬资源库/转存记录/{日期}/{任务名}",
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

describe("LocalCliProcessingService share result", () => {
  it("keeps real local cli share result and does not use mock links", async () => {
    const adapter = makeAdapter({
      ok: true,
      source: "local_cli",
      shareUrl: "https://pan.baidu.com/s/1realunit?pwd=9abc",
      extractCode: "9abc",
      verified: true,
      redactedForLog: "<redacted-share-url>"
    });

    const task = await new LocalCliProcessingService(adapter, { delayMs: 0 }).createAndRunTask("https://pan.baidu.com/s/1input 1234", options);

    expect(task.shareResult).toMatchObject({
      source: "local_cli",
      shareUrl: "https://pan.baidu.com/s/1realunit?pwd=9abc",
      extractCode: "9abc",
      verified: true
    });
    expect(task.shareResult?.shareUrl).not.toContain("mock");
    expect(task.shareResult?.shareUrl).not.toContain("redacted");
    expect(task.finalShareDirectory).toContain("/盘姬资源库/转存记录/");
    expect(task.resource?.savePath).toContain("盘姬资源库/转存记录/");
    expect(task.summary.renamedFiles).toBe(0);
    expect(task.shareMessage).toContain("网盘链接：https://pan.baidu.com/s/1realunit?pwd=9abc");
  });

  it("returns a partial task without fake share result when share creation fails after file operations", async () => {
    const task = await new LocalCliProcessingService(makeAdapter({ ok: false, error: "创建分享链接失败：CLI 未返回可用分享链接" }), { delayMs: 0 })
      .createAndRunTask("https://pan.baidu.com/s/1input 1234", options);

    expect(task.status).toBe("partial_completed");
    expect(task.shareResult).toBeUndefined();
    expect(task.shareError).toContain("创建分享链接失败");
  });

  it("keeps path errors as failed tasks", async () => {
    const task = await new LocalCliProcessingService(makeAdapter({ ok: false, error: "路径错误：CLI 需要绝对网盘路径" }), { delayMs: 0 })
      .createAndRunTask("https://pan.baidu.com/s/1input 1234", options);

    expect(task.status).toBe("failed");
    expect(task.shareResult).toBeUndefined();
    expect(task.shareError).toContain("绝对网盘路径");
  });
});

function makeAdapter(share: Awaited<ReturnType<StorageAdapter["createShareLink"]>>): StorageAdapter {
  return {
    mode: "windows_local_cli",
    async getCapabilities() {
      return capabilities;
    },
    async checkConnection() {
      return { ok: true, message: "ok" };
    },
    async transferSharedLink(input) {
      return { ok: true, remotePath: input.targetDirectory };
    },
    async listFiles(input) {
      return [{ id: "1", name: "hello.txt", path: `${input.remoteDirectory}/hello.txt`, size: 1, isDirectory: false }];
    },
    async mkdir() {
      return { ok: true };
    },
    async renameFile() {
      return { ok: true };
    },
    async moveFile() {
      return { ok: true };
    },
    async downloadFile() {
      return { ok: true };
    },
    async uploadFile() {
      return { ok: true };
    },
    async createShareLink() {
      return share;
    }
  };
}
