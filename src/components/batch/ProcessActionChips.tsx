import { processActions } from "../../data/prototypeData";
import { Card, Tag } from "../ui";

export function ProcessActionChips() {
  return (
    <Card title="处理动作" action={<Tag tone="orange">mock 选择</Tag>}>
      <div className="chip-list">
        {processActions.map((action, index) => (
          <span className={`chip ${index < 8 ? "checked" : ""}`} key={action}>
            {action}
          </span>
        ))}
      </div>
      <p className="notice">
        自动去除水印、删除引流字段只作为授权素材处理流程的 UI 占位；真实实现前必须保留原文件备份和人工确认。
      </p>
    </Card>
  );
}
