import { CheckCircle2, FileCheck2, PencilLine, ShieldAlert, Share2, Sparkles, XCircle } from "lucide-react";
import type { ProcessingTask } from "../../domain/types";

export function ResultSummaryCards({ task }: { task: ProcessingTask }) {
  const cards = [
    { icon: <FileCheck2 size={18} />, label: "已识别文件", value: task.summary.recognizedFiles },
    { icon: <CheckCircle2 size={18} />, label: "内容分类", value: task.resource?.contentCategory ?? "未识别" },
    { icon: <ShieldAlert size={18} />, label: "去除水印", value: task.summary.removedWatermarks },
    { icon: <Sparkles size={18} />, label: "清理引流内容", value: task.summary.removedTrafficItems },
    { icon: <PencilLine size={18} />, label: "重命名文件", value: task.summary.renamedFiles },
    { icon: <Share2 size={18} />, label: "成功转存", value: task.summary.transferredFiles },
    { icon: <XCircle size={18} />, label: "失败", value: task.summary.failedFiles, warn: true }
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
