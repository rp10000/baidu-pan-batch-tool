import { Activity, Archive, CheckCircle2, Clock3, FileScan, Share2, Zap } from "lucide-react";
import { recentActivities } from "../data/prototypeData";
import type { PageId } from "../types";
import { Card, StatCard, StatusDot, Tag } from "../components/ui";

export function WorkbenchPage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>任务工作台</h2>
          <p>全流程概览、当前队列、最近活动和快捷入口</p>
        </div>
        <button className="primary-btn" type="button" onClick={() => onNavigate("batch")}>
          <Zap size={18} />
          开始批量处理
        </button>
      </div>

      <div className="kpi-grid">
        <StatCard icon={<CheckCircle2 />} label="今日转存" value="128" tone="green" />
        <StatCard icon={<FileScan />} label="风险命中" value="17" tone="pink" />
        <StatCard icon={<Archive />} label="自动归档" value="3,942" tone="purple" />
        <StatCard icon={<Share2 />} label="新分享码" value="96%" tone="orange" />
      </div>

      <div className="dashboard-grid">
        <Card title="当前处理队列" action={<Tag tone="green">运行中</Tag>} className="span-2">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>任务</th>
                  <th>阶段</th>
                  <th>进度</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["AI课程资料", "检查水印 / 引流内容", "72%", "处理中"],
                  ["设计素材包", "创建新分享链接", "96%", "即将完成"],
                  ["模板合集", "等待人工确认", "38%", "需人工"]
                ].map(([name, step, progress, status]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{step}</td>
                    <td>
                      <span className="progress">
                        <span style={{ width: progress }} />
                      </span>
                      <em>{progress}</em>
                    </td>
                    <td>
                      <StatusDot tone={status === "需人工" ? "orange" : "green"} />
                      {status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="全流程概览" action={<Activity size={18} />}>
          <div className="flow-stack">
            {["粘贴链接", "识别提取码", "转存分类", "扫描风险", "生成分享码"].map((item, index) => (
              <div className="flow-item" key={item}>
                <b>{index + 1}</b>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="最近活动">
          <div className="activity-list">
            {recentActivities.map((activity) => (
              <div className="activity-row" key={activity}>
                <Clock3 size={16} />
                <span>{activity}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="快捷入口" className="span-2">
          <div className="quick-grid">
            <button type="button" onClick={() => onNavigate("batch")}>批量处理</button>
            <button type="button" onClick={() => onNavigate("scan")}>扫描检查</button>
            <button type="button" onClick={() => onNavigate("archive")}>资源归档</button>
            <button type="button" onClick={() => onNavigate("share")}>分享导出</button>
          </div>
        </Card>
      </div>
    </section>
  );
}
