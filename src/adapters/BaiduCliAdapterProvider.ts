import { BaiduPcsGoAdapter } from "./BaiduPcsGoAdapter";
import type { LocalCliAdapter } from "./LocalCliAdapter";
import { LocalCliBridgeCommandRunner } from "../services/LocalCliCommandRunner";

export interface LocalCliCandidate {
  name: string;
  commandNames: string[];
  recommended: boolean;
  risk: "low" | "medium" | "high_manual_cookie_only" | "reject";
}

export const LOCAL_CLI_CANDIDATES: LocalCliCandidate[] = [
  { name: "BaiduPCS-Go", commandNames: ["BaiduPCS-Go", "baidupcs-go"], recommended: true, risk: "medium" },
  { name: "BaiduPan-cli", commandNames: ["BaiduPan-cli", "baidupan-cli"], recommended: false, risk: "high_manual_cookie_only" },
  { name: "baidu-pcs-cli-rs", commandNames: ["baidu-pcs-cli-rs"], recommended: false, risk: "medium" },
  { name: "bypy", commandNames: ["bypy"], recommended: false, risk: "low" }
];

export function createLocalCliAdapter(): LocalCliAdapter {
  return new BaiduPcsGoAdapter(new LocalCliBridgeCommandRunner());
}
