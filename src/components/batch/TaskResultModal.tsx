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
          <span>转存目录</span>
          <b>{task.rawDirectory ?? "Mock 输入目录"}</b>
        </div>
        <div>
          <span>输出目录</span>
          <b>{task.outputDirectory ?? task.options.targetDirectory}</b>
        </div>
        <div>
          <span>扫描状态</span>
          <b>{task.options.scanOptions.enabled ? `${task.options.scanOptions.mode} 扫描按需执行` : "扫描未启用"}</b>
        </div>
        <div>
          <span>清理副本</span>
          <b>{task.options.scanOptions.createCleanCopy ? "已请求生成清理副本" : "未启用"}</b>
        </div>
      </div>
      <NewShareInfoBox shareResult={task.shareResult} shareError={task.shareError} onCopy={onCopy} onOpen={onOpenShare} />
      <ProcessedFileTable files={task.processedFiles} targetDirectory={task.options.targetDirectory} />
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
        <button className="primary-btn" type="button" onClick={onClose}>
          完成
        </button>
      </div>
    </div>
  );
}

function resultTitle(task: ProcessingTask): string {
  if (task.shareResult?.source === "mock") return "Mock 演示完成";
  if (task.status === "partial_completed") return "处理完成，分享失败";
  if (task.status === "failed") return "任务失败";
  return "任务完成";
}
