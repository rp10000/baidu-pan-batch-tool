import { ClipboardCopy, Download, FileJson, Sheet } from "lucide-react";
import { shareRows } from "../data/prototypeData";
import { Card, StatCard, StatusDot, Tag } from "../components/ui";

export function ShareExportPage({ onToast }: { onToast: (message: string) => void }) {
  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>分享导出</h2>
          <p>查看转存后的新分享链接、提取码、分享状态、有效期并导出结果</p>
        </div>
        <button className="primary-btn" type="button" onClick={() => onToast("已模拟导出 CSV / Excel / JSON")}>
          <Download size={18} />
          批量导出
        </button>
      </div>

      <div className="kpi-grid">
        <StatCard icon="96%" label="分享成功率" value="96%" tone="green" />
        <StatCard icon="12" label="失效链接" value="12" tone="pink" />
        <StatCard icon="128" label="今日新增分享" value="128" tone="blue" />
        <StatCard icon="32" label="已导出任务" value="32" tone="orange" />
      </div>

      <div className="share-grid">
        <ShareTaskTable onToast={onToast} />
        <ShareDetailPanel onToast={onToast} />
        <ExportSettingsPanel />
      </div>
    </section>
  );
}

function ShareTaskTable({ onToast }: { onToast: (message: string) => void }) {
  return (
    <Card title="分享任务列表" className="span-2" action={<Tag tone="green">可复制</Tag>}>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>任务名称</th>
              <th>状态</th>
              <th>有效期</th>
              <th>提取码</th>
              <th>导出</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {shareRows.map((row) => (
              <tr key={row.title}>
                <td>{row.title}</td>
                <td>
                  <StatusDot tone={row.status === "valid" ? "green" : row.status === "partial" ? "orange" : "red"} />
                  {row.status === "valid" ? "全部有效" : row.status === "partial" ? "部分失效" : "已失效"}
                </td>
                <td>{row.expiresAt}</td>
                <td>{row.code}</td>
                <td>{row.exported ? "已导出" : "未导出"}</td>
                <td>
                  <button className="text-btn" type="button" onClick={() => onToast(`已复制 ${row.code}`)}>
                    复制
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ShareDetailPanel({ onToast }: { onToast: (message: string) => void }) {
  return (
    <Card title="分享详情" action={<Tag tone="green">已生成</Tag>}>
      <div className="form-grid one">
        <label>
          <span>新分享链接</span>
          <input className="input" value="https://pan.baidu.com/s/mock-new-share-link" readOnly />
        </label>
        <label>
          <span>提取码</span>
          <input className="input" value="A7K9" readOnly />
        </label>
        <label>
          <span>有效期</span>
          <input className="input" value="永久有效" readOnly />
        </label>
      </div>
      <button className="primary-btn full" type="button" onClick={() => onToast("已复制分享信息")}>
        <ClipboardCopy size={17} />
        复制分享信息
      </button>
    </Card>
  );
}

function ExportSettingsPanel() {
  return (
    <Card title="导出设置" action={<Tag>字段选择</Tag>}>
      <div className="export-grid">
        <button type="button">
          <Sheet size={20} />
          CSV
        </button>
        <button type="button">
          <Sheet size={20} />
          Excel
        </button>
        <button type="button">
          <FileJson size={20} />
          JSON
        </button>
      </div>
      <div className="chip-list">
        {["任务基本信息", "链接信息", "分享状态", "处理记录", "风险报告"].map((field, index) => (
          <span className={`chip ${index < 4 ? "checked" : ""}`} key={field}>{field}</span>
        ))}
      </div>
    </Card>
  );
}
