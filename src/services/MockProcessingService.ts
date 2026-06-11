import type { ProcessingOptions, ProcessingTask, RiskType } from "../domain/types";
import { createMockFiles, createRisksForFile, getMockCategory, getRiskTypes } from "../domain/mockData";
import { createEmptyStages, PIPELINE_ORDER, STAGE_TASK_STATUS } from "../domain/pipeline";
import { applyRenameRule } from "../domain/renameRule";
import { parseShareLinks } from "../domain/shareParser";
import type { ProcessingService, TaskUpdateHandler } from "./ProcessingService";

interface MockProcessingServiceOptions {
  delayMs?: number;
}

export class MockProcessingService implements ProcessingService {
  private readonly delayMs: number;

  constructor(options: MockProcessingServiceOptions = {}) {
    this.delayMs = options.delayMs ?? 180;
  }

  async createAndRunTask(
    rawText: string,
    options: ProcessingOptions,
    onUpdate?: TaskUpdateHandler
  ): Promise<ProcessingTask> {
    const task = createDraftTask(rawText, options);
    emit(task, onUpdate);

    for (const [index, stage] of PIPELINE_ORDER.entries()) {
      task.status = STAGE_TASK_STATUS[stage];
      task.stages[stage] = "running";
      task.progress = Math.round((index / PIPELINE_ORDER.length) * 100);
      emit(task, onUpdate);
      await wait(this.delayMs);

      applyStage(task, stage);
      task.stages[stage] = "completed";
      task.progress = Math.round(((index + 1) / PIPELINE_ORDER.length) * 100);
      task.summary = summarizeTask(task);
      emit(task, onUpdate);
    }

    task.status = "completed";
    task.progress = 100;
    task.summary = summarizeTask(task);
    emit(task, onUpdate);
    return cloneTask(task);
  }
}

export function createAndRunTask(rawText: string, options: ProcessingOptions): Promise<ProcessingTask> {
  return new MockProcessingService().createAndRunTask(rawText, options);
}

function createDraftTask(rawText: string, options: ProcessingOptions): ProcessingTask {
  const createdAt = new Date().toISOString();
  const inputs = parseShareLinks(rawText);
  return {
    id: `task-${Date.now()}-${hashString(rawText).slice(0, 6)}`,
    name: `批量任务 ${formatTaskNameDate(createdAt)}`,
    createdAt,
    status: "draft",
    progress: 0,
    inputs,
    options,
    stages: createEmptyStages(),
    processedFiles: [],
    summary: {
      recognizedFiles: 0,
      classifiedFiles: 0,
      removedWatermarks: 0,
      removedTrafficItems: 0,
      renamedFiles: 0,
      transferredFiles: 0,
      failedFiles: 0
    }
  };
}

function applyStage(task: ProcessingTask, stage: (typeof PIPELINE_ORDER)[number]) {
  switch (stage) {
    case "link_parse":
      return;
    case "classify":
      task.processedFiles = createMockFiles().map((file) => ({
        ...file,
        category: task.options.autoClassify ? getMockCategory(file.id) : "未分类"
      }));
      return;
    case "watermark_scan":
      if (task.options.scanWatermark) {
        task.processedFiles = task.processedFiles.map((file) => ({
          ...file,
          risks: [...file.risks, ...createRisksForFile(file, getRiskTypes(file.id).filter((type) => type === "watermark"))]
        }));
      }
      return;
    case "traffic_scan":
      if (task.options.scanTrafficContent) {
        task.processedFiles = task.processedFiles.map((file) => ({
          ...file,
          risks: [
            ...file.risks,
            ...createRisksForFile(
              file,
              getRiskTypes(file.id).filter((type) => type !== "watermark")
            )
          ]
        }));
      }
      return;
    case "auto_clean":
      task.processedFiles = task.processedFiles.map((file) => ({
        ...file,
        risks: file.risks.map((risk) => ({
          ...risk,
          action: shouldCleanRisk(risk.type, task.options) ? "cleaned" : risk.action
        })),
        status: file.risks.some((risk) => shouldCleanRisk(risk.type, task.options)) ? "cleaned" : file.status
      }));
      return;
    case "rename":
      task.processedFiles = task.processedFiles.map((file, index) => ({
        ...file,
        newName: task.options.autoRenameFiles
          ? applyRenameRule({
              originalName: file.originalName,
              category: file.category,
              date: formatDateCompact(task.createdAt),
              index: index + 1,
              rule: task.options.renameRule
            })
          : file.originalName
      }));
      return;
    case "transfer":
      task.processedFiles = task.processedFiles.map((file, index) => ({
        ...file,
        status: task.options.autoTransfer ? (index === task.processedFiles.length - 1 ? "failed" : "transferred") : "skipped"
      }));
      return;
    case "create_share":
      if (task.options.autoCreateShareCode) {
        task.shareResult = {
          source: "mock",
          shareUrl: `https://pan.baidu.com/s/mock-${task.id.slice(-6)}`,
          extractCode: "A7K9",
          verified: false,
          redactedForLog: "<mock-share-url>"
        };
      }
      return;
  }
}

function shouldCleanRisk(type: RiskType, options: ProcessingOptions): boolean {
  if (type === "watermark") {
    return options.autoRemoveWatermark;
  }

  return options.removeTrafficFields;
}

function summarizeTask(task: ProcessingTask): ProcessingTask["summary"] {
  const allRisks = task.processedFiles.flatMap((file) => file.risks);
  return {
    recognizedFiles: task.processedFiles.length,
    classifiedFiles: task.processedFiles.filter((file) => file.category !== "未分类").length,
    removedWatermarks: allRisks.filter((risk) => risk.type === "watermark" && risk.action === "cleaned").length,
    removedTrafficItems: allRisks.filter((risk) => risk.type !== "watermark" && risk.action === "cleaned").length,
    renamedFiles: task.processedFiles.filter((file) => file.newName !== file.originalName).length,
    transferredFiles: task.processedFiles.filter((file) => file.status === "transferred").length,
    failedFiles: task.processedFiles.filter((file) => file.status === "failed").length
  };
}

function formatDateCompact(value: string): string {
  return value.slice(0, 10).replaceAll("-", "");
}

function formatTaskNameDate(value: string): string {
  return value.slice(0, 16).replace("T", " ");
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

async function wait(delayMs: number): Promise<void> {
  if (delayMs <= 0) {
    return;
  }

  await new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

function emit(task: ProcessingTask, onUpdate?: TaskUpdateHandler) {
  onUpdate?.(cloneTask(task));
}

function cloneTask(task: ProcessingTask): ProcessingTask {
  return JSON.parse(JSON.stringify(task)) as ProcessingTask;
}
