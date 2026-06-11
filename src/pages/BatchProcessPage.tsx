import { Download, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAdapterModeMeta } from "../adapters/adapterMode";
import type { AdapterMode } from "../adapters/adapterMode";
import { TaskResultModal } from "../components/batch/TaskResultModal";
import { ProcessActionChips } from "../components/batch/ProcessActionChips";
import { ProcessedFileTable } from "../components/batch/ProcessedFileTable";
import { RenameRuleForm } from "../components/batch/RenameRuleForm";
import { TaskInputPanel } from "../components/batch/TaskInputPanel";
import { PipelineSteps } from "../components/batch/PipelineSteps";
import { Card, StatCard, Tag } from "../components/ui";
import type { ProcessingOptions } from "../domain/types";
import { defaultDeepScanOptions, defaultFastScanOptions, defaultStandardScanOptions } from "../domain/scanOptions";
import type { ScanMode, ScanOptions } from "../domain/scanOptions";
import { parseShareLinks } from "../domain/shareParser";
import { MockProcessingService } from "../services/MockProcessingService";
import { RealProcessingService } from "../services/RealProcessingService";
import { exportTaskAsCsv, exportTaskAsJson } from "../services/exportService";
import { classifyShareFailure } from "../services/ShareFailureClassifier";
import { openShareLinkForVerification } from "../services/ShareVerificationService";
import { useBatchDraftStore } from "../state/batchDraftStore";
import { useStorageMode } from "../state/storageModeStore";
import { useTaskStore } from "../state/taskStore";
import type { PageId } from "../types";

export function BatchProcessPage({
  onNavigate,
  onToast
}: {
  onNavigate: (page: PageId) => void;
  onToast: (message: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");
  const draft = useBatchDraftStore();
  const input = draft.rawInput;
  const mode = draft.selectedMode;
  const options = draft.options;
  const { activeTask, createTask, updateTask } = useTaskStore();
  const storage = useStorageMode();
  const modeMeta = getAdapterModeMeta(storage.activeMode);
  const localCliBlocked = storage.activeMode === "windows_local_cli" && !storage.connectionOk;
  const localCliStatusText =
    storage.activeMode === "windows_local_cli"
      ? storage.cliRuntime?.loginState === "logged_in"
        ? "已登录"
        : storage.cliRuntime?.cliInstalled
          ? "未登录"
          : "未检测到"
      : storage.connectionOk
        ? "已连接"
        : "未验证";
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

  useEffect(() => {
    if (storage.activeMode === "windows_local_cli" && !storage.cliRuntime && !storage.checking) {
      void storage.refreshCapabilities();
    }
  }, [storage]);

  async function startProcess() {
    if (running) {
      return;
    }
    if (inputStats.valid === 0) {
      onToast("请输入至少一条有效链接");
      return;
    }
    if (localCliBlocked) {
      setBlockedReason(storage.cliRuntime?.message ?? "请先连接百度网盘。打开设置中心后，按教程导入 BDUSS 和 STOKEN。");
      return;
    }

    setRunning(true);
    setBlockedReason("");
    setModalOpen(false);
    let created = false;
    const canUseRealAdapter =
      (storage.activeMode === "windows_local_cli" && storage.connectionOk) ||
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
    const value = options[key];
    if (typeof value !== "boolean") return;
    draft.setOption(key, !value);
  }

  function setScanMode(scanMode: ScanMode) {
    const scanOptions =
      scanMode === "off"
        ? defaultFastScanOptions()
        : scanMode === "standard"
          ? defaultStandardScanOptions()
          : defaultDeepScanOptions();

    draft.setScanModeOptions(scanOptions);
  }

  function toggleScanOption(key: keyof ScanOptions) {
    draft.toggleScanOption(key);
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

  async function retryCreateShare() {
    if (!activeTask?.outputDirectory) {
      onToast("当前任务没有输出目录");
      return;
    }
    setRunning(true);
    const adapter = storage.getActiveAdapter();
    const share = await adapter.createShareLink({ remotePaths: [activeTask.outputDirectory], periodDays: 7 });
    if (share.ok && share.shareUrl) {
      updateTask({
        ...activeTask,
        status: "completed",
        shareError: undefined,
        shareResult: {
          source: share.source ?? "manual",
          shareUrl: share.shareUrl,
          extractCode: share.extractCode,
          expireAt: share.expireAt,
          verified: Boolean(share.verified),
          redactedForLog: share.redactedForLog ?? "<redacted-share-url>"
        },
        stages: { ...activeTask.stages, create_share: "completed" }
      });
      onToast("已重新创建分享链接");
    } else {
      const error = share.error ?? "创建分享链接失败";
      updateTask({
        ...activeTask,
        status: activeTask.processedFiles.length > 0 ? "partial_completed" : "failed",
        shareError: error,
        shareResult: undefined,
        stages: { ...activeTask.stages, create_share: "failed" }
      });
      onToast(`分享失败：${classifyShareFailure(error).message}`);
    }
    setRunning(false);
  }

  function openOutputDirectory() {
    const directory = activeTask?.outputDirectory ?? activeTask?.options.targetDirectory;
    if (!directory) {
      onToast("当前任务没有输出目录");
      return;
    }
    void navigator.clipboard?.writeText(directory).catch(() => undefined);
    onToast("已复制输出目录路径，可到百度网盘中手动打开");
  }

  function showManualShareGuide() {
    onToast("手动分享：打开输出目录，选中文件或目录，使用百度网盘分享功能创建链接");
  }

  function showFailureReason() {
    const failure = classifyShareFailure(activeTask?.shareError);
    onToast(`${failure.label}：${failure.message}`);
  }

  return (
    <section className="page batch-page">
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
          <button className="primary-btn" type="button" onClick={startProcess} disabled={running || localCliBlocked} title={localCliBlocked ? "请先到设置中心连接百度网盘" : undefined}>
            <Play size={17} />
            {localCliBlocked ? "请先连接百度网盘" : running ? "处理中" : primaryActionLabel}
          </button>
        </div>
      </div>
      {(blockedReason || localCliBlocked) && (
        <div className="notice error batch-blocked-notice">
          <b>{blockedReason || storage.cliRuntime?.message || "请先连接百度网盘"}</b>
          <button className="secondary-btn" type="button" onClick={() => onNavigate("settings")}>
            去设置中心连接
          </button>
        </div>
      )}

      <div className="batch-grid">
        <div className="batch-left">
          <TaskInputPanel
            input={input}
            onInputChange={draft.setRawInput}
            mode={mode}
            onModeChange={draft.setSelectedMode}
            stats={inputStats}
            onRestoreSample={draft.restoreSampleInput}
            onClearInput={draft.clearRawInput}
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
            onRetryShare={retryCreateShare}
            onOpenOutput={openOutputDirectory}
            onManualShareGuide={showManualShareGuide}
            onViewFailureReason={showFailureReason}
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
          <Card title="当前处理状态" action={<Tag tone={activeTask?.shareError ? "orange" : storage.activeMode === "windows_local_cli" ? "green" : "blue"}>{modeMeta.badge}</Tag>}>
            <div className="status-grid">
              <div>
                <span>当前模式</span>
                <b>{modeMeta.label}</b>
              </div>
              <div>
                <span>CLI 状态</span>
                <b>{localCliStatusText}</b>
              </div>
              <div>
                <span>分享能力</span>
                <b>{activeTask?.shareResult ? "可用" : activeTask?.shareError ? "失败" : "未验证"}</b>
              </div>
              <div>
                <span>转存能力</span>
                <b>未验证，缺测试分享链接</b>
              </div>
            </div>
            {activeTask?.shareError && (
              <p className="notice error">文件已处理完成，但 BaiduPCS-Go 未能创建分享链接。原因：{classifyShareFailure(activeTask.shareError).message}</p>
            )}
            {storage.activeMode === "windows_local_cli" && (
              <p className={`notice ${storage.connectionOk ? "" : "error"}`}>
                {storage.connectionOk
                  ? "分享链接转存还未真实验证。请提供一个自有测试分享链接和提取码后运行 transfer smoke。"
                  : "请先连接百度网盘。到设置中心打开百度网盘登录页，按教程导入 BDUSS 和 STOKEN 后再重新检测。"}
              </p>
            )}
          </Card>
          <RenameRuleForm
            renameRule={options.renameRule}
            targetDirectory={options.targetDirectory}
            onRenameRuleChange={(renameRule) => draft.setOption("renameRule", renameRule)}
            onTargetDirectoryChange={(targetDirectory) => draft.setOption("targetDirectory", targetDirectory)}
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
  if (task.status === "partial_completed") return `部分完成：${task.shareError ?? "创建分享链接失败"}`;
  return `任务完成，已生成分享码 ${task.shareResult?.extractCode ?? "----"}`;
}

function taskStatusLabel(status?: string): string {
  if (!status) return "draft";
  if (status === "partial_completed") return "部分完成";
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  return status;
}
