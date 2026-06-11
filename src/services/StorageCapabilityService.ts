import type { AdapterMode, StorageCapabilities } from "../adapters/StorageAdapter";
import { DEFAULT_STORAGE_CAPABILITIES } from "../adapters/StorageAdapter";
import { createStorageAdapter } from "../adapters/adapterProvider";

export interface StorageRuntimeResult {
  requestedMode: AdapterMode;
  activeMode: AdapterMode;
  connectionOk: boolean;
  displayName?: string;
  message: string;
  capabilities: StorageCapabilities;
}

export function resolveActiveStorageMode(input: {
  requestedMode: AdapterMode;
  connectionOk: boolean;
  message: string;
}): { activeMode: AdapterMode; message: string } {
  if (input.requestedMode === "bdpan_wsl" && !input.connectionOk) {
    return {
      activeMode: "mock",
      message: `${input.message}；bdpan WSL 高级模式不可用，当前回退 Mock`
    };
  }

  return {
    activeMode: input.requestedMode,
    message: input.message
  };
}

export async function inspectStorageRuntime(requestedMode: AdapterMode): Promise<StorageRuntimeResult> {
  const adapter = createStorageAdapter(requestedMode);
  const connection = await adapter.checkConnection();
  const capabilities = await adapter.getCapabilities().catch(() => DEFAULT_STORAGE_CAPABILITIES);
  const resolved = resolveActiveStorageMode({
    requestedMode,
    connectionOk: connection.ok,
    message: connection.message
  });

  return {
    requestedMode,
    activeMode: resolved.activeMode,
    connectionOk: connection.ok,
    displayName: connection.displayName,
    message: resolved.message,
    capabilities
  };
}
