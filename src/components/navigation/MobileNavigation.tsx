import { useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { NavLink } from "./NavLink";

export interface MobileNavigationItem {
  label: string;
  href: string;
  active?: boolean;
}

export function MobileNavigation({ items }: { items: MobileNavigationItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <XMarkIcon className="size-5" /> : <Bars3Icon className="size-5" />}
      </Button>
      {open && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="absolute inset-x-0 top-full z-[var(--z-dropdown)] border-b border-border bg-surface px-4 py-3 shadow-md">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} active={item.active} className="w-full" onClick={() => setOpen(false)}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}