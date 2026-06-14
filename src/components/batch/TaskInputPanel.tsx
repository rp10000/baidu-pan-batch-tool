import { FileUp, Link2 } from "lucide-react";
import { Card, Tag } from "../ui";

export function TaskInputPanel({
  input,
  onInputChange,
  mode,
  onModeChange,
  stats,
  onRestoreSample,
  onClearInput
}: {
  input: string;
  onInputChange: (value: string) => void;
  mode: "single" | "batch";
  onModeChange: (mode: "single" | "batch") => void;
  stats: {
    total: number;
    valid: number;
    duplicate: number;
    invalid: number;
  };
  onRestoreSample: () => void;
  onClearInput: () => void;
}) {
  return (
    <Card
      title="任务输入区"
      action={<Tag tone="pink">链接 / 提取码 / 备注</Tag>}
      className="task-input-card"
    >
      <div className="segmented">
        <button className={mode === "single" ? "active" : ""} type="button" onClick={() => onModeChange("single")}>
          单条处理
        </button>
        <button className={mode === "batch" ? "active" : ""} type="button" onClick={() => onModeChange("batch")}>
          多条任务
        </button>
      </div>

      <label className="field-label" htmlFor="share-input">
        <Link2 size={16} />
        粘贴网盘链接
      </label>
      <textarea
        id="share-input"
        className="textarea link-textarea"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        placeholder="粘贴百度网盘分享链接和提取码，每行一个"
        spellCheck={false}
      />

      <div className="input-stats" aria-label="链接识别统计">
        <span>总链接数 <b>{stats.total}</b></span>
        <span>有效链接 <b>{stats.valid}</b></span>
        <span>重复链接 <b>{stats.duplicate}</b></span>
        <span>无效链接 <b>{stats.invalid}</b></span>
      </div>

      <div className="drop-zone">
        <FileUp size={30} />
        <div>
          <b>拖拽 TXT / CSV 到这里</b>
          <span>支持每行一个分享链接，提取码可自动识别</span>
        </div>
      </div>

      <div className="input-actions">
        <button className="ghost-fill" type="button" onClick={onRestoreSample}>
          恢复示例输入
        </button>
        <button className="secondary-btn" type="button" onClick={onClearInput}>
          清空
        </button>
      </div>
    </Card>
  );
}
