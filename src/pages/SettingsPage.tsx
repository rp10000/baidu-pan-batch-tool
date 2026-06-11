import { Database, Info, KeyRound, ScanLine, Settings2, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
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

interface DesktopCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

interface CliDiagnostic {
  status: "logged_in" | "not_logged_in" | "failed";
  username: string;
  quotaTotal: string;
  quotaUsed: string;
  rootListStatus: string;
  message: string;
  raw: {
    who: DesktopCommandResult;
    quota: DesktopCommandResult;
    rootList: DesktopCommandResult;
  };
}

interface DependencyItem {
  name: string;
  status: "found" | "missing";
  path: string;
  version: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface CommandLogEntry {
  id: string;
  createdAt: string;
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
  const [cliDiagnostic, setCliDiagnostic] = useState<CliDiagnostic | undefined>();
  const [dependencies, setDependencies] = useState<DependencyItem[]>([]);
  const [cacheResult, setCacheResult] = useState("");
  const [developerLog, setDeveloperLog] = useState<{ cliPath: string; entries: CommandLogEntry[] } | undefined>();
  const cliStatus = cliDiagnostic
    ? cliDiagnostic.status === "logged_in"
      ? "已连接"
      : cliDiagnostic.message
    : storage.connectionOk
      ? "已连接"
      : storage.checking || detecting
        ? "检测中"
        : "未登录 / 未检测到";

  async function refreshDeveloperLog() {
    const desktop = getDesktopApi();
    if (!desktop?.getLocalCliCommandLog) return;
    setDeveloperLog(await desktop.getLocalCliCommandLog());
  }

  async function redetectConnection() {
    setDetecting(true);
    storage.setRequestedMode("windows_local_cli");
    const diagnostic = await runCliDiagnostic();
    setCliDiagnostic(diagnostic);
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
    setLoginMessage(result.ok ? `登录窗口已打开${result.pid ? `（PID ${result.pid}）` : ""}。完成扫码/确认后，回到这里点“重新检测”。` : result.error ?? "无法打开登录窗口");
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
    const result = await desktop.checkDependencies();
    setDependencies(result.items);
    setDependencyChecking(false);
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
    setCacheResult(`删除文件 ${result.filesDeleted} 个，释放 ${formatBytes(result.bytesFreed)}${result.errors.length ? `；错误：${result.errors.join("；")}` : ""}`);
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
              <span>当前 CLI：BaiduPCS-Go</span>
            </div>
          </div>
          <div className="api-row"><span>连接状态</span><b>{cliStatus}</b></div>
          <div className="api-row"><span>用户名</span><b>{cliDiagnostic?.username ?? "未检测"}</b></div>
          <div className="api-row"><span>容量 / 已用</span><b>{cliDiagnostic ? `${cliDiagnostic.quotaTotal} / ${cliDiagnostic.quotaUsed}` : "未检测"}</b></div>
          <div className="dual-actions">
            <button className="secondary-btn" type="button" onClick={() => void redetectConnection()}>
              {storage.checking || detecting ? "检测中" : "重新检测"}
            </button>
            <button className="primary-btn" type="button" onClick={() => void startLogin()}>
              {loginOpening ? "正在打开" : "启动登录"}
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
          <div className="api-row"><span>OCR / Tesseract</span><b>{dependencyLabel(dependencies, "Tesseract")}</b></div>
          <div className="api-row"><span>OpenCV</span><b>{dependencyLabel(dependencies, "OpenCV")}</b></div>
          <div className="api-row"><span>FFmpeg</span><b>{dependencyLabel(dependencies, "FFmpeg")}</b></div>
          <div className="dual-actions">
            <button className="secondary-btn" type="button" disabled title="自动下载安装策略未接线">
              功能未接线
            </button>
            <button className="secondary-btn" type="button" onClick={() => void checkDependencies()}>
              {dependencyChecking ? "检测中" : "检查依赖"}
            </button>
          </div>
          {dependencies.length > 0 && (
            <div className="dependency-list">
              {dependencies.map((item) => (
                <div className="api-row" key={item.name}>
                  <span>{item.name}</span>
                  <b>{item.status === "found" ? item.version || "已检测" : item.stderr || "未检测到"}</b>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="数据与缓存" action={<Database size={18} />}>
          <div className="api-row"><span>缓存大小</span><b>2.34GB</b></div>
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
          <button className="secondary-btn full" type="button" disabled title="更新服务未接线">功能未接线</button>
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
            <div className="api-row"><span>CLI 版本</span><b>{dependencies.find((item) => item.name === "BaiduPCS-Go")?.version ?? "未检测"}</b></div>
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

async function runCliDiagnostic(): Promise<CliDiagnostic> {
  const desktop = getDesktopApi();
  if (!desktop?.localCliRun) {
    const failed = { exitCode: 127, stdout: "", stderr: "desktop IPC unavailable" };
    return {
      status: "failed",
      username: "未检测",
      quotaTotal: "未检测",
      quotaUsed: "未检测",
      rootListStatus: "未检测",
      message: "当前不是桌面客户端，无法执行真实检测。",
      raw: { who: failed, quota: failed, rootList: failed }
    };
  }

  const [who, quota, rootList] = await Promise.all([
    desktop.localCliRun({ args: ["who"], timeoutMs: 10000 }),
    desktop.localCliRun({ args: ["quota"], timeoutMs: 10000 }),
    desktop.localCliRun({ args: ["ls", "/"], timeoutMs: 20000 })
  ]);
  const whoText = `${who.stdout}\n${who.stderr}`;
  const loggedIn = who.exitCode === 0 && !/uid\s*[:：]\s*0\b|请重新登录|登录状态过期|user not exists|代码\s*[:：]\s*-?\d+/i.test(whoText);
  const quotaInfo = parseQuota(`${quota.stdout}\n${quota.stderr}`);
  return {
    status: loggedIn ? "logged_in" : "not_logged_in",
    username: loggedIn ? parseUsername(whoText) : "未登录",
    quotaTotal: quotaInfo.total,
    quotaUsed: quotaInfo.used,
    rootListStatus: rootList.exitCode === 0 ? "ls / 已执行" : `ls / 失败：${rootList.stderr || rootList.stdout || rootList.exitCode}`,
    message: loggedIn ? "已连接" : who.stderr || who.stdout || "未登录 / 登录已失效",
    raw: { who, quota, rootList }
  };
}

function parseUsername(value: string): string {
  return (
    value.match(/用户名\s*[:：]\s*([^,\r\n]+)/)?.[1]?.trim() ||
    value.match(/username\s*[:：]\s*([^,\r\n]+)/i)?.[1]?.trim() ||
    value.match(/name\s*[:：]\s*([^,\r\n]+)/i)?.[1]?.trim() ||
    "已登录，用户名未解析"
  );
}

function parseQuota(value: string): { total: string; used: string } {
  const total =
    value.match(/(?:总容量|总空间|total|quota)\D{0,16}([\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB))/i)?.[1] ??
    "未解析";
  const used =
    value.match(/(?:已用|使用|used)\D{0,16}([\d.]+\s*(?:TB|GB|MB|KB|B|TiB|GiB|MiB))/i)?.[1] ??
    "未解析";
  return { total, used };
}

function dependencyLabel(items: DependencyItem[], name: string): string {
  const item = items.find((candidate) => candidate.name === name);
  if (!item) return "未检测";
  return item.status === "found" ? "已检测" : "未检测到";
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
      localCliRun?: (command: { args: string[]; timeoutMs?: number }) => Promise<DesktopCommandResult>;
      startLocalCliLogin?: () => Promise<{ ok: boolean; error?: string; pid?: number }>;
      getLocalCliCommandLog?: () => Promise<{ cliPath: string; entries: CommandLogEntry[] }>;
      checkDependencies?: () => Promise<{ checkedAt: string; items: DependencyItem[] }>;
      clearCache?: () => Promise<{ ok: boolean; userDataPath: string; filesDeleted: number; bytesFreed: number; errors: string[] }>;
    }
  | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window as typeof window & {
      panjieDesktop?: {
        localCliRun?: (command: { args: string[]; timeoutMs?: number }) => Promise<DesktopCommandResult>;
        startLocalCliLogin?: () => Promise<{ ok: boolean; error?: string; pid?: number }>;
        getLocalCliCommandLog?: () => Promise<{ cliPath: string; entries: CommandLogEntry[] }>;
        checkDependencies?: () => Promise<{ checkedAt: string; items: DependencyItem[] }>;
        clearCache?: () => Promise<{ ok: boolean; userDataPath: string; filesDeleted: number; bytesFreed: number; errors: string[] }>;
      };
    }
  ).panjieDesktop;
}
