import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const tooltipId = useId();
  return (
    <span className={cn("group relative inline-flex", className)}>
      <span aria-describedby={tooltipId} tabIndex={0} className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">
        {children}
      </span>
      <span
        id={tooltipId}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-[var(--z-dropdown)] w-max max-w-56 -translate-x-1/2 rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        )}
      >
        {content}
      </span>
    </span>
  );
}