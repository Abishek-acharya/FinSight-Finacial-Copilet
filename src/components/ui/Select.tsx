import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const messageId = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && <label htmlFor={selectId} className="text-sm font-medium text-ink">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={messageId}
            className={cn(
              "min-h-11 w-full appearance-none rounded-lg border bg-surface py-2 pl-3 pr-10 text-sm text-ink",
              "focus-visible:border-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/25",
              "disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:opacity-70",
              error ? "border-error" : "border-border",
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
        </div>
        {error && <span id={`${selectId}-error`} role="alert" className="text-xs text-error">{error}</span>}
        {!error && hint && <span id={`${selectId}-hint`} className="text-xs text-ink-muted">{hint}</span>}
      </div>
    );
  },
);

Select.displayName = "Select";