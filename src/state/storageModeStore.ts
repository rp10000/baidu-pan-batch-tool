import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { capabilitiesForMode, getAdapterModeMeta } from "../adapters/adapterMode";
import type { AdapterMode } from "../adapters/adapterMode";
import type { StorageCapabilities } from "../adapters/StorageAdapter";
import { createStorageAdapter } from "../adapters/adapterProvider";
import { inspectStorageRuntime } from "../services/StorageCapabilityService";
import type { LocalCliRuntimeSnapshot } from "../services/LocalCliRuntimeService";

interface StorageModeValue {
  requestedMode: AdapterMode;
  activeMode: AdapterMode;
  message: string;
  connectionOk: boolean;
  displayName?: string;
  capabilities: StorageCapabilities;
  cliRuntime?: LocalCliRuntimeSnapshot;
  checking: boolean;
  setRequestedMode: (mode: AdapterMode) => void;
  refreshCapabilities: () => Promise<void>;
  getActiveAdapter: () => ReturnType<typeof createStorageAdapter>;
}

const defaultMode: AdapterMode = "windows_local_cli";

const StorageModeContext = createContext<StorageModeValue | undefined>(undefined);

export function StorageModeProvider({ children }: { children: ReactNode }) {
  const [requestedMode, setRequestedModeState] = useState<AdapterMode>(defaultMode);
  const [activeMode, setActiveMode] = useState<AdapterMode>(defaultMode);
  const [message, setMessage] = useState(modeMessage(defaultMode));
  const [connectionOk, setConnectionOk] = useState(false);
  const [displayName, setDisplayName] = useState<string | undefined>(getAdapterModeMeta(defaultMode).label);
  const [capabilities, setCapabilities] = useState<StorageCapabilities>(capabilitiesForMode(defaultMode));
  const [cliRuntime, setCliRuntime] = useState<LocalCliRuntimeSnapshot | undefined>();
  const [checking, setChecking] = useState(false);

  const setRequestedMode = useCallback((mode: AdapterMode) => {
    setRequestedModeState(mode);
    setActiveMode(mode);
    setConnectionOk(mode === "mock");
    setDisplayName(getAdapterModeMeta(mode).label);
    setCapabilities(capabilitiesForMode(mode));
    if (mode !== "windows_local_cli") setCliRuntime(undefined);
    setMessage(modeMessage(mode));
  }, []);

  const refreshCapabilities = useCallback(async () => {
    if (requestedMode !== "bdpan_wsl" && requestedMode !== "windows_local_cli") {
      setActiveMode(requestedMode);
      setConnectionOk(requestedMode === "mock");
      setDisplayName(getAdapterModeMeta(requestedMode).label);
      setCapabilities(capabilitiesForMode(requestedMode));
      setMessage(modeMessage(requestedMode));
      return;
    }

    setChecking(true);
    try {
      if (requestedMode === "windows_local_cli") {
        const desktopRuntime = await inspectDesktopLocalCli();
        if (desktopRuntime) {
          setActiveMode("windows_local_cli");
          setCliRuntime(desktopRuntime);
          setMessage(desktopRuntime.message);
          setConnectionOk(desktopRuntime.loginState === "logged_in");
          setDisplayName(desktopRuntime.account.username ?? "未登录");
          setCapabilities(capabilitiesForMode("windows_local_cli"));
          return;
        }
      }
      const result = await inspectStorageRuntime(requestedMode);
      setActiveMode(result.activeMode);
      setMessage(result.message);
      setConnectionOk(result.connectionOk);
      setDisplayName(result.displayName);
      setCapabilities(result.capabilities);
    } finally {
      setChecking(false);
    }
  }, [requestedMode]);

  const getActiveAdapter = useCallback(() => createStorageAdapter(activeMode), [activeMode]);

  const value = useMemo(
    () => ({
      requestedMode,
      activeMode,
      message,
      connectionOk,
      displayName,
      capabilities,
      cliRuntime,
      checking,
      setRequestedMode,
      refreshCapabilities,
      getActiveAdapter
    }),
    [
      activeMode,
      capabilities,
      checking,
      cliRuntime,
      connectionOk,
      displayName,
      getActiveAdapter,
      message,
      refreshCapabilities,
      requestedMode,
      setRequestedMode
    ]
  );

  return createElement(StorageModeContext.Provider, { value }, children);
}

export function useStorageMode(): StorageModeValue {
  const value = useContext(StorageModeContext);
  if (!value) {
    throw new Error("useStorageMode must be used inside StorageModeProvider");
  }
  return value;
}

function modeMessage(mode: AdapterMode): string {
  const messages: Record<AdapterMode, string> = {
    windows_native_official: "Windows 原生官方能力待验证：分享链接转存尚未确认",
    baidu_mcp: "百度网盘 MCP 接入待实现：文件管理能力已列入验证矩阵",
    baidu_sdk: "百度网盘 SDK / OpenAPI 接入待实现：分享链接转存尚未确认",
    windows_local_cli: "Windows 本地 CLI 模式：等待检测本机 CLI 与登录状态",
    bdpan_wsl: "bdpan WSL 高级模式：仅在已配置 WSL + bdpan 时启用",
    mock: "Mock 演示模式，不会真实转存"
  };
  return messages[mode];
}

async function inspectDesktopLocalCli(): Promise<LocalCliRuntimeSnapshot | undefined> {
  if (typeof window === "undefined") return undefined;
  const api = (
    window as typeof window & {
      panjieDesktop?: {
        inspectLocalCli?: () => Promise<LocalCliRuntimeSnapshot>;
      };
    }
  ).panjieDesktop;
  if (!api?.inspectLocalCli) return undefined;
  return api.inspectLocalCli();
}
