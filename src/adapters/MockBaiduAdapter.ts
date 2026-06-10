import type { ShareResult } from "../domain/types";
import type { BaiduAdapter, BaiduCapability } from "./BaiduAdapter";

export class MockBaiduAdapter implements BaiduAdapter {
  getCapabilityMatrix(): BaiduCapability[] {
    return [
      { name: "OAuth 授权", status: "pending_integration" },
      { name: "读取目录", status: "pending_integration" },
      { name: "创建目录", status: "pending_integration" },
      { name: "转存分享链接", status: "pending_verification" },
      { name: "创建分享链接", status: "pending_verification" },
      { name: "导出结果", status: "implemented_mock" },
      { name: "本地扫描", status: "implemented_mock" }
    ];
  }

  async transferSharedLink(fileIds: string[]): Promise<{ transferredFileIds: string[] }> {
    return { transferredFileIds: fileIds.filter((_, index) => index !== fileIds.length - 1) };
  }

  async createShareLink(fileIds: string[]): Promise<ShareResult> {
    const idPart = fileIds.join("-").slice(0, 8) || "empty";
    return {
      newShareUrl: `https://pan.baidu.com/s/mock-${idPart}`,
      extractCode: "A7K9"
    };
  }
}
