import type { ProcessingTask } from "../../domain/types";
import { PIPELINE_LABELS, PIPELINE_ORDER } from "../../domain/pipeline";

export function PipelineSteps({ task }: { task?: ProcessingTask }) {
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
