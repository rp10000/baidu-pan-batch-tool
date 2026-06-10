import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AdapterMode, StorageCapabilities } from "../adapters/StorageAdapter";
import { createStorageAdapter } from "../adapters/adapterProvider";
import { inspectStorageRuntime } from "../services/StorageCapabilityService";

interface StorageModeValue {
  requestedMode: AdapterMode;
  activeMode: AdapterMode;
  message: string;
  connectionOk: boolean;
  displayName?: string;
  capabilities: StorageCapabilities;
  checking: boolean;
  setRequestedMode: (mode: AdapterMode) => void;
  refreshCapabilities: () => Promise<void>;
  getActiveAdapter: () => ReturnType<typeof createStorageAdapter>;
}

const supportedCapabilities: StorageCapabilities = {
  checkLogin: "supported",
  transferSharedLink: "supported",
  listFiles: "supported",
  createDirectory: "supported",
  renameFile: "supported",
  moveFile: "supported",
  downloadFile: "supported",
  uploadFile: "supported",
  createShareLink: "supported"
};

const StorageModeContext = createContext<StorageModeValue | undefined>(undefined);

export function StorageModeProvider({ children }: { children: ReactNode }) {
  const [requestedMode, setRequestedMode] = useState<AdapterMode>("mock");
  const [activeMode, setActiveMode] = useState<AdapterMode>("mock");
  const [message, setMessage] = useState("Mock 模式已连接");
  const [connectionOk, setConnectionOk] = useState(true);
  const [displayName, setDisplayName] = useState<string | undefined>("Mock");
  const [capabilities, setCapabilities] = useState<StorageCapabilities>(supportedCapabilities);
  const [checking, setChecking] = useState(false);

  const refreshCapabilities = useCallback(async () => {
    setChecking(true);
    try {
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
      checking,
      setRequestedMode,
      refreshCapabilities,
      getActiveAdapter
    }),
    [
      activeMode,
      capabilities,
      checking,
      connectionOk,
      displayName,
      getActiveAdapter,
      message,
      refreshCapabilities,
      requestedMode
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
