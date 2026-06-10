import { Download, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { TaskResultModal } from "../components/batch/TaskResultModal";
import { ProcessActionChips } from "../components/batch/ProcessActionChips";
import { ProcessedFileTable } from "../components/batch/ProcessedFileTable";
import { RenameRuleForm } from "../components/batch/RenameRuleForm";
import { TaskInputPanel } from "../components/batch/TaskInputPanel";
import { PipelineSteps } from "../components/batch/PipelineSteps";
import { Card, StatCard, Tag } from "../components/ui";
import { inputSample } from "../data/prototypeData";
import type { ProcessingOptions } from "../domain/types";
import { parseShareLinks } from "../domain/shareParser";
import { MockProcessingService } from "../services/MockProcessingService";
import { RealProcessingService } from "../services/RealProcessingService";
import { exportTaskAsCsv, exportTaskAsJson } from "../services/exportService";
import { useStorageMode } from "../state/storageModeStore";
import { useTaskStore } from "../state/taskStore";
import type { PageId } from "../types";

const defaultOptions: ProcessingOptions = {
  autoClassify: true,
  autoTransfer: true,
  scanWatermark: true,
  scanTrafficContent: true,
  autoRemoveWatermark: true,
  removeTrafficFields: true,
  autoCreateShareCode: true,
  autoRenameFiles: true,
  renameRule: "{分类}_{日期}_{序号}",
  targetDirectory: "panjie/output/{taskId}/{分类}"
};

export function BatchProcessPage({
  onNavigate,
  onToast
}: {
  onNavigate: (page: PageId) => void;
  onToast: (message: string) => void;
}) {
  const [input, setInput] = useState(inputSample);
  const [mode, setMode] = useState<"single" | "batch">("batch");
  const [options, setOptions] = useState<ProcessingOptions>(defaultOptions);
  const [modalOpen, setModalOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const { activeTask, createTask, updateTask } = useTaskStore();
  const storage = useStorageMode();
  const parsedInputs = useMemo(() => parseShareLinks(input), [input]);
  const inputStats = useMemo(
    () => ({
      total: parsedInputs.length,
      valid: parsedInputs.filter((item) => item.valid && !item.duplicate).length,
      duplicate: parsedInputs.filter((item) => item.duplicate).length,
      invalid: parsedInputs.filter((item) => !item.valid).length
    }),
    [parsedInputs]
  );

  async function startProcess() {
    if (running) {
      return;
    }
    if (inputStats.valid === 0) {
      onToast("请输入至少一条有效链接");
      return;
    }

    setRunning(true);
    setModalOpen(false);
    let created = false;
    const service =
      storage.activeMode === "bdpan_cli"
        ? new RealProcessingService(storage.getActiveAdapter())
        : new MockProcessingService();
    try {
      const task = await service.createAndRunTask(input, options, (snapshot) => {
        if (!created) {
          createTask(snapshot);
          created = true;
          return;
        }
        updateTask(snapshot);
      });
      updateTask(task);
      setModalOpen(true);
      onToast(task.shareError ? `任务完成，${task.shareError}` : `任务完成，已生成新分享码 ${task.shareResult?.extractCode ?? "----"}`);
    } finally {
      setRunning(false);
    }
  }

  function toggleOption(key: keyof ProcessingOptions) {
    setOptions((current) => {
      const value = current[key];
      if (typeof value !== "boolean") {
        return current;
      }

      return {
        ...current,
        [key]: !value
      };
    });
  }

  function copyShareInfo() {
    if (!activeTask?.shareResult) {
      onToast("当前任务还没有生成分享信息");
      return;
    }
    void navigator.clipboard
      ?.writeText(`${activeTask.shareResult.newShareUrl}\n提取码：${activeTask.shareResult.extractCode}`)
      .catch(() => undefined);
    onToast("已复制分享链接和提取码");
  }

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>批量处理</h2>
          <p>粘贴他人网盘链接，识别提取码，执行分类、转存、扫描、重命名并生成新分享码</p>
        </div>
        <div className="page-actions">
          <button className="secondary-btn" type="button">
            <Download size={17} />
            导入 TXT / CSV
          </button>
          <button className="primary-btn" type="button" onClick={startProcess}>
            <Play size={17} />
            {running ? "处理中" : "开始处理"}
          </button>
        </div>
      </div>

      <div className="batch-grid">
        <div className="batch-left">
          <TaskInputPanel
            input={input}
            onInputChange={setInput}
            mode={mode}
            onModeChange={setMode}
            stats={inputStats}
          />
          <ProcessActionChips options={options} onToggle={toggleOption} />
        </div>
        <div className="batch-right">
          <TaskResultModal
            open={modalOpen}
            task={activeTask}
            onClose={() => setModalOpen(false)}
            onCopy={copyShareInfo}
            onViewDetails={() => onNavigate("workbench")}
            onExportJson={() => activeTask && exportTaskAsJson(activeTask)}
            onExportCsv={() => activeTask && exportTaskAsCsv(activeTask)}
          />
          <div className="kpi-grid compact-kpis">
            <StatCard icon={inputStats.total} label="总链接数" value={inputStats.total} tone="blue" />
            <StatCard icon={inputStats.valid} label="有效链接" value={inputStats.valid} tone="green" />
            <StatCard icon={inputStats.duplicate} label="重复链接" value={inputStats.duplicate} tone="orange" />
            <StatCard icon={inputStats.invalid} label="无效链接" value={inputStats.invalid} tone="pink" />
          </div>
          <Card title="任务流水线" action={<Tag tone={activeTask?.status === "completed" ? "green" : "orange"}>{activeTask?.status ?? "draft"}</Tag>}>
            <PipelineSteps task={activeTask} />
            <span className="progress full-width"><span style={{ width: `${activeTask?.progress ?? 0}%` }} /></span>
            <p className="muted">当前进度：{activeTask?.progress ?? 0}%</p>
          </Card>
          <Card title="真实接入状态" action={<Tag tone={storage.activeMode === "bdpan_cli" ? "green" : "orange"}>{modeLabel(storage.activeMode)}</Tag>}>
            <div className="rename-preview">
              <div>
                <span>当前接入</span>
                <b>{modeLabel(storage.activeMode)}</b>
              </div>
              <div>
                <span>bdpan 状态</span>
                <b>{storage.message}</b>
              </div>
              <div>
                <span>输出目录</span>
                <b>我的应用数据 / bdpan / panjie</b>
              </div>
            </div>
          </Card>
          <RenameRuleForm
            renameRule={options.renameRule}
            targetDirectory={options.targetDirectory}
            onRenameRuleChange={(renameRule) => setOptions((current) => ({ ...current, renameRule }))}
            onTargetDirectoryChange={(targetDirectory) => setOptions((current) => ({ ...current, targetDirectory }))}
          />
          <Card title="处理后文件重命名预览" action={<Tag tone="green">可导出</Tag>}>
            <ProcessedFileTable files={activeTask?.processedFiles ?? []} targetDirectory={options.targetDirectory} />
          </Card>
          <Card title="新分享链接和提取码">
            <div className="new-share-list">
              <div>
                <b>{activeTask?.name ?? "等待任务完成"}</b>
                <span>
                  {activeTask?.shareResult
                    ? `${activeTask.shareResult.newShareUrl} · 提取码 ${activeTask.shareResult.extractCode}`
                    : "开始处理后生成 mock 分享信息"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function modeLabel(mode: string): string {
  const labels: Record<string, string> = {
    mock: "Mock",
    bdpan_cli: "bdpan CLI",
    baidu_mcp: "百度 MCP",
    baidu_sdk: "百度 SDK"
  };
  return labels[mode] ?? mode;
}
