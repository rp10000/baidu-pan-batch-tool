import { Database, KeyRound, Palette, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { AdapterMode, CapabilityStatus, StorageCapabilities } from "../adapters/StorageAdapter";
import { useStorageMode } from "../state/storageModeStore";
import { Card, StatusDot, Switch, Tag } from "../components/ui";

export function SettingsPage() {
  const storage = useStorageMode();
  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>设置中心</h2>
          <p>授权状态、连接状态、本地服务状态、接口能力状态、扫描规则、主题色、日志与缓存</p>
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
        <ProcessingSettingsCard />
        <ScanSettingsCard />
        <ThemeCard />
        <ApiStatusCard capabilities={storage.capabilities} />
        <CacheLogCard />
      </div>
    </section>
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
  return (
    <Card title="接入模式" action={<Tag tone={activeMode === "mock" ? "orange" : "green"}>{modeLabel(activeMode)}</Tag>}>
      <div className="setting-hero">
        <KeyRound size={34} />
        <div>
          <b>当前接入：{modeLabel(activeMode)}</b>
          <span>{message}</span>
        </div>
      </div>
      <div className="mode-grid">
        {(["mock", "bdpan_cli", "baidu_mcp", "baidu_sdk"] as AdapterMode[]).map((item) => (
          <button
            className={`mode-card ${mode === item ? "active" : ""}`}
            key={item}
            type="button"
            onClick={() => onModeChange(item)}
          >
            {modeLabel(item)}
          </button>
        ))}
      </div>
      <p className="muted">所有自动化输出固定在：我的应用数据 / bdpan / panjie</p>
      <button className="secondary-btn full" type="button" onClick={onRefresh}>
        {checking ? "检测中" : "检测 bdpan / WSL / 登录状态"}
      </button>
    </Card>
  );
}

function ProcessingSettingsCard() {
  return (
    <Card title="处理设置" action={<SlidersHorizontal size={18} />}>
      <div className="form-grid">
        <label><span>并发数</span><input className="input" value="3" readOnly /></label>
        <label><span>重试次数</span><input className="input" value="2" readOnly /></label>
        <label><span>工作目录</span><input className="input" value="我的应用数据 / bdpan / panjie" readOnly /></label>
        <label><span>重复文件策略</span><select className="select" value="skip" disabled><option value="skip">跳过已有文件</option></select></label>
      </div>
    </Card>
  );
}

function ScanSettingsCard() {
  return (
    <Card title="扫描规则开关">
      {["扫描子文件夹", "忽略隐藏文件", "联系方式检测", "二维码检测", "自动清理敏感日志"].map((rule) => (
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

function ApiStatusCard({ capabilities }: { capabilities: StorageCapabilities }) {
  const rows: Array<[keyof StorageCapabilities, string]> = [
    ["checkLogin", "登录"],
    ["transferSharedLink", "转存分享链接"],
    ["listFiles", "读取文件列表"],
    ["createDirectory", "创建目录"],
    ["renameFile", "重命名"],
    ["moveFile", "移动"],
    ["downloadFile", "下载"],
    ["uploadFile", "上传"],
    ["createShareLink", "创建分享链接"]
  ];

  return (
    <Card title="能力矩阵">
      {rows.map(([key, label]) => (
        <div className="api-row" key={key}>
          <span>
            <StatusDot tone={capabilities[key] === "supported" ? "green" : capabilities[key] === "paid_required" ? "orange" : "red"} />
            {label}
          </span>
          <b>{capabilityLabel(capabilities[key])}</b>
        </div>
      ))}
    </Card>
  );
}

function capabilityLabel(status: CapabilityStatus): string {
  const labels: Record<CapabilityStatus, string> = {
    supported: "可用",
    unsupported: "不支持",
    paid_required: "需开通",
    wsl_required: "需 WSL / CLI",
    login_required: "需登录",
    unknown: "待检测"
  };
  return labels[status];
}

function modeLabel(mode: AdapterMode): string {
  const labels: Record<AdapterMode, string> = {
    mock: "Mock",
    bdpan_cli: "bdpan CLI",
    baidu_mcp: "百度 MCP",
    baidu_sdk: "百度 SDK"
  };
  return labels[mode];
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
