import type { DetectedRisk, ProcessedFile, RiskType } from "./types";

interface MockFileTemplate {
  originalName: string;
  category: string;
  riskTypes: RiskType[];
}

export const MOCK_FILE_TEMPLATES: MockFileTemplate[] = [
  {
    originalName: "课程先导片.mp4",
    category: "视频课程",
    riskTypes: ["watermark"]
  },
  {
    originalName: "资料讲义.pdf",
    category: "学习资料",
    riskTypes: ["phone", "url"]
  },
  {
    originalName: "封面海报.png",
    category: "图片素材",
    riskTypes: ["qrcode", "external_traffic_word"]
  },
  {
    originalName: "素材压缩包.zip",
    category: "设计素材",
    riskTypes: []
  },
  {
    originalName: "安装说明.txt",
    category: "说明文档",
    riskTypes: ["email", "wechat", "qq"]
  }
];

const RISK_COPY: Record<RiskType, { label: string; content: string; confidence: number }> = {
  watermark: { label: "角落水印", content: "右下角品牌字样", confidence: 88 },
  qrcode: { label: "二维码", content: "页面底部扫码入口", confidence: 95 },
  phone: { label: "手机号", content: "13****0000", confidence: 91 },
  email: { label: "邮箱", content: "demo@example.com", confidence: 84 },
  url: { label: "外部网址", content: "example.com/course", confidence: 93 },
  wechat: { label: "微信号", content: "wx_demo_2026", confidence: 82 },
  qq: { label: "QQ号", content: "100000", confidence: 80 },
  external_traffic_word: { label: "引流词", content: "扫码进群", confidence: 90 }
};

export function createMockFiles(): ProcessedFile[] {
  return MOCK_FILE_TEMPLATES.map((file, index) => ({
    id: `file-${index + 1}`,
    originalName: file.originalName,
    newName: file.originalName,
    category: "未分类",
    status: "skipped",
    risks: []
  }));
}

export function getMockCategory(fileId: string): string {
  const index = Number(fileId.replace("file-", "")) - 1;
  return MOCK_FILE_TEMPLATES[index]?.category ?? "未分类";
}

export function createRisksForFile(file: ProcessedFile, types: RiskType[]): DetectedRisk[] {
  return types.map((type, index) => {
    const copy = RISK_COPY[type];
    return {
      id: `${file.id}-risk-${index + 1}`,
      fileId: file.id,
      type,
      label: copy.label,
      content: copy.content,
      confidence: copy.confidence,
      action: "pending"
    };
  });
}

export function getRiskTypes(fileId: string): RiskType[] {
  const index = Number(fileId.replace("file-", "")) - 1;
  return MOCK_FILE_TEMPLATES[index]?.riskTypes ?? [];
}
