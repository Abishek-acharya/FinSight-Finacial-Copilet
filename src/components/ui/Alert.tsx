import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const alertStyles = cva("flex gap-3 rounded-xl border p-4 text-sm", {
  variants: {
    variant: {
      info: "border-[#d7e6f4] bg-[#f1f7fc] text-[#244b6a]",
      success: "border-[#cfe6d6] bg-[#eff8f2] text-[#1d5b38]",
      warning: "border-[#f0dfb8] bg-[#fff8e9] text-[#70500b]",
      error: "border-[#f1d0cc] bg-[#fff3f1] text-[#8f2119]",
    },
  },
  defaultVariants: { variant: "info" },
});

export interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertStyles> {
  title?: string;
  icon?: ReactNode;
}

export function Alert({ className, variant, title, icon, children, ...props }: AlertProps) {
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn(alertStyles({ variant }), className)} {...props}>
      {icon && <span className="mt-0.5 shrink-0" aria-hidden="true">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && "mt-1")}>{children}</div>
      </div>
    </div>
  );
}