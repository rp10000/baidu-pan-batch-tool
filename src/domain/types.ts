export type TaskStatus =
  | "draft"
  | "parsing"
  | "classifying"
  | "scanning"
  | "cleaning"
  | "transferring"
  | "sharing"
  | "completed"
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
  valid: boolean;
  duplicate: boolean;
  error?: string;
}

export interface ProcessingOptions {
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
}

export interface ShareResult {
  newShareUrl: string;
  extractCode: string;
  copied?: boolean;
}

export interface ProcessingTask {
  id: string;
  name: string;
  createdAt: string;
  status: TaskStatus;
  progress: number;
  inputs: ShareInput[];
  options: ProcessingOptions;
  stages: Record<PipelineStage, PipelineStageStatus>;
  processedFiles: ProcessedFile[];
  shareResult?: ShareResult;
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
