import { describe, expect, it } from "vitest";
import type { StorageAdapter, StorageCapabilities } from "../adapters/StorageAdapter";
import type { ProcessingOptions } from "../domain/types";
import { RealProcessingService } from "./RealProcessingService";

const supportedCapabilities: StorageCapabilities = {
  checkLogin: "supported",
  transferSharedLink: "supported",
  listFiles: "supported",
  createDirectory: "supported",
  renameFile: "supported",
  moveFile: "supported",
  downloadFile: "supported",
  uploadFile: "supported",
  createShareLink: "paid_required"
};

const options: ProcessingOptions = {
  autoClassify: true,
  autoTransfer: true,
  scanWatermark: false,
  scanTrafficContent: false,
  autoRemoveWatermark: false,
  removeTrafficFields: false,
  autoCreateShareCode: true,
  autoRenameFiles: true,
  renameRule: "{分类}_{日期}_{序号}",
  targetDirectory: "panjie/output/{taskId}/{分类}"
};

describe("RealProcessingService", () => {
  it("runs the bdpan transfer to classify, rename, move, and share flow with share fallback", async () => {
    const calls: string[] = [];
    const adapter: StorageAdapter = {
      mode: "bdpan_wsl",
      async getCapabilities() {
        return supportedCapabilities;
      },
      async checkConnection() {
        return { ok: true, displayName: "tester", message: "已连接" };
      },
      async transferSharedLink(input) {
        calls.push(`transfer:${input.targetDirectory}`);
        return { ok: true, remotePath: input.targetDirectory, fileCount: 2 };
      },
      async listFiles(input) {
        calls.push(`ls:${input.remoteDirectory}`);
        return [
          { id: "1", name: "课程.mp4", path: `${input.remoteDirectory}/课程.mp4`, size: 100, isDirectory: false },
          { id: "2", name: "讲义.pdf", path: `${input.remoteDirectory}/讲义.pdf`, size: 80, isDirectory: false }
        ];
      },
      async mkdir(input) {
        calls.push(`mkdir:${input.remoteDirectory}`);
        return { ok: true };
      },
      async renameFile(input) {
        calls.push(`rename:${input.remotePath}->${input.newName}`);
        return { ok: true };
      },
      async moveFile(input) {
        calls.push(`mv:${input.remotePath}->${input.targetDirectory}`);
        return { ok: true };
      },
      async downloadFile() {
        return { ok: true };
      },
      async uploadFile() {
        return { ok: true };
      },
      async createShareLink() {
        calls.push("share");
        return { ok: false, error: "分享接口不可用 / 需开通" };
      }
    };

    const task = await new RealProcessingService(adapter, { delayMs: 0 }).createAndRunTask(
      "https://pan.baidu.com/s/1abc A7K9",
      options
    );

    expect(calls.some((call) => call.startsWith("transfer:panjie/raw/task-"))).toBe(true);
    expect(calls.some((call) => call.startsWith("ls:panjie/raw/task-"))).toBe(true);
    expect(calls.some((call) => call.startsWith("mkdir:panjie/output/task-"))).toBe(true);
    expect(calls.some((call) => call.startsWith("rename:"))).toBe(true);
    expect(calls.some((call) => call.startsWith("mv:"))).toBe(true);
    expect(calls).toContain("share");
    expect(task.status).toBe("completed");
    expect(task.processedFiles).toHaveLength(2);
    expect(task.summary.transferredFiles).toBe(2);
    expect(task.shareResult).toBeUndefined();
    expect(task.shareError).toBe("分享接口不可用 / 需开通");
  });
});
