import type { RemoteFile, StorageAdapter, StorageCapabilities } from "./StorageAdapter";

export type LocalCliRiskLevel = "low" | "medium" | "high_manual_cookie_only" | "reject";
export type LocalCliLoginMode = "qr_login" | "web_login" | "device_code" | "account_prompt" | "manual_cookie" | "unknown";
export type LocalCliStatus = "not_detected" | "detected" | "not_logged_in" | "logged_in" | "manual_auth_required" | "manual_cookie_mode" | "capability_limited";

export interface LocalCliCapabilities extends StorageCapabilities {
  jsonOutput: boolean;
}

export interface LocalCliDetection {
  status: LocalCliStatus;
  name: string;
  version?: string;
  loginMode: LocalCliLoginMode;
  requiresManualCookie: boolean;
  riskLevel: LocalCliRiskLevel;
  message: string;
}

export interface LocalCliAdapter extends StorageAdapter {
  name: string;
  loginMode: LocalCliLoginMode;
  riskLevel: LocalCliRiskLevel;
  checkInstalled(): Promise<LocalCliDetection>;
  getVersion(): Promise<string | undefined>;
  login(): Promise<{ ok: boolean; status: LocalCliStatus; error?: string }>;
  checkLogin(): Promise<{ ok: boolean; status: LocalCliStatus; displayName?: string; message: string }>;
  getLocalCapabilities(): Promise<LocalCliCapabilities>;
  uploadFile(input: { localPath: string; remotePath: string }): Promise<{ ok: boolean; error?: string }>;
  listFiles(input: { remoteDirectory: string }): Promise<RemoteFile[]>;
}
