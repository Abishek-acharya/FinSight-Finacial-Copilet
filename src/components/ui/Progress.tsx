import { cn } from "@/lib/utils";

export interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  className,
  indicatorClassName,
}: ProgressProps) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          {label && <span className="font-medium text-ink-muted">{label}</span>}
          {showValue && <span className="tabular-nums text-ink-muted">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label ?? "Progress"}
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-secondary", className)}
      >
        <div
          className={cn("h-full rounded-full bg-accent-primary transition-[width] duration-300", indicatorClassName)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}