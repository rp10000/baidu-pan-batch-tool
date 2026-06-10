import { ClipboardCheck, Database, KeyRound, Palette, RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  ADAPTER_MODE_OPTIONS,
  CAPABILITY_LABELS,
  CAPABILITY_MATRIX,
  capabilityStatusLabel,
  getAdapterModeMeta
} from "../adapters/adapterMode";
import type { AdapterMode, CapabilityKey, CapabilityStatus } from "../adapters/adapterMode";
import { useStorageMode } from "../state/storageModeStore";
import { Card, StatusDot, Switch, Tag } from "../components/ui";

const matrixRows: CapabilityKey[] = [
  "checkLogin",
  "getUserInfo",
  "getQuota",
  "listFiles",
  "createDirectory",
  "transferSharedLink",
  "listTransferredFiles",
  "renameFile",
  "moveFile",
  "downloadFile",
  "uploadFile",
  "createShareLink"
];

export function SettingsPage() {
  const storage = useStorageMode();
  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>设置中心</h2>
          <p>Windows 桌面版接入路线、能力矩阵、本地服务状态、扫描规则和缓存日志</p>
        </div>
      </div>

      <div className="settings-grid">
        <AuthorizationCard
          mode={storage.requestedMode}
          activeMode={storage.activeMode}
          message={storage.message}
          checking={storage.checking}
          onModeChange={storage.setRequestedMode}
          onRefresh={storage.refreshCapabilities}
        />
        <OAuthPreparationCard />
        <ProcessingSettingsCard />
        <AdapterMatrixCard />
        <ActiveCapabilityCard mode={storage.activeMode} />
        <ScanSettingsCard />
        <ThemeCard />
        <CacheLogCard />
      </div>
    </section>
  );
}

function OAuthPreparationCard() {
  const copyText = (text: string) => {
    void navigator.clipboard?.writeText(text);
  };
  const rows = [
    ["App Key", "未填写"],
    ["Secret Key", "未填写"],
    ["Redirect URI", "未填写"],
    ["回调模式", "未选择"],
    ["测试目录授权", "未确认"],
    ["测试分享链接", "未提供"]
  ];

  return (
    <Card title="百度网盘 OAuth 准备状态" action={<ClipboardCheck size={18} />}>
      <div className="setting-hero">
        <KeyRound size={30} />
        <div>
          <b>未连接百度网盘</b>
          <span>这里只展示准备状态，不执行真实登录、不请求授权、不读取本地凭据。</span>
        </div>
      </div>
      {rows.map(([label, status]) => (
        <div className="api-row" key={label}>
          <span>{label}：</span>
          <b>{status}</b>
        </div>
      ))}
      <div className="dual-actions oauth-actions">
        <button className="secondary-btn" type="button" onClick={() => copyText(".env.local.example")}>
          复制 .env.local.example 路径
        </button>
        <button className="secondary-btn" type="button" onClick={() => copyText("npm run prep:oauth")}>
          运行准备检查
        </button>
        <button className="secondary-btn" type="button" onClick={() => copyText("docs/user-input-required.md")}>
          查看用户准备清单
        </button>
      </div>
    </Card>
  );
}

function AuthorizationCard({
  mode,
  activeMode,
  message,
  checking,
  onModeChange,
  onRefresh
}: {
  mode: AdapterMode;
  activeMode: AdapterMode;
  message: string;
  checking: boolean;
  onModeChange: (mode: AdapterMode) => void;
  onRefresh: () => void;
}) {
  const activeMeta = getAdapterModeMeta(activeMode);
  return (
    <Card title="接入模式" action={<Tag tone={activeMode === "mock" ? "orange" : "green"}>{activeMeta.badge}</Tag>}>
      <div className="setting-hero">
        <KeyRound size={34} />
        <div>
          <b>当前接入：{activeMeta.label}</b>
          <span>{message}</span>
        </div>
      </div>
      <div className="mode-grid">
        {ADAPTER_MODE_OPTIONS.map((item) => (
          <button
            className={`mode-card ${mode === item.mode ? "active" : ""}`}
            key={item.mode}
            type="button"
            onClick={() => onModeChange(item.mode)}
          >
            <b>{item.badge}：{item.label}</b>
            <span>{item.description}</span>
          </button>
        ))}
      </div>
      <p className="muted">bdpan WSL 是高级模式；普通 Windows 桌面版默认走官方原生能力验证路线。</p>
      <button className="secondary-btn full" type="button" onClick={onRefresh}>
        {checking ? "检测中" : activeMode === "bdpan_wsl" ? "检测 bdpan / WSL / 登录状态" : "刷新当前模式状态"}
      </button>
    </Card>
  );
}

function AdapterMatrixCard() {
  return (
    <Card title="全模式能力矩阵" className="span-2" action={<Tag tone="blue">Windows 主线</Tag>}>
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

function ActiveCapabilityCard({ mode }: { mode: AdapterMode }) {
  const meta = getAdapterModeMeta(mode);
  const rows: Array<[CapabilityKey, string]> = [
    ["transferSharedLink", "核心：分享链接转存"],
    ["listFiles", "读取目录"],
    ["renameFile", "重命名"],
    ["moveFile", "移动归档"],
    ["createShareLink", "创建分享链接"]
  ];

  return (
    <Card title="当前模式关键能力" action={<Tag tone="orange">{meta.label}</Tag>}>
      {rows.map(([key, label]) => {
        const status = CAPABILITY_MATRIX[key][mode];
        return (
          <div className="api-row" key={key}>
            <span>
              <StatusDot tone={statusTone(status)} />
              {label}
            </span>
            <b>{capabilityStatusLabel(status)}</b>
          </div>
        );
      })}
    </Card>
  );
}

function CapabilityStatusBadge({ status }: { status: CapabilityStatus }) {
  return <span className={`capability-badge ${status}`}>{capabilityStatusLabel(status)}</span>;
}

function ProcessingSettingsCard() {
  return (
    <Card title="处理设置" action={<SlidersHorizontal size={18} />}>
      <div className="form-grid">
        <label><span>并发数</span><input className="input" value="3" readOnly /></label>
        <label><span>重试次数</span><input className="input" value="2" readOnly /></label>
        <label><span>默认工作目录</span><input className="input" value="我的应用数据 / bdpan / panjie" readOnly /></label>
        <label><span>重复文件策略</span><select className="select" value="skip" disabled><option value="skip">跳过已有文件</option></select></label>
      </div>
    </Card>
  );
}

function ScanSettingsCard() {
  return (
    <Card title="扫描规则开关">
      {["扫描子文件夹", "忽略隐藏文件", "联系方式检测", "二维码检测", "敏感日志脱敏"].map((rule) => (
        <div className="rule-row" key={rule}>
          <span>{rule}</span>
          <Switch checked />
        </div>
      ))}
    </Card>
  );
}

function ThemeCard() {
  return (
    <Card title="主题色" action={<Palette size={18} />}>
      <div className="swatches">
        <span className="swatch orange">暖日橙</span>
        <span className="swatch pink">霓虹粉</span>
        <span className="swatch blue">镜片蓝</span>
        <span className="swatch purple">发丝紫</span>
      </div>
    </Card>
  );
}

function CacheLogCard() {
  return (
    <Card title="日志与缓存" action={<Database size={18} />}>
      <div className="setting-hero">
        <RotateCcw size={30} />
        <div>
          <b>缓存 2.34GB</b>
          <span>日志默认脱敏，导出前再次执行敏感字段扫描。</span>
        </div>
      </div>
      <div className="dual-actions">
        <button className="secondary-btn" type="button">清理缓存</button>
        <button className="secondary-btn" type="button">导出日志</button>
      </div>
    </Card>
  );
}

function statusTone(status: CapabilityStatus): "blue" | "pink" | "orange" | "green" | "red" {
  if (status === "supported" || status === "mock_only") return "green";
  if (status === "needs_official_verification" || status === "paid_required" || status === "manual_required") return "orange";
  if (status === "wsl_only") return "blue";
  return "red";
}
