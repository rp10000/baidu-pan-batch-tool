import type { StorageAdapter } from "../adapters/StorageAdapter";
import { PANJIE_ROOT } from "../adapters/StorageAdapter";
import type { ProcessingOptions, ProcessingTask, ProcessedFile, ShareInput } from "../domain/types";
import { createEmptyStages } from "../domain/pipeline";
import { applyRenameRule } from "../domain/renameRule";
import { parseShareLinks } from "../domain/shareParser";
import type { ProcessingService, TaskUpdateHandler } from "./ProcessingService";

interface RealProcessingServiceOptions {
  delayMs?: number;
}

export class RealProcessingService implements ProcessingService {
  private readonly delayMs: number;

  constructor(
    private readonly adapter: StorageAdapter,
    options: RealProcessingServiceOptions = {}
  ) {
    this.delayMs = options.delayMs ?? 120;
  }

  async createAndRunTask(
    rawText: string,
    options: ProcessingOptions,
    onUpdate?: TaskUpdateHandler
  ): Promise<ProcessingTask> {
    const task = createRealDraftTask(rawText, options, this.adapter.mode);
    emit(task, onUpdate);

    await runStage(task, "link_parse", "parsing", 8, onUpdate, this.delayMs, async () => undefined);

    try {
      const validInputs = task.inputs.filter((input) => input.valid && !input.duplicate);
      await runStage(task, "transfer", "transferring", 25, onUpdate, this.delayMs, async () => {
        for (const input of validInputs) {
          const result = await this.adapter.transferSharedLink({
            url: input.url,
            extractCode: input.extractCode,
            targetDirectory: task.rawDirectory ?? `${PANJIE_ROOT}/raw/${task.id}`
          });
          if (!result.ok) {
            throw new Error(result.error ?? "转存失败");
          }
        }
      });

      await runStage(task, "classify", "classifying", 45, onUpdate, this.delayMs, async () => {
        const files = await this.adapter.listFiles({ remoteDirectory: task.rawDirectory ?? `${PANJIE_ROOT}/raw/${task.id}` });
        task.processedFiles = files
          .filter((file) => !file.isDirectory)
          .map((file, index) => {
            const category = classifyByName(file.name);
            return {
              id: file.id,
              originalName: file.name,
              newName: file.name,
              category,
              status: "transferred",
              risks: [],
              remotePath: file.path,
              targetDirectory: task.options.targetDirectory
                .replace("{taskId}", task.id)
                .replace("{分类}", category)
            } satisfies ProcessedFile;
          });
        if (task.processedFiles.length === 0 && validInputs.length > 0) {
          task.processedFiles = validInputs.map((input, index) => toFallbackFile(input, index, task));
        }
      });

      await runStage(task, "watermark_scan", "scanning", 52, onUpdate, this.delayMs, async () => undefined);
      await runStage(task, "traffic_scan", "scanning", 58, onUpdate, this.delayMs, async () => undefined);

      await runStage(task, "rename", "cleaning", 74, onUpdate, this.delayMs, async () => {
      for (const [index, file] of task.processedFiles.entries()) {
        file.newName = options.autoRenameFiles
          ? applyRenameRule({
              originalName: file.originalName,
              category: file.category,
              date: compactDate(task.createdAt),
              index: index + 1,
              rule: options.renameRule
            })
          : file.originalName;
        const rename = await this.adapter.renameFile({
          remotePath: file.remotePath ?? `${task.rawDirectory}/${file.originalName}`,
          newName: file.newName
        });
        if (!rename.ok) {
          file.status = "failed";
        }
      }
      });

      await runStage(task, "auto_clean", "cleaning", 86, onUpdate, this.delayMs, async () => {
      const directories = new Set(task.processedFiles.map((file) => file.targetDirectory ?? task.outputDirectory ?? ""));
      for (const directory of directories) {
        if (directory) {
          await this.adapter.mkdir({ remoteDirectory: directory });
        }
      }
      for (const file of task.processedFiles) {
        const source = file.remotePath
          ? replaceFileName(file.remotePath, file.newName)
          : `${task.rawDirectory}/${file.newName}`;
        const moved = await this.adapter.moveFile({
          remotePath: source,
          targetDirectory: file.targetDirectory ?? task.outputDirectory ?? `${PANJIE_ROOT}/output/${task.id}`
        });
        if (!moved.ok) {
          file.status = "failed";
        }
      }
      });

      await runStage(task, "create_share", "sharing", 100, onUpdate, this.delayMs, async () => {
      if (!options.autoCreateShareCode) {
        return;
      }
      const share = await this.adapter.createShareLink({
        remotePaths: [task.outputDirectory ?? `${PANJIE_ROOT}/output/${task.id}`],
        periodDays: 7
      });
      if (share.ok) {
        task.shareResult = {
          source: share.source ?? "manual",
          shareUrl: share.shareUrl ?? "",
          extractCode: share.extractCode,
          expireAt: share.expireAt,
          verified: Boolean(share.verified),
          redactedForLog: share.redactedForLog ?? "<redacted-share-url>"
        };
      } else {
        task.shareError = share.error ?? "创建分享链接失败";
        throw new Error(task.shareError);
      }
      });

      task.status = "completed";
      task.progress = 100;
    } catch (error) {
      const runningStage = Object.entries(task.stages).find(([, status]) => status === "running")?.[0] as keyof ProcessingTask["stages"] | undefined;
      if (runningStage) task.stages[runningStage] = "failed";
      task.shareError = error instanceof Error ? error.message : "真实处理失败";
      task.status = shouldMarkPartialShareFailure(task) ? "partial_completed" : "failed";
    }
    task.summary = summarizeRealTask(task);
    emit(task, onUpdate);
    return cloneTask(task);
  }
}

function shouldMarkPartialShareFailure(task: ProcessingTask): boolean {
  if (!task.shareError || task.processedFiles.length === 0) {
    return false;
  }
  if (task.shareError.includes("路径错误") || task.shareError.includes("not absolute path")) {
    return false;
  }
  return task.stages.create_share === "failed";
}

function createRealDraftTask(rawText: string, options: ProcessingOptions, adapterMode: ProcessingTask["adapterMode"]): ProcessingTask {
  const createdAt = new Date().toISOString();
  const id = `task-${Date.now()}-${hashString(rawText).slice(0, 6)}`;
  return {
    id,
    name: `真实任务 ${createdAt.slice(0, 16).replace("T", " ")}`,
    createdAt,
    status: "draft",
    progress: 0,
    adapterMode,
    rawDirectory: `${PANJIE_ROOT}/raw/${id}`,
    outputDirectory: `${PANJIE_ROOT}/output/${id}`,
    inputs: parseShareLinks(rawText),
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

async function runStage(
  task: ProcessingTask,
  stage: keyof ProcessingTask["stages"],
  status: ProcessingTask["status"],
  progress: number,
  onUpdate: TaskUpdateHandler | undefined,
  delayMs: number,
  action: () => Promise<void>
) {
  task.status = status;
  task.stages[stage] = "running";
  task.progress = Math.max(task.progress, Math.min(progress - 1, 99));
  emit(task, onUpdate);
  await wait(delayMs);
  await action();
  task.stages[stage] = "completed";
  task.progress = progress;
  task.summary = summarizeRealTask(task);
  emit(task, onUpdate);
}

function toFallbackFile(input: ShareInput, index: number, task: ProcessingTask): ProcessedFile {
  const originalName = `转存文件_${index + 1}.dat`;
  const category = "其他";
  return {
    id: `remote-${index + 1}`,
    originalName,
    newName: originalName,
    category,
    status: "transferred",
    risks: [],
    remotePath: `${task.rawDirectory}/${originalName}`,
    targetDirectory: task.options.targetDirectory.replace("{taskId}", task.id).replace("{分类}", category)
  };
}

function classifyByName(name: string): string {
  const lower = name.toLowerCase();
  if (/\.(mp4|mkv|avi)$/.test(lower)) return "视频课程";
  if (/\.(pdf|docx|pptx|txt)$/.test(lower)) return "学习资料";
  if (/\.(jpg|jpeg|png|webp)$/.test(lower)) return "图片素材";
  if (/\.(zip|rar|7z)$/.test(lower)) return "压缩包";
  return "其他";
}

function summarizeRealTask(task: ProcessingTask): ProcessingTask["summary"] {
  return {
    recognizedFiles: task.processedFiles.length,
    classifiedFiles: task.processedFiles.filter((file) => file.category !== "未分类").length,
    removedWatermarks: 0,
    removedTrafficItems: 0,
    renamedFiles: task.processedFiles.filter((file) => file.newName !== file.originalName).length,
    transferredFiles: task.processedFiles.filter((file) => file.status !== "failed").length,
    failedFiles: task.processedFiles.filter((file) => file.status === "failed").length
  };
}

function replaceFileName(path: string, newName: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? `${path.slice(0, slash + 1)}${newName}` : newName;
}

function compactDate(value: string): string {
  return value.slice(0, 10).replaceAll("-", "");
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

async function wait(delayMs: number): Promise<void> {
  if (delayMs <= 0) return;
  await new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

function emit(task: ProcessingTask, onUpdate?: TaskUpdateHandler) {
  onUpdate?.(cloneTask(task));
}

function cloneTask(task: ProcessingTask): ProcessingTask {
  return JSON.parse(JSON.stringify(task)) as ProcessingTask;
}
