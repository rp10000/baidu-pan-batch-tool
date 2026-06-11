import { Copy, ExternalLink } from "lucide-react";
import type { ShareResult } from "../../domain/types";
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
  const canOpen = shareResult?.source === "local_cli" && verification === "format_valid";

  return (
    <div className="share-box">
      <div>
        <small>{shareError ? "分享状态" : isMock ? "Mock 演示链接" : "新分享链接"}</small>
        <strong>{shareResult?.shareUrl ?? shareError ?? "等待生成"}</strong>
        <span>
          {shareError
            ? "操作建议：1. 检查 CLI 远程路径是否为绝对路径；2. 重新运行分享；3. 手动在百度网盘中分享输出目录。"
            : isMock
              ? "Mock 演示链接，不可真实访问。"
              : `提取码：${shareResult?.extractCode ?? "----"} · 验证：${verification}`}
        </span>
      </div>
      <div className="share-actions">
        <button className="secondary-btn" type="button" onClick={onCopy} disabled={!shareResult || isMock}>
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
