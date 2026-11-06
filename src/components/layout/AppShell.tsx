import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AppShell({ children, header, footer, className }: AppShellProps) {
  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      {header}
      <div className="flex-1">{children}</div>
      {footer}
    </div>
  );
}