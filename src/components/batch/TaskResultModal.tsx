import { X } from "lucide-react";
import type { ProcessingTask } from "../../domain/types";
import { NewShareInfoBox } from "./NewShareInfoBox";
import { PipelineSteps } from "./PipelineSteps";
import { ProcessedFileTable } from "./ProcessedFileTable";
import { ResultSummaryCards } from "./ResultSummaryCards";

export function TaskResultModal({
  open,
  task,
  onClose,
  onCopy,
  onCopyMessage,
  onOpenShare,
  onRetryShare,
  onOpenOutput,
  onManualShareGuide,
  onViewFailureReason,
  onViewDetails,
  onExportJson,
  onExportCsv
}: {
  open: boolean;
  task?: ProcessingTask;
  onClose: () => void;
  onCopy: () => void;
  onCopyMessage: () => void;
  onOpenShare: () => void;
  onRetryShare: () => void;
  onOpenOutput: () => void;
  onManualShareGuide: () => void;
  onViewFailureReason: () => void;
  onViewDetails: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
}) {
  if (!open || !task) return null;
  const title = resultTitle(task);
  const tone = task.status === "failed" ? "failed" : task.status === "partial_completed" ? "partial" : "success";
  const canCopyShare = Boolean(task.shareResult && task.shareResult.source !== "mock" && !task.shareError);
  const canCopyMessage = canCopyShare && Boolean(task.shareMessage);
  const hasShareFailure = Boolean(task.shareError);

  return (
    <div className="modal-card result-modal" role="dialog" aria-label="任务结果弹窗">
      <button className="icon-close" type="button" onClick={onClose} aria-label="关闭">
        <X size={18} />
      </button>
      <div className="modal-title">
        <span className={`success-mark ${tone}`}>{task.status === "failed" || task.status === "partial_completed" ? "!" : "✓"}</span>
        {title}
      </div>
      <PipelineSteps task={task} />
      <ResultSummaryCards task={task} />
      <div className="rename-preview modal-directory">
        <div>
          <span>资源标题</span>
          <b>{task.resource?.title ?? task.name}</b>
        </div>
        <div>
          <span>内容分类</span>
          <b>{task.resource?.contentCategory ?? "未识别"}</b>
        </div>
        <div>
          <span>内容摘要</span>
          <b>{task.resource?.contentSummary ?? "原样转存，文件名和目录结构保持不变。"}</b>
        </div>
        <div>
          <span>转存目录</span>
          <b>{task.resource?.savePath ?? task.rawDirectory ?? "Mock 输入目录"}</b>
        </div>
        <div>
          <span>最终分享目录</span>
          <b>{task.resource?.savePath ?? task.finalShareDirectory ?? task.outputDirectory ?? task.rawDirectory ?? task.options.targetDirectory}</b>
        </div>
        <div>
          <span>检查状态</span>
          <b>{checkStatusLabel(task)}</b>
        </div>
        <div>
          <span>文件数量</span>
          <b>{task.finalShareFileCount ?? task.summary.recognizedFiles}</b>
        </div>
      </div>
      <NewShareInfoBox shareResult={task.shareResult} shareError={task.shareError} onCopy={onCopy} onOpen={onOpenShare} />
      {task.shareMessage && !task.shareError && (
        <div className="share-message-preview modal-message-preview">
          <b>可转发文案</b>
          <pre>{task.shareMessage}</pre>
        </div>
      )}
      <ProcessedFileTable files={task.processedFiles} targetDirectory={task.finalShareDirectory ?? task.options.targetDirectory} />
      <div className="modal-actions">
        {hasShareFailure && (
          <>
            <button className="primary-btn" type="button" onClick={onRetryShare}>
              重新创建分享
            </button>
            <button className="secondary-btn" type="button" onClick={onOpenOutput}>
              打开输出目录
            </button>
            <button className="secondary-btn" type="button" onClick={onManualShareGuide}>
              手动分享指引
            </button>
            <button className="secondary-btn" type="button" onClick={onViewFailureReason}>
              查看失败原因
            </button>
          </>
        )}
        <button className="secondary-btn" type="button" onClick={onViewDetails}>
          查看详情
        </button>
        <button className="secondary-btn" type="button" onClick={onExportJson}>
          导出 JSON
        </button>
        <button className="secondary-btn" type="button" onClick={onExportCsv}>
          导出 CSV
        </button>
        <button className="secondary-btn" type="button" onClick={onCopy} disabled={!canCopyShare}>
          复制分享信息
        </button>
        <button className="secondary-btn" type="button" onClick={onCopyMessage} disabled={!canCopyMessage}>
          复制可转发文案
        </button>
        <button className="primary-btn" type="button" onClick={onClose}>
          完成
        </button>
      </div>
    </div>
  );
}

function resultTitle(task: ProcessingTask): string {
  if (task.shareResult?.source === "mock") return "Mock 演示完成";
  if (task.status === "partial_completed") return "转存成功，分享失败";
  if (task.status === "failed") return task.stages.transfer === "failed" ? "转存失败" : "任务失败";
  if (task.options.transferMode === "original") return "原样转存完成";
  return "任务完成";
}

function checkStatusLabel(task: ProcessingTask): string {
  if (task.resource?.checkStatus === "checked") return "已检查";
  if (task.resource?.checkStatus === "pending") return "等待检查";
  if (task.resource?.checkStatus === "unsupported") return "功能未接线";
  return task.options.scanOptions.enabled ? `${task.options.scanOptions.mode} 检查按需执行` : "未检查";
}
