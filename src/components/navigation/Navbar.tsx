import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MobileNavigation } from "./MobileNavigation";
import { NavLink } from "./NavLink";

export interface NavbarItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface NavbarProps {
  brand?: ReactNode;
  links?: NavbarItem[];
  actions?: ReactNode;
  className?: string;
}

export function Navbar({ brand = "FinSight AI", links = [], actions, className }: NavbarProps) {
  return (
    <header className={cn("sticky top-0 z-[var(--z-sticky)] border-b border-border bg-background/95 backdrop-blur", className)}>
      <div className="relative mx-auto flex h-16 max-w-[var(--content-max)] items-center justify-between gap-4 px-[var(--space-page)]">
        <a href="/" className="shrink-0 rounded-sm font-display text-lg font-extrabold tracking-tight text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">
          {brand}
        </a>
        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {links.map((link) => <NavLink key={link.href} href={link.href} active={link.active}>{link.label}</NavLink>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <MobileNavigation items={links} />
        </div>
      </div>
    </header>
  );
}