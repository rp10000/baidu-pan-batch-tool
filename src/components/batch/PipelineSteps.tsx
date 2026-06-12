import type { ProcessingTask } from "../../domain/types";
import { PIPELINE_LABELS, PIPELINE_ORDER } from "../../domain/pipeline";

export function PipelineSteps({ task }: { task?: ProcessingTask }) {
  if (task?.options.transferMode === "original") {
    const transferStatus = task.stages.transfer;
    const shareStatus = task.stages.create_share;
    const listStatus =
      task.finalShareFileCount || task.processedFiles.length
        ? "completed"
        : transferStatus === "failed"
          ? "failed"
          : transferStatus === "running"
            ? "running"
            : "pending";
    const messageStatus =
      task.shareMessage
        ? "completed"
        : shareStatus === "failed" || task.shareError
          ? "failed"
          : shareStatus === "running"
            ? "running"
            : "pending";
    const originalSteps = [
      { key: "parse", label: "链接解析", status: task.stages.link_parse },
      { key: "mkdir", label: "创建转存目录", status: transferStatus === "pending" ? "pending" : transferStatus },
      { key: "transfer", label: "原样转存", status: transferStatus },
      { key: "list", label: "读取文件列表", status: listStatus },
      { key: "share", label: "创建分享", status: shareStatus },
      { key: "message", label: "生成文案", status: messageStatus }
    ] as const;

    return (
      <div className="pipeline">
        {originalSteps.map((stage) => (
          <div className={`pipe-step ${stage.status}`} key={stage.key}>
            {stage.label}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pipeline">
      {PIPELINE_ORDER.map((stage) => (
        <div className={`pipe-step ${task?.stages[stage] ?? "pending"}`} key={stage}>
          {PIPELINE_LABELS[stage]}
        </div>
      ))}
    </div>
  );
}
