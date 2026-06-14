import { useCallback, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ArchivePage } from "./pages/ArchivePage";
import { BatchProcessPage } from "./pages/BatchProcessPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WorkbenchPage } from "./pages/WorkbenchPage";
import { StorageModeProvider } from "./state/storageModeStore";
import { BatchDraftProvider } from "./state/batchDraftStore";
import { TaskProvider } from "./state/taskStore";
import type { PageId, ToastState } from "./types";

export default function App() {
  return (
    <StorageModeProvider>
      <BatchDraftProvider>
        <TaskProvider>
          <AppContent />
        </TaskProvider>
      </BatchDraftProvider>
    </StorageModeProvider>
  );
}

function AppContent() {
  const [activePage, setActivePage] = useState<PageId>("workbench");
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "" });

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    window.setTimeout(() => setToast({ visible: false, message }), 1600);
  }, []);

  const navigate = useCallback((page: PageId) => {
    setActivePage(page);
  }, []);

  return (
    <AppShell
      activePage={activePage}
      onPageChange={navigate}
      onNewTask={() => navigate("batch")}
      toast={toast}
    >
      {activePage === "workbench" && <WorkbenchPage onNavigate={navigate} />}
      {activePage === "batch" && (
        <BatchProcessPage
          onNavigate={navigate}
          onToast={showToast}
        />
      )}
      {activePage === "archive" && <ArchivePage />}
      {activePage === "settings" && <SettingsPage />}
    </AppShell>
  );
}
