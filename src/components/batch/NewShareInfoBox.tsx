import { Copy, ExternalLink } from "lucide-react";
import type { ShareResult } from "../../domain/types";
import { classifyShareFailure } from "../../services/ShareFailureClassifier";
import { verifyShareResult } from "../../services/ShareVerificationService";

export function NewShareInfoBox({
  shareResult,
  shareError,
  onCopy,
  onOpen
}: {
  shareResult?: ShareResult;
  shareError?: string;
  onCopy: () => void;
  onOpen?: () => void;
}) {
  const verification = verifyShareResult(shareResult);
  const isMock = shareResult?.source === "mock";
  const hasFailure = Boolean(shareError);
  const canOpen = !hasFailure && shareResult?.source === "local_cli" && verification === "format_valid";
  const failure = shareError ? classifyShareFailure(shareError) : undefined;

  return (
    <div className={`share-box ${shareError ? "failed" : ""}`}>
      <div>
        <small>{shareError ? "分享状态" : isMock ? "Mock 演示链接" : "新分享链接"}</small>
        <strong>{shareError ? "创建分享链接失败" : shareResult?.shareUrl ?? "等待生成"}</strong>
        <span>
          {shareError
            ? `原因：${failure?.message ?? shareError}。建议：重新创建分享，或打开输出目录后手动分享。`
            : isMock
              ? "Mock 演示链接，不可真实访问。"
              : `提取码：${shareResult?.extractCode ?? "----"} · 验证：${verification}`}
        </span>
      </div>
      <div className="share-actions">
        <button className="secondary-btn" type="button" onClick={onCopy} disabled={!shareResult || isMock || hasFailure}>
          <Copy size={16} />
          复制分享信息
        </button>
        <button className="secondary-btn" type="button" onClick={onOpen} disabled={!canOpen}>
          <ExternalLink size={16} />
          打开链接验证
        </button>
      </div>
    </div>
  );
}
