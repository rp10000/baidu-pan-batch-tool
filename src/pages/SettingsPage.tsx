import { Bug, Database, ExternalLink, KeyRound, RefreshCw, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ADAPTER_MODE_OPTIONS,
  CAPABILITY_LABELS,
  CAPABILITY_MATRIX,
  capabilityStatusLabel
} from "../adapters/adapterMode";
import type { CapabilityKey, CapabilityStatus } from "../adapters/adapterMode";
import { BaiduCookieGuideModal } from "../components/auth/BaiduCookieGuideModal";
import type { SessionImportPayload } from "../components/auth/SessionImportForm";
import { SessionImportForm } from "../components/auth/SessionImportForm";
import { Card, StatusDot, Switch, Tag } from "../components/ui";
import type { LocalCliRuntimeSnapshot } from "../services/LocalCliRuntimeService";
import { useBatchDraftStore } from "../state/batchDraftStore";
import { useStorageMode } from "../state/storageModeStore";

const matrixRows: CapabilityKey[] = [
  "checkLogin",
  "listFiles",
  "createDirectory",
  "transferSharedLink",
  "renameFile",
  "moveFile",
  "uploadFile",
  "createShareLink"
];

interface DependencyItem {
  name: string;
  status: "found" | "missing" | "timeout" | "error" | "skipped_dependency_missing";
  path: string;
  source?: "embedded" | "user_selected" | "path" | "missing";
  category?: "core" | "recommended" | "scan_runtime";
  version: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

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

interface LoginProbeResult {
  ok: boolean;
  supports: { bduss: boolean; stoken: boolean; cookies: boolean };
  error?: string;
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
  const [dependencyChecking, setDependencyChecking] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [dependencies, setDependencies] = useState<DependencyItem[]>([]);
  const [cacheResult, setCacheResult] = useState("");
  const [developerLog, setDeveloperLog] = useState<{ cliPath: string; entries: CommandLogEntry[] } | undefined>();
  const [loginProbe, setLoginProbe] = useState<LoginProbeResult | undefined>();
  const cliRuntime = storage.cliRuntime;
  const cliStatus = cliStatusLabel(cliRuntime, storage.checking || detecting, storage.connectionOk);
  const cliMissing = cliRuntime?.cliInstalled === false;

  useEffect(() => {
    if (!cliRuntime && !storage.checking && !detecting && getDesktopApi()?.inspectLocalCli) {
      void redetectConnection();
    }
    void probeLoginMethod();
  }, []);

  async function refreshDeveloperLog() {
    const desktop = getDesktopApi();
    if (!desktop?.getLocalCliCommandLog) return;
    setDeveloperLog(await desktop.getLocalCliCommandLog());
  }

  async function probeLoginMethod() {
    const desktop = getDesktopApi();
    if (!desktop?.probeBaiduLoginMethod) return;
    const result = await desktop.probeBaiduLoginMethod();
    setLoginProbe(result);
  }

  async function redetectConnection() {
    setDetecting(true);
    storage.setRequestedMode("windows_local_cli");
    await storage.refreshCapabilities();
    await probeLoginMethod();
    await refreshDeveloperLog();
    setDetecting(false);
  }

  async function openLoginPage() {
    setOpeningLoginPage(true);
    const desktop = getDesktopApi();
    if (!desktop?.openBaiduLoginPage) {
      setMessage("当前不是桌面客户端，无法自动打开百度网盘网页。");
      setOpeningLoginPage(false);
      return;
    }
    const result = await desktop.openBaiduLoginPage();
    setMessage(result.ok ? "已打开百度网盘登录页。登录完成后回到这里查看获取教程。" : `打开百度网盘登录页失败：${result.error ?? "未知错误"}`);
    setOpeningLoginPage(false);
  }

  async function importSession(payload: SessionImportPayload) {
    const desktop = getDesktopApi();
    if (!desktop?.importBaiduSession) {
      setMessage("当前不是桌面客户端，无法导入本机 BaiduPCS-Go 登录态。");
      return;
    }
    setImporting(true);
    const result = await desktop.importBaiduSession(payload);
    await redetectConnection();
    await refreshDeveloperLog();
    setImporting(false);
    if (result.ok) {
      setGuideOpen(false);
      setMessage(`导入成功。登录方式：${loginMethodText(result.loginMethod ?? payload.mode)}`);
      return;
    }
    setMessage(`导入失败：${result.error ?? "BaiduPCS-Go 未确认登录"}`);
  }

  async function clearSession() {
    const desktop = getDesktopApi();
    if (!desktop?.clearBaiduSession) {
      setMessage("当前不是桌面客户端，无法清除本地会话。");
      return;
    }
    const result = await desktop.clearBaiduSession();
    await redetectConnection();
    await refreshDeveloperLog();
    setMessage(result.ok ? "本地 BaiduPCS-Go 会话已清除。" : `清除本地会话失败：${result.error ?? "未知错误"}`);
  }

  async function checkDependencies() {
    setDependencyChecking(true);
    const desktop = getDesktopApi();
    if (!desktop?.checkDependencies) {
      setDependencies([]);
      setMessage("当前不是桌面客户端，无法检查系统依赖。");
      setDependencyChecking(false);
      return;
    }
    try {
      const result = await desktop.checkDependencies();
      setDependencies(result.items);
    } catch (error) {
      setMessage(`检查依赖失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setDependencyChecking(false);
    }
  }

  async function clearCache() {
    setCacheClearing(true);
    const desktop = getDesktopApi();
    if (!desktop?.clearCache) {
      setCacheResult("当前不是桌面客户端，无法清理缓存。");
      setCacheClearing(false);
      return;
    }
    const result = await desktop.clearCache();
    setCacheResult(`删除文件 ${result.filesDeleted} 个，释放 ${formatBytes(result.bytesFreed)}${result.skipped?.length ? `；跳过 ${result.skipped.length} 项` : ""}${result.errors.length ? `；错误：${result.errors.join("；")}` : ""}`);
    setCacheClearing(false);
  }

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>设置中心</h2>
          <p>先连接百度网盘。默认流程只需要打开网页登录、按教程复制 BDUSS 和 STOKEN，再导入验证。</p>
        </div>
      </div>

      <div className="settings-connect-layout">
        <Card title="百度网盘连接" className="connect-main-card" action={<Tag tone={storage.connectionOk ? "green" : "orange"}>{cliStatus}</Tag>}>
          <div className="setting-hero compact">
            <KeyRound size={30} />
            <div>
              <b>{cliRuntimeLabel(cliRuntime)}</b>
              <span>本软件不会自动读取浏览器 Cookie。请登录百度网盘后，按图文教程复制 BDUSS 和 STOKEN 并导入。</span>
            </div>
          </div>

          <div className="connect-status-grid">
            <div><span>CLI</span><b>{cliRuntimeLabel(cliRuntime)}</b></div>
            <div><span>账号</span><b>{accountText(cliRuntime)}</b></div>
            <div><span>登录方式</span><b>{loginMethodText(cliRuntime?.loginMethod)}</b></div>
            <div><span>最后检测</span><b>{formatTime(cliRuntime?.lastCheckedAt)}</b></div>
            <div><span>文件列表检测</span><b>{cliRuntime?.rootListOk ? "通过" : "未通过"}</b></div>
            <div><span>容量检测</span><b>{cliRuntime?.quotaOk ? "通过" : "未通过"}</b></div>
          </div>

          {cliRuntime?.message && <p className={`notice ${cliRuntime.loginState === "logged_in" ? "" : "error"}`}>{cliRuntime.message}</p>}
          {cliMissing && <p className="notice error">内置 CLI 缺失，请重新安装客户端或运行 prepare:embedded-cli。</p>}
          {loginProbe && !loginProbe.ok && <p className="notice error">无法确认 BaiduPCS-Go 登录参数：{loginProbe.error ?? "login help 失败"}</p>}
          {message && <p className={`notice ${message.includes("失败") ? "error" : ""}`}>{message}</p>}

          <div className="connect-action-grid">
            <button className="secondary-btn" type="button" onClick={() => void openLoginPage()} disabled={openingLoginPage}>
              <ExternalLink size={17} />
              {openingLoginPage ? "正在打开" : "打开百度网盘登录页"}
            </button>
            <button className="secondary-btn" type="button" onClick={() => setGuideOpen(true)}>
              <ShieldCheck size={17} />
              我已登录，查看获取教程
            </button>
            <button className="primary-btn" type="button" onClick={() => setGuideOpen(true)} disabled={cliMissing || importing}>
              粘贴并导入登录态
            </button>
            <button className="secondary-btn" type="button" onClick={() => void redetectConnection()} disabled={storage.checking || detecting}>
              <RefreshCw size={17} />
              {storage.checking || detecting ? "检测中" : "重新检测"}
            </button>
          </div>

          {storage.connectionOk && (
            <div className="connect-action-grid compact-actions">
              <button className="secondary-btn" type="button" onClick={() => setGuideOpen(true)}>
                重新导入
              </button>
              <button className="secondary-btn danger" type="button" onClick={() => void clearSession()}>
                <Trash2 size={16} />
                清除本地会话
              </button>
            </div>
          )}
        </Card>
      </div>

      <details className="advanced-settings">
        <summary>
          <Settings2 size={18} />
          展开高级调试
        </summary>
        <div className="settings-grid advanced-grid">
          <Card title="完整 Cookie 导入" action={<Tag tone="orange">高级</Tag>}>
            <p className="notice">默认建议使用 BDUSS + STOKEN。只有你明确知道自己在做什么时，再使用完整 Cookie 导入。</p>
            <SessionImportForm mode="cookie" title="完整 Cookie 字符串导入" onImport={importSession} importing={importing} disabled={cliMissing} />
          </Card>

          <Card title="依赖检测" action={<Bug size={18} />}>
            <div className="api-row"><span>登录参数</span><b>{loginProbe ? loginSupportText(loginProbe) : "未检测"}</b></div>
            <div className="api-row"><span>内置 BaiduPCS-Go</span><b>{dependencyLabel(dependencies, "内置 BaiduPCS-Go")}</b></div>
            <div className="api-row"><span>FFmpeg</span><b>{dependencyLabel(dependencies, "FFmpeg")}</b></div>
            <div className="api-row"><span>Python</span><b>{dependencyLabel(dependencies, "Python")}</b></div>
            <div className="api-row"><span>OCR / Tesseract</span><b>{dependencyLabel(dependencies, "Tesseract")}</b></div>
            <div className="dual-actions">
              <button className="secondary-btn" type="button" disabled title="完整扫描运行时后续提供">
                OCR 模型安装未接线
              </button>
              <button className="secondary-btn" type="button" onClick={() => void checkDependencies()} disabled={dependencyChecking}>
                {dependencyChecking ? "检测中" : "检查依赖"}
              </button>
            </div>
            {dependencies.length > 0 && (
              <div className="dependency-list">
                {dependencies.map((item) => (
                  <div className="api-row" key={item.name}>
                    <span>{item.name}</span>
                    <b>{dependencyStatusText(item)}</b>
                  </div>
                ))}
              </div>
            )}
          </Card>

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

          <Card title="开发者模式" action={<Tag tone="blue">真实 IPC</Tag>}>
            <div className="api-row"><span>CLI 路径</span><b>{developerLog?.cliPath || "未刷新"}</b></div>
            <div className="api-row"><span>CLI 版本</span><b>{cliRuntime?.cliVersion || dependencies.find((item) => item.name === "内置 BaiduPCS-Go")?.version || "未检测"}</b></div>
            <div className="api-row"><span>当前模式</span><b>{storage.activeMode}</b></div>
            <button className="secondary-btn full" type="button" onClick={() => void refreshDeveloperLog()}>
              刷新执行日志
            </button>
            <DeveloperCommandLog entries={developerLog?.entries ?? []} />
            <div className="mode-grid debug-mode-grid">
              {ADAPTER_MODE_OPTIONS.map((item) => (
                <button
                  className={`mode-card ${storage.requestedMode === item.mode ? "active" : ""}`}
                  key={item.mode}
                  type="button"
                  onClick={() => storage.setRequestedMode(item.mode)}
                >
                  <b>{item.label}</b>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="官方 OAuth / MCP 预留" action={<Tag tone="orange">预留</Tag>}>
            <div className="api-row"><span>OAuth 授权</span><b>待接入</b></div>
            <div className="api-row"><span>MCP 能力</span><b>待接入</b></div>
            <div className="api-row"><span>当前主流程</span><b>本机 BaiduPCS-Go 登录态导入</b></div>
          </Card>

          <AdapterMatrixCard />
        </div>
      </details>

      <BaiduCookieGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        onOpenLoginPage={() => void openLoginPage()}
        onImport={importSession}
        importing={importing}
      />
    </section>
  );
}

function AdapterMatrixCard() {
  return (
    <Card title="能力矩阵" className="span-2" action={<Tag tone="blue">调试</Tag>}>
      <div className="table-scroll">
        <table className="capability-table">
          <thead>
            <tr>
              <th>能力</th>
              {ADAPTER_MODE_OPTIONS.map((mode) => (
                <th key={mode.mode}>{mode.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixRows.map((key) => (
              <tr key={key}>
                <td>{CAPABILITY_LABELS[key]}</td>
                {ADAPTER_MODE_OPTIONS.map((mode) => (
                  <td key={mode.mode}>
                    <CapabilityStatusBadge status={CAPABILITY_MATRIX[key][mode.mode]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DeveloperCommandLog({ entries }: { entries: CommandLogEntry[] }) {
  const latest = entries.at(-1);
  if (!latest) {
    return <p className="notice">暂无 CLI 执行日志。点击“重新检测”或刷新执行日志后显示真实命令输出。</p>;
  }

  function copyDebugInfo() {
    const payload = { latest, entries: entries.slice(-10) };
    void navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => undefined);
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
      <button className="secondary-btn full" type="button" onClick={copyDebugInfo}>
        复制调试信息
      </button>
    </div>
  );
}

function CapabilityStatusBadge({ status }: { status: CapabilityStatus }) {
  return (
    <span className={`capability-badge ${status}`}>
      <StatusDot tone={statusTone(status)} />
      {capabilityStatusLabel(status)}
    </span>
  );
}

function statusTone(status: CapabilityStatus): "blue" | "pink" | "orange" | "green" | "red" {
  if (status === "supported" || status === "mock_only") return "green";
  if (status === "needs_official_verification" || status === "paid_required" || status === "manual_required") return "orange";
  if (status === "wsl_only") return "blue";
  return "red";
}

function cliStatusLabel(runtime: LocalCliRuntimeSnapshot | undefined, checking: boolean, connectionOk: boolean): string {
  if (checking) return "检测中";
  if (!runtime) return connectionOk ? "已登录" : "未检测";
  if (!runtime.cliInstalled) return "未检测到";
  if (runtime.loginState === "logged_in") return "已登录";
  if (runtime.loginState === "not_logged_in") return "未登录";
  return "未验证";
}

function dependencyLabel(items: DependencyItem[], name: string): string {
  const item = items.find((candidate) => candidate.name === name);
  if (!item) return "未检测";
  return dependencyStatusText(item);
}

function dependencyStatusText(item: DependencyItem): string {
  if (item.status === "found") return item.version || "可用";
  if (item.status === "timeout") return "检测超时";
  if (item.status === "skipped_dependency_missing") return item.stderr || "需要前置依赖";
  if (item.status === "error") return item.stderr || "检测错误";
  return item.stderr || "未检测到";
}

function cliRuntimeLabel(runtime: LocalCliRuntimeSnapshot | undefined): string {
  if (!runtime) return "内置 BaiduPCS-Go";
  if (!runtime.cliInstalled) return "内置 CLI 缺失";
  const version = runtime.cliVersion.replace(/^BaiduPCS-Go\s+version\s*/i, "").trim();
  return `${runtime.cliSource === "embedded" ? "内置 " : ""}BaiduPCS-Go${version ? ` ${version}` : ""}`;
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

function loginSupportText(probe: LoginProbeResult): string {
  if (!probe.ok) return "检测失败";
  const items = [];
  if (probe.supports.bduss && probe.supports.stoken) items.push("BDUSS+STOKEN");
  if (probe.supports.cookies) items.push("Cookie");
  return items.length ? items.join(" / ") : "未识别支持项";
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
      probeBaiduLoginMethod?: () => Promise<LoginProbeResult>;
      importBaiduSession?: (payload: SessionImportPayload) => Promise<ImportResult>;
      clearBaiduSession?: () => Promise<{ ok: boolean; error?: string; runtime?: LocalCliRuntimeSnapshot }>;
      checkDependencies?: () => Promise<{ checkedAt: string; items: DependencyItem[] }>;
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
        probeBaiduLoginMethod?: () => Promise<LoginProbeResult>;
        importBaiduSession?: (payload: SessionImportPayload) => Promise<ImportResult>;
        clearBaiduSession?: () => Promise<{ ok: boolean; error?: string; runtime?: LocalCliRuntimeSnapshot }>;
        checkDependencies?: () => Promise<{ checkedAt: string; items: DependencyItem[] }>;
        clearCache?: () => Promise<{ ok: boolean; userDataPath: string; filesDeleted: number; bytesFreed: number; errors: string[]; skipped?: string[] }>;
      };
    }
  ).panjieDesktop;
}
