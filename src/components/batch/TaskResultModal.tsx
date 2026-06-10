import { X } from "lucide-react";
import { NewShareInfoBox } from "./NewShareInfoBox";
import { PipelineSteps } from "./PipelineSteps";
import { ProcessedFileTable } from "./ProcessedFileTable";
import { ResultSummaryCards } from "./ResultSummaryCards";

export function TaskResultModal({
  open,
  onClose,
  onCopy
}: {
  open: boolean;
  onClose: () => void;
  onCopy: () => void;
}) {
  if (!open) return null;

  return (
    <div className="modal-card result-modal" role="dialog" aria-label="任务完成弹窗">
      <button className="icon-close" type="button" onClick={onClose} aria-label="关闭">
        <X size={18} />
      </button>
      <div className="modal-title">
        <span className="success-mark">✓</span>
        任务处理完成
      </div>
      <PipelineSteps />
      <ResultSummaryCards />
      <NewShareInfoBox onCopy={onCopy} />
      <ProcessedFileTable />
      <div className="modal-actions">
        <button className="secondary-btn" type="button" onClick={onClose}>
          留在此页
        </button>
        <button className="primary-btn" type="button" onClick={onCopy}>
          复制并继续
        </button>
      </div>
    </div>
  );
}
