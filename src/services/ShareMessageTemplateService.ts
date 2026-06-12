import type { ProcessingTask, ResourceCheckStatus, ShareResult, ShareTemplateSettings, ShareTemplateType } from "../domain/types";

export interface ShareMessageInput {
  task?: Pick<ProcessingTask, "createdAt" | "finalShareFileCount" | "shareResult" | "shareTemplateType" | "resource">;
  shareResult?: ShareResult;
  template: ShareTemplateSettings;
  fileCount?: number;
}

const TEMPLATE_LABELS: Record<ShareTemplateType, string> = {
  baidu_standard: "百度标准格式",
  xiaohongshu_virtual: "小红书虚拟店铺发货格式",
  wechat_simple: "微信简洁格式",
  after_sale_resend: "售后补发格式",
  custom: "自定义模板"
};

const TEMPLATES: Record<Exclude<ShareTemplateType, "custom">, string> = {
  baidu_standard: `【{title}】
分类：{contentCategory}
内容：{contentSummary}
网盘链接：{shareUrl}
提取码：{extractCode}
{expireText}`,
  xiaohongshu_virtual: `【{title}】
分类：{contentCategory}
内容：{contentSummary}
网盘链接：{shareUrl}
提取码：{extractCode}
{expireText}`,
  wechat_simple: `【{title}】
分类：{contentCategory}
网盘链接：{shareUrl}
提取码：{extractCode}
{expireText}`,
  after_sale_resend: `您好，【{title}】已重新发送。
分类：{contentCategory}
网盘链接：{shareUrl}
提取码：{extractCode}
{expireText}
{note}`
};

export function getShareTemplateOptions(): Array<{ value: ShareTemplateType; label: string }> {
  return (Object.keys(TEMPLATE_LABELS) as ShareTemplateType[]).map((value) => ({
    value,
    label: TEMPLATE_LABELS[value]
  }));
}

export function generateShareMessage(input: ShareMessageInput): string {
  const shareResult = input.shareResult ?? input.task?.shareResult;
  if (!shareResult) {
    return "生成分享链接后将自动生成可转发文案。";
  }
  const templateText =
    input.template.type === "custom"
      ? input.template.customTemplate?.trim() || TEMPLATES.xiaohongshu_virtual
      : TEMPLATES[input.template.type];
  const values = createTemplateValues(input, shareResult);

  return templateText.replace(
    /\{(title|resourceTitle|contentCategory|contentSummary|checkStatus|savePath|shareUrl|extractCode|expireText|fileCount|date|note|storeName|orderNo)\}/g,
    (_, key: keyof typeof values) => values[key]
  );
}

function createTemplateValues(input: ShareMessageInput, shareResult: ShareResult): Record<string, string> {
  const createdAt = input.task?.createdAt ? new Date(input.task.createdAt) : new Date();
  const date = Number.isNaN(createdAt.valueOf()) ? "" : createdAt.toISOString().slice(0, 10);
  const fileCount = input.fileCount ?? input.task?.finalShareFileCount ?? 0;
  const resourceTitle = chooseMessageTitle(input.task?.resource?.title, input.template.title);
  const contentCategory = input.task?.resource?.contentCategory ?? "未识别";
  const contentSummary =
    input.task?.resource?.contentSummary ||
    (fileCount > 0 ? `共 ${fileCount} 个文件，原样转存，文件名和目录结构保持不变。` : "原样转存，文件名和目录结构保持不变。");
  return {
    title: resourceTitle,
    resourceTitle,
    contentCategory,
    contentSummary,
    checkStatus: checkStatusLabel(input.task?.resource?.checkStatus),
    savePath: input.task?.resource?.savePath ?? "",
    shareUrl: shareResult.shareUrl,
    extractCode: shareResult.extractCode || "无",
    expireText: `有效期：${shareResult.expireAt && shareResult.expireAt !== "0" ? shareResult.expireAt : "永久有效"}`,
    fileCount: String(fileCount),
    date,
    note: input.template.note?.trim() || "",
    storeName: input.template.storeName?.trim() || "",
    orderNo: input.template.orderNo?.trim() || ""
  };
}

function chooseMessageTitle(resourceTitle: string | undefined, templateTitle: string): string {
  const manualTitle = templateTitle.trim();
  if (resourceTitle && !resourceTitle.startsWith("未命名资源")) return resourceTitle;
  return manualTitle || resourceTitle || "资料包";
}

function checkStatusLabel(status?: ResourceCheckStatus): string {
  if (status === "checked") return "已检查";
  if (status === "pending") return "等待检查";
  if (status === "unsupported") return "功能未接线";
  return "未检查";
}
