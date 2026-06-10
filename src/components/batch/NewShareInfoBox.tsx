import { Copy } from "lucide-react";

export function NewShareInfoBox({ onCopy }: { onCopy: () => void }) {
  return (
    <div className="share-box">
      <div>
        <small>新分享链接</small>
        <strong>https://pan.baidu.com/s/mock-new-share-link</strong>
        <span>提取码：A7K9 · 有效期：永久有效</span>
      </div>
      <button className="secondary-btn" type="button" onClick={onCopy}>
        <Copy size={16} />
        复制分享信息
      </button>
    </div>
  );
}
