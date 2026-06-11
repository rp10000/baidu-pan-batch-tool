import type { ProcessingOptions } from "../../domain/types";
import type { ScanMode, ScanOptions } from "../../domain/scanOptions";
import { Card, Tag } from "../ui";

const actionItems: Array<{ key: keyof ProcessingOptions; label: string }> = [
  { key: "autoTransfer", label: "一键转存" },
  { key: "autoClassify", label: "自动分类" },
  { key: "autoRenameFiles", label: "自动重命名" },
  { key: "autoCreateShareCode", label: "创建新分享链接" }
];

const scanItems: Array<{ key: keyof ScanOptions; label: string; impact: "快" | "中" | "慢" | "很慢" }> = [
  { key: "checkQrCode", label: "检查二维码", impact: "中" },
  { key: "checkOcrText", label: "OCR 检查文字", impact: "慢" },
  { key: "checkContactInfo", label: "检查联系方式", impact: "快" },
  { key: "checkTrafficWords", label: "检查引流内容", impact: "快" },
  { key: "checkWatermark", label: "检查水印", impact: "慢" },
  { key: "createCleanCopy", label: "生成清理副本", impact: "很慢" },
  { key: "scanVideo", label: "深度扫描 / 视频抽帧", impact: "很慢" }
];

export function ProcessActionChips({
  options,
  onToggle,
  onScanModeChange,
  onScanToggle
}: {
  options: ProcessingOptions;
  onToggle: (key: keyof ProcessingOptions) => void;
  onScanModeChange: (mode: ScanMode) => void;
  onScanToggle: (key: keyof ScanOptions) => void;
}) {
  return (
    <Card title="处理模式与扫描选项" action={<Tag tone={options.scanOptions.enabled ? "orange" : "green"}>{options.scanOptions.mode === "off" ? "快速" : "按需扫描"}</Tag>}>
      <div className="mode-grid processing-mode-grid">
        <button
          className={`mode-card ${options.scanOptions.mode === "off" ? "active" : ""}`}
          type="button"
          onClick={() => onScanModeChange("off")}
        >
          <b>快速转存模式</b>
          <span>只转存、分类、重命名、移动和创建分享，不下载样本。</span>
        </button>
        <button
          className={`mode-card ${options.scanOptions.mode === "standard" ? "active" : ""}`}
          type="button"
          onClick={() => onScanModeChange("standard")}
        >
          <b>标准检查模式</b>
          <span>转存后抽样检查文本、小图片、PDF 前 3 页。</span>
        </button>
        <button
          className={`mode-card ${options.scanOptions.mode === "deep" ? "active" : ""}`}
          type="button"
          onClick={() => onScanModeChange("deep")}
        >
          <b>深度扫描模式</b>
          <span>会下载文件样本并运行 OCR/抽帧，耗时明显增加。</span>
        </button>
      </div>
      <div className="scan-option-grid">
        {scanItems.map((item) => {
          const checked = Boolean(options.scanOptions[item.key]);
          return (
            <button
              className={`scan-option ${checked ? "checked" : ""}`}
              key={item.key}
              type="button"
              onClick={() => onScanToggle(item.key)}
            >
              <span>{checked ? "☑" : "☐"} {item.label}</span>
              <em>{item.impact}</em>
            </button>
          );
        })}
      </div>
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
        未勾选扫描时不会下载文件样本、不会初始化 OCR、不会视频抽帧；清理只生成副本，不覆盖原文件。
      </p>
    </Card>
  );
}
