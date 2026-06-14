import {
  Archive,
  ClipboardCheck,
  Cog,
  LayoutDashboard
} from "lucide-react";
import type { NavItem, ProcessedFile, RiskFile, ShareExportRow } from "../types";

export const navItems: NavItem[] = [
  { id: "workbench", label: "任务工作台", description: "概览 / 队列 / 最近活动", icon: LayoutDashboard },
  { id: "batch", label: "任务处理", description: "输入链接并生成新分享码", icon: ClipboardCheck },
  { id: "archive", label: "资源归档", description: "分类 / 保存路径 / 转发文案", icon: Archive },
  { id: "settings", label: "设置中心", description: "连接百度网盘 / 本机设置", icon: Cog }
];

export const inputSample = `https://pan.baidu.com/s/1abcDEF 提取码: 12zx 备注: AI课程资料
https://pan.baidu.com/share/init?surl=AbCdEF 提取码：abcd 备注: 设计素材包
链接: https://pan.baidu.com/s/1p9Kxyz 密码: 8q2m 备注: 模板合集`;

export const processActions = [
  "一键分类",
  "一键转存",
  "检查水印",
  "检查二维码",
  "检查联系方式",
  "检查引流内容",
  "删除引流字段",
  "生成新分享码",
  "自动重命名"
];

export const pipelineSteps = ["识别链接", "校验提取码", "扫描风险", "分类重命名", "转存目录", "创建分享", "导出结果"];

export const processedFiles: ProcessedFile[] = [
  {
    originalName: "AI课程资料.zip",
    newName: "课程_AI资料_20260610_001.zip",
    category: "课程资料",
    targetPath: "/自动归档/课程资料",
    status: "manual"
  },
  {
    originalName: "设计素材包",
    newName: "素材_设计素材包_20260610_002",
    category: "设计素材",
    targetPath: "/自动归档/设计素材",
    status: "done"
  },
  {
    originalName: "模板合集.pdf",
    newName: "文档_模板合集_20260610_003.pdf",
    category: "文档模板",
    targetPath: "/自动归档/文档模板",
    status: "done"
  }
];

export const riskFiles: RiskFile[] = [
  { name: "封面图_扫码进群.png", type: "图片", risks: ["二维码", "引流词"], confidence: 96, status: "high" },
  { name: "课程说明.pdf", type: "PDF", risks: ["手机号", "URL"], confidence: 91, status: "high" },
  { name: "安装说明.txt", type: "文本", risks: ["QQ号"], confidence: 82, status: "medium" },
  { name: "宣传视频.mp4", type: "视频", risks: ["角落水印"], confidence: 74, status: "medium" },
  { name: "素材预览.jpg", type: "图片", risks: ["未命中"], confidence: 99, status: "safe" }
];

export const shareRows: ShareExportRow[] = [
  { title: "课程_AI资料_20260610_001.zip", status: "valid", expiresAt: "永久有效", code: "A7K9", exported: false },
  { title: "素材_设计素材包_20260610_002", status: "valid", expiresAt: "2026-07-10", code: "B3L2", exported: true },
  { title: "文档_模板合集_20260610_003.pdf", status: "partial", expiresAt: "2026-07-10", code: "C8M4", exported: false },
  { title: "图片备份_20260610", status: "expired", expiresAt: "已失效", code: "D1Q6", exported: true }
];

export const recentActivities = [
  "已识别 3 条分享链接，其中 1 条需要人工确认",
  "命中二维码风险 1 个、联系方式风险 2 个",
  "已生成 2 条 mock 新分享链接和提取码",
  "已将 3 个文件映射到自动归档目录"
];
