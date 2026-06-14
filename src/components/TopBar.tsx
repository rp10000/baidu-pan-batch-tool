import { Bell, Plus, Search, ShieldCheck } from "lucide-react";
import { getAdapterModeMeta } from "../adapters/adapterMode";
import { useStorageMode } from "../state/storageModeStore";

export function TopBar({ onNewTask }: { onNewTask: () => void }) {
  const storage = useStorageMode();
  const meta = getAdapterModeMeta(storage.activeMode);
  const connected = storage.activeMode === "windows_local_cli" && storage.cliRuntime?.loginState === "logged_in";

  return (
    <header className="topbar">
      <div className="search-box">
        <Search size={18} />
        <span>搜索任务、文件名、分享码</span>
      </div>
      <div className="top-spacer" />
      <span className="sync-pill">
        <ShieldCheck size={17} />
        当前接入：{meta.label}
      </span>
      <span className={`sync-pill ${connected ? "connected" : ""}`}>
        <Bell size={17} />
        {storage.activeMode === "windows_local_cli" && storage.cliRuntime
          ? `${storage.cliRuntime.cliInstalled ? "CLI 已检测" : "CLI 未检测到"} · ${storage.cliRuntime.loginState === "logged_in" ? "已登录" : "未登录"}`
          : storage.message}
      </span>
      <button className="primary-btn" type="button" onClick={onNewTask}>
        <Plus size={18} />
        新建任务
      </button>
    </header>
  );
}
