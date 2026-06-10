import { processedFiles } from "../../data/prototypeData";
import { StatusDot } from "../ui";

export function ProcessedFileTable() {
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
          {processedFiles.map((file) => (
            <tr key={file.originalName}>
              <td>{file.originalName}</td>
              <td>{file.category}</td>
              <td>{file.newName}</td>
              <td>{file.targetPath}</td>
              <td>
                <StatusDot tone={file.status === "done" ? "green" : "orange"} />
                {file.status === "done" ? "已处理" : "需确认"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
