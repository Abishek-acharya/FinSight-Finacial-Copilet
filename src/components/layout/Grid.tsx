import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4;
}

const columnClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function Grid({ columns = 3, className, ...props }: GridProps) {
  return <div className={cn("grid gap-4 sm:gap-5", columnClasses[columns], className)} {...props} />;
}