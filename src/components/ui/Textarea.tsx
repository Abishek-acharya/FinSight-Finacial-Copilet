import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const descriptionId = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && <label htmlFor={fieldId} className="text-sm font-medium text-ink">{label}</label>}
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={descriptionId}
          className={cn(
            "min-h-28 w-full resize-y rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/80",
            "focus-visible:border-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/25",
            "disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:opacity-70",
            error ? "border-error" : "border-border",
            className,
          )}
          {...props}
        />
        {error && <span id={`${fieldId}-error`} role="alert" className="text-xs text-error">{error}</span>}
        {!error && hint && <span id={`${fieldId}-hint`} className="text-xs text-ink-muted">{hint}</span>}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";