import { Database, ExternalLink, KeyRound, RefreshCw, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BaiduCookieGuideModal } from "../components/auth/BaiduCookieGuideModal";
import type { SessionImportPayload } from "../components/auth/SessionImportForm";
import { SessionImportForm } from "../components/auth/SessionImportForm";
import { Card, Switch, Tag } from "../components/ui";
import type { LocalCliRuntimeSnapshot } from "../services/LocalCliRuntimeService";
import { useBatchDraftStore } from "../state/batchDraftStore";
import { useStorageMode } from "../state/storageModeStore";

interface CommandLogEntry {
  id: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ImportResult {
  ok: boolean;
  error?: string;
  runtime?: LocalCliRuntimeSnapshot;
  loginMethod?: "bduss_stoken" | "cookie";
}

export function SettingsPage() {
  const storage = useStorageMode();
  const draft = useBatchDraftStore();
  const [guideOpen, setGuideOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [openingLoginPage, setOpeningLoginPage] = useState(false);
  const [importing, setImporting] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheResult, setCacheResult] = useState("");
  const [developerLog, setDeveloperLog] = useState<{ cliPath: string; entries: CommandLogEntry[] } | undefined>();
  const desktop = getDesktopApi();
  const runtime = storage.cliRuntime;
  const connected = runtime?.loginState === "logged_in" || storage.connectionOk;
  const cliMissing = runtime?.cliInstalled === false;

  useEffect(() => {
    if (!runtime && !storage.checking && !detecting) {
      void redetectConnection();
    }
  }, []);

  async function refreshDeveloperLog() {
    if (!desktop?.getLocalCliCommandLog) return;
    setDeveloperLog(await desktop.getLocalCliCommandLog());
  }

  async function redetectConnection() {
    setDetecting(true);
    storage.setRequestedMode("windows_local_cli");
    if (desktop?.inspectLocalCli) {
      const snapshot = await desktop.inspectLocalCli();
      storage.applyLocalCliRuntime(snapshot);
    } else {
      await storage.refreshCapabilities();
    }
    await refreshDeveloperLog();
    setDetecting(false);
  }

  async function openLoginPage() {
    setOpeningLoginPage(true);
    if (!desktop?.openBaiduLoginPage) {
      setMessage("当前不是桌面客户端，无法自动打开百度网盘网页。");
      setOpeningLoginPage(false);
      return;
    }
    const result = await desktop.openBaiduLoginPage();
    setMessage(result.ok ? "已打开百度网盘登录页。登录后把 BDUSS 和 STOKEN 粘贴到下方。" : `打开失败：${result.error ?? "未知错误"}`);
    setOpeningLoginPage(false);
  }

  async function importSession(payload: SessionImportPayload) {
    if (!desktop?.importBaiduSession) {
      setMessage("当前不是桌面客户端，无法导入本机 BaiduPCS-Go 登录态。");
      return;
    }
    setImporting(true);
    const result: ImportResult = await desktop.importBaiduSession(payload);
    if (result.runtime) {
      storage.applyLocalCliRuntime(result.runtime);
    } else {
      await redetectConnection();
    }
    await refreshDeveloperLog();
    setImporting(false);

    if (result.ok && result.runtime?.loginState === "logged_in") {
      setMessage(`导入成功，百度网盘已连接。登录方式：${loginMethodText(result.loginMethod ?? payload.mode)}`);
      return;
    }
    setMessage(`导入失败：${result.error ?? result.runtime?.message ?? "BaiduPCS-Go 未确认登录"}`);
  }

  async function clearSession() {
    if (!desktop?.clearBaiduSession) {
      setMessage("当前不是桌面客户端，无法清除本地会话。");
      return;
    }
    const result = await desktop.clearBaiduSession();
    if (result.runtime) storage.applyLocalCliRuntime(result.runtime);
    await refreshDeveloperLog();
    setMessage(result.ok ? "本地 BaiduPCS-Go 会话已清除。" : `清除失败：${result.error ?? "未知错误"}`);
  }

  async function clearCache() {
    setCacheClearing(true);
    if (!desktop?.clearCache) {
      setCacheResult("当前不是桌面客户端，无法清理缓存。");
      setCacheClearing(false);
      return;
    }
    const result = await desktop.clearCache();
    setCacheResult(`删除 ${result.filesDeleted} 个文件，释放 ${formatBytes(result.bytesFreed)}${result.skipped?.length ? `，跳过 ${result.skipped.length} 项` : ""}${result.errors.length ? `，错误：${result.errors.join("；")}` : ""}`);
    setCacheClearing(false);
  }

  return (
    <section className="page settings-clean-page">
      <div className="page-title">
        <div>
          <h2>设置中心</h2>
          <p>这里只保留连接百度网盘和本机数据设置。先连接成功，再去任务处理。</p>
        </div>
      </div>

      <div className="settings-connect-layout">
        <Card title="百度网盘连接" className="connect-main-card" action={<Tag tone={connected ? "green" : "orange"}>{connectionLabel(runtime, storage.checking || detecting)}</Tag>}>
          <div className="setting-hero compact">
            <KeyRound size={30} />
            <div>
              <b>{connected ? "百度网盘已连接" : "连接你的百度网盘"}</b>
              <span>打开网页登录后，手动复制 BDUSS 和 STOKEN 到下方。软件不会自动读取浏览器数据。</span>
            </div>
          </div>

          <div className="connect-status-grid simple-connect-status">
            <div className={connected ? "status-ok" : "status-warn"}><span>连接状态</span><b>{connected ? "已连接" : "未连接"}</b></div>
            <div className={runtime?.cliInstalled ? "status-ok" : "status-warn"}><span>本机组件</span><b>{runtime?.cliInstalled ? cliRuntimeLabel(runtime) : "未检测到"}</b></div>
            <div className={connected ? "status-ok" : "status-warn"}><span>账号</span><b>{accountText(runtime)}</b></div>
            <div className={connected ? "status-ok" : "status-warn"}><span>登录方式</span><b>{loginMethodText(runtime?.loginMethod)}</b></div>
            <div className={runtime?.rootListOk ? "status-ok" : "status-warn"}><span>网盘读取</span><b>{runtime?.rootListOk ? "可读取" : "未通过"}</b></div>
            <div><span>最后检测</span><b>{formatTime(runtime?.lastCheckedAt)}</b></div>
          </div>

          {runtime?.message && <p className={`notice ${connected ? "" : "error"}`}>{runtime.message}</p>}
          {cliMissing && <p className="notice error">内置 BaiduPCS-Go 缺失，请重新安装客户端。</p>}
          {message && <p className={`notice ${message.includes("失败") ? "error" : ""}`}>{message}</p>}

          <div className="connect-action-grid compact-actions">
            <button className="secondary-btn" type="button" onClick={() => void openLoginPage()} disabled={openingLoginPage}>
              <ExternalLink size={17} />
              {openingLoginPage ? "正在打开" : "打开百度网盘登录页"}
            </button>
            <button className="secondary-btn" type="button" onClick={() => setGuideOpen(true)}>
              <ShieldCheck size={17} />
              查看获取教程
            </button>
            <button className="secondary-btn" type="button" onClick={() => void redetectConnection()} disabled={storage.checking || detecting}>
              <RefreshCw size={17} />
              {storage.checking || detecting ? "检测中" : "重新检测"}
            </button>
            {connected && (
              <button className="secondary-btn danger" type="button" onClick={() => void clearSession()}>
                <Trash2 size={16} />
                清除登录态
              </button>
            )}
          </div>

          <SessionImportForm
            title="粘贴 BDUSS / STOKEN"
            onImport={importSession}
            importing={importing}
            disabled={cliMissing}
          />
        </Card>
      </div>

      <details className="advanced-settings">
        <summary>
          <Settings2 size={18} />
          展开高级调试
        </summary>
        <div className="settings-grid advanced-grid">
          <Card title="数据与缓存" action={<Database size={18} />}>
            <div className="api-row">
              <span>草稿保存</span>
              <button className="inline-toggle" type="button" onClick={() => draft.setPersistDraft(!draft.persistDraft)}>
                <Switch checked={draft.persistDraft} />
                <b>{draft.persistDraft ? "开" : "关"}</b>
              </button>
            </div>
            <button className="secondary-btn full" type="button" onClick={() => void clearCache()}>
              {cacheClearing ? "清理中" : "清理缓存"}
            </button>
            {cacheResult && <p className="notice">{cacheResult}</p>}
          </Card>

          <Card title="开发者模式" action={<Tag tone="blue">调试</Tag>}>
            <div className="api-row"><span>CLI 路径</span><b>{developerLog?.cliPath || "未刷新"}</b></div>
            <div className="api-row"><span>CLI 版本</span><b>{runtime?.cliVersion || "未检测"}</b></div>
            <button className="secondary-btn full" type="button" onClick={() => void refreshDeveloperLog()}>
              刷新执行日志
            </button>
            <DeveloperCommandLog entries={developerLog?.entries ?? []} />
          </Card>
        </div>
      </details>

      <BaiduCookieGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onOpenLoginPage={() => void openLoginPage()}
      />
    </section>
  );
}

function DeveloperCommandLog({ entries }: { entries: CommandLogEntry[] }) {
  const latest = entries.at(-1);
  if (!latest) {
    return <p className="notice">暂无 CLI 执行日志。点击“重新检测”后显示真实命令输出。</p>;
  }

  return (
    <div className="developer-log">
      <div className="api-row"><span>执行命令</span><b>{latest.command}</b></div>
      <div className="api-row"><span>exitCode</span><b>{latest.exitCode}</b></div>
      <label>
        <span>stdout</span>
        <pre className="log-block">{latest.stdout || "(empty)"}</pre>
      </label>
      <label>
        <span>stderr</span>
        <pre className="log-block">{latest.stderr || "(empty)"}</pre>
      </label>
    </div>
  );
}

function connectionLabel(runtime: LocalCliRuntimeSnapshot | undefined, checking: boolean): string {
  if (checking) return "检测中";
  if (runtime?.loginState === "logged_in") return "已连接";
  if (runtime?.cliInstalled) return "未登录";
  return "未检测";
}

function cliRuntimeLabel(runtime: LocalCliRuntimeSnapshot | undefined): string {
  if (!runtime) return "内置 BaiduPCS-Go";
  if (!runtime.cliInstalled) return "内置组件缺失";
  const version = runtime.cliVersion.replace(/^BaiduPCS-Go\s+version\s*/i, "").trim();
  return `BaiduPCS-Go${version ? ` ${version}` : ""}`;
}

function accountText(runtime: LocalCliRuntimeSnapshot | undefined): string {
  if (!runtime) return "未检测";
  if (runtime.loginState !== "logged_in") return "未登录";
  return maskText(runtime.account.username || runtime.account.uid || "已登录");
}

function maskText(value: string): string {
  if (value.length <= 2) return value;
  if (/^\d+$/.test(value)) return `uid ${value.slice(0, 2)}***${value.slice(-2)}`;
  return `${value.slice(0, 1)}***${value.slice(-1)}`;
}

function loginMethodText(method?: LocalCliRuntimeSnapshot["loginMethod"] | "bduss_stoken" | "cookie"): string {
  if (method === "bduss_stoken") return "BDUSS+STOKEN";
  if (method === "cookie") return "Cookie";
  if (method === "existing") return "已有会话";
  return "未导入";
}

function formatTime(value: string | undefined): string {
  if (!value) return "未检测";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units.shift() ?? "KB";
  while (value >= 1024 && units.length > 0) {
    value /= 1024;
    unit = units.shift() ?? unit;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

function getDesktopApi():
  | {
      inspectLocalCli?: () => Promise<LocalCliRuntimeSnapshot>;
      getLocalCliCommandLog?: () => Promise<{ cliPath: string; entries: CommandLogEntry[] }>;
      openBaiduLoginPage?: () => Promise<{ ok: boolean; error?: string }>;
      importBaiduSession?: (payload: SessionImportPayload) => Promise<ImportResult>;
      clearBaiduSession?: () => Promise<{ ok: boolean; error?: string; runtime?: LocalCliRuntimeSnapshot }>;
      clearCache?: () => Promise<{ ok: boolean; userDataPath: string; filesDeleted: number; bytesFreed: number; errors: string[]; skipped?: string[] }>;
    }
  | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window as typeof window & {
      panjieDesktop?: {
        inspectLocalCli?: () => Promise<LocalCliRuntimeSnapshot>;
        getLocalCliCommandLog?: () => Promise<{ cliPath: string; entries: CommandLogEntry[] }>;
        openBaiduLoginPage?: () => Promise<{ ok: boolean; error?: string }>;
        importBaiduSession?: (payload: SessionImportPayload) => Promise<ImportResult>;
        clearBaiduSession?: () => Promise<{ ok: boolean; error?: string; runtime?: LocalCliRuntimeSnapshot }>;
        clearCache?: () => Promise<{ ok: boolean; userDataPath: string; filesDeleted: number; bytesFreed: number; errors: string[]; skipped?: string[] }>;
      };
    }
  ).panjieDesktop;
}
