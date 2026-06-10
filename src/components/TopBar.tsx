import { Bell, Plus, Search, ShieldCheck } from "lucide-react";
import { useStorageMode } from "../state/storageModeStore";

export function TopBar({ onNewTask }: { onNewTask: () => void }) {
  const storage = useStorageMode();

  return (
    <header className="topbar">
      <div className="search-box">
        <Search size={18} />
        <span>搜索任务、文件名、分享码</span>
      </div>
      <div className="top-spacer" />
      <span className="sync-pill">
        <ShieldCheck size={17} />
        当前接入：{modeLabel(storage.activeMode)}
      </span>
      <span className="sync-pill">
        <Bell size={17} />
        {storage.message}
      </span>
      <button className="primary-btn" type="button" onClick={onNewTask}>
        <Plus size={18} />
        新建任务
      </button>
    </header>
  );
}

function modeLabel(mode: string): string {
  const labels: Record<string, string> = {
    mock: "Mock",
    bdpan_cli: "bdpan CLI",
    baidu_mcp: "百度 MCP",
    baidu_sdk: "百度 SDK"
  };
  return labels[mode] ?? mode;
}
