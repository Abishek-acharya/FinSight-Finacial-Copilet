import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export interface ButtonLinkProps extends Omit<LinkProps, "to"> {
  to: LinkProps["to"];
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "relative overflow-hidden rounded-xl bg-gradient-to-b from-[#e88756] to-accent-primary text-white shadow-[0_4px_14px_rgba(217,119,69,0.39)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(217,119,69,0.23)]",
  secondary: "bg-surface-secondary text-ink hover:bg-[#ece6db]",
  outline: "border border-border bg-surface text-ink hover:bg-surface-secondary",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-secondary hover:text-ink",
  destructive: "bg-error text-white hover:bg-[#941b12]",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
  icon: "size-10 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = "Button";

export function ButtonLink({ to, variant = "primary", size = "md", className, children, ...props }: ButtonLinkProps) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}