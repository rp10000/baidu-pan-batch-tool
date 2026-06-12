import type { AdapterMode } from "../adapters/StorageAdapter";
import type { ScanOptions, ShareTiming } from "./scanOptions";

export type TaskStatus =
  | "draft"
  | "parsing"
  | "classifying"
  | "scanning"
  | "cleaning"
  | "transferring"
  | "sharing"
  | "completed"
  | "partial_completed"
  | "failed";

export type PipelineStage =
  | "link_parse"
  | "classify"
  | "watermark_scan"
  | "traffic_scan"
  | "auto_clean"
  | "rename"
  | "transfer"
  | "create_share";

export type RiskType =
  | "watermark"
  | "qrcode"
  | "phone"
  | "email"
  | "url"
  | "wechat"
  | "qq"
  | "external_traffic_word";

export type PipelineStageStatus = "pending" | "running" | "completed" | "failed";

export interface ShareInput {
  id: string;
  rawLine: string;
  url: string;
  extractCode?: string;
  explicitExtractCode?: string;
  codeConflict?: boolean;
  valid: boolean;
  duplicate: boolean;
  error?: string;
}

export type TransferMode = "original" | "archive" | "scan_clean";
export type ShareTemplateType =
  | "baidu_standard"
  | "xiaohongshu_virtual"
  | "wechat_simple"
  | "after_sale_resend"
  | "custom";

export interface ShareTemplateSettings {
  type: ShareTemplateType;
  title: string;
  storeName?: string;
  orderNo?: string;
  note?: string;
  customTemplate?: string;
}

export interface ProcessingOptions {
  transferMode: TransferMode;
  mergeLinks: boolean;
  autoClassify: boolean;
  autoTransfer: boolean;
  scanWatermark: boolean;
  scanTrafficContent: boolean;
  autoRemoveWatermark: boolean;
  removeTrafficFields: boolean;
  autoCreateShareCode: boolean;
  autoRenameFiles: boolean;
  renameRule: string;
  targetDirectory: string;
  scanOptions: ScanOptions;
  shareTiming: ShareTiming;
  shareTemplate: ShareTemplateSettings;
}

export interface DetectedRisk {
  id: string;
  fileId: string;
  type: RiskType;
  label: string;
  content: string;
  confidence: number;
  action: "ignored" | "marked" | "cleaned" | "pending";
}

export interface ProcessedFile {
  id: string;
  originalName: string;
  newName: string;
  category: string;
  status: "transferred" | "cleaned" | "failed" | "skipped";
  risks: DetectedRisk[];
  remotePath?: string;
  targetDirectory?: string;
}

export interface ShareResult {
  source: "mock" | "local_cli" | "manual";
  shareUrl: string;
  extractCode?: string;
  expireAt?: string;
  verified: boolean;
  redactedForLog: string;
  copied?: boolean;
}

export type ResourceContentCategory =
  | "课程资料"
  | "设计素材"
  | "文档模板"
  | "软件工具"
  | "电子书/PDF"
  | "图片素材"
  | "音频资料"
  | "视频素材"
  | "综合资料包"
  | "未识别";

export type ResourceCheckStatus = "unchecked" | "pending" | "unsupported" | "checked";

export interface ResourceMetadata {
  title: string;
  contentCategory: ResourceContentCategory;
  contentSummary: string;
  checkStatus: ResourceCheckStatus;
  savePath: string;
  classificationConfidence: number;
  classificationSource: "share_text" | "file_list" | "fallback" | "manual";
}

export interface ProcessingTaskItem {
  id: string;
  inputId: string;
  rawPath: string;
  fileCount: number;
  shareResult?: ShareResult;
  shareError?: string;
  messageText?: string;
}

export interface ProcessingTask {
  id: string;
  name: string;
  createdAt: string;
  status: TaskStatus;
  progress: number;
  adapterMode?: AdapterMode;
  rawDirectory?: string;
  outputDirectory?: string;
  finalShareDirectory?: string;
  finalShareFileCount?: number;
  inputs: ShareInput[];
  options: ProcessingOptions;
  stages: Record<PipelineStage, PipelineStageStatus>;
  processedFiles: ProcessedFile[];
  taskItems?: ProcessingTaskItem[];
  shareResult?: ShareResult;
  shareError?: string;
  shareMessage?: string;
  shareTemplateType?: ShareTemplateType;
  resource?: ResourceMetadata;
  summary: {
    recognizedFiles: number;
    classifiedFiles: number;
    removedWatermarks: number;
    removedTrafficItems: number;
    renamedFiles: number;
    transferredFiles: number;
    failedFiles: number;
  };
}
