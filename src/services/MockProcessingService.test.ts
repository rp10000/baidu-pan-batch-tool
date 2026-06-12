import { describe, expect, it } from "vitest";
import type { PipelineStage, ProcessingOptions, ProcessingTask } from "../domain/types";
import { PIPELINE_ORDER } from "../domain/pipeline";
import { defaultFastScanOptions, defaultStandardScanOptions } from "../domain/scanOptions";
import { MockProcessingService } from "./MockProcessingService";

const options: ProcessingOptions = {
  transferMode: "scan_clean",
  mergeLinks: false,
  autoClassify: true,
  autoTransfer: true,
  scanWatermark: true,
  scanTrafficContent: true,
  autoRemoveWatermark: true,
  removeTrafficFields: true,
  autoCreateShareCode: true,
  autoRenameFiles: true,
  renameRule: "{分类}_{日期}_{序号}",
  targetDirectory: "/自动归档/{分类}",
  scanOptions: { ...defaultStandardScanOptions(), createCleanCopy: true },
  shareTiming: "share_immediately",
  shareTemplate: { type: "xiaohongshu_virtual", title: "资料包" }
};

describe("MockProcessingService", () => {
  it("runs stages in order and returns a completed task with files, cleaned risks, and a share result", async () => {
    const snapshots: ProcessingTask[] = [];
    const service = new MockProcessingService({ delayMs: 0 });

    const task = await service.createAndRunTask(
      [
        "https://pan.baidu.com/s/abc123 A7K9",
        "https://pan.baidu.com/s/def456 提取码: B3L2",
        "https://pan.baidu.com/s/ghi789 密码 9K2P"
      ].join("\n"),
      options,
      (snapshot) => snapshots.push(snapshot)
    );

    const runningStages = snapshots
      .map((snapshot) => Object.entries(snapshot.stages).find(([, status]) => status === "running")?.[0])
      .filter(Boolean) as PipelineStage[];

    expect(runningStages).toEqual(PIPELINE_ORDER);
    expect(task.status).toBe("completed");
    expect(task.progress).toBe(100);
    expect(Object.values(task.stages).every((stage) => stage === "completed")).toBe(true);
    expect(task.processedFiles.map((file) => file.originalName)).toEqual(
      expect.arrayContaining([
        "课程先导片.mp4",
        "资料讲义.pdf",
        "封面海报.png",
        "素材压缩包.zip",
        "安装说明.txt"
      ])
    );
    expect(task.summary.recognizedFiles).toBe(5);
    expect(task.summary.classifiedFiles).toBe(5);
    expect(task.summary.removedWatermarks).toBeGreaterThan(0);
    expect(task.summary.removedTrafficItems).toBeGreaterThan(0);
    expect(task.summary.renamedFiles).toBe(5);
    expect(task.summary.transferredFiles).toBeGreaterThan(0);
    expect(task.resource).toMatchObject({
      contentCategory: "课程资料",
      checkStatus: "unchecked"
    });
    expect(task.shareMessage).toContain("分类：课程资料");
    expect(task.shareResult).toMatchObject({
      source: "mock",
      shareUrl: expect.stringContaining("https://pan.baidu.com/s/mock-"),
      verified: false,
      extractCode: expect.stringMatching(/^[A-Z0-9]{4}$/)
    });
    expect(task.processedFiles.flatMap((file) => file.risks).every((risk) => risk.action === "cleaned")).toBe(true);
  });

  it("keeps fast mode free of scan and clean work", async () => {
    const task = await new MockProcessingService({ delayMs: 0 }).createAndRunTask("https://pan.baidu.com/s/abc123 A7K9", {
      ...options,
      scanWatermark: false,
      scanTrafficContent: false,
      autoRemoveWatermark: false,
      removeTrafficFields: false,
      scanOptions: defaultFastScanOptions()
    });

    expect(task.options.scanOptions.enabled).toBe(false);
    expect(task.processedFiles.flatMap((file) => file.risks)).toHaveLength(0);
    expect(task.summary.removedWatermarks).toBe(0);
    expect(task.summary.removedTrafficItems).toBe(0);
  });
});
