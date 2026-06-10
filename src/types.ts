import type { LucideIcon } from "lucide-react";

export type PageId = "workbench" | "batch" | "scan" | "archive" | "share" | "settings";

export interface NavItem {
  id: PageId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface ToastState {
  visible: boolean;
  message: string;
}

export interface RiskFile {
  name: string;
  type: string;
  risks: string[];
  confidence: number;
  status: "high" | "medium" | "low" | "safe";
}

export interface ProcessedFile {
  originalName: string;
  newName: string;
  category: string;
  targetPath: string;
  status: "done" | "manual" | "pending";
}

export interface ShareExportRow {
  title: string;
  status: "valid" | "partial" | "expired";
  expiresAt: string;
  code: string;
  exported: boolean;
}
