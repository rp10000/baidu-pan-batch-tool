import type { ReactNode } from "react";

export function GuideStepCard({
  step,
  title,
  children,
  visual,
  action
}: {
  step: number;
  title: string;
  children: ReactNode;
  visual: ReactNode;
  action?: ReactNode;
}) {
  return (
    <article className="guide-step-card">
      <div className="guide-step-visual">{visual}</div>
      <div className="guide-step-body">
        <span className="guide-step-index">步骤 {step}</span>
        <h4>{title}</h4>
        <p>{children}</p>
        {action}
      </div>
    </article>
  );
}
