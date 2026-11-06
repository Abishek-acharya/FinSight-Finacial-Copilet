import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppMobileNav } from "@/components/app/AppMobileNav";
import { AppNavbar } from "@/components/app/AppNavbar";
import { LiveBackground } from "@/components/layout/LiveBackground";
import { useToast } from "@/components/ui/Toast";

export default function AppLayout() {
  const { showToast } = useToast();
  useEffect(() => {
    const handleSyncError = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      showToast({
        kind: "error",
        title: "Could not sync finance data",
        description: detail?.message ?? "Your latest changes could not be saved to your account.",
        duration: 0,
      });
    };
    window.addEventListener("finsight:finance-sync-error", handleSyncError);
    return () => window.removeEventListener("finsight:finance-sync-error", handleSyncError);
  }, [showToast]);

  return (
    <div className="relative isolate min-h-screen bg-background text-ink">
      <LiveBackground />
      <AppNavbar />
      <main className="relative z-10 mx-auto w-full max-w-[var(--content-max)] px-[var(--space-page)] pb-24 pt-8 sm:pt-10">
        <Outlet />
      </main>
      <AppMobileNav />
    </div>
  );
}
