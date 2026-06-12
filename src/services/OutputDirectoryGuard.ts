import type { TransferMode } from "../domain/types";

export interface FinalShareTargetInput {
  mode: TransferMode;
  rawPath: string;
  outputPath?: string;
  cleanedPath?: string;
  rawFileCount: number;
  outputFileCount?: number;
  cleanedFileCount?: number;
}

export interface FinalShareTarget {
  path: string;
  fileCount: number;
}

export function resolveFinalShareTarget(input: FinalShareTargetInput): FinalShareTarget {
  if (input.mode === "original") {
    return requireNonEmpty({ path: input.rawPath, fileCount: input.rawFileCount });
  }
  if (input.mode === "archive") {
    return requireNonEmpty({ path: input.outputPath ?? input.rawPath, fileCount: input.outputFileCount ?? input.rawFileCount });
  }
  if ((input.cleanedFileCount ?? 0) > 0 && input.cleanedPath) {
    return requireNonEmpty({ path: input.cleanedPath, fileCount: input.cleanedFileCount ?? 0 });
  }
  return requireNonEmpty({ path: input.outputPath ?? input.rawPath, fileCount: input.outputFileCount ?? input.rawFileCount });
}

export function assertNonEmptyFinalShareDirectory(path: string, fileCount: number): void {
  if (!path.trim()) {
    throw new Error("输出目录为空，未创建分享链接");
  }
  if (fileCount <= 0) {
    throw new Error("输出目录为空，未创建分享链接");
  }
}

function requireNonEmpty(target: FinalShareTarget): FinalShareTarget {
  assertNonEmptyFinalShareDirectory(target.path, target.fileCount);
  return target;
}

