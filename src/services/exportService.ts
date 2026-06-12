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
    "资源标题",
    "内容分类",
    "内容摘要",
    "保存路径",
    "检查状态",
    "原文件名",
    "新文件名",
    "分类",
    "风险项",
    "风险处理状态",
    "转存状态",
    "新分享链接",
    "提取码",
    "模板类型",
    "可转发文案",
    "文件数量",
    "任务状态"
  ];
  const rows = task.processedFiles.map((file) => [
    task.id,
    task.name,
    task.createdAt,
    task.resource?.title ?? task.name,
    task.resource?.contentCategory ?? "未识别",
    task.resource?.contentSummary ?? "",
    task.resource?.savePath ?? "",
    task.resource?.checkStatus ?? "unchecked",
    file.originalName,
    file.newName,
    file.category,
    file.risks.map((risk) => risk.label).join(" / "),
    file.risks.map((risk) => risk.action).join(" / "),
    file.status,
    task.shareResult?.source === "mock" ? "" : task.shareResult?.shareUrl ?? "",
    task.shareResult?.source === "mock" ? "" : task.shareResult?.extractCode ?? "",
    task.shareTemplateType ?? task.options.shareTemplate.type,
    task.shareResult?.source === "mock" ? "" : task.shareMessage ?? "",
    String(task.finalShareFileCount ?? task.processedFiles.length),
    task.status
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  downloadTextFile(`${task.id}.csv`, `\ufeff${csv}`, "text/csv;charset=utf-8");
}

function toExportPayload(task: ProcessingTask) {
  return {
    taskId: task.id,
    taskName: task.name,
    createdAt: task.createdAt,
    resource: task.resource,
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
    templateType: task.shareTemplateType ?? task.options.shareTemplate.type,
    messageText: task.shareResult?.source === "mock" ? undefined : task.shareMessage,
    fileCount: task.finalShareFileCount ?? task.processedFiles.length,
    status: task.status,
    shareResult: task.shareResult?.source === "mock" ? undefined : task.shareResult
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
