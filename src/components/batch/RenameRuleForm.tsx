import { Card } from "../ui";

export function RenameRuleForm() {
  return (
    <Card title="重命名规则">
      <div className="form-grid">
        <label>
          <span>命名前缀</span>
          <input className="input" value="资料" readOnly />
        </label>
        <label>
          <span>编号规则</span>
          <select className="select" value="date-index" disabled>
            <option value="date-index">日期 + 序号</option>
          </select>
        </label>
        <label>
          <span>转存目录</span>
          <input className="input" value="/自动归档/{分类}" readOnly />
        </label>
        <label>
          <span>重复文件</span>
          <select className="select" value="rename" disabled>
            <option value="rename">自动追加序号</option>
          </select>
        </label>
      </div>
    </Card>
  );
}
