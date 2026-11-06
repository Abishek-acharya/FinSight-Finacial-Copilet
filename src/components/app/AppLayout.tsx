import { Outlet } from "react-router-dom";
import { AppMobileNav } from "@/components/app/AppMobileNav";
import { AppNavbar } from "@/components/app/AppNavbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-ink">
      <AppNavbar />
      <main className="mx-auto w-full max-w-[var(--content-max)] px-[var(--space-page)] pb-24 pt-8 sm:pt-10">
        <Outlet />
      </main>
      <AppMobileNav />
    </div>
  );
}
