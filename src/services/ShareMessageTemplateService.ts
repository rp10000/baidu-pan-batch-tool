import type { ProcessingTask, ShareResult, ShareTemplateSettings, ShareTemplateType } from "../domain/types";

export interface ShareMessageInput {
  task?: Pick<ProcessingTask, "createdAt" | "finalShareFileCount" | "shareResult" | "shareTemplateType">;
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
  baidu_standard: `链接：{shareUrl}
提取码：{extractCode}
{expireText}`,
  xiaohongshu_virtual: `【{title}】

资料已经整理好啦，复制下面链接到浏览器或百度网盘 App 打开即可保存。

网盘链接：{shareUrl}
提取码：{extractCode}

温馨提示：
链接有效期为永久。建议保存到自己的网盘，方便后续查看。`,
  wechat_simple: `{title}
链接：{shareUrl}
提取码：{extractCode}`,
  after_sale_resend: `您好，{title} 已重新发送。

网盘链接：{shareUrl}
提取码：{extractCode}
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
    return "生成分享链接后将自动生成发送文案。";
  }
  const templateText =
    input.template.type === "custom"
      ? input.template.customTemplate?.trim() || TEMPLATES.xiaohongshu_virtual
      : TEMPLATES[input.template.type];
  const values = createTemplateValues(input, shareResult);

  return templateText.replace(/\{(title|shareUrl|extractCode|expireText|fileCount|date|note|storeName|orderNo)\}/g, (_, key: keyof typeof values) => values[key]);
}

function createTemplateValues(input: ShareMessageInput, shareResult: ShareResult): Record<string, string> {
  const createdAt = input.task?.createdAt ? new Date(input.task.createdAt) : new Date();
  const date = Number.isNaN(createdAt.valueOf()) ? "" : createdAt.toISOString().slice(0, 10);
  const fileCount = input.fileCount ?? input.task?.finalShareFileCount ?? 0;
  return {
    title: input.template.title.trim() || "资料包",
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
