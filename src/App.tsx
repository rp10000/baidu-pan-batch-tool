import { useCallback, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ArchivePage } from "./pages/ArchivePage";
import { BatchProcessPage } from "./pages/BatchProcessPage";
import { ScanCheckPage } from "./pages/ScanCheckPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ShareExportPage } from "./pages/ShareExportPage";
import { WorkbenchPage } from "./pages/WorkbenchPage";
import type { PageId, ToastState } from "./types";

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("workbench");
  const [batchShouldShowModal, setBatchShouldShowModal] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "" });

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    window.setTimeout(() => setToast({ visible: false, message }), 1600);
  }, []);

  const navigate = useCallback((page: PageId) => {
    setActivePage(page);
    if (page === "batch") {
      setBatchShouldShowModal(true);
    }
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
          showDefaultModal={batchShouldShowModal}
          onDefaultModalShown={() => setBatchShouldShowModal(false)}
          onToast={showToast}
        />
      )}
      {activePage === "scan" && <ScanCheckPage />}
      {activePage === "archive" && <ArchivePage />}
      {activePage === "share" && <ShareExportPage onToast={showToast} />}
      {activePage === "settings" && <SettingsPage />}
    </AppShell>
  );
}
