export type AdapterMode =
  | "mock"
  | "windows_local_cli"
  | "windows_native_official"
  | "baidu_mcp"
  | "baidu_sdk"
  | "bdpan_wsl";

export type CapabilityStatus =
  | "supported"
  | "unsupported"
  | "needs_official_verification"
  | "paid_required"
  | "manual_required"
  | "wsl_only"
  | "mock_only";

export interface AdapterModeMeta {
  mode: AdapterMode;
  label: string;
  badge: "推荐" | "可选" | "高级" | "演示";
  description: string;
}

export type CapabilityKey =
  | "checkLogin"
  | "getUserInfo"
  | "getQuota"
  | "listFiles"
  | "createDirectory"
  | "transferSharedLink"
  | "listTransferredFiles"
  | "renameFile"
  | "moveFile"
  | "downloadFile"
  | "uploadFile"
  | "createShareLink";

export type CapabilityMatrix = Record<CapabilityKey, Record<AdapterMode, CapabilityStatus>>;

export const ADAPTER_MODE_OPTIONS: AdapterModeMeta[] = [
  {
    mode: "windows_native_official",
    label: "Windows 原生官方模式",
    badge: "推荐",
    description: "Windows 桌面版主线，优先验证官方 API / MCP / SDK 能力。"
  },
  {
    mode: "windows_local_cli",
    label: "Windows 本地 CLI 模式",
    badge: "推荐",
    description: "优先用于自用 MVP，调用本机已安装的百度网盘 CLI，不读取浏览器凭据。"
  },
  {
    mode: "baidu_mcp",
    label: "百度网盘 MCP 模式",
    badge: "可选",
    description: "基于官方 MCP 能力，适合文件管理和创建分享能力验证。"
  },
  {
    mode: "baidu_sdk",
    label: "百度网盘 SDK 模式",
    badge: "可选",
    description: "基于官方 SDK / OpenAPI 的原生集成方向。"
  },
  {
    mode: "bdpan_wsl",
    label: "bdpan WSL 高级模式",
    badge: "高级",
    description: "仅在用户已配置 WSL + bdpan 时启用，不作为普通 Windows 用户默认依赖。"
  },
  {
    mode: "mock",
    label: "Mock 演示模式",
    badge: "演示",
    description: "用于演示、测试和无账号环境，不会真实转存。"
  }
];

export const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  checkLogin: "授权登录",
  getUserInfo: "获取用户信息",
  getQuota: "获取容量",
  listFiles: "读取目录",
  createDirectory: "创建目录",
  transferSharedLink: "分享链接转存",
  listTransferredFiles: "读取转存后文件列表",
  renameFile: "重命名",
  moveFile: "移动",
  downloadFile: "下载到本地扫描",
  uploadFile: "上传清理后文件",
  createShareLink: "创建新分享链接"
};

export const CAPABILITY_MATRIX: CapabilityMatrix = {
  checkLogin: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "needs_official_verification",
    baidu_sdk: "needs_official_verification",
    bdpan_wsl: "wsl_only",
    mock: "mock_only"
  },
  getUserInfo: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "supported",
    baidu_sdk: "supported",
    bdpan_wsl: "wsl_only",
    mock: "mock_only"
  },
  getQuota: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "supported",
    baidu_sdk: "supported",
    bdpan_wsl: "wsl_only",
    mock: "mock_only"
  },
  listFiles: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "supported",
    baidu_sdk: "supported",
    bdpan_wsl: "wsl_only",
    mock: "mock_only"
  },
  createDirectory: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "supported",
    baidu_sdk: "supported",
    bdpan_wsl: "wsl_only",
    mock: "mock_only"
  },
  transferSharedLink: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "needs_official_verification",
    baidu_sdk: "needs_official_verification",
    bdpan_wsl: "wsl_only",
    mock: "mock_only"
  },
  listTransferredFiles: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "supported",
    baidu_sdk: "supported",
    bdpan_wsl: "wsl_only",
    mock: "mock_only"
  },
  renameFile: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "supported",
    baidu_sdk: "supported",
    bdpan_wsl: "wsl_only",
    mock: "mock_only"
  },
  moveFile: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "supported",
    baidu_sdk: "supported",
    bdpan_wsl: "wsl_only",
    mock: "mock_only"
  },
  downloadFile: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "manual_required",
    baidu_sdk: "supported",
    bdpan_wsl: "wsl_only",
    mock: "mock_only"
  },
  uploadFile: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "supported",
    baidu_sdk: "supported",
    bdpan_wsl: "wsl_only",
    mock: "mock_only"
  },
  createShareLink: {
    windows_native_official: "needs_official_verification",
    windows_local_cli: "supported",
    baidu_mcp: "needs_official_verification",
    baidu_sdk: "needs_official_verification",
    bdpan_wsl: "paid_required",
    mock: "mock_only"
  }
};

export function getAdapterModeMeta(mode: AdapterMode): AdapterModeMeta {
  return ADAPTER_MODE_OPTIONS.find((item) => item.mode === mode) ?? ADAPTER_MODE_OPTIONS[0];
}

export function capabilitiesForMode(mode: AdapterMode) {
  return {
    checkLogin: CAPABILITY_MATRIX.checkLogin[mode],
    transferSharedLink: CAPABILITY_MATRIX.transferSharedLink[mode],
    listFiles: CAPABILITY_MATRIX.listFiles[mode],
    createDirectory: CAPABILITY_MATRIX.createDirectory[mode],
    renameFile: CAPABILITY_MATRIX.renameFile[mode],
    moveFile: CAPABILITY_MATRIX.moveFile[mode],
    downloadFile: CAPABILITY_MATRIX.downloadFile[mode],
    uploadFile: CAPABILITY_MATRIX.uploadFile[mode],
    createShareLink: CAPABILITY_MATRIX.createShareLink[mode]
  };
}

export function capabilityStatusLabel(status: CapabilityStatus): string {
  const labels: Record<CapabilityStatus, string> = {
    supported: "支持",
    unsupported: "不支持",
    needs_official_verification: "待官方验证",
    paid_required: "需开通 / 待验证",
    manual_required: "需人工确认",
    wsl_only: "WSL 高级模式",
    mock_only: "Mock"
  };
  return labels[status];
}
