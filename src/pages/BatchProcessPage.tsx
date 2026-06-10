import { Download, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { TaskResultModal } from "../components/batch/TaskResultModal";
import { ProcessActionChips } from "../components/batch/ProcessActionChips";
import { ProcessedFileTable } from "../components/batch/ProcessedFileTable";
import { RenameRuleForm } from "../components/batch/RenameRuleForm";
import { TaskInputPanel } from "../components/batch/TaskInputPanel";
import { Card, StatCard, Tag } from "../components/ui";
import { inputSample } from "../data/prototypeData";

export function BatchProcessPage({
  showDefaultModal,
  onDefaultModalShown,
  onToast
}: {
  showDefaultModal: boolean;
  onDefaultModalShown: () => void;
  onToast: (message: string) => void;
}) {
  const [input, setInput] = useState(inputSample);
  const [mode, setMode] = useState<"single" | "batch">("batch");
  const [modalOpen, setModalOpen] = useState(showDefaultModal);

  useEffect(() => {
    if (showDefaultModal) {
      setModalOpen(true);
      onDefaultModalShown();
    }
  }, [showDefaultModal, onDefaultModalShown]);

  function startProcess() {
    setModalOpen(true);
    onToast("模拟处理完成，已生成新分享码 A7K9");
  }

  function copyShareInfo() {
    onToast("已复制分享链接和提取码");
  }

  return (
    <section className="page">
      <div className="page-title">
        <div>
          <h2>批量处理</h2>
          <p>粘贴他人网盘链接，识别提取码，执行分类、转存、扫描、重命名并生成新分享码</p>
        </div>
        <div className="page-actions">
          <button className="secondary-btn" type="button">
            <Download size={17} />
            导入 TXT / CSV
          </button>
          <button className="primary-btn" type="button" onClick={startProcess}>
            <Play size={17} />
            开始处理
          </button>
        </div>
      </div>

      <div className="batch-grid">
        <div className="batch-left">
          <TaskInputPanel input={input} onInputChange={setInput} mode={mode} onModeChange={setMode} />
          <ProcessActionChips />
        </div>
        <div className="batch-right">
          <TaskResultModal open={modalOpen} onClose={() => setModalOpen(false)} onCopy={copyShareInfo} />
          <div className="kpi-grid compact-kpis">
            <StatCard icon="3" label="识别链接" value="3" tone="blue" />
            <StatCard icon="2" label="可自动转存" value="2" tone="green" />
            <StatCard icon="1" label="风险待确认" value="1" tone="pink" />
          </div>
          <RenameRuleForm />
          <Card title="处理后文件重命名预览" action={<Tag tone="green">可导出</Tag>}>
            <ProcessedFileTable />
          </Card>
          <Card title="新分享链接和提取码">
            <div className="new-share-list">
              <div>
                <b>课程_AI资料_20260610_001.zip</b>
                <span>https://pan.baidu.com/s/mock-new-share-link · 提取码 A7K9</span>
              </div>
              <div>
                <b>素材_设计素材包_20260610_002</b>
                <span>https://pan.baidu.com/s/mock-design-share · 提取码 B3L2</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
