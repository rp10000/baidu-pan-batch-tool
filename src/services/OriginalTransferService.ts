import type { StorageAdapter, RemoteFile } from "../adapters/StorageAdapter";
import { PANJIE_ROOT } from "../adapters/StorageAdapter";
import { createEmptyStages } from "../domain/pipeline";
import { parseShareLinks } from "../domain/shareParser";
import type { ProcessingOptions, ProcessingTask, ProcessingTaskItem, ProcessedFile, ShareResult } from "../domain/types";
import { resolveFinalShareTarget } from "./OutputDirectoryGuard";
import type { ProcessingService, TaskUpdateHandler } from "./ProcessingService";
import {
  buildResourceTransferDirectory,
  classifyResource,
  isGenericResourceTitle,
  sanitizeResourceTaskName
} from "./ResourceMetadataService";
import { generateShareMessage } from "./ShareMessageTemplateService";

interface OriginalTransferServiceOptions {
  delayMs?: number;
  now?: () => Date;
}

export class OriginalTransferService implements ProcessingService {
  private readonly delayMs: number;
  private readonly now: () => Date;

  constructor(
    private readonly adapter: StorageAdapter,
    options: OriginalTransferServiceOptions = {}
  ) {
    this.delayMs = options.delayMs ?? 120;
    this.now = options.now ?? (() => new Date());
  }

  async createAndRunTask(
    rawText: string,
    options: ProcessingOptions,
    onUpdate?: TaskUpdateHandler
  ): Promise<ProcessingTask> {
    const task = createOriginalDraftTask(rawText, options, this.adapter.mode, this.now());
    emit(task, onUpdate);

    try {
      await runStage(task, "link_parse", "parsing", 8, onUpdate, this.delayMs, async () => undefined);
      const validInputs = task.inputs.filter((input) => input.valid && !input.duplicate);
      if (validInputs.length === 0) {
        throw new Error("没有可转存的有效百度网盘链接");
      }

      await runStage(task, "transfer", "transferring", 58, onUpdate, this.delayMs, async () => {
        await this.reserveResourceDirectory(task);
        await this.adapter.mkdir({ remoteDirectory: task.rawDirectory ?? `${PANJIE_ROOT}/raw/${task.id}` });
        if (options.mergeLinks || validInputs.length === 1) {
          await this.transferInputGroup(task, validInputs, task.rawDirectory ?? `${PANJIE_ROOT}/raw/${task.id}`);
          return;
        }
        for (const input of validInputs) {
          const itemRawPath = `${task.rawDirectory}/${input.id}`;
          await this.adapter.mkdir({ remoteDirectory: itemRawPath });
          await this.transferInputGroup(task, [input], itemRawPath);
        }
      });

      await runStage(task, "create_share", "sharing", 100, onUpdate, this.delayMs, async () => {
        if (!options.autoCreateShareCode) {
          return;
        }
        if (options.mergeLinks || task.taskItems?.length === 1) {
          await this.createSingleShare(task);
          return;
        }
        await this.createSeparateShares(task);
      });

      task.status = task.shareError ? "partial_completed" : "completed";
      task.progress = 100;
    } catch (error) {
      const runningStage = Object.entries(task.stages).find(([, status]) => status === "running")?.[0] as keyof ProcessingTask["stages"] | undefined;
      if (runningStage) task.stages[runningStage] = "failed";
      task.shareError = error instanceof Error ? error.message : "原样转存失败";
      task.status = shouldMarkPartialShareFailure(task.shareError, task) ? "partial_completed" : "failed";
    }

    task.summary = summarizeOriginalTask(task);
    emit(task, onUpdate);
    return cloneTask(task);
  }

  private async transferInputGroup(
    task: ProcessingTask,
    inputs: ProcessingTask["inputs"],
    rawPath: string,
    allowDuplicateRetry = true
  ): Promise<void> {
    for (const input of inputs) {
      const transfer = await this.adapter.transferSharedLink({
        url: input.url,
        extractCode: input.extractCode,
        targetDirectory: rawPath
      });
      if (!transfer.ok) {
        const error = transfer.error ?? "转存失败";
        if (allowDuplicateRetry && isDuplicateRemoteError(error)) {
          const retryPath = await this.reserveDuplicateRetryDirectory(task, rawPath);
          return this.transferInputGroup(task, inputs, retryPath, false);
        }
        throw new Error(`分享链接转存到网盘失败: ${error}`);
      }
      if (transfer.fileCount !== undefined && transfer.fileCount <= 0) {
        throw new Error("转存完成后目录为空，未读取到文件");
      }
    }

    let files = await this.adapter.listFiles({ remoteDirectory: rawPath });
    if (files.length <= 0) {
      throw new Error("转存完成后目录为空，未读取到文件");
    }
    const metadata = classifyResource({
      rawText: classificationRawText(task),
      files,
      savePath: task.resource?.savePath
    });
    const finalized = await this.finalizeResourceDirectoryFromFiles(task, rawPath, files, metadata);
    rawPath = finalized.rawPath;
    files = finalized.files;

    const item: ProcessingTaskItem = {
      id: `item-${(task.taskItems?.length ?? 0) + 1}`,
      inputId: inputs.map((input) => input.id).join(","),
      rawPath,
      fileCount: files.length
    };
    task.taskItems = [...(task.taskItems ?? []), item];
    task.processedFiles = [...task.processedFiles, ...files.map((file) => toProcessedFile(file, rawPath))];
    task.resource = {
      ...finalized.metadata,
      savePath: finalized.savePath
    };
    task.finalShareFileCount = task.processedFiles.length;
    task.summary = summarizeOriginalTask(task);
  }

  private async reserveResourceDirectory(task: ProcessingTask): Promise<void> {
    const parentDirectory = dirname(task.rawDirectory ?? "");
    if (!parentDirectory || parentDirectory === "/") return;
    await this.adapter.mkdir({ remoteDirectory: parentDirectory });
    const existing = await this.adapter.listFiles({ remoteDirectory: parentDirectory }).catch(() => []);
    const directory = buildResourceTransferDirectory({
      createdAt: task.createdAt,
      title: task.resource?.title ?? task.name,
      existingNames: existing.map((file) => file.name)
    });
    task.name = directory.title;
    task.rawDirectory = directory.cliPath;
    task.outputDirectory = directory.cliPath;
    task.resource = {
      ...(task.resource ?? classifyResource({ rawText: task.inputs.map((input) => input.rawLine).join("\n") })),
      title: directory.title,
      savePath: directory.displayPath
    };
  }

  private async reserveDuplicateRetryDirectory(task: ProcessingTask, currentPath: string): Promise<string> {
    const parentDirectory = dirname(currentPath);
    await this.adapter.mkdir({ remoteDirectory: parentDirectory });
    const existing = await this.adapter.listFiles({ remoteDirectory: parentDirectory }).catch(() => []);
    const existingNames = new Set(existing.map((file) => file.name));
    existingNames.add(task.name);
    existingNames.add(basename(currentPath));

    const directory = buildResourceTransferDirectory({
      createdAt: task.createdAt,
      title: task.resource?.title ?? task.name,
      existingNames: [...existingNames]
    });
    await this.adapter.mkdir({ remoteDirectory: directory.cliPath });

    if (normalizePath(currentPath) === normalizePath(task.rawDirectory ?? "")) {
      task.name = directory.title;
      task.rawDirectory = directory.cliPath;
      task.outputDirectory = directory.cliPath;
      task.resource = {
        ...(task.resource ?? classifyResource({ rawText: task.inputs.map((input) => input.rawLine).join("\n") })),
        savePath: directory.displayPath
      };
    }

    return directory.cliPath;
  }

  private async finalizeResourceDirectoryFromFiles(
    task: ProcessingTask,
    rawPath: string,
    files: RemoteFile[],
    metadata: ReturnType<typeof classifyResource>
  ): Promise<{ rawPath: string; files: RemoteFile[]; metadata: ReturnType<typeof classifyResource>; savePath: string }> {
    if (!shouldRenameResourceContainer(task, rawPath, metadata)) {
      return {
        rawPath,
        files,
        metadata,
        savePath: task.resource?.savePath ?? rawPath.replace(/^\/+/, "")
      };
    }

    const parentDirectory = dirname(rawPath);
    const existing = await this.adapter.listFiles({ remoteDirectory: parentDirectory }).catch(() => []);
    const directory = buildResourceTransferDirectory({
      createdAt: task.createdAt,
      title: metadata.title,
      existingNames: existing
        .map((file) => file.name)
        .filter((name) => sanitizeResourceTaskName(name) !== sanitizeResourceTaskName(basename(rawPath)))
    });

    if (normalizePath(directory.cliPath) === normalizePath(rawPath)) {
      return { rawPath, files, metadata, savePath: directory.displayPath };
    }

    const moved = await this.adapter.moveFile({ remotePath: rawPath, targetDirectory: directory.cliPath });
    if (!moved.ok) {
      throw new Error(`保存目录改名失败: ${moved.error ?? "未知错误"}`);
    }

    task.name = directory.title;
    task.rawDirectory = directory.cliPath;
    task.outputDirectory = directory.cliPath;

    return {
      rawPath: directory.cliPath,
      files: files.map((file) => ({
        ...file,
        path: rewriteFilePath(file.path, rawPath, directory.cliPath)
      })),
      metadata: {
        ...metadata,
        savePath: directory.displayPath
      },
      savePath: directory.displayPath
    };
  }

  private async createSingleShare(task: ProcessingTask): Promise<void> {
    const rawPath = task.rawDirectory ?? `${PANJIE_ROOT}/raw/${task.id}`;
    const finalTarget = resolveFinalShareTarget({
      mode: "original",
      rawPath,
      rawFileCount: task.finalShareFileCount ?? task.processedFiles.length
    });
    task.finalShareDirectory = finalTarget.path;
    task.finalShareFileCount = finalTarget.fileCount;

    const shareResult = await this.createShareResult(finalTarget.path);
    task.shareResult = shareResult;
    task.shareTemplateType = task.options.shareTemplate.type;
    task.shareMessage = generateShareMessage({
      task,
      shareResult,
      template: task.options.shareTemplate,
      fileCount: finalTarget.fileCount
    });
    task.taskItems = (task.taskItems ?? []).map((item) => ({
      ...item,
      shareResult,
      messageText: task.shareMessage
    }));
  }

  private async createSeparateShares(task: ProcessingTask): Promise<void> {
    const updatedItems: ProcessingTaskItem[] = [];
    for (const item of task.taskItems ?? []) {
      try {
        const finalTarget = resolveFinalShareTarget({
          mode: "original",
          rawPath: item.rawPath,
          rawFileCount: item.fileCount
        });
        const shareResult = await this.createShareResult(finalTarget.path);
        const messageText = generateShareMessage({
          task: { ...task, finalShareFileCount: item.fileCount, shareResult },
          shareResult,
          template: task.options.shareTemplate,
          fileCount: item.fileCount
        });
        updatedItems.push({ ...item, shareResult, messageText });
        if (!task.shareResult) {
          task.shareResult = shareResult;
          task.finalShareDirectory = finalTarget.path;
          task.finalShareFileCount = item.fileCount;
          task.shareMessage = messageText;
          task.shareTemplateType = task.options.shareTemplate.type;
        }
      } catch (error) {
        const shareError = error instanceof Error ? error.message : "创建分享链接失败";
        updatedItems.push({ ...item, shareError });
        task.shareError = shareError;
      }
    }
    task.taskItems = updatedItems;
    if (task.shareError && !task.shareResult) {
      throw new Error(task.shareError);
    }
  }

  private async createShareResult(remotePath: string): Promise<ShareResult> {
    const share = await this.adapter.createShareLink({ remotePaths: [remotePath], periodDays: 0 });
    if (!share.ok || !share.shareUrl) {
      throw new Error(share.error ?? "创建分享链接失败");
    }
    return {
      source: share.source ?? "manual",
      shareUrl: share.shareUrl,
      extractCode: share.extractCode,
      expireAt: share.expireAt,
      verified: Boolean(share.verified),
      redactedForLog: share.redactedForLog ?? "<redacted-share-url>"
    };
  }
}

function shouldMarkPartialShareFailure(error: string, task: ProcessingTask): boolean {
  if (task.processedFiles.length === 0 || task.stages.create_share !== "failed") {
    return false;
  }
  return !/not absolute path|绝对网盘路径|路径错误/i.test(error);
}

function createOriginalDraftTask(rawText: string, options: ProcessingOptions, adapterMode: ProcessingTask["adapterMode"], now: Date): ProcessingTask {
  const createdAt = now.toISOString();
  const id = `task-${Date.now()}-${hashString(rawText).slice(0, 6)}`;
  const resource = classifyResource({ rawText });
  const directory = buildResourceTransferDirectory({ createdAt, title: resource.title });
  return {
    id,
    name: directory.title,
    createdAt,
    status: "draft",
    progress: 0,
    adapterMode,
    rawDirectory: directory.cliPath,
    outputDirectory: directory.cliPath,
    inputs: parseShareLinks(rawText),
    options,
    stages: createEmptyStages(),
    processedFiles: [],
    taskItems: [],
    resource: {
      ...resource,
      title: directory.title,
      savePath: directory.displayPath
    },
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
  task.summary = summarizeOriginalTask(task);
  emit(task, onUpdate);
}

function toProcessedFile(file: RemoteFile, fallbackDirectory: string): ProcessedFile {
  return {
    id: file.id,
    originalName: file.name,
    newName: file.name,
    category: "保持原样",
    status: "transferred",
    risks: [],
    remotePath: file.path,
    targetDirectory: fallbackDirectory
  };
}

function dirname(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  const index = normalized.lastIndexOf("/");
  return index <= 0 ? "/" : normalized.slice(0, index);
}

function basename(path: string): string {
  const normalized = normalizePath(path);
  const segments = normalized.split("/").filter(Boolean);
  return segments.at(-1) ?? "";
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}

function isDuplicateRemoteError(error: string): boolean {
  return /文件重复|已存在|duplicate|already exists|file exists/i.test(error);
}

function shouldRenameResourceContainer(
  task: ProcessingTask,
  rawPath: string,
  metadata: ReturnType<typeof classifyResource>
): boolean {
  if (normalizePath(rawPath) !== normalizePath(task.rawDirectory ?? "")) return false;
  if (isGenericResourceTitle(metadata.title)) return false;
  const currentName = basename(rawPath);
  if (!isGenericResourceTitle(currentName)) return false;
  return sanitizeResourceTaskName(currentName) !== sanitizeResourceTaskName(metadata.title);
}

function classificationRawText(task: ProcessingTask): string {
  const existingTitle = task.resource?.title;
  return [
    existingTitle && !isGenericResourceTitle(existingTitle) ? existingTitle : "",
    ...task.inputs.map((input) => input.rawLine)
  ]
    .filter(Boolean)
    .join("\n");
}

function rewriteFilePath(path: string, oldBase: string, newBase: string): string {
  const normalizedPath = normalizePath(path);
  const oldAbsolute = normalizePath(oldBase);
  const newAbsolute = normalizePath(newBase);
  const oldDisplay = oldAbsolute.replace(/^\/+/, "");
  const newDisplay = newAbsolute.replace(/^\/+/, "");
  if (normalizedPath.startsWith(`${oldAbsolute}/`)) {
    return `${newAbsolute}${normalizedPath.slice(oldAbsolute.length)}`;
  }
  if (normalizedPath.startsWith(`${oldDisplay}/`)) {
    return `${newDisplay}${normalizedPath.slice(oldDisplay.length)}`;
  }
  return `${newDisplay}/${basename(normalizedPath)}`;
}

function summarizeOriginalTask(task: ProcessingTask): ProcessingTask["summary"] {
  return {
    recognizedFiles: task.processedFiles.length,
    classifiedFiles: 0,
    removedWatermarks: 0,
    removedTrafficItems: 0,
    renamedFiles: 0,
    transferredFiles: task.processedFiles.filter((file) => file.status === "transferred").length,
    failedFiles: task.processedFiles.filter((file) => file.status === "failed").length
  };
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
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function emit(task: ProcessingTask, onUpdate?: TaskUpdateHandler) {
  onUpdate?.(cloneTask(task));
}

function cloneTask(task: ProcessingTask): ProcessingTask {
  return JSON.parse(JSON.stringify(task)) as ProcessingTask;
}
