import type { ProcessingTask } from "../domain/types";

export function exportTaskAsJson(task: ProcessingTask): void {
  downloadTextFile(
    `${task.id}.json`,
    JSON.stringify(toExportPayload(task), null, 2),
    "application/json;charset=utf-8"
  );
}

export function exportTaskAsCsv(task: ProcessingTask): void {
  const headers = [
    "任务 ID",
    "任务名称",
    "创建时间",
    "原文件名",
    "新文件名",
    "分类",
    "风险项",
    "风险处理状态",
    "转存状态",
    "新分享链接",
    "提取码"
  ];
  const rows = task.processedFiles.map((file) => [
    task.id,
    task.name,
    task.createdAt,
    file.originalName,
    file.newName,
    file.category,
    file.risks.map((risk) => risk.label).join(" / "),
    file.risks.map((risk) => risk.action).join(" / "),
    file.status,
    task.shareResult?.newShareUrl ?? "",
    task.shareResult?.extractCode ?? ""
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  downloadTextFile(`${task.id}.csv`, `\ufeff${csv}`, "text/csv;charset=utf-8");
}

function toExportPayload(task: ProcessingTask) {
  return {
    taskId: task.id,
    taskName: task.name,
    createdAt: task.createdAt,
    files: task.processedFiles.map((file) => ({
      originalName: file.originalName,
      newName: file.newName,
      category: file.category,
      risks: file.risks.map((risk) => ({
        label: risk.label,
        action: risk.action
      })),
      status: file.status
    })),
    shareResult: task.shareResult
  };
}

function escapeCsv(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
