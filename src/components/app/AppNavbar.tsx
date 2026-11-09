import { ArrowTrendingUpIcon, BellAlertIcon, ChartBarIcon, ClipboardDocumentListIcon, CreditCardIcon, CurrencyDollarIcon, HomeIcon, MoonIcon, RocketLaunchIcon, SunIcon, WalletIcon } from "@heroicons/react/24/outline";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { AddExpenseDialog } from "@/components/app/AddExpenseDialog";
import { NotificationCenter } from "@/components/app/NotificationCenter";
import { PwaControls } from "@/components/app/PwaControls";
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
  { label: "Activity", to: "/app/activity", icon: ClipboardDocumentListIcon },
];

export function AppNavbar() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [isDark, setIsDark] = useState(() => localStorage.getItem("finsight-theme") === "dark");
  const [isLive, setIsLive] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("finsight-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const handleConnection = (event: Event) => {
      const detail = (event as CustomEvent<{ connected: boolean; offline?: boolean }>).detail;
      setIsLive(detail.connected);
      setIsOffline(detail.offline ?? false);
    };
    window.addEventListener("finsight:live-connection", handleConnection);
    return () => window.removeEventListener("finsight:live-connection", handleConnection);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-background/70 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] backdrop-blur-xl transition-all">
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
                    "relative inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                    isActive ? "text-[#803d22]" : "text-ink-muted hover:bg-surface-secondary hover:text-ink",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-lg bg-[#f8e9df]"
                      transition={reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 360, damping: 32 }}
                    />
                  )}
                  <Icon className="relative z-10 size-4" />
                  <span className="relative z-10">{label}</span>
                </RouterNavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <AddExpenseDialog />
          <span className="hidden items-center gap-1.5 text-[11px] font-medium text-ink-muted lg:inline-flex" aria-live="polite">
            <span className={`size-2 rounded-full ${isLive ? "bg-success shadow-[0_0_8px_rgba(45,122,77,0.65)]" : isOffline ? "bg-amber-500" : "bg-ink-muted/50"}`} />
            {isLive ? "Live" : isOffline ? "Offline" : "Reconnecting"}
          </span>
          <button
            type="button"
            onClick={() => setIsDark((current) => !current)}
            className="grid size-9 place-items-center rounded-lg bg-surface-secondary text-ink-muted transition-colors hover:bg-border hover:text-ink"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
          </button>
          <PwaControls />
          <NotificationCenter />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
