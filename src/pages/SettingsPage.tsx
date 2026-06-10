import { Database, KeyRound, Palette, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Card, StatusDot, Switch, Tag } from "../components/ui";

export function SettingsPage() {
  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>设置中心</h2>
          <p>账号授权、并发重试、默认路径、扫描规则、主题色、API 状态、日志与缓存</p>
        </div>
      </div>

      <div className="settings-grid">
        <AuthorizationCard />
        <ProcessingSettingsCard />
        <ScanSettingsCard />
        <ThemeCard />
        <ApiStatusCard />
        <CacheLogCard />
      </div>
    </section>
  );
}

function AuthorizationCard() {
  return (
    <Card title="账号授权状态" action={<Tag tone="green">mock 已授权</Tag>}>
      <div className="setting-hero">
        <KeyRound size={34} />
        <div>
          <b>百度网盘 OAuth</b>
          <span>真实凭证接入前仅展示授权占位，不保存账号密码。</span>
        </div>
      </div>
      <div className="progress full-width"><span style={{ width: "23%" }} /></div>
      <p className="muted">容量占用 2.34GB / 10GB</p>
      <button className="secondary-btn full" type="button">清除本地授权状态</button>
    </Card>
  );
}

function ProcessingSettingsCard() {
  return (
    <Card title="处理设置" action={<SlidersHorizontal size={18} />}>
      <div className="form-grid">
        <label><span>并发数</span><input className="input" value="3" readOnly /></label>
        <label><span>重试次数</span><input className="input" value="2" readOnly /></label>
        <label><span>默认保存路径</span><input className="input" value="D:\\Panjie\\Output" readOnly /></label>
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

function ApiStatusCard() {
  return (
    <Card title="API 状态">
      {["OAuth 授权", "文件列表", "转存分享", "创建分享", "扫描 worker"].map((api, index) => (
        <div className="api-row" key={api}>
          <span>
            <StatusDot tone={index === 0 ? "green" : "orange"} />
            {api}
          </span>
          <b>{index === 0 ? "mock 支持" : "待实测"}</b>
        </div>
      ))}
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
