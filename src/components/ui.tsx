import type { ReactNode } from "react";

export function Card({
  title,
  action,
  children,
  className = ""
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          {title ? <h3>{title}</h3> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  tone = "blue",
  icon
}: {
  label: string;
  value: string | number;
  tone?: "blue" | "pink" | "orange" | "green" | "purple";
  icon: ReactNode;
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}

export function Tag({ children, tone = "blue" }: { children: ReactNode; tone?: string }) {
  return <span className={`tag ${tone}`}>{children}</span>;
}

export function StatusDot({ tone = "blue" }: { tone?: "blue" | "pink" | "orange" | "green" | "red" }) {
  return <span className={`dot ${tone}`} />;
}

export function Switch({ checked = false }: { checked?: boolean }) {
  return <span className={`switch ${checked ? "on" : ""}`} />;
}
