import { Copy } from "lucide-react";
import type { ShareResult } from "../../domain/types";

export function NewShareInfoBox({
  shareResult,
  shareError,
  onCopy
}: {
  shareResult?: ShareResult;
  shareError?: string;
  onCopy: () => void;
}) {
  return (
    <div className="share-box">
      <div>
        <small>{shareError ? "分享状态" : "新分享链接"}</small>
        <strong>{shareResult?.newShareUrl ?? shareError ?? "等待生成"}</strong>
        <span>
          {shareError
            ? "转存和分类已完成，可手动分享或开通开放平台分享能力。"
            : `提取码：${shareResult?.extractCode ?? "----"} · 有效期：永久有效`}
        </span>
      </div>
      <button className="secondary-btn" type="button" onClick={onCopy} disabled={!shareResult}>
        <Copy size={16} />
        复制分享信息
      </button>
    </div>
  );
}
