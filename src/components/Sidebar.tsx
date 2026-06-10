import { navItems } from "../data/prototypeData";
import type { PageId } from "../types";

export function Sidebar({
  activePage,
  onPageChange
}: {
  activePage: PageId;
  onPageChange: (page: PageId) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="avatar-wrap">
          <img className="avatar" src="./brand-avatar.png" alt="盘姬头像" />
        </div>
        <h1>
          <span>盘姬</span>
          <span>批量助手</span>
        </h1>
        <p>网盘资源清洗与转存工作台</p>
      </div>

      <nav className="nav" aria-label="主导航">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-btn ${activePage === item.id ? "active" : ""}`}
              key={item.id}
              type="button"
              onClick={() => onPageChange(item.id)}
            >
              <Icon size={20} />
              <span>
                <b>{item.label}</b>
                <small>{item.description}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <span className="status-dot" />
        本地 mock 原型运行中
        <br />
        仅模拟授权与处理流程
      </div>
    </aside>
  );
}
