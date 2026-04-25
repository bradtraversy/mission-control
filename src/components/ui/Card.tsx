import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface/40 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-2">
      <div className="flex items-baseline gap-2 min-w-0">
        <h2 className="text-[12px] font-medium tracking-[0.15em] uppercase text-muted shrink-0">
          {title}
        </h2>
        {meta && (
          <span className="text-[11px] text-muted/60 truncate">{meta}</span>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-4 pb-4 ${className}`}>{children}</div>;
}
