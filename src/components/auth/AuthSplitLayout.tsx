import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface AuthSplitLayoutProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  asideTitle: string;
  asideBody: string;
  className?: string;
}

export function AuthSplitLayout({
  title,
  eyebrow,
  description,
  children,
  asideTitle,
  asideBody,
  className,
}: AuthSplitLayoutProps) {
  return (
    <div className={cn("grid min-h-screen bg-background lg:grid-cols-[1.1fr_0.9fr]", className)}>
      <main className="flex flex-col px-5 py-6 sm:px-8 lg:px-14">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-ink">
            <span className="grid size-9 place-items-center rounded-xl bg-accent-primary text-sm font-bold text-ink">F</span>
            <span className="font-display text-lg font-bold">FinSight AI</span>
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-10">
          <div className="w-full">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-secondary">{eyebrow}</p>
            )}
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
            {description && <p className="mt-2 text-sm text-ink-muted">{description}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </main>

      <aside className="hidden items-center justify-center bg-surface-secondary px-10 py-12 lg:flex">
        <div className="max-w-md rounded-[28px] border border-border bg-surface p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Welcome back</p>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-ink">{asideTitle}</h2>
          <p className="mt-4 text-sm leading-7 text-ink-muted">{asideBody}</p>
        </div>
      </aside>
    </div>
  );
}
