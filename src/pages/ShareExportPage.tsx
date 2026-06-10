import { ClipboardCopy, Download, FileJson, Sheet } from "lucide-react";
import type { ProcessingTask } from "../domain/types";
import { exportTaskAsCsv, exportTaskAsJson } from "../services/exportService";
import { useTaskStore } from "../state/taskStore";
import { Card, StatCard, StatusDot, Tag } from "../components/ui";

export function ShareExportPage({ onToast }: { onToast: (message: string) => void }) {
  const { tasks, activeTask, selectTask } = useTaskStore();
  const shareTasks = tasks.filter((task) => task.shareResult);
  const failedLinks = tasks.reduce((sum, task) => sum + task.summary.failedFiles, 0);

  function copyShareInfo(task = activeTask) {
    if (!task?.shareResult) {
      onToast("当前任务还没有生成分享信息");
      return;
    }
    void navigator.clipboard
      ?.writeText(`${task.shareResult.newShareUrl}\n提取码：${task.shareResult.extractCode}`)
      .catch(() => undefined);
    onToast("已复制分享信息");
  }

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>分享导出</h2>
          <p>查看转存后的新分享链接、提取码、分享状态、有效期并导出结果</p>
        </div>
        <button className="primary-btn" type="button" onClick={() => activeTask && exportTaskAsCsv(activeTask)}>
          <Download size={18} />
          批量导出
        </button>
      </div>

      <div className="kpi-grid">
        <StatCard icon="✓" label="可分享任务" value={shareTasks.length} tone="green" />
        <StatCard icon="!" label="失败文件" value={failedLinks} tone="pink" />
        <StatCard icon="+" label="今日新增分享" value={shareTasks.length} tone="blue" />
        <StatCard icon="↓" label="可导出任务" value={tasks.length} tone="orange" />
      </div>

      <div className="share-grid">
        <ShareTaskTable tasks={tasks} activeTaskId={activeTask?.id} onSelect={selectTask} onCopy={copyShareInfo} />
        <ShareDetailPanel task={activeTask} onCopy={() => copyShareInfo()} />
        <ExportSettingsPanel task={activeTask} />
      </div>
    </section>
  );
}

function ShareTaskTable({
  tasks,
  activeTaskId,
  onSelect,
  onCopy
}: {
  tasks: ProcessingTask[];
  activeTaskId?: string;
  onSelect: (taskId: string) => void;
  onCopy: (task: ProcessingTask) => void;
}) {
  return (
    <Card title="分享任务列表" className="span-2" action={<Tag tone="green">可复制</Tag>}>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>任务名称</th>
              <th>状态</th>
              <th>有效期</th>
              <th>提取码</th>
              <th>导出</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className={task.id === activeTaskId ? "selected" : ""} onClick={() => onSelect(task.id)}>
                <td>{task.name}</td>
                <td>
                  <StatusDot tone={task.shareResult ? "green" : "orange"} />
                  {task.shareResult ? "已生成" : "待生成"}
                </td>
                <td>永久有效</td>
                <td>{task.shareResult?.extractCode ?? "----"}</td>
                <td>{task.status === "completed" ? "可导出" : "处理中"}</td>
                <td>
                  <button className="text-btn" type="button" onClick={() => onCopy(task)}>
                    复制
                  </button>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6}>暂无分享任务，先完成批量处理。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ShareDetailPanel({ task, onCopy }: { task?: ProcessingTask; onCopy: () => void }) {
  return (
    <Card title="分享详情" action={<Tag tone="green">已生成</Tag>}>
      <div className="form-grid one">
        <label>
          <span>新分享链接</span>
          <input className="input" value={task?.shareResult?.newShareUrl ?? "等待生成"} readOnly />
        </label>
        <label>
          <span>提取码</span>
          <input className="input" value={task?.shareResult?.extractCode ?? "----"} readOnly />
        </label>
        <label>
          <span>有效期</span>
          <input className="input" value="永久有效" readOnly />
        </label>
      </div>
      <button className="primary-btn full" type="button" onClick={onCopy}>
        <ClipboardCopy size={17} />
        复制分享信息
      </button>
    </Card>
  );
}

function ExportSettingsPanel({ task }: { task?: ProcessingTask }) {
  return (
    <Card title="导出设置" action={<Tag>字段选择</Tag>}>
      <div className="export-grid">
        <button type="button" onClick={() => task && exportTaskAsCsv(task)}>
          <Sheet size={20} />
          CSV
        </button>
        <button type="button">
          <Sheet size={20} />
          Excel
        </button>
        <button type="button" onClick={() => task && exportTaskAsJson(task)}>
          <FileJson size={20} />
          JSON
        </button>
      </div>
      <div className="chip-list">
        {["任务基本信息", "链接信息", "分享状态", "处理记录", "风险报告"].map((field, index) => (
          <span className={`chip ${index < 4 ? "checked" : ""}`} key={field}>{field}</span>
        ))}
      </div>
    </Card>
  );
}
