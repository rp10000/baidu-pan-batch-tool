import { AlertTriangle, FileText, QrCode, ScanText, ShieldAlert } from "lucide-react";
import type { DetectedRisk, ProcessedFile } from "../domain/types";
import { useTaskStore } from "../state/taskStore";
import { Card, StatCard, StatusDot, Switch, Tag } from "../components/ui";

export function ScanCheckPage() {
  const { activeTask } = useTaskStore();
  const files = activeTask?.processedFiles ?? [];
  const scanEnabled = Boolean(activeTask?.options.scanOptions.enabled);
  const risks = files.flatMap((file) => file.risks.map((risk) => ({ file, risk })));
  const watermarks = risks.filter(({ risk }) => risk.type === "watermark").length;
  const qrcodes = risks.filter(({ risk }) => risk.type === "qrcode").length;
  const contactRisks = risks.filter(({ risk }) => ["phone", "email", "wechat", "qq"].includes(risk.type)).length;
  const pendingRisks = risks.filter(({ risk }) => risk.action === "pending").length;

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>扫描检查</h2>
          <p>扫描只在任务勾选后执行；快速模式不会下载样本、OCR 或视频抽帧</p>
        </div>
        <button className="primary-btn" type="button">
          <ScanText size={18} />
          单独扫描选中文件
        </button>
      </div>

      {!scanEnabled && (
        <Card title="扫描未启用" action={<Tag tone="green">快速模式</Tag>}>
          <p className="notice">当前任务未启用扫描。可在批量处理页勾选二维码/OCR/水印检测后重新运行，或点击单独扫描。</p>
        </Card>
      )}

      <div className="kpi-grid">
        <StatCard icon={<ShieldAlert />} label="水印风险" value={watermarks} tone="pink" />
        <StatCard icon={<QrCode />} label="二维码" value={qrcodes} tone="orange" />
        <StatCard icon={<FileText />} label="联系方式" value={contactRisks} tone="purple" />
        <StatCard icon={<AlertTriangle />} label="待人工确认" value={pendingRisks} tone="blue" />
      </div>

      <div className="scan-grid">
        <Card title="风险文件列表" action={<Tag tone="pink">按风险排序</Tag>} className="span-2">
          <RiskResultTable risks={risks} />
        </Card>
        <FilePreviewPanel file={risks[0]?.file} risk={risks[0]?.risk} />
        <ScanRulePanel />
      </div>
    </section>
  );
}

function RiskResultTable({ risks }: { risks: Array<{ file: ProcessedFile; risk: DetectedRisk }> }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>文件</th>
            <th>类型</th>
            <th>命中项</th>
            <th>置信度</th>
            <th>处理</th>
          </tr>
        </thead>
        <tbody>
          {risks.map(({ file, risk }) => (
            <tr key={risk.id} className={risk.confidence >= 90 ? "selected" : ""}>
              <td>{file.newName}</td>
              <td>{risk.label}</td>
              <td>{risk.content}</td>
              <td>
                <span className={`progress ${risk.confidence >= 90 ? "pink" : ""}`}>
                  <span style={{ width: `${risk.confidence}%` }} />
                </span>
                <em>{risk.confidence}%</em>
              </td>
              <td>
                <button className="text-btn" type="button">忽略</button>
                <button className="text-btn warn" type="button">标记风险</button>
              </td>
            </tr>
          ))}
          {risks.length === 0 && (
            <tr>
              <td colSpan={5}>当前任务没有风险命中项。</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FilePreviewPanel({ file, risk }: { file?: ProcessedFile; risk?: DetectedRisk }) {
  return (
    <Card title="文件预览" action={<Tag tone="orange">{risk?.label ?? "等待扫描"}</Tag>}>
      <div className="preview-panel">
        <img src="/brand-avatar.png" alt="风险文件预览" />
        <div className="scan-finding">
          <b>检测结果</b>
          <span>文件：{file?.newName ?? "暂无文件"}</span>
          <span>命中内容：{risk ? `${risk.label} / ${risk.content}` : "暂无命中"}</span>
          <span>建议：保留原文件备份，模拟清理后进入人工复核。</span>
        </div>
      </div>
    </Card>
  );
}

function ScanRulePanel() {
  return (
    <Card title="扫描规则">
      {["OCR 状态：按需检查", "QR 状态：按需启用", "ffmpeg 状态：仅视频扫描检查", "联系方式检测", "URL / 域名检测", "清理副本不覆盖原文件"].map((rule) => (
        <div className="rule-row" key={rule}>
          <span>
            <StatusDot tone="blue" />
            {rule}
          </span>
          <Switch checked />
        </div>
      ))}
      <button className="secondary-btn full" type="button">生成扫描报告</button>
    </Card>
  );
}
