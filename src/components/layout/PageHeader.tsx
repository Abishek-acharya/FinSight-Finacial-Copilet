import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-secondary">{eyebrow}</p>}
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}