import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function PageContainer({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn("mx-auto w-full max-w-[var(--content-max)] px-[var(--space-page)] py-8 sm:py-10", className)}
      {...props}
    />
  );
}