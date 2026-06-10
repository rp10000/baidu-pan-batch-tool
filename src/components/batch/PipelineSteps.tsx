import { pipelineSteps } from "../../data/prototypeData";

export function PipelineSteps() {
  return (
    <div className="pipeline">
      {pipelineSteps.map((step) => (
        <div className="pipe-step" key={step}>
          {step}
        </div>
      ))}
    </div>
  );
}
