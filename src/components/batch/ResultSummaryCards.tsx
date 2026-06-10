import { CheckCircle2, FileCheck2, ShieldAlert, Share2 } from "lucide-react";

export function ResultSummaryCards() {
  return (
    <div className="summary-grid">
      <div className="summary-card">
        <FileCheck2 size={18} />
        <span>识别链接</span>
        <b>3</b>
      </div>
      <div className="summary-card">
        <CheckCircle2 size={18} />
        <span>成功转存</span>
        <b>2</b>
      </div>
      <div className="summary-card warn">
        <ShieldAlert size={18} />
        <span>风险待确认</span>
        <b>1</b>
      </div>
      <div className="summary-card">
        <Share2 size={18} />
        <span>新分享码</span>
        <b>2</b>
      </div>
    </div>
  );
}
