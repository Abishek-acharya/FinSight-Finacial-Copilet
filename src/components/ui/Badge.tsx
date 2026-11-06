import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeStyles = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
  {
    variants: {
      variant: {
        default: "bg-surface-secondary text-ink",
        accent: "bg-[#f8e9df] text-[#803d22]",
        success: "bg-[#e6f3eb] text-success",
        warning: "bg-[#fff2d6] text-warning",
        error: "bg-[#fce9e7] text-error",
        outline: "border border-border bg-transparent text-ink-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeStyles> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeStyles({ variant }), className)} {...props} />;
}