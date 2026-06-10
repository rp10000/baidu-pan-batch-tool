import type { PipelineStage, PipelineStageStatus, TaskStatus } from "./types";

export const PIPELINE_ORDER: PipelineStage[] = [
  "link_parse",
  "classify",
  "watermark_scan",
  "traffic_scan",
  "auto_clean",
  "rename",
  "transfer",
  "create_share"
];

export const PIPELINE_LABELS: Record<PipelineStage, string> = {
  link_parse: "链接解析",
  classify: "分类识别",
  watermark_scan: "水印检测",
  traffic_scan: "引流检测",
  auto_clean: "自动处理",
  rename: "重命名",
  transfer: "转存完成",
  create_share: "生成分享码"
};

export const STAGE_TASK_STATUS: Record<PipelineStage, TaskStatus> = {
  link_parse: "parsing",
  classify: "classifying",
  watermark_scan: "scanning",
  traffic_scan: "scanning",
  auto_clean: "cleaning",
  rename: "cleaning",
  transfer: "transferring",
  create_share: "sharing"
};

export function createEmptyStages(): Record<PipelineStage, PipelineStageStatus> {
  return Object.fromEntries(PIPELINE_ORDER.map((stage) => [stage, "pending"])) as Record<
    PipelineStage,
    PipelineStageStatus
  >;
}
