import { Activity, Archive, CheckCircle2, Clock3, FileScan, Share2, Zap } from "lucide-react";
import { PIPELINE_LABELS, PIPELINE_ORDER } from "../domain/pipeline";
import { useTaskStore } from "../state/taskStore";
import { useStorageMode } from "../state/storageModeStore";
import type { PageId } from "../types";
import { Card, StatCard, StatusDot, Tag } from "../components/ui";

export function WorkbenchPage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { tasks, activeTask, selectTask } = useTaskStore();
  const storage = useStorageMode();
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const riskCount = tasks.reduce((sum, task) => sum + task.processedFiles.flatMap((file) => file.risks).length, 0);
  const transferredCount = tasks.reduce((sum, task) => sum + task.summary.transferredFiles, 0);
  const shareCount = tasks.filter((task) => task.shareResult).length;

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>任务工作台</h2>
          <p>全流程概览、当前队列、最近活动和快捷入口</p>
        </div>
        <button className="primary-btn" type="button" onClick={() => onNavigate("batch")}>
          <Zap size={18} />
          开始批量处理
        </button>
      </div>

      <div className="kpi-grid">
        <StatCard icon={<CheckCircle2 />} label="完成任务" value={completedTasks.length} tone="green" />
        <StatCard icon={<FileScan />} label="风险命中" value={riskCount} tone="pink" />
        <StatCard icon={<Archive />} label="成功转存" value={transferredCount} tone="purple" />
        <StatCard icon={<Share2 />} label="新分享码" value={shareCount} tone="orange" />
      </div>

      <div className="dashboard-grid">
        <Card title="当前处理队列" action={<Tag tone="green">运行中</Tag>} className="span-2">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>任务</th>
                  <th>阶段</th>
                  <th>进度</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className={task.id === activeTask?.id ? "selected" : ""} onClick={() => selectTask(task.id)}>
                    <td>{task.name}</td>
                    <td>{currentStageLabel(task)}</td>
                    <td>
                      <span className="progress">
                        <span style={{ width: `${task.progress}%` }} />
                      </span>
                      <em>{task.progress}%</em>
                    </td>
                    <td>
                      <StatusDot tone={task.status === "completed" ? "green" : task.status === "failed" ? "red" : "orange"} />
                      {task.status === "completed" ? "已完成" : task.status === "failed" ? "失败" : "处理中"}
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={4}>暂无任务，先从批量处理页创建一条任务。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="全流程概览" action={<Activity size={18} />}>
          <div className="flow-stack">
            {["粘贴链接", "识别提取码", "转存分类", "扫描风险", "生成分享码"].map((item, index) => (
              <div className="flow-item" key={item}>
                <b>{index + 1}</b>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="快速处理状态" action={<Tag tone="green">默认</Tag>}>
          <div className="rename-preview">
            <div><span>当前接入模式</span><b>{storage.displayName}</b></div>
            <div><span>主流程</span><b>转存 → 分类 → 重命名 → 移动 → 分享</b></div>
            <div><span>扫描状态</span><b>{activeTask?.options.scanOptions.enabled ? "按需扫描已启用" : "扫描未启用，快速完成"}</b></div>
          </div>
        </Card>

        <Card title="深度扫描任务" action={<Tag tone={activeTask?.options.scanOptions.mode === "deep" ? "orange" : "blue"}>按需</Tag>}>
          <div className="rename-preview">
            <div><span>OCR / QR</span><b>{activeTask?.options.scanOptions.enabled ? "按任务选项执行" : "未初始化"}</b></div>
            <div><span>视频抽帧</span><b>{activeTask?.options.scanOptions.scanVideo ? "已启用" : "未启用"}</b></div>
            <div><span>清理副本</span><b>{activeTask?.options.scanOptions.createCleanCopy ? "生成副本" : "未启用"}</b></div>
          </div>
        </Card>

        <Card title="最近活动">
          <div className="activity-list">
            {recentActivitiesFromTasks(tasks).map((activity) => (
              <div className="activity-row" key={activity}>
                <Clock3 size={16} />
                <span>{activity}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="快捷入口" className="span-2">
          <div className="quick-grid">
            <button type="button" onClick={() => onNavigate("batch")}>批量处理</button>
            <button type="button" onClick={() => onNavigate("scan")}>扫描检查</button>
            <button type="button" onClick={() => onNavigate("archive")}>资源归档</button>
            <button type="button" onClick={() => onNavigate("share")}>分享导出</button>
          </div>
        </Card>
      </div>
    </section>
  );
}

function currentStageLabel(task: ReturnType<typeof useTaskStore>["tasks"][number]): string {
  const runningStage = PIPELINE_ORDER.find((stage) => task.stages[stage] === "running");
  if (runningStage) {
    return PIPELINE_LABELS[runningStage];
  }
  if (task.status === "completed") {
    return "生成分享码";
  }
  return "等待处理";
}

function recentActivitiesFromTasks(tasks: ReturnType<typeof useTaskStore>["tasks"]): string[] {
  if (tasks.length === 0) {
    return ["暂无最近活动"];
  }

  return tasks.slice(0, 4).map((task) => {
    const risks = task.processedFiles.flatMap((file) => file.risks).length;
    return `${task.name}：${task.summary.recognizedFiles} 个文件，${risks} 个风险项，进度 ${task.progress}%`;
  });
}
