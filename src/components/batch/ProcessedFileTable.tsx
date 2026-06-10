import type { ProcessedFile } from "../../domain/types";
import { StatusDot } from "../ui";

export function ProcessedFileTable({
  files,
  targetDirectory
}: {
  files: ProcessedFile[];
  targetDirectory: string;
}) {
  return (
    <div className="table-scroll compact">
      <table>
        <thead>
          <tr>
            <th>原文件</th>
            <th>分类</th>
            <th>新文件名</th>
            <th>目标目录</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.originalName}>
              <td>{file.originalName}</td>
              <td>{file.category}</td>
              <td>{file.newName}</td>
              <td>{targetDirectory.replace("{分类}", file.category)}</td>
              <td>
                <StatusDot tone={file.status === "failed" ? "red" : file.status === "skipped" ? "orange" : "green"} />
                {statusLabel(file.status)}
              </td>
            </tr>
          ))}
          {files.length === 0 && (
            <tr>
              <td colSpan={5}>暂无处理后文件，输入链接后开始处理。</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function statusLabel(status: ProcessedFile["status"]): string {
  const labels: Record<ProcessedFile["status"], string> = {
    transferred: "已转存",
    cleaned: "已清理",
    failed: "失败",
    skipped: "未转存"
  };
  return labels[status];
}
