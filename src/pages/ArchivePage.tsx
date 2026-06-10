import { MoveRight, Wand2 } from "lucide-react";
import type { ProcessedFile } from "../domain/types";
import { useTaskStore } from "../state/taskStore";
import { Card, StatCard, StatusDot, Switch, Tag } from "../components/ui";

export function ArchivePage() {
  const { activeTask } = useTaskStore();
  const files = activeTask?.processedFiles ?? [];

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>资源归档</h2>
          <p>自动分类规则、文件分类结果、新文件名预览、目标目录与批量移动建议</p>
        </div>
        <button className="primary-btn" type="button">
          <MoveRight size={18} />
          应用分类
        </button>
      </div>

      <div className="kpi-grid">
        <StatCard icon="▶" label="视频" value={countByExtension(files, [".mp4", ".mkv", ".avi"])} tone="blue" />
        <StatCard icon="▣" label="文档" value={countByExtension(files, [".pdf", ".docx", ".pptx", ".txt"])} tone="purple" />
        <StatCard icon="▧" label="图片" value={countByExtension(files, [".jpg", ".png", ".webp"])} tone="pink" />
        <StatCard icon="▤" label="其他" value={countOther(files)} tone="orange" />
      </div>

      <div className="archive-grid">
        <ClassificationRules />
        <ArchiveFileTable files={files} targetDirectory={activeTask?.options.targetDirectory ?? "/自动归档/{分类}"} />
        <RenamePreviewPanel
          renameRule={activeTask?.options.renameRule ?? "{分类}_{原文件名}_{日期}_{序号}"}
          targetDirectory={activeTask?.options.targetDirectory ?? "/自动归档/{分类}"}
        />
      </div>
    </section>
  );
}

function ClassificationRules() {
  return (
    <Card title="自动分类规则" action={<Tag>规则启用</Tag>}>
      {[
        ["视频文件", ".mp4 .mkv .avi", true],
        ["文档文件", ".pdf .docx .pptx", true],
        ["图片文件", ".jpg .png .webp", true],
        ["压缩包", ".zip .rar .7z", true],
        ["未知类型", "进入未分类目录", false]
      ].map(([name, desc, checked]) => (
        <div className="rule-row" key={String(name)}>
          <span>
            <b>{name}</b>
            <small>{desc}</small>
          </span>
          <Switch checked={Boolean(checked)} />
        </div>
      ))}
    </Card>
  );
}

function ArchiveFileTable({ files, targetDirectory }: { files: ProcessedFile[]; targetDirectory: string }) {
  return (
    <Card title="文件分类结果" className="span-2" action={<Tag tone="green">重命名预览</Tag>}>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>原文件名</th>
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
                  <StatusDot tone={file.status === "failed" ? "red" : "green"} />
                  {file.status === "failed" ? "需确认" : "可移动"}
                </td>
              </tr>
            ))}
            {files.length === 0 && (
              <tr>
                <td colSpan={5}>暂无分类结果，先完成一条批量处理任务。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RenamePreviewPanel({ renameRule, targetDirectory }: { renameRule: string; targetDirectory: string }) {
  return (
    <Card title="批量移动与重命名建议" action={<Wand2 size={18} />}>
      <div className="rename-preview">
        <div>
          <span>当前规则</span>
          <b>{renameRule}</b>
        </div>
        <div>
          <span>目标根目录</span>
          <b>{targetDirectory}</b>
        </div>
        <div>
          <span>冲突处理</span>
          <b>自动追加序号</b>
        </div>
      </div>
      <button className="secondary-btn full" type="button">生成重命名建议</button>
    </Card>
  );
}

function countByExtension(files: ProcessedFile[], extensions: string[]): number {
  return files.filter((file) => extensions.some((extension) => file.originalName.toLowerCase().endsWith(extension))).length;
}

function countOther(files: ProcessedFile[]): number {
  const known = [".mp4", ".mkv", ".avi", ".pdf", ".docx", ".pptx", ".txt", ".jpg", ".png", ".webp"];
  return files.filter((file) => !known.some((extension) => file.originalName.toLowerCase().endsWith(extension))).length;
}
