import { ClipboardCopy, Download, FileJson, Sheet } from "lucide-react";
import type { ProcessingTask } from "../domain/types";
import { exportTaskAsCsv, exportTaskAsJson } from "../services/exportService";
import { classifyShareFailure } from "../services/ShareFailureClassifier";
import { generateShareMessage } from "../services/ShareMessageTemplateService";
import { openShareLinkForVerification, verifyShareResult } from "../services/ShareVerificationService";
import { useTaskStore } from "../state/taskStore";
import { Card, StatCard, StatusDot, Tag } from "../components/ui";

export function ShareExportPage({ onToast }: { onToast: (message: string) => void }) {
  const { tasks, activeTask, selectTask } = useTaskStore();
  const shareTasks = tasks.filter((task) => task.shareResult || task.shareError);
  const failedLinks = tasks.reduce((sum, task) => sum + task.summary.failedFiles, 0);

  function copyShareInfo(task = activeTask) {
    if (!task?.shareResult) {
      onToast("当前任务还没有生成分享信息");
      return;
    }
    if (task.shareResult.source === "mock") {
      onToast("Mock 演示链接不可作为真实分享复制");
      return;
    }
    void navigator.clipboard
      ?.writeText(`${task.shareResult.shareUrl}\n提取码：${task.shareResult.extractCode ?? ""}`)
      .catch(() => undefined);
    onToast("已复制分享信息");
  }

  function copyShareMessage(task = activeTask) {
    if (!task?.shareResult) {
      onToast(task?.shareError ? "分享链接创建失败，无法生成可转发文案" : "当前任务还没有生成分享信息");
      return;
    }
    if (task.shareResult.source === "mock") {
      onToast("Mock 演示链接不可作为真实发货文案复制");
      return;
    }
    const message = task.shareMessage || generateShareMessage({
      task,
      shareResult: task.shareResult,
      template: task.options.shareTemplate,
      fileCount: task.finalShareFileCount
    });
    void navigator.clipboard?.writeText(message).catch(() => undefined);
    onToast("已复制可转发文案");
  }

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>分享导出</h2>
          <p>查看资源标题、内容分类、保存路径、新分享链接和可转发文案，并导出结果。</p>
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
        <ShareTaskTable tasks={tasks} activeTaskId={activeTask?.id} onSelect={selectTask} onCopy={copyShareInfo} onCopyMessage={copyShareMessage} />
        <ShareDetailPanel task={activeTask} onCopy={() => copyShareInfo()} onCopyMessage={() => copyShareMessage()} />
        <ExportSettingsPanel task={activeTask} />
      </div>
    </section>
  );
}

function ShareTaskTable({
  tasks,
  activeTaskId,
  onSelect,
  onCopy,
  onCopyMessage
}: {
  tasks: ProcessingTask[];
  activeTaskId?: string;
  onSelect: (taskId: string) => void;
  onCopy: (task: ProcessingTask) => void;
  onCopyMessage: (task: ProcessingTask) => void;
}) {
  return (
    <Card title="分享任务列表" className="span-2" action={<Tag tone="green">可复制</Tag>}>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>资源标题</th>
              <th>内容分类</th>
              <th>状态</th>
              <th>有效期</th>
              <th>提取码</th>
              <th>可转发文案</th>
              <th>导出</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className={task.id === activeTaskId ? "selected" : ""} onClick={() => onSelect(task.id)}>
                <td>{task.resource?.title ?? task.name}</td>
                <td>{task.resource?.contentCategory ?? "未识别"}</td>
                <td>
                  <StatusDot tone={task.shareResult ? "green" : task.shareError ? "orange" : "orange"} />
                  {task.shareResult?.source === "mock" ? "Mock 演示" : task.shareResult ? "已生成" : task.shareError ? "需人工" : "待生成"}
                </td>
                <td>永久有效</td>
                <td>{task.shareResult?.source === "mock" ? "演示" : task.shareResult?.extractCode ?? "----"}</td>
                <td>{task.shareMessage ? "已生成" : task.shareError ? "不可生成" : "待生成"}</td>
                <td>{task.status === "completed" || task.status === "partial_completed" ? "可导出" : task.status === "failed" ? "失败" : "处理中"}</td>
                <td>
                  <button className="text-btn" type="button" onClick={() => onCopy(task)} disabled={!task.shareResult || task.shareResult.source === "mock"}>
                    链接
                  </button>
                  <button className="text-btn" type="button" onClick={() => onCopyMessage(task)} disabled={!task.shareResult || task.shareResult.source === "mock" || Boolean(task.shareError)}>
                    文案
                  </button>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={8}>暂无分享任务，先完成批量处理。</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ShareDetailPanel({ task, onCopy, onCopyMessage }: { task?: ProcessingTask; onCopy: () => void; onCopyMessage: () => void }) {
  const verification = verifyShareResult(task?.shareResult);
  const isMock = task?.shareResult?.source === "mock";
  function openShare() {
    openShareLinkForVerification(task?.shareResult);
  }

  return (
    <Card title="分享详情" action={<Tag tone={task?.shareError ? "orange" : isMock ? "blue" : "green"}>{task?.shareError ? "失败" : isMock ? "Mock" : "已生成"}</Tag>}>
      <div className="form-grid one">
        <label>
          <span>资源标题</span>
          <input className="input" value={task?.resource?.title ?? task?.name ?? "暂无任务"} readOnly />
        </label>
        <label>
          <span>内容分类</span>
          <input className="input" value={task?.resource?.contentCategory ?? "未识别"} readOnly />
        </label>
        <label>
          <span>保存路径</span>
          <input className="input" value={task?.resource?.savePath ?? "盘姬资源库/转存记录/{日期}/{任务名}"} readOnly />
        </label>
        <label>
          <span>新分享链接</span>
          <input className="input" value={task?.shareResult?.shareUrl ?? "未生成分享链接"} readOnly />
        </label>
        <label>
          <span>提取码</span>
          <input className="input" value={isMock ? "Mock 演示" : task?.shareResult?.extractCode ?? "----"} readOnly />
        </label>
        <label>
          <span>有效期</span>
          <input className="input" value="永久有效" readOnly />
        </label>
        <label>
          <span>检查状态</span>
          <input
            className="input"
            value={checkStatusLabel(task)}
            readOnly
          />
        </label>
        <label>
          <span>结果来源</span>
          <input className="input" value={task?.shareResult?.source === "local_cli" ? `真实 CLI / ${verification}` : task?.shareResult?.source === "mock" ? "Mock 演示链接，不可真实访问" : "未生成"} readOnly />
        </label>
        <label>
          <span>可转发文案</span>
          <textarea
            className="textarea template-textarea"
            value={task?.shareMessage ?? (task?.shareResult ? generateShareMessage({ task, shareResult: task.shareResult, template: task.options.shareTemplate, fileCount: task.finalShareFileCount }) : "生成分享链接后将自动生成可转发文案。")}
            readOnly
          />
        </label>
      </div>
      {task?.shareError && (
        <p className="notice error">分享失败：{classifyShareFailure(task.shareError).message}。不会导出假链接，请在百度网盘中手动分享输出目录。</p>
      )}
      <div className="dual-actions">
        <button className="primary-btn full" type="button" onClick={onCopy} disabled={isMock || !task?.shareResult}>
          <ClipboardCopy size={17} />
          复制分享信息
        </button>
        <button className="secondary-btn full" type="button" onClick={openShare} disabled={verification !== "format_valid"}>
          打开链接验证
        </button>
        <button className="secondary-btn full" type="button" onClick={onCopyMessage} disabled={isMock || !task?.shareResult || Boolean(task.shareError)}>
          复制可转发文案
        </button>
      </div>
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

function checkStatusLabel(task?: ProcessingTask): string {
  if (task?.resource?.checkStatus === "checked") return "已检查";
  if (task?.resource?.checkStatus === "pending") return "等待检查";
  if (task?.resource?.checkStatus === "unsupported") return "功能未接线";
  return task?.options.scanOptions.enabled ? "等待检查" : "未检查";
}
