import type { ReactNode } from "react";
import type { PageId, ToastState } from "../types";
import { AppTitleBar } from "./AppTitleBar";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({
  activePage,
  onPageChange,
  onNewTask,
  toast,
  children
}: {
  activePage: PageId;
  onPageChange: (page: PageId) => void;
  onNewTask: () => void;
  toast: ToastState;
  children: ReactNode;
}) {
  return (
    <main className="app-shell">
      <AppTitleBar />
      <div className="app-body">
        <Sidebar activePage={activePage} onPageChange={onPageChange} />
        <section className="content-shell">
          <TopBar onNewTask={onNewTask} />
          <div className="page-stage">{children}</div>
        </section>
      </div>
      <div className={`toast ${toast.visible ? "show" : ""}`}>{toast.message}</div>
    </main>
  );
}
