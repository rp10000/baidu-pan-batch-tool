import { Download, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { getAdapterModeMeta } from "../adapters/adapterMode";
import type { AdapterMode } from "../adapters/adapterMode";
import { TaskResultModal } from "../components/batch/TaskResultModal";
import { ProcessActionChips } from "../components/batch/ProcessActionChips";
import { ProcessedFileTable } from "../components/batch/ProcessedFileTable";
import { RenameRuleForm } from "../components/batch/RenameRuleForm";
import { TaskInputPanel } from "../components/batch/TaskInputPanel";
import { PipelineSteps } from "../components/batch/PipelineSteps";
import { Card, StatCard, Tag } from "../components/ui";
import { inputSample } from "../data/prototypeData";
import type { ProcessingOptions } from "../domain/types";
import { defaultDeepScanOptions, defaultFastScanOptions, defaultStandardScanOptions } from "../domain/scanOptions";
import type { ScanMode, ScanOptions } from "../domain/scanOptions";
import { parseShareLinks } from "../domain/shareParser";
import { MockProcessingService } from "../services/MockProcessingService";
import { RealProcessingService } from "../services/RealProcessingService";
import { exportTaskAsCsv, exportTaskAsJson } from "../services/exportService";
import { openShareLinkForVerification } from "../services/ShareVerificationService";
import { useStorageMode } from "../state/storageModeStore";
import { useTaskStore } from "../state/taskStore";
import type { PageId } from "../types";

const defaultOptions: ProcessingOptions = {
  autoClassify: true,
  autoTransfer: true,
  scanWatermark: false,
  scanTrafficContent: false,
  autoRemoveWatermark: false,
  removeTrafficFields: false,
  autoCreateShareCode: true,
  autoRenameFiles: true,
  renameRule: "{分类}_{日期}_{序号}",
  targetDirectory: "盘姬测试/panjie/output/{taskId}/{分类}",
  scanOptions: defaultFastScanOptions(),
  shareTiming: "share_immediately"
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
  const modeMeta = getAdapterModeMeta(storage.activeMode);
  const primaryActionLabel =
    options.scanOptions.mode === "off"
      ? "开始快速处理"
      : options.scanOptions.mode === "standard"
        ? "开始处理并检查"
        : "开始深度扫描处理";
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
    const canUseRealAdapter =
      storage.activeMode === "windows_local_cli" ||
      (storage.activeMode === "bdpan_wsl" && storage.connectionOk);
    const service = canUseRealAdapter
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
      onToast(taskToast(task));
    } catch (error) {
      onToast(error instanceof Error ? error.message : "真实处理失败");
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

  function setScanMode(scanMode: ScanMode) {
    const scanOptions =
      scanMode === "off"
        ? defaultFastScanOptions()
        : scanMode === "standard"
          ? defaultStandardScanOptions()
          : defaultDeepScanOptions();

    setOptions((current) => ({
      ...current,
      scanOptions,
      scanWatermark: scanOptions.checkWatermark,
      scanTrafficContent: scanOptions.checkContactInfo || scanOptions.checkTrafficWords,
      autoRemoveWatermark: scanOptions.createCleanCopy,
      removeTrafficFields: scanOptions.createCleanCopy
    }));
  }

  function toggleScanOption(key: keyof ScanOptions) {
    setOptions((current) => {
      const value = current.scanOptions[key];
      if (typeof value !== "boolean") {
        return current;
      }
      const scanOptions = {
        ...current.scanOptions,
        enabled: true,
        mode: current.scanOptions.mode === "off" ? "standard" : current.scanOptions.mode,
        [key]: !value
      };
      return {
        ...current,
        scanOptions,
        scanWatermark: scanOptions.checkWatermark,
        scanTrafficContent: scanOptions.checkContactInfo || scanOptions.checkTrafficWords || scanOptions.checkOcrText || scanOptions.checkQrCode,
        autoRemoveWatermark: scanOptions.createCleanCopy,
        removeTrafficFields: scanOptions.createCleanCopy
      };
    });
  }

  function copyShareInfo() {
    if (!activeTask?.shareResult) {
      onToast("当前任务还没有生成分享信息");
      return;
    }
    if (activeTask.shareResult.source === "mock") {
      onToast("Mock 演示链接不可作为真实分享复制");
      return;
    }
    void navigator.clipboard
      ?.writeText(`${activeTask.shareResult.shareUrl}\n提取码：${activeTask.shareResult.extractCode ?? ""}`)
      .catch(() => undefined);
    onToast("已复制分享链接和提取码");
  }

  function openShareInfo() {
    const status = openShareLinkForVerification(activeTask?.shareResult);
    onToast(status === "opened_in_browser" ? "已打开默认浏览器验证链接" : `链接无法打开：${status}`);
  }

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>批量处理</h2>
          <p>输入百度网盘分享链接和提取码，按当前接入模式执行转存、分类、重命名和导出</p>
        </div>
        <div className="page-actions">
          <button className="secondary-btn" type="button">
            <Download size={17} />
            导入 TXT / CSV
          </button>
          <button className="primary-btn" type="button" onClick={startProcess}>
            <Play size={17} />
            {running ? "处理中" : primaryActionLabel}
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
          <ProcessActionChips
            options={options}
            onToggle={toggleOption}
            onScanModeChange={setScanMode}
            onScanToggle={toggleScanOption}
          />
        </div>
        <div className="batch-right">
          <TaskResultModal
            open={modalOpen}
            task={activeTask}
            onClose={() => setModalOpen(false)}
            onCopy={copyShareInfo}
            onViewDetails={() => onNavigate("workbench")}
            onOpenShare={openShareInfo}
            onExportJson={() => activeTask && exportTaskAsJson(activeTask)}
            onExportCsv={() => activeTask && exportTaskAsCsv(activeTask)}
          />
          <div className="kpi-grid compact-kpis">
            <StatCard icon={inputStats.total} label="总链接数" value={inputStats.total} tone="blue" />
            <StatCard icon={inputStats.valid} label="有效链接" value={inputStats.valid} tone="green" />
            <StatCard icon={inputStats.duplicate} label="重复链接" value={inputStats.duplicate} tone="orange" />
            <StatCard icon={inputStats.invalid} label="无效链接" value={inputStats.invalid} tone="pink" />
          </div>
          <Card title="任务流水线" action={<Tag tone={activeTask?.status === "completed" ? "green" : activeTask?.status === "failed" ? "red" : "orange"}>{taskStatusLabel(activeTask?.status)}</Tag>}>
            <PipelineSteps task={activeTask} />
            <span className="progress full-width"><span style={{ width: `${activeTask?.progress ?? 0}%` }} /></span>
            <p className="muted">当前进度：{activeTask?.progress ?? 0}%</p>
          </Card>
          <Card title="接入状态" action={<Tag tone={storage.activeMode === "windows_local_cli" ? "green" : storage.activeMode === "bdpan_wsl" ? "blue" : "orange"}>{modeMeta.badge}</Tag>}>
            <div className="rename-preview">
              <div>
                <span>当前使用</span>
                <b>{modeMeta.label}</b>
              </div>
              <div>
                <span>状态说明</span>
                <b>{modeNotice(storage.activeMode, storage.message)}</b>
              </div>
              <div>
                <span>Windows 主线</span>
                <b>{storage.activeMode === "windows_local_cli" ? "本地 CLI 可做自用 MVP；transfer 需用户测试分享链接" : "bdpan WSL 不可用不会阻塞桌面版主流程开发"}</b>
              </div>
              {storage.activeMode === "windows_local_cli" && (
                <div>
                  <span>真实处理</span>
                  <b>通过 Electron main 调用本地 CLI；失败会显示原因</b>
                </div>
              )}
              {storage.activeMode === "windows_local_cli" && (
                <>
                  <div><span>文件操作</span><b>已验证：ls / mkdir / upload / rename / mv</b></div>
                  <div><span>创建分享</span><b>以真实 CLI 返回为准，失败不显示假链接</b></div>
                  <div><span>分享链接转存</span><b>未验证，缺用户自有测试分享链接</b></div>
                  <div><span>当前结果来源</span><b>{activeTask?.shareResult?.source === "local_cli" ? "真实 CLI" : activeTask?.shareResult?.source === "mock" ? "Mock 演示" : "等待任务结果"}</b></div>
                </>
              )}
            </div>
            {storage.activeMode === "windows_local_cli" && (
              <p className="notice">分享链接转存还未真实验证。请提供一个自有测试分享链接和提取码后运行 transfer smoke。</p>
            )}
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
                    ? `${activeTask.shareResult.source === "mock" ? "Mock 演示：" : ""}${activeTask.shareResult.shareUrl} · 提取码 ${activeTask.shareResult.extractCode ?? "----"}`
                    : "当前页面会按接入模式显示真实结果、降级原因或 Mock 演示结果"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function modeNotice(mode: AdapterMode, message: string): string {
  if (mode === "mock") {
    return "这是演示模式，不会真实转存。";
  }
  if (mode === "windows_native_official") {
    return "当前官方 Windows 原生接入尚未确认支持分享链接转存。可先使用 Mock 演示，或切换到 bdpan WSL 高级模式。";
  }
  if (mode === "windows_local_cli") {
    return "当前接入：Windows 本地 CLI。支持文件管理、转存与分享能力检测；未登录或 bridge 未连接时不得伪造成功。";
  }
  if (mode === "bdpan_wsl") {
    return `bdpan WSL 高级模式：${message}`;
  }
  return message;
}

function taskToast(task: { status: string; shareError?: string; shareResult?: { extractCode?: string } }): string {
  if (task.status === "failed") return `任务失败：${task.shareError ?? "真实处理失败"}`;
  if (task.status === "partial_completed") return `处理完成，分享失败：${task.shareError ?? "创建分享链接失败"}`;
  return `任务完成，已生成分享码 ${task.shareResult?.extractCode ?? "----"}`;
}

function taskStatusLabel(status?: string): string {
  if (!status) return "draft";
  if (status === "partial_completed") return "部分完成";
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  return status;
}
