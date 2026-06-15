import { Download, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TaskResultModal } from "../components/batch/TaskResultModal";
import { ProcessActionChips } from "../components/batch/ProcessActionChips";
import { ProcessedFileTable } from "../components/batch/ProcessedFileTable";
import { RenameRuleForm } from "../components/batch/RenameRuleForm";
import { TaskInputPanel } from "../components/batch/TaskInputPanel";
import { PipelineSteps } from "../components/batch/PipelineSteps";
import { Card, StatCard, Tag } from "../components/ui";
import type { ProcessingOptions, ProcessingTask, ShareTemplateSettings } from "../domain/types";
import { defaultDeepScanOptions, defaultFastScanOptions, defaultStandardScanOptions } from "../domain/scanOptions";
import type { ScanMode, ScanOptions } from "../domain/scanOptions";
import { parseShareLinks } from "../domain/shareParser";
import { MockProcessingService } from "../services/MockProcessingService";
import { OriginalTransferService } from "../services/OriginalTransferService";
import { RealProcessingService } from "../services/RealProcessingService";
import { exportTaskAsCsv, exportTaskAsJson } from "../services/exportService";
import { classifyShareFailure } from "../services/ShareFailureClassifier";
import { generateShareMessage, getShareTemplateOptions, getShareTemplateText } from "../services/ShareMessageTemplateService";
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
  const localCliBlocked = storage.activeMode === "windows_local_cli" && !storage.connectionOk;
  const primaryActionLabel =
    options.transferMode === "original"
      ? "开始原样转存"
      : options.transferMode === "archive"
        ? "开始整理转存"
        : "开始检测处理";
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
      ? options.transferMode === "original"
        ? new OriginalTransferService(storage.getActiveAdapter())
        : new RealProcessingService(storage.getActiveAdapter())
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
    const text = activeTask.shareMessage || generateShareMessage({
      task: activeTask,
      shareResult: activeTask.shareResult,
      template: options.shareTemplate,
      fileCount: activeTask.finalShareFileCount
    });
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    onToast("已复制分享信息");
  }

  function openShareInfo() {
    const status = openShareLinkForVerification(activeTask?.shareResult);
    onToast(status === "opened_in_browser" ? "已打开默认浏览器验证链接" : `链接无法打开：${status}`);
  }

  async function retryCreateShare() {
    const task = activeTask;
    if (!task) {
      onToast("当前任务没有输出目录");
      return;
    }
    const directory = task.finalShareDirectory ?? task.outputDirectory ?? task.rawDirectory;
    if (!directory) {
      onToast("当前任务没有输出目录");
      return;
    }
    setRunning(true);
    const adapter = storage.getActiveAdapter();
    const share = await adapter.createShareLink({ remotePaths: [directory], periodDays: 0 });
    if (share.ok && share.shareUrl) {
      const shareResult = {
        source: share.source ?? "manual",
        shareUrl: share.shareUrl,
        extractCode: share.extractCode,
        expireAt: share.expireAt,
        verified: Boolean(share.verified),
        redactedForLog: share.redactedForLog ?? "<redacted-share-url>"
      } as const;
      const shareMessage = generateShareMessage({
        task: { ...task, shareResult },
        shareResult,
        template: options.shareTemplate,
        fileCount: task.finalShareFileCount
      });
      updateTask({
        ...task,
        status: "completed",
        shareError: undefined,
        shareResult,
        shareMessage,
        shareTemplateType: options.shareTemplate.type,
        stages: { ...task.stages, create_share: "completed" }
      });
      onToast("已重新创建分享链接");
    } else {
      const error = share.error ?? "创建分享链接失败";
      updateTask({
        ...task,
        status: task.processedFiles.length > 0 ? "partial_completed" : "failed",
        shareError: error,
        shareResult: undefined,
        stages: { ...task.stages, create_share: "failed" }
      });
      onToast(`分享失败：${classifyShareFailure(error).message}`);
    }
    setRunning(false);
  }

  function openOutputDirectory() {
    const directory = activeTask?.resource?.savePath ?? activeTask?.outputDirectory ?? activeTask?.options.targetDirectory;
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

  function updateShareTemplate(nextTemplate: typeof options.shareTemplate) {
    draft.setOption("shareTemplate", nextTemplate);
    if (!activeTask?.shareResult) return;
    const shareMessage = generateShareMessage({
      task: activeTask,
      shareResult: activeTask.shareResult,
      template: nextTemplate,
      fileCount: activeTask.finalShareFileCount
    });
    updateTask({
      ...activeTask,
      options: { ...activeTask.options, shareTemplate: nextTemplate },
      shareTemplateType: nextTemplate.type,
      shareMessage
    });
  }

  return (
    <section className="page batch-page">
      <div className="page-title">
        <div>
          <h2>任务处理</h2>
          <p>粘贴百度网盘分享文本，原样转存到资源库，识别资源分类，并生成可直接转发的中文文案。</p>
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
          {options.transferMode === "original" ? (
            <Card title="保存目录" action={<Tag tone="green">原样保存</Tag>}>
              <div className="rename-preview">
                <div>
                  <span>正式路径</span>
                  <b>{activeTask?.resource?.savePath ?? "盘姬资源库/转存记录/{日期}/{任务名}"}</b>
                </div>
              </div>
            </Card>
          ) : (
            <RenameRuleForm
              renameRule={options.renameRule}
              targetDirectory={options.targetDirectory}
              onRenameRuleChange={(renameRule) => draft.setOption("renameRule", renameRule)}
              onTargetDirectoryChange={(targetDirectory) => draft.setOption("targetDirectory", targetDirectory)}
            />
          )}
          <ShareTemplateCard
            task={activeTask}
            template={options.shareTemplate}
            onTemplateChange={updateShareTemplate}
            onToast={onToast}
          />
          <Card title="原样转存文件列表" action={<Tag tone="green">文件名保持不变</Tag>}>
            <ProcessedFileTable files={activeTask?.processedFiles ?? []} targetDirectory={activeTask?.resource?.savePath ?? options.targetDirectory} />
          </Card>
          <Card title="新分享链接和提取码">
            <div className="new-share-list">
              <div>
                <b>{activeTask?.resource?.title ?? activeTask?.name ?? "等待任务完成"}</b>
                <span>
                  {activeTask?.shareResult
                    ? `${activeTask.shareResult.source === "mock" ? "Mock 演示：" : ""}${activeTask.shareResult.shareUrl} · 提取码 ${activeTask.shareResult.extractCode ?? "----"}`
                    : "当前页面会按接入模式显示真实结果、降级原因或 Mock 演示结果"}
                </span>
                <small>{activeTask?.resource ? `分类：${activeTask.resource.contentCategory} · 保存：${activeTask.resource.savePath}` : "保存路径：盘姬资源库/转存记录/{日期}/{任务名}"}</small>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function taskToast(task: { status: string; shareError?: string; shareResult?: { extractCode?: string } }): string {
  if (task.status === "failed") return `任务失败：${task.shareError ?? "真实处理失败"}`;
  if (task.status === "partial_completed") return `部分完成：${task.shareError ?? "创建分享链接失败"}`;
  return `原样转存完成，已生成分享码 ${task.shareResult?.extractCode ?? "----"}`;
}

function taskStatusLabel(status?: string): string {
  if (!status) return "draft";
  if (status === "partial_completed") return "部分完成";
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  return status;
}

function ShareTemplateCard({
  task,
  template,
  onTemplateChange,
  onToast
}: {
  task?: ProcessingTask;
  template: ShareTemplateSettings;
  onTemplateChange: (template: ShareTemplateSettings) => void;
  onToast: (message: string) => void;
}) {
  const templateDetail = template.type === "custom"
    ? template.customTemplate || getShareTemplateText("xiaohongshu_virtual")
    : template.customTemplate || getShareTemplateText(template.type);
  const previewTemplate = template.type === "custom"
    ? { ...template, customTemplate: templateDetail }
    : template;
  const preview = task?.shareError
    ? "分享链接创建失败，无法生成可转发文案。"
    : task?.shareResult
      ? generateShareMessage({
          task,
          shareResult: task.shareResult,
          template: previewTemplate,
          fileCount: task.finalShareFileCount
        })
      : "生成分享链接后将自动生成可转发文案。";
  const templateOptions = getShareTemplateOptions();
  const canCopyPreview = Boolean(task?.shareResult && !task?.shareError);

  function selectTemplate(type: ShareTemplateSettings["type"]) {
    onTemplateChange({
      ...template,
      type,
      customTemplate: type === "custom" ? templateDetail : ""
    });
  }

  function editTemplateDetail(value: string) {
    onTemplateChange({
      ...template,
      type: "custom",
      customTemplate: value
    });
  }

  function copyPreview() {
    if (!canCopyPreview) {
      onToast("生成真实分享链接后才能复制文案");
      return;
    }
    void navigator.clipboard?.writeText(preview).catch(() => undefined);
    onToast("已复制文案");
  }

  return (
    <Card title="分享文案模板" action={<Tag tone="pink">{template.type === "custom" ? "自定义文案" : "默认小红书发货"}</Tag>}>
      <div className="form-grid">
        <label>
          <span>模板类型</span>
          <select className="input" value={template.type} onChange={(event) => selectTemplate(event.target.value as ShareTemplateSettings["type"])}>
            {templateOptions.map((option) => (
              <option value={option.value} key={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field-label" htmlFor="share-template-detail">模板详情</label>
      <textarea
        id="share-template-detail"
        className="input share-template-detail"
        value={templateDetail}
        onChange={(event) => editTemplateDetail(event.target.value)}
        rows={7}
        spellCheck={false}
      />
      <div className={`share-message-preview ${task?.shareError ? "failed" : ""}`}>
        <b>可转发文案预览</b>
        <pre>{preview}</pre>
      </div>
      <div className="form-actions right">
        <button className="secondary-btn" type="button" onClick={copyPreview} disabled={!canCopyPreview}>
          复制文案
        </button>
      </div>
    </Card>
  );
}
