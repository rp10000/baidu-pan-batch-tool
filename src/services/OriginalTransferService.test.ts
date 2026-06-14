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

describe("OriginalTransferService", () => {
  it("transfers to the resource library path, keeps names unchanged, and creates resource metadata", async () => {
    const calls: string[] = [];
    const adapter = makeAdapter(calls, {
      ok: true,
      source: "local_cli",
      shareUrl: "https://pan.baidu.com/s/1original?pwd=z9x8",
      extractCode: "z9x8",
      verified: true,
      redactedForLog: "<redacted-share-url>"
    });

    const task = await new OriginalTransferService(adapter, {
      delayMs: 0,
      now: () => new Date("2026-06-12T04:00:00.000Z")
    }).createAndRunTask(
      [
        "通过网盘分享的文件：AI绘画教程资料包",
        "链接: https://pan.baidu.com/s/1input?pwd=z9x8",
        "提取码: z9x8"
      ].join("\n"),
      options
    );

    expect(task.status).toBe("completed");
    expect(task.options.transferMode).toBe("original");
    expect(task.name).toBe("AI绘画教程资料包");
    expect(task.resource).toMatchObject({
      title: "AI绘画教程资料包",
      contentCategory: "课程资料",
      checkStatus: "unchecked",
      savePath: "盘姬资源库/转存记录/2026-06-12/AI绘画教程资料包"
    });
    expect(task.rawDirectory).toBe("/盘姬资源库/转存记录/2026-06-12/AI绘画教程资料包");
    expect(task.summary.classifiedFiles).toBe(0);
    expect(task.summary.renamedFiles).toBe(0);
    expect(task.processedFiles[0]).toMatchObject({
      originalName: "hello.txt",
      newName: "hello.txt",
      category: "保持原样"
    });
    expect(calls.some((call) => call.startsWith("rename:"))).toBe(false);
    expect(calls.some((call) => call.startsWith("mv:"))).toBe(false);
    const shareCall = calls.find((call) => call.startsWith("share:"));
    expect(shareCall).toBe("share:/盘姬资源库/转存记录/2026-06-12/AI绘画教程资料包:0");
    expect(task.shareResult?.shareUrl).toBe("https://pan.baidu.com/s/1original?pwd=z9x8");
    expect(task.shareMessage).toContain("【AI绘画教程资料包】");
    expect(task.shareMessage).toContain("分类：课程资料");
    expect(task.shareMessage).toContain("有效期：永久有效");
  });

  it("does not create a share for an empty raw directory", async () => {
    const calls: string[] = [];
    const adapter = makeAdapter(calls, {
      ok: true,
      source: "local_cli",
      shareUrl: "https://pan.baidu.com/s/1should-not-run",
      extractCode: "z9x8",
      verified: true,
      redactedForLog: "<redacted-share-url>"
    }, []);

    const task = await new OriginalTransferService(adapter, { delayMs: 0 }).createAndRunTask(
      "https://pan.baidu.com/s/1input?pwd=z9x8",
      options
    );

    expect(task.status).toBe("failed");
    expect(task.shareResult).toBeUndefined();
    expect(task.shareError).toBeTruthy();
    expect(calls.some((call) => call.startsWith("share:"))).toBe(false);
  });

  it("uses a numbered Chinese resource directory when the title already exists", async () => {
    const calls: string[] = [];
    const title = "公司年会学校新年晚会节目单word模板";
    const adapter = makeAdapter(
      calls,
      {
        ok: true,
        source: "local_cli",
        shareUrl: "https://pan.baidu.com/s/1original?pwd=z9x8",
        extractCode: "z9x8",
        verified: true,
        redactedForLog: "<redacted-share-url>"
      },
      [{ id: "1", name: "模板.docx", size: 1, isDirectory: false }],
      {
        async listFiles(input) {
          calls.push(`ls:${input.remoteDirectory}`);
          if (input.remoteDirectory.endsWith("/2026-06-12")) {
            return [{ id: "existing", name: title, path: `${input.remoteDirectory}/${title}`, size: 0, isDirectory: false }];
          }
          return [{ id: "1", name: "模板.docx", path: `${input.remoteDirectory}/模板.docx`, size: 1, isDirectory: false }];
        }
      }
    );

    const task = await new OriginalTransferService(adapter, {
      delayMs: 0,
      now: () => new Date("2026-06-12T04:00:00.000Z")
    }).createAndRunTask(`通过网盘分享的文件：${title}\n链接: https://pan.baidu.com/s/1input?pwd=z9x8`, options);

    expect(task.status).toBe("completed");
    expect(task.rawDirectory).toBe(`/盘姬资源库/转存记录/2026-06-12/${title}-002`);
    expect(calls).toContain(`transfer:/盘姬资源库/转存记录/2026-06-12/${title}-002`);
  });

  it("retries the transfer in a new resource directory when the CLI reports duplicate files", async () => {
    const calls: string[] = [];
    const title = "AI绘画教程资料包";
    let transferAttempts = 0;
    const files = [{ id: "1", name: "hello.txt", size: 1, isDirectory: false }];
    const adapter = makeAdapter(
      calls,
      {
        ok: true,
        source: "local_cli",
        shareUrl: "https://pan.baidu.com/s/1original?pwd=z9x8",
        extractCode: "z9x8",
        verified: true,
        redactedForLog: "<redacted-share-url>"
      },
      files,
      {
        async transferSharedLink(input) {
          calls.push(`transfer:${input.targetDirectory}`);
          transferAttempts += 1;
          if (transferAttempts === 1) {
            return { ok: false, error: "文件重复" };
          }
          return { ok: true, remotePath: input.targetDirectory, fileCount: files.length };
        }
      }
    );

    const task = await new OriginalTransferService(adapter, {
      delayMs: 0,
      now: () => new Date("2026-06-12T04:00:00.000Z")
    }).createAndRunTask(`通过网盘分享的文件：${title}\n链接: https://pan.baidu.com/s/1input?pwd=z9x8`, options);

    expect(task.status).toBe("completed");
    expect(calls).toContain(`transfer:/盘姬资源库/转存记录/2026-06-12/${title}`);
    expect(calls).toContain(`transfer:/盘姬资源库/转存记录/2026-06-12/${title}-002`);
    expect(task.rawDirectory).toBe(`/盘姬资源库/转存记录/2026-06-12/${title}-002`);
  });
});

function makeAdapter(
  calls: string[],
  share: Awaited<ReturnType<StorageAdapter["createShareLink"]>>,
  files = [{ id: "1", name: "hello.txt", size: 1, isDirectory: false }],
  overrides: Partial<StorageAdapter> = {}
): StorageAdapter {
  const adapter: StorageAdapter = {
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
      calls.push(`share:${input.remotePaths.join("|")}:${input.periodDays}`);
      return share;
    }
  };
  return { ...adapter, ...overrides };
}
