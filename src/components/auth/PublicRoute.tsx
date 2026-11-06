import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function PublicRoute({ children }: { children?: ReactNode }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm font-medium text-ink-muted">
        Preparing your workspace…
      </div>
    );
  }

  if (user) {
    const destination = (location.state as { from?: string } | null)?.from ?? "/app/overview";
    return <Navigate to={destination} replace />;
  }

  return children ?? <Outlet />;
}
