import type { ShareResult } from "../domain/types";

export type BaiduCapabilityStatus = "implemented_mock" | "pending_integration" | "pending_verification";

export interface BaiduCapability {
  name: string;
  status: BaiduCapabilityStatus;
}

export interface BaiduAdapter {
  getCapabilityMatrix(): BaiduCapability[];
  transferSharedLink(fileIds: string[], targetDirectory: string): Promise<{ transferredFileIds: string[] }>;
  createShareLink(fileIds: string[]): Promise<ShareResult>;
}
