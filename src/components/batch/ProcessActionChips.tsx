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
    <Card title="处理模式与扫描选项" action={<Tag tone={options.transferMode === "original" ? "green" : options.transferMode === "archive" ? "blue" : "orange"}>{modeTag(options.transferMode)}</Tag>}>
      <div className="mode-grid processing-mode-grid">
        <button
          className={`mode-card ${options.transferMode === "original" ? "active" : ""}`}
          type="button"
          onClick={() => onScanModeChange("off")}
        >
          <b>原样转存</b>
          <span>默认模式：不分类、不重命名、不扫描，转存后直接生成新链接和发送文案。</span>
        </button>
        <button
          className={`mode-card ${options.transferMode === "archive" ? "active" : ""}`}
          type="button"
          onClick={() => onScanModeChange("standard")}
        >
          <b>归档整理</b>
          <span>可选：转存后按文件名分类、重命名并移动到分类目录。</span>
        </button>
        <button
          className={`mode-card ${options.transferMode === "scan_clean" ? "active" : ""}`}
          type="button"
          onClick={() => onScanModeChange("deep")}
        >
          <b>检测清理</b>
          <span>可选：原样转存后再按需检查 OCR、二维码、水印和引流内容。</span>
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
        原样转存不会下载文件样本、不会初始化 OCR、不会改文件名；只有切到检测清理并勾选选项后才执行扫描。
      </p>
    </Card>
  );
}

function modeTag(mode: ProcessingOptions["transferMode"]): string {
  if (mode === "original") return "原样转存";
  if (mode === "archive") return "归档整理";
  return "检测清理";
}
