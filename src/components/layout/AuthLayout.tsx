import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AuthLayoutProps {
  children: ReactNode;
  brand?: ReactNode;
  aside?: ReactNode;
  className?: string;
}

export function AuthLayout({ children, brand, aside, className }: AuthLayoutProps) {
  return (
    <div className={cn("grid min-h-screen lg:grid-cols-2", className)}>
      <main className="flex flex-col px-5 py-6 sm:px-10 lg:px-14">
        {brand && <div className="font-display text-lg font-bold">{brand}</div>}
        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-10">{children}</div>
      </main>
      {aside && <aside className="hidden items-center justify-center bg-surface-secondary p-10 lg:flex">{aside}</aside>}
    </div>
  );
}