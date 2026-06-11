import { Database, Info, KeyRound, ScanLine, Settings2, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ADAPTER_MODE_OPTIONS,
  CAPABILITY_LABELS,
  CAPABILITY_MATRIX,
  capabilityStatusLabel
} from "../adapters/adapterMode";
import type { CapabilityKey, CapabilityStatus } from "../adapters/adapterMode";
import { useBatchDraftStore } from "../state/batchDraftStore";
import { useStorageMode } from "../state/storageModeStore";
import { Card, StatusDot, Switch, Tag } from "../components/ui";
import type { LocalCliRuntimeSnapshot } from "../services/LocalCliRuntimeService";

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

export function SettingsPage() {
  const storage = useStorageMode();
  const draft = useBatchDraftStore();
  const [loginMessage, setLoginMessage] = useState("");
  const [loginOpening, setLoginOpening] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [dependencyChecking, setDependencyChecking] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);
  const [dependencies, setDependencies] = useState<DependencyItem[]>([]);
  const [cacheResult, setCacheResult] = useState("");
  const [developerLog, setDeveloperLog] = useState<{ cliPath: string; entries: CommandLogEntry[] } | undefined>();
  const cliRuntime = storage.cliRuntime;
  const cliStatus = cliStatusLabel(cliRuntime, storage.checking || detecting, storage.connectionOk);
  const cliMissing = cliRuntime?.cliInstalled === false;

  useEffect(() => {
    if (!cliRuntime && !storage.checking && !detecting && getDesktopApi()?.inspectLocalCli) {
      void redetectConnection();
    }
  }, []);

  async function refreshDeveloperLog() {
    const desktop = getDesktopApi();
    if (!desktop?.getLocalCliCommandLog) return;
    setDeveloperLog(await desktop.getLocalCliCommandLog());
  }

  async function redetectConnection() {
    setDetecting(true);
    storage.setRequestedMode("windows_local_cli");
    await storage.refreshCapabilities();
    await refreshDeveloperLog();
    setDetecting(false);
  }

  async function startLogin() {
    setLoginOpening(true);
    storage.setRequestedMode("windows_local_cli");
    const desktop = getDesktopApi();
    if (!desktop?.startLocalCliLogin) {
      setLoginMessage("当前不是桌面客户端。请打开 release 里的 exe 后再启动登录。");
      setLoginOpening(false);
      return;
    }
    const result = await desktop.startLocalCliLogin();
    setLoginMessage(result.ok ? "已打开可见登录终端。请在弹出的 BaiduPCS-Go 窗口内完成登录，然后点击“重新检测”。" : `打开登录终端失败：${result.error ?? "无法打开登录终端"}`);
    await refreshDeveloperLog();
    setLoginOpening(false);
  }

  async function checkDependencies() {
    setDependencyChecking(true);
    const desktop = getDesktopApi();
    if (!desktop?.checkDependencies) {
      setDependencies([]);
      setLoginMessage("当前不是桌面客户端，无法检查系统依赖。");
      setDependencyChecking(false);
      return;
    }
    try {
      const result = await desktop.checkDependencies();
      setDependencies(result.items);
    } catch (error) {
      setLoginMessage(`检查依赖失败：${error instanceof Error ? error.message : "未知错误"}`);
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
    setCacheResult(`删除文件 ${result.filesDeleted} 个，释放 ${formatBytes(result.bytesFreed)}${result.skipped?.length ? `；跳过锁定项 ${result.skipped.length} 个` : ""}${result.errors.length ? `；错误：${result.errors.join("；")}` : ""}`);
    setCacheClearing(false);
  }

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>设置中心</h2>
          <p>普通设置只保留连接、默认值、扫描、缓存和版本信息；调试细节默认折叠。</p>
        </div>
      </div>

      <div className="settings-simple-grid">
        <Card title="百度网盘连接" action={<Tag tone={storage.connectionOk ? "green" : "orange"}>{cliStatus}</Tag>}>
          <div className="setting-hero compact">
            <KeyRound size={28} />
            <div>
              <b>Windows 本地 CLI</b>
              <span>CLI：{cliRuntimeLabel(cliRuntime)}</span>
            </div>
          </div>
          <div className="api-row"><span>来源</span><b>{cliSourceText(cliRuntime?.cliSource)}</b></div>
          <div className="api-row"><span>连接状态</span><b>{cliStatus}</b></div>
          <div className="api-row"><span>用户名</span><b>{cliRuntime?.account.username ?? (cliRuntime?.loginState === "not_logged_in" ? "未登录" : "未检测")}</b></div>
          <div className="api-row"><span>容量 / 已用</span><b>{cliRuntime?.account.quotaTotal || cliRuntime?.account.quotaUsed ? `${cliRuntime.account.quotaTotal ?? "未解析"} / ${cliRuntime.account.quotaUsed ?? "未解析"}` : "未检测"}</b></div>
          {cliRuntime?.message && <p className={`notice ${cliRuntime.loginState === "logged_in" ? "" : "error"}`}>{cliRuntime.message}</p>}
          {cliMissing && <p className="notice error">内置 CLI 缺失，请重新安装客户端或运行 prepare:embedded-cli。</p>}
          <div className="dual-actions">
            <button className="secondary-btn" type="button" onClick={() => void redetectConnection()} disabled={storage.checking || detecting}>
              {storage.checking || detecting ? "检测中" : "重新检测"}
            </button>
            <button className="primary-btn" type="button" onClick={() => void startLogin()} disabled={loginOpening || cliMissing}>
              {loginOpening ? "正在打开" : "打开登录终端"}
            </button>
          </div>
          {loginMessage && <p className="notice">{loginMessage}</p>}
        </Card>

        <Card title="处理默认值" action={<SlidersHorizontal size={18} />}>
          <div className="api-row"><span>默认模式</span><b>快速转存</b></div>
          <div className="api-row"><span>默认重命名</span><b>{draft.autoRenameFiles ? "开启" : "关闭"}</b></div>
          <div className="api-row"><span>默认创建分享</span><b>{draft.autoCreateShareCode ? "开启" : "关闭"}</b></div>
          <div className="api-row"><span>默认扫描</span><b>{draft.scanOptions.enabled ? "开启" : "关闭"}</b></div>
        </Card>

        <Card title="扫描配置" action={<ScanLine size={18} />}>
          <div className="api-row"><span>Python</span><b>{dependencyLabel(dependencies, "Python")}</b></div>
          <div className="api-row"><span>OCR / Tesseract</span><b>{dependencyLabel(dependencies, "Tesseract")}</b></div>
          <div className="api-row"><span>OpenCV</span><b>{dependencyLabel(dependencies, "OpenCV")}</b></div>
          <div className="api-row"><span>FFmpeg</span><b>{dependencyLabel(dependencies, "FFmpeg")}</b></div>
          <div className="api-row"><span>PaddleOCR</span><b>{dependencyLabel(dependencies, "PaddleOCR")}</b></div>
          <div className="dual-actions">
            <button className="secondary-btn" type="button" disabled title="OCR 模型安装尚未完成真实接线">
              完整扫描运行时后续提供
            </button>
            <button className="secondary-btn" type="button" onClick={() => void checkDependencies()} disabled={dependencyChecking}>
              {dependencyChecking ? "检测中" : "检查依赖"}
            </button>
          </div>
          {dependencyChecking && <p className="notice">正在逐项检查依赖，每项最多等待 5 秒。</p>}
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
          <div className="api-row"><span>缓存状态</span><b>{cacheResult ? "已清理" : "未检测"}</b></div>
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

        <Card title="关于" action={<Info size={18} />}>
          <div className="api-row"><span>版本</span><b>0.1.0</b></div>
          <div className="api-row"><span>exe 路径</span><b>release/盘姬批量助手 0.1.0.exe</b></div>
          <div className="api-row"><span>数据目录</span><b>Windows 应用数据目录</b></div>
          <button className="secondary-btn full" type="button" disabled title="检查更新功能未接线">检查更新未接线</button>
        </Card>
      </div>

      <details className="advanced-settings">
        <summary>
          <Settings2 size={18} />
          展开高级调试
        </summary>
        <div className="settings-grid advanced-grid">
          <Card title="开发者模式" action={<Tag tone="blue">真实 IPC</Tag>}>
            <div className="api-row"><span>CLI 路径</span><b>{developerLog?.cliPath || "未刷新"}</b></div>
            <div className="api-row"><span>CLI 版本</span><b>{cliRuntime?.cliVersion || dependencies.find((item) => item.name === "BaiduPCS-Go")?.version || "未检测"}</b></div>
            <div className="api-row"><span>当前模式</span><b>{storage.activeMode}</b></div>
            <div className="api-row"><span>smoke 日志</span><b>docs/windows-cli-smoke-report.md</b></div>
            <div className="api-row"><span>bdpan WSL</span><b>保留为高级诊断</b></div>
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

          <Card title="官方 OAuth 预留" action={<Tag tone="orange">待接入</Tag>}>
            <div className="api-row"><span>OAuth 授权</span><b>待接入</b></div>
            <div className="api-row"><span>读取目录</span><b>待接入</b></div>
            <div className="api-row"><span>创建分享链接</span><b>待验证</b></div>
            <div className="api-row"><span>导出结果</span><b>已实现 mock / CLI</b></div>
          </Card>

          <AdapterMatrixCard />
        </div>
      </details>
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
    return <p className="notice">暂无 CLI 执行日志。点击“重新检测”、创建分享或刷新执行日志后显示真实命令输出。</p>;
  }

  function copyDebugInfo() {
    const payload = {
      latest,
      entries: entries.slice(-10)
    };
    void navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).catch(() => undefined);
  }

  return (
    <div className="developer-log">
      <div className="api-row"><span>执行命令</span><b>{latest.command}</b></div>
      <div className="api-row"><span>startedAt</span><b>{latest.startedAt ?? latest.createdAt}</b></div>
      <div className="api-row"><span>finishedAt</span><b>{latest.finishedAt ?? latest.createdAt}</b></div>
      <div className="api-row"><span>durationMs</span><b>{latest.durationMs ?? 0}</b></div>
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
  if (!runtime) return "BaiduPCS-Go";
  if (!runtime.cliInstalled) return "内置 CLI 缺失";
  const version = runtime.cliVersion.replace(/^BaiduPCS-Go\s+version\s*/i, "").trim();
  return `${runtime.cliSource === "embedded" ? "内置 " : ""}BaiduPCS-Go${version ? ` ${version}` : ""}`;
}

function cliSourceText(source: LocalCliRuntimeSnapshot["cliSource"]): string {
  if (source === "embedded") return "应用内置";
  if (source === "user_selected") return "用户选择";
  if (source === "path") return "系统 PATH";
  return "未检测到";
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
      startLocalCliLogin?: () => Promise<{ ok: boolean; error?: string; message?: string }>;
      getLocalCliCommandLog?: () => Promise<{ cliPath: string; entries: CommandLogEntry[] }>;
      checkDependencies?: () => Promise<{ checkedAt: string; items: DependencyItem[] }>;
      clearCache?: () => Promise<{ ok: boolean; userDataPath: string; filesDeleted: number; bytesFreed: number; errors: string[]; skipped?: string[] }>;
    }
  | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window as typeof window & {
      panjieDesktop?: {
        inspectLocalCli?: () => Promise<LocalCliRuntimeSnapshot>;
        startLocalCliLogin?: () => Promise<{ ok: boolean; error?: string; message?: string }>;
        getLocalCliCommandLog?: () => Promise<{ cliPath: string; entries: CommandLogEntry[] }>;
        checkDependencies?: () => Promise<{ checkedAt: string; items: DependencyItem[] }>;
        clearCache?: () => Promise<{ ok: boolean; userDataPath: string; filesDeleted: number; bytesFreed: number; errors: string[]; skipped?: string[] }>;
      };
    }
  ).panjieDesktop;
}
