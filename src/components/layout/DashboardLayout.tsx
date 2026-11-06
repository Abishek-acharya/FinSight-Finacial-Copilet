import type { ReactNode } from "react";
import { AppShell } from "./AppShell";
import { PageContainer } from "./PageContainer";
import { Navbar, type NavbarProps } from "@/components/navigation/Navbar";

export interface DashboardLayoutProps extends Omit<NavbarProps, "brand"> {
  children: ReactNode;
  brand?: ReactNode;
}

export function DashboardLayout({ children, brand, links, actions }: DashboardLayoutProps) {
  return (
    <AppShell header={<Navbar brand={brand} links={links} actions={actions} />}>
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );
}