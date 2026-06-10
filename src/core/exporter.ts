export type TaskStatus = "pending" | "running" | "success" | "failed" | "manual_required" | "skipped";

export interface ProcessingTask {
  id: string;
  sourceUrl: string;
  extractionCode?: string;
  status: TaskStatus;
  targetPath?: string;
  category?: string;
  newShareLink?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const CSV_HEADERS: Array<[keyof ProcessingTask | "errorRedacted", string]> = [
  ["id", "任务ID"],
  ["sourceUrl", "原链接"],
  ["extractionCode", "提取码"],
  ["status", "状态"],
  ["targetPath", "目标目录"],
  ["category", "分类"],
  ["newShareLink", "新分享链接"],
  ["errorRedacted", "错误原因"],
  ["createdAt", "创建时间"],
  ["updatedAt", "更新时间"]
];

export function exportTasksToCsv(tasks: ProcessingTask[]): string {
  const rows = [
    CSV_HEADERS.map(([, label]) => escapeCsv(label)).join(","),
    ...tasks.map((task) => {
      return CSV_HEADERS.map(([field]) => {
        const value = field === "errorRedacted" ? (task.error ? "已省略" : "") : task[field] ?? "";
        return escapeCsv(String(value));
      }).join(",");
    })
  ];

  return `\ufeff${rows.join("\r\n")}`;
}

function escapeCsv(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}
