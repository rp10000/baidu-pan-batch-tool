import { Card } from "../ui";

export function RenameRuleForm({
  renameRule,
  targetDirectory,
  onRenameRuleChange,
  onTargetDirectoryChange
}: {
  renameRule: string;
  targetDirectory: string;
  onRenameRuleChange: (value: string) => void;
  onTargetDirectoryChange: (value: string) => void;
}) {
  return (
    <Card title="重命名规则">
      <div className="form-grid">
        <label>
          <span>文件名规则</span>
          <input className="input" value={renameRule} onChange={(event) => onRenameRuleChange(event.target.value)} />
        </label>
        <label>
          <span>可用占位符</span>
          <input className="input" value="{原文件名} {分类} {日期} {序号} {扩展名}" readOnly />
        </label>
        <label>
          <span>转存目录</span>
          <input
            className="input"
            value={targetDirectory}
            onChange={(event) => onTargetDirectoryChange(event.target.value)}
          />
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
