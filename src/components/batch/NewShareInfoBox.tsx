import { Copy } from "lucide-react";
import type { ShareResult } from "../../domain/types";

export function NewShareInfoBox({ shareResult, onCopy }: { shareResult?: ShareResult; onCopy: () => void }) {
  return (
    <div className="share-box">
      <div>
        <small>新分享链接</small>
        <strong>{shareResult?.newShareUrl ?? "等待生成"}</strong>
        <span>提取码：{shareResult?.extractCode ?? "----"} · 有效期：永久有效</span>
      </div>
      <button className="secondary-btn" type="button" onClick={onCopy} disabled={!shareResult}>
        <Copy size={16} />
        复制分享信息
      </button>
    </div>
  );
}
