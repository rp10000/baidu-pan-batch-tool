import type { ProcessingOptions } from "../../domain/types";
import { Card, Tag } from "../ui";

const actionItems: Array<{ key: keyof ProcessingOptions; label: string }> = [
  { key: "autoClassify", label: "一键分类" },
  { key: "autoTransfer", label: "一键转存" },
  { key: "scanWatermark", label: "检查水印" },
  { key: "scanTrafficContent", label: "检查引流内容" },
  { key: "autoRemoveWatermark", label: "自动去除水印" },
  { key: "removeTrafficFields", label: "删除引流字段" },
  { key: "autoCreateShareCode", label: "生成新分享码" },
  { key: "autoRenameFiles", label: "自动重命名" }
];

export function ProcessActionChips({
  options,
  onToggle
}: {
  options: ProcessingOptions;
  onToggle: (key: keyof ProcessingOptions) => void;
}) {
  return (
    <Card title="处理动作" action={<Tag tone="orange">mock 选择</Tag>}>
      <div className="chip-list">
        {actionItems.map((action) => (
          <button
            className={`chip action-chip ${options[action.key] ? "checked" : ""}`}
            key={action.key}
            type="button"
            onClick={() => onToggle(action.key)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <p className="notice">
        自动去除水印、删除引流字段只作为授权素材处理流程的 UI 占位；真实实现前必须保留原文件备份和人工确认。
      </p>
    </Card>
  );
}
