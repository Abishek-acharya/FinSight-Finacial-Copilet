import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ContentSectionProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function ContentSection({ title, description, action, className, children, ...props }: ContentSectionProps) {
  return (
    <section className={cn("mb-10", className)} {...props}>
      {(title || description || action) && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-lg sm:text-xl">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}