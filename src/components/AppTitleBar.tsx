import { Maximize2, Minus, Square, X } from "lucide-react";
import { getAdapterModeMeta } from "../adapters/adapterMode";
import { useStorageMode } from "../state/storageModeStore";

export function AppTitleBar() {
  const storage = useStorageMode();
  const meta = getAdapterModeMeta(storage.activeMode);
  const windowApi = getWindowApi();

  return (
    <header className="app-titlebar" data-testid="custom-titlebar">
      <div className="titlebar-brand">
        <img src="./brand-avatar.png" alt="" />
        <span>盘姬 · 批量助手</span>
      </div>
      <div className="titlebar-status">
        <span>{meta.label}</span>
        <b>{titlebarStatus(storage)}</b>
      </div>
      <div className="window-controls" aria-label="窗口控制">
        <button type="button" aria-label="最小化窗口" onClick={() => void windowApi?.minimize()}>
          <Minus size={15} />
        </button>
        <button type="button" aria-label="最大化或还原窗口" onClick={() => void windowApi?.toggleMaximize()}>
          {windowApi ? <Square size={13} /> : <Maximize2 size={14} />}
        </button>
        <button className="close" type="button" aria-label="关闭窗口" onClick={() => void windowApi?.close()}>
          <X size={16} />
        </button>
      </div>
    </header>
  );
}

function titlebarStatus(storage: ReturnType<typeof useStorageMode>): string {
  if (storage.activeMode === "mock") return "Mock 演示模式";
  if (storage.activeMode !== "windows_local_cli") return storage.connectionOk ? "已连接" : "待验证";
  if (storage.cliRuntime?.loginState === "logged_in") return "CLI 已登录";
  if (storage.cliRuntime?.cliInstalled) return "CLI 未登录";
  return "CLI 未检测到";
}

function getWindowApi():
  | {
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<boolean>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
    }
  | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & {
    panjieWindow?: {
      minimize: () => Promise<void>;
      toggleMaximize: () => Promise<boolean>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
    };
  }).panjieWindow;
}
