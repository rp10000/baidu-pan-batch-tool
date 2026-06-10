import { AlertTriangle, FileText, QrCode, ScanText, ShieldAlert } from "lucide-react";
import { riskFiles } from "../data/prototypeData";
import { Card, StatCard, StatusDot, Switch, Tag } from "../components/ui";

export function ScanCheckPage() {
  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>扫描检查</h2>
          <p>检测水印、二维码、联系方式、URL 和引流内容，输出风险文件列表与报告</p>
        </div>
        <button className="primary-btn" type="button">
          <ScanText size={18} />
          开始扫描
        </button>
      </div>

      <div className="kpi-grid">
        <StatCard icon={<ShieldAlert />} label="高风险" value="611" tone="pink" />
        <StatCard icon={<QrCode />} label="二维码" value="38" tone="orange" />
        <StatCard icon={<FileText />} label="联系方式" value="124" tone="purple" />
        <StatCard icon={<AlertTriangle />} label="待人工确认" value="17" tone="blue" />
      </div>

      <div className="scan-grid">
        <Card title="风险文件列表" action={<Tag tone="pink">按风险排序</Tag>} className="span-2">
          <RiskResultTable />
        </Card>
        <FilePreviewPanel />
        <ScanRulePanel />
      </div>
    </section>
  );
}

function RiskResultTable() {
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
          {riskFiles.map((file) => (
            <tr key={file.name} className={file.status === "high" ? "selected" : ""}>
              <td>{file.name}</td>
              <td>{file.type}</td>
              <td>{file.risks.join(" / ")}</td>
              <td>
                <span className={`progress ${file.status === "high" ? "pink" : ""}`}>
                  <span style={{ width: `${file.confidence}%` }} />
                </span>
                <em>{file.confidence}%</em>
              </td>
              <td>
                <button className="text-btn" type="button">忽略</button>
                <button className="text-btn warn" type="button">标记风险</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FilePreviewPanel() {
  return (
    <Card title="文件预览" action={<Tag tone="orange">命中二维码</Tag>}>
      <div className="preview-panel">
        <img src="/brand-avatar.png" alt="风险文件预览" />
        <div className="scan-finding">
          <b>检测结果</b>
          <span>命中内容：手机号 / URL / 二维码</span>
          <span>建议：删除引流字段，遮盖二维码区域，保留原文件备份</span>
        </div>
      </div>
    </Card>
  );
}

function ScanRulePanel() {
  return (
    <Card title="扫描规则">
      {["水印检测", "二维码检测", "联系方式检测", "URL / 域名检测", "敏感词检测", "保留原文件备份"].map((rule) => (
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
