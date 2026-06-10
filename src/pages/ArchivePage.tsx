import { MoveRight, Wand2 } from "lucide-react";
import { processedFiles } from "../data/prototypeData";
import { Card, StatCard, StatusDot, Switch, Tag } from "../components/ui";

export function ArchivePage() {
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
        <StatCard icon="▶" label="视频" value="1,248" tone="blue" />
        <StatCard icon="▣" label="文档" value="892" tone="purple" />
        <StatCard icon="▧" label="图片" value="3,176" tone="pink" />
        <StatCard icon="▤" label="其他" value="612" tone="orange" />
      </div>

      <div className="archive-grid">
        <ClassificationRules />
        <ArchiveFileTable />
        <RenamePreviewPanel />
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

function ArchiveFileTable() {
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
            {processedFiles.map((file) => (
              <tr key={file.originalName}>
                <td>{file.originalName}</td>
                <td>{file.category}</td>
                <td>{file.newName}</td>
                <td>{file.targetPath}</td>
                <td>
                  <StatusDot tone={file.status === "done" ? "green" : "orange"} />
                  {file.status === "done" ? "可移动" : "需确认"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RenamePreviewPanel() {
  return (
    <Card title="批量移动与重命名建议" action={<Wand2 size={18} />}>
      <div className="rename-preview">
        <div>
          <span>当前规则</span>
          <b>{`{分类}_{原文件名}_{日期}_{序号}`}</b>
        </div>
        <div>
          <span>目标根目录</span>
          <b>/自动归档/</b>
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
