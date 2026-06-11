const DEFAULT_REMOTE_ROOT = "盘姬测试";

export function normalizeRemotePath(path: string): string {
  const normalized = String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");
  if (!normalized || normalized === ".") {
    return "";
  }
  return normalized.replace(/\/$/, "");
}

export function joinRemotePath(...parts: Array<string | undefined | null>): string {
  return normalizeRemotePath(parts.filter(Boolean).join("/"));
}

export function toCliAbsolutePath(path: string): string {
  const normalized = normalizeRemotePath(path);
  if (!normalized) {
    return `/${DEFAULT_REMOTE_ROOT}`;
  }
  if (normalized.startsWith("/")) {
    return normalizeRemotePath(`/${normalized.replace(/^\/+/, "")}`);
  }
  if (normalized === DEFAULT_REMOTE_ROOT || normalized.startsWith(`${DEFAULT_REMOTE_ROOT}/`)) {
    return `/${normalized}`;
  }
  return `/${joinRemotePath(DEFAULT_REMOTE_ROOT, normalized)}`;
}

export function toDisplayPath(path: string): string {
  const normalized = normalizeRemotePath(path);
  if (!normalized) {
    return DEFAULT_REMOTE_ROOT;
  }
  return normalized.replace(/^\/+/, "");
}

export function assertCliAbsolutePath(path: string): string {
  const normalized = normalizeRemotePath(path);
  if (!normalized.startsWith("/")) {
    throw new Error("路径错误：CLI 需要绝对网盘路径");
  }
  if (normalized.includes("/./") || normalized.startsWith("./")) {
    throw new Error("路径错误：CLI 需要绝对网盘路径");
  }
  return normalized;
}

export const PANJIE_DISPLAY_ROOT = `${DEFAULT_REMOTE_ROOT}/panjie`;
