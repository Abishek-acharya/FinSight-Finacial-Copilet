import { Outlet } from "react-router-dom";
import { AppNavbar } from "./AppNavbar";
import { PageContainer } from "@/components/layout/PageContainer";
import { LiveBackground } from "@/components/layout/LiveBackground";

export function AppShellLayout() {
  return (
    <div className="min-h-screen bg-background relative">
      <LiveBackground />
      <AppNavbar />
      <main className="py-6 sm:py-8 relative z-10">
        <PageContainer className="max-w-7xl">
          <Outlet />
        </PageContainer>
      </main>
    </div>
  );
}

export default AppShellLayout;
