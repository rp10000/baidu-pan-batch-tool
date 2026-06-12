import { classifyCommandProbeResult, type CommandProbeStatus } from "./CommandTimeoutService";

export type DependencyCategory = "core" | "recommended" | "scan_runtime";
export type DependencySource = "embedded" | "path" | "missing" | "user_selected";

export interface DependencyProbeItem {
  name: string;
  status: CommandProbeStatus;
  path: string;
  source: DependencySource;
  category: DependencyCategory;
  version: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function createDependencyProbeItem(input: {
  name: string;
  executablePath?: string;
  source?: DependencySource;
  category: DependencyCategory;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
}): DependencyProbeItem {
  const status = classifyCommandProbeResult({
    executablePath: input.executablePath,
    exitCode: input.exitCode,
    timedOut: input.timedOut
  });
  return {
    name: input.name,
    status,
    path: input.executablePath ?? "",
    source: input.source ?? (input.executablePath ? "path" : "missing"),
    category: input.category,
    version: firstLine(`${input.stdout ?? ""}\n${input.stderr ?? ""}`),
    exitCode: input.exitCode ?? (status === "missing" ? 127 : status === "timeout" ? 124 : 1),
    stdout: input.stdout ?? "",
    stderr: input.stderr ?? (status === "missing" ? `${input.name} not found` : "")
  };
}

export function skippedDependencyProbeItem(name: string, reason: string): DependencyProbeItem {
  return {
    name,
    status: "skipped_dependency_missing",
    path: "",
    source: "missing",
    category: "scan_runtime",
    version: "",
    exitCode: 127,
    stdout: "",
    stderr: reason
  };
}

export function dependencyStatusText(item: Pick<DependencyProbeItem, "status" | "version" | "stderr">): string {
  if (item.status === "found") return item.version || "可用";
  if (item.status === "timeout") return "检测超时";
  if (item.status === "skipped_dependency_missing") return item.stderr || "依赖缺失，已跳过";
  if (item.status === "error") return item.stderr || "检测错误";
  return item.stderr || "未检测到";
}

function firstLine(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}
