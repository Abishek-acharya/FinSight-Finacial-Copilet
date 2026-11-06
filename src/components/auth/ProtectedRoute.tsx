import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm font-medium text-ink-muted">
        Checking your session…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children ?? <Outlet />;
}
