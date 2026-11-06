import { ArrowTrendingUpIcon, BellAlertIcon, ChartBarIcon, CreditCardIcon, CurrencyDollarIcon, HomeIcon, RocketLaunchIcon, WalletIcon } from "@heroicons/react/24/outline";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { NotificationCenter } from "@/components/app/NotificationCenter";
import { UserMenu } from "@/components/app/UserMenu";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", to: "/app/overview", icon: HomeIcon },
  { label: "Statements", to: "/app/statements", icon: WalletIcon },
  { label: "Transactions", to: "/app/transactions", icon: CreditCardIcon },
  { label: "Analytics", to: "/app/analytics", icon: ChartBarIcon },
  { label: "Forecast", to: "/app/forecast", icon: ArrowTrendingUpIcon },
  { label: "Budget goals", to: "/app/budget-goals", icon: CurrencyDollarIcon },
  { label: "Assistant", to: "/app/assistant", icon: RocketLaunchIcon },
  { label: "Reports", to: "/app/reports", icon: BellAlertIcon },
];

export function AppNavbar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[var(--content-max)] items-center justify-between gap-4 px-[var(--space-page)] py-3">
        <div className="flex items-center gap-4">
          <RouterNavLink to="/app/overview" className="flex items-center gap-3 text-ink">
            <span className="grid size-9 place-items-center rounded-xl bg-accent-primary text-sm font-bold text-ink">F</span>
            <span className="font-display text-lg font-bold tracking-tight">FinSight AI</span>
          </RouterNavLink>

          <nav className="hidden items-center gap-1 xl:flex">
            {navItems.map(({ label, to, icon: Icon }) => {
              const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
              return (
                <RouterNavLink
                  key={to}
                  to={to}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                    isActive ? "bg-[#f8e9df] text-[#803d22]" : "text-ink-muted hover:bg-surface-secondary hover:text-ink",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </RouterNavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NotificationCenter />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
