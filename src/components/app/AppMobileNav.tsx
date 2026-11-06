import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", to: "/app/overview" },
  { label: "Statements", to: "/app/statements" },
  { label: "Transactions", to: "/app/transactions" },
  { label: "Goals", to: "/app/budget-goals" },
  { label: "Reports", to: "/app/reports" },
];

export function AppMobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-[var(--content-max)] grid-cols-5 gap-2 px-4 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-xl px-2 py-2 text-center text-[11px] font-semibold transition-colors",
                isActive ? "bg-[#f8e9df] text-[#803d22]" : "text-ink-muted hover:bg-surface-secondary",
              )}
            >
              {item.label}
            </RouterNavLink>
          );
        })}
      </div>
    </nav>
  );
}
