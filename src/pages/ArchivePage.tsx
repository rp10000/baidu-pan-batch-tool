import { ClipboardList, Tags } from "lucide-react";
import type { ProcessingTask, ResourceContentCategory } from "../domain/types";
import { useTaskStore } from "../state/taskStore";
import { Card, StatCard, StatusDot, Tag } from "../components/ui";

const CATEGORIES: ResourceContentCategory[] = [
  "课程资料",
  "设计素材",
  "文档模板",
  "软件工具",
  "电子书/PDF",
  "图片素材",
  "音频资料",
  "视频素材",
  "综合资料包",
  "未识别"
];

export function ArchivePage() {
  const { activeTask, tasks } = useTaskStore();
  const category = activeTask?.resource?.contentCategory ?? "未识别";

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>资源归档</h2>
          <p>这里展示资源内容分类，用于发货文案和导出；默认不移动、不重命名网盘里的文件。</p>
        </div>
        <button className="primary-btn" type="button" disabled>
          <Tags size={18} />
          手动改分类
        </button>
      </div>

      <div className="kpi-grid">
        <StatCard icon="类" label="当前分类" value={category} tone="blue" />
        <StatCard icon="存" label="保存路径" value={activeTask?.resource?.savePath ? 1 : 0} tone="green" />
        <StatCard icon="文" label="文件数量" value={activeTask?.summary.recognizedFiles ?? 0} tone="purple" />
        <StatCard icon="检" label="检查状态" value={checkStatusLabel(activeTask)} tone="orange" />
      </div>

      <div className="archive-grid">
        <ResourceCategoryPanel task={activeTask} />
        <ResourceHistoryTable tasks={tasks} activeTaskId={activeTask?.id} />
        <OriginalFilesPanel task={activeTask} />
      </div>
    </section>
  );
}

function ResourceCategoryPanel({ task }: { task?: ProcessingTask }) {
  return (
    <Card title="资源分类结果" action={<Tag tone="green">资源级分类</Tag>}>
      <div className="rename-preview">
        <div>
          <span>资源标题</span>
          <b>{task?.resource?.title ?? task?.name ?? "暂无任务"}</b>
        </div>
        <div>
          <span>内容分类</span>
          <b>{task?.resource?.contentCategory ?? "未识别"}</b>
        </div>
        <div>
          <span>内容摘要</span>
          <b>{task?.resource?.contentSummary ?? "完成转存后自动识别资源内容。"}</b>
        </div>
        <div>
          <span>保存路径</span>
          <b>{task?.resource?.savePath ?? "盘姬资源库/转存记录/{日期}/{任务名}"}</b>
        </div>
      </div>
    </Card>
  );
}

function ResourceHistoryTable({ tasks, activeTaskId }: { tasks: ProcessingTask[]; activeTaskId?: string }) {
  return (
    <Card title="最近资源分类" className="span-2" action={<Tag>不改变文件结构</Tag>}>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>资源标题</th>
              <th>内容分类</th>
              <th>保存路径</th>
              <th>检查状态</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className={task.id === activeTaskId ? "selected" : ""}>
                <td>{task.resource?.title ?? task.name}</td>
                <td>{task.resource?.contentCategory ?? "未识别"}</td>
                <td>{task.resource?.savePath ?? task.rawDirectory ?? "未生成"}</td>
                <td>{checkStatusLabel(task)}</td>
                <td>
                  <StatusDot tone={task.status === "failed" ? "red" : task.status === "partial_completed" ? "orange" : "green"} />
                  {task.status === "partial_completed" ? "部分完成" : task.status === "failed" ? "失败" : "已完成"}
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5}>暂无资源分类结果，先完成一条原样转存任务。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function OriginalFilesPanel({ task }: { task?: ProcessingTask }) {
  return (
    <Card title="原样文件说明" action={<ClipboardList size={18} />}>
      <div className="rename-preview">
        <div>
          <span>文件名</span>
          <b>保持原名</b>
        </div>
        <div>
          <span>目录结构</span>
          <b>保持原结构</b>
        </div>
        <div>
          <span>可选分类</span>
          <b>{CATEGORIES.join(" / ")}</b>
        </div>
      </div>
      <p className="notice">分类只用于判断这份资源属于什么内容，方便你转发和导出，不会默认整理网盘文件夹。</p>
      <p className="muted">当前任务文件数：{task?.summary.recognizedFiles ?? 0}</p>
    </Card>
  );
}

function checkStatusLabel(task?: ProcessingTask): string {
  if (task?.resource?.checkStatus === "checked") return "已检查";
  if (task?.resource?.checkStatus === "pending") return "等待检查";
  if (task?.resource?.checkStatus === "unsupported") return "功能未接线";
  return "未检查";
}
