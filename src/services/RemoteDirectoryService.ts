import type { RemoteFile } from "../adapters/StorageAdapter";

export type RemoteDirectoryEnsureStatus = "created" | "already_exists";
export type RemotePathKind = "directory" | "file" | "unknown";

export interface RemoteDirectoryProbeResult {
  ok: boolean;
  kind?: RemotePathKind;
  entries?: RemoteFile[];
  error?: string;
}

export interface RemoteDirectoryCreateResult {
  ok: boolean;
  error?: string;
}

export interface RemoteDirectoryAdapter {
  list(path: string): Promise<RemoteDirectoryProbeResult>;
  mkdir(path: string): Promise<RemoteDirectoryCreateResult>;
}

export interface RemoteDirectoryEnsureResult {
  ok: boolean;
  status?: RemoteDirectoryEnsureStatus;
  error?: string;
}

export async function ensureRemoteDir(
  path: string,
  adapter: RemoteDirectoryAdapter
): Promise<RemoteDirectoryEnsureResult> {
  const existing = await adapter.list(path);
  if (existing.ok) {
    if (existing.kind === "file") {
      return { ok: false, error: "path_conflict_file" };
    }
    return { ok: true, status: "already_exists" };
  }

  const created = await adapter.mkdir(path);
  if (created.ok) {
    return { ok: true, status: "created" };
  }

  if (!isAlreadyExistsError(created.error)) {
    return { ok: false, error: created.error ?? "mkdir_failed" };
  }

  const confirmed = await adapter.list(path);
  if (confirmed.ok && confirmed.kind !== "file") {
    return { ok: true, status: "already_exists" };
  }
  if (confirmed.ok && confirmed.kind === "file") {
    return { ok: false, error: "path_conflict_file" };
  }
  return { ok: false, error: confirmed.error ?? created.error ?? "mkdir_conflict_unconfirmed" };
}

export function isAlreadyExistsError(error?: string): boolean {
  return /31061|already exists|file exists|exists|文件已存在|目录已存在/i.test(error ?? "");
}
