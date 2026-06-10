import { Bell, Plus, Search, ShieldCheck } from "lucide-react";

export function TopBar({ onNewTask }: { onNewTask: () => void }) {
  return (
    <header className="topbar">
      <div className="search-box">
        <Search size={18} />
        <span>搜索任务、文件名、分享码</span>
      </div>
      <div className="top-spacer" />
      <span className="sync-pill">
        <ShieldCheck size={17} />
        OAuth mock 已授权
      </span>
      <span className="sync-pill">
        <Bell size={17} />
        3 条风险待确认
      </span>
      <button className="primary-btn" type="button" onClick={onNewTask}>
        <Plus size={18} />
        新建任务
      </button>
    </header>
  );
}
