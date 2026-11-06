import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const messageId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-ink">
            {label}
            {props.required && <span className="ml-1 text-error" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={messageId}
            className={cn(
              "min-h-11 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/80",
              "transition-colors focus-visible:border-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/25",
              "disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:opacity-70",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error ? "border-error" : "border-border",
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-muted" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <span id={`${inputId}-error`} className="text-xs text-error" role="alert">{error}</span>}
        {!error && hint && <span id={`${inputId}-hint`} className="text-xs text-ink-muted">{hint}</span>}
      </div>
    );
  },
);

Input.displayName = "Input";

export type FormLabelProps = {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
};

export function FormLabel({ htmlFor, children, required, className }: FormLabelProps) {
  return (
    <label htmlFor={htmlFor} className={cn("text-sm font-medium text-ink", className)}>
      {children}
      {required && <span aria-hidden="true" className="ml-1 text-error">*</span>}
    </label>
  );
}

export function ValidationMessage({ id, children }: { id?: string; children: ReactNode }) {
  return <p id={id} role="alert" className="text-xs font-medium text-error">{children}</p>;
}

export function EmailInput(props: Omit<InputProps, "type">) {
  return <Input type="email" autoComplete="email" {...props} />;
}

export function PasswordInput(props: Omit<InputProps, "type">) {
  return <Input type="password" autoComplete="current-password" {...props} />;
}

export function SearchInput(props: Omit<InputProps, "type">) {
  return <Input type="search" {...props} />;
}

export function DateInput(props: Omit<InputProps, "type">) {
  return <Input type="date" {...props} />;
}