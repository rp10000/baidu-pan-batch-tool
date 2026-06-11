import { Database, Info, KeyRound, ScanLine, Settings2, SlidersHorizontal } from "lucide-react";
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

export function SettingsPage() {
  const storage = useStorageMode();
  const draft = useBatchDraftStore();
  const cliStatus = storage.connectionOk ? "已连接" : storage.checking ? "检测中" : "未登录 / 未检测到";

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
          <div className="dual-actions">
            <button className="secondary-btn" type="button" onClick={() => void storage.refreshCapabilities()}>
              {storage.checking ? "检测中" : "重新检测"}
            </button>
            <button className="primary-btn" type="button" onClick={() => storage.setRequestedMode("windows_local_cli")}>
              启动登录
            </button>
          </div>
        </Card>

        <Card title="处理默认值" action={<SlidersHorizontal size={18} />}>
          <div className="api-row"><span>默认模式</span><b>快速转存</b></div>
          <div className="api-row"><span>默认重命名</span><b>{draft.autoRenameFiles ? "开启" : "关闭"}</b></div>
          <div className="api-row"><span>默认创建分享</span><b>{draft.autoCreateShareCode ? "开启" : "关闭"}</b></div>
          <div className="api-row"><span>默认扫描</span><b>{draft.scanOptions.enabled ? "开启" : "关闭"}</b></div>
        </Card>

        <Card title="扫描配置" action={<ScanLine size={18} />}>
          <div className="api-row"><span>OCR</span><b>未安装</b></div>
          <div className="api-row"><span>二维码检测</span><b>可用</b></div>
          <div className="api-row"><span>视频抽帧</span><b>未启用</b></div>
          <div className="dual-actions">
            <button className="secondary-btn" type="button">安装 OCR 模型</button>
            <button className="secondary-btn" type="button">检查依赖</button>
          </div>
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
          <button className="secondary-btn full" type="button">清理缓存</button>
        </Card>

        <Card title="关于" action={<Info size={18} />}>
          <div className="api-row"><span>版本</span><b>0.1.0</b></div>
          <div className="api-row"><span>exe 路径</span><b>release/盘姬批量助手 0.1.0.exe</b></div>
          <div className="api-row"><span>数据目录</span><b>Windows 应用数据目录</b></div>
          <button className="secondary-btn full" type="button">检查更新</button>
        </Card>
      </div>

      <details className="advanced-settings">
        <summary>
          <Settings2 size={18} />
          展开高级调试
        </summary>
        <div className="settings-grid advanced-grid">
          <Card title="CLI 调试信息" action={<Tag tone="blue">高级</Tag>}>
            <div className="api-row"><span>CLI 路径</span><b>tools/baidu-cli/BaiduPCS-Go/...</b></div>
            <div className="api-row"><span>当前模式</span><b>{storage.activeMode}</b></div>
            <div className="api-row"><span>smoke 日志</span><b>docs/windows-cli-smoke-report.md</b></div>
            <div className="api-row"><span>bdpan WSL</span><b>保留为高级诊断</b></div>
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
