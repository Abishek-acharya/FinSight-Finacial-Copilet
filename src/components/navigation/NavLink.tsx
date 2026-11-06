import type { AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface NavLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
}

export function NavLink({ active = false, className, ...props }: NavLinkProps) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors",
        active ? "bg-[#f8e9df] text-[#803d22]" : "text-ink-muted hover:bg-surface-secondary hover:text-ink",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
        className,
      )}
      {...props}
    />
  );
}