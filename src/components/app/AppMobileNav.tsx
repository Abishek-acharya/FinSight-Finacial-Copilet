import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", mobileLabel: "Overview", to: "/app/overview" },
  { label: "Statements", mobileLabel: "Stmt.", to: "/app/statements" },
  { label: "Transactions", mobileLabel: "Txns", to: "/app/transactions" },
  { label: "Analytics", mobileLabel: "Analytics", to: "/app/analytics" },
  { label: "Forecast", mobileLabel: "Forecast", to: "/app/forecast" },
  { label: "Goals", mobileLabel: "Goals", to: "/app/budget-goals" },
  { label: "Reports", mobileLabel: "Reports", to: "/app/reports" },
  { label: "Activity", mobileLabel: "Activity", to: "/app/activity" },
];

export function AppMobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-[var(--content-max)] grid-cols-8 gap-1 px-1 py-2 sm:gap-2 sm:px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-xl px-0 py-2 text-center text-[11px] font-semibold transition-colors sm:px-1",
                isActive ? "bg-[#f8e9df] text-[#803d22]" : "text-ink-muted hover:bg-surface-secondary",
              )}
              aria-label={item.label}
              title={item.label}
            >
              <span className="whitespace-nowrap text-[10px] sm:text-[11px]">{item.mobileLabel}</span>
            </RouterNavLink>
          );
        })}
      </div>
    </nav>
  );
}
