import type { RemoteFile } from "../adapters/StorageAdapter";
import type { ResourceContentCategory, ResourceMetadata } from "../domain/types";
import { normalizeRemotePath } from "./RemotePathService";

export const RESOURCE_LIBRARY_ROOT = "盘姬资源库/转存记录";

interface ClassifyResourceInput {
  rawText: string;
  files?: Array<Pick<RemoteFile, "name" | "isDirectory">>;
  savePath?: string;
}

export function extractResourceTitleFromShareText(rawText: string, fallbackIndex = 1): string {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match =
      line.match(/通过网盘分享的(?:文件|资料|资源)?\s*[:：]\s*(.+)$/i) ??
      line.match(/分享(?:文件|资料|资源)?\s*[:：]\s*(.+)$/i) ??
      line.match(/(?:文件|标题|资源名)\s*[:：]\s*(.+)$/i);
    const candidate = match?.[1] ? sanitizeResourceTaskName(match[1]) : "";
    if (candidate) return candidate;
  }

  const firstPlainLine = lines.find((line) => isLikelyTitleLine(line));
  const title = firstPlainLine ? sanitizeResourceTaskName(firstPlainLine) : "";
  return title || `未命名资源-${String(fallbackIndex).padStart(3, "0")}`;
}

export function sanitizeResourceTaskName(value: string): string {
  const cleaned = String(value || "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/pan\.baidu\.com\/\S+/gi, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/[提取码密码]\s*[:：]?\s*[A-Za-z0-9]{4}/g, "")
    .replace(/\s+/g, "")
    .replace(/[，。；;、]+$/g, "")
    .trim();
  const truncated = cleaned.slice(0, 60).replace(/[. ]+$/g, "");
  return truncated || "未命名资源";
}

export function buildResourceTransferDirectory(input: {
  createdAt: string | Date;
  title: string;
  existingNames?: string[];
}): { displayPath: string; cliPath: string; title: string } {
  const date = formatDate(input.createdAt);
  const baseTitle = sanitizeResourceTaskName(input.title);
  const title = nextAvailableName(baseTitle, input.existingNames ?? []);
  const displayPath = normalizeRemotePath(`${RESOURCE_LIBRARY_ROOT}/${date}/${title}`).replace(/^\/+/, "");
  return {
    displayPath,
    cliPath: `/${displayPath}`,
    title
  };
}

export function classifyResource(input: ClassifyResourceInput): ResourceMetadata {
  const title = extractResourceTitleFromShareText(input.rawText);
  const files = input.files ?? [];
  const contentCategory = inferCategory(title, files);
  return {
    title,
    contentCategory,
    contentSummary: summarizeResource(contentCategory, files),
    checkStatus: "unchecked",
    savePath: input.savePath ?? "",
    classificationConfidence: contentCategory === "未识别" ? 0.35 : 0.76,
    classificationSource: title.startsWith("未命名资源") ? "file_list" : "share_text"
  };
}

function isLikelyTitleLine(line: string): boolean {
  if (/pan\.baidu\.com|https?:\/\/|提取码|密码|复制这段内容|打开百度网盘|链接/i.test(line)) {
    return false;
  }
  return line.length >= 2 && line.length <= 80;
}

function inferCategory(title: string, files: Array<Pick<RemoteFile, "name" | "isDirectory">>): ResourceContentCategory {
  const text = `${title} ${files.map((file) => file.name).join(" ")}`.toLowerCase();
  const extensions = files.map((file) => extensionOf(file.name));
  if (/课程|教程|训练营|课件|讲义|学习|第\d+课|lesson|course/.test(text)) return "课程资料";
  if (/软件|安装包|客户端|插件|破解|激活|setup|installer/.test(text) || extensions.some((ext) => [".exe", ".msi", ".dmg", ".apk"].includes(ext))) return "软件工具";
  if (/电子书|书籍|pdf|epub|mobi/.test(text) || extensions.some((ext) => [".pdf", ".epub", ".mobi"].includes(ext))) return "电子书/PDF";
  if (/合同|简历|表格|模板|ppt|word|excel|docx|xlsx|pptx/.test(text) || extensions.some((ext) => [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"].includes(ext))) return "文档模板";
  if (/设计|素材|ui|figma|psd|海报|插画/.test(text) || extensions.some((ext) => [".psd", ".ai", ".sketch", ".fig"].includes(ext))) return "设计素材";
  if (/图片|壁纸|照片|图库/.test(text) || extensions.some((ext) => [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext))) return "图片素材";
  if (/音频|音乐|录音|播客/.test(text) || extensions.some((ext) => [".mp3", ".wav", ".flac", ".m4a"].includes(ext))) return "音频资料";
  if (/视频|录像|录屏|短片/.test(text) || extensions.some((ext) => [".mp4", ".mkv", ".avi", ".mov"].includes(ext))) return "视频素材";
  if (files.length > 1) return "综合资料包";
  return "未识别";
}

function summarizeResource(category: ResourceContentCategory, files: Array<Pick<RemoteFile, "name" | "isDirectory">>): string {
  if (files.length === 0) {
    return `${category}，原样转存，暂未读取到文件列表。`;
  }
  const directoryCount = files.filter((file) => file.isDirectory).length;
  const fileCount = files.length - directoryCount;
  const detail = directoryCount > 0 ? `${fileCount} 个文件、${directoryCount} 个文件夹` : `${files.length} 个文件`;
  return `${category}，共 ${detail}，原样转存，文件名和目录结构保持不变。`;
}

function nextAvailableName(baseName: string, existingNames: string[]): string {
  const existing = new Set(existingNames.map((name) => sanitizeResourceTaskName(name)));
  if (!existing.has(baseName)) return baseName;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${baseName}-${String(index).padStart(3, "0")}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${baseName}-${Date.now()}`;
}

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return new Date().toISOString().slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}
