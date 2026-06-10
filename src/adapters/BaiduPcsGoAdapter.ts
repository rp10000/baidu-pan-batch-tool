import { GenericBaiduCliAdapter } from "./GenericBaiduCliAdapter";
import type { GenericBaiduCliProfile } from "./GenericBaiduCliAdapter";
import type { LocalCliCommandRunner } from "../services/LocalCliCommandRunner";

const baiduPcsGoProfile: GenericBaiduCliProfile = {
  name: "BaiduPCS-Go",
  loginMode: "account_prompt",
  riskLevel: "medium",
  capabilities: {
    checkLogin: "supported",
    transferSharedLink: "supported",
    listFiles: "supported",
    createDirectory: "supported",
    renameFile: "supported",
    moveFile: "supported",
    downloadFile: "supported",
    uploadFile: "supported",
    createShareLink: "supported",
    jsonOutput: false
  },
  commands: {
    version: ["--version"],
    help: ["help"],
    login: ["login"],
    who: ["who"],
    ls: (dir) => ["ls", dir],
    mkdir: (dir) => ["mkdir", dir],
    upload: (localPath, remotePath) => ["upload", localPath, remotePath],
    move: (remotePath, targetPath) => ["mv", remotePath, targetPath],
    transfer: (url, extractCode) => ["transfer", url, extractCode ?? ""].filter(Boolean),
    share: (remotePaths) => ["share", ...remotePaths]
  }
};

export class BaiduPcsGoAdapter extends GenericBaiduCliAdapter {
  constructor(runner: LocalCliCommandRunner) {
    super(runner, baiduPcsGoProfile);
  }
}

export { baiduPcsGoProfile };
