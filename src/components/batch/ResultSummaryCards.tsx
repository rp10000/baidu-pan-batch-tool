import { CheckCircle2, FileCheck2, Share2, XCircle } from "lucide-react";
import type { ProcessingTask } from "../../domain/types";

export function ResultSummaryCards({ task }: { task: ProcessingTask }) {
  const cards = [
    { icon: <FileCheck2 size={18} />, label: "已识别文件", value: task.summary.recognizedFiles },
    { icon: <CheckCircle2 size={18} />, label: "内容分类", value: task.resource?.contentCategory ?? "未识别" },
    { icon: <Share2 size={18} />, label: "成功转存", value: task.summary.transferredFiles },
    { icon: <XCircle size={18} />, label: task.shareError ? "分享失败" : "失败", value: task.shareError ? 1 : task.summary.failedFiles, warn: Boolean(task.shareError) || task.summary.failedFiles > 0 }
  ];

  return (
    <div className="summary-grid">
      {cards.map((card) => (
        <div className={`summary-card ${card.warn ? "warn" : ""}`} key={card.label}>
          {card.icon}
          <span>{card.label}</span>
          <b>{card.value}</b>
        </div>
      ))}
    </div>
  );
}
