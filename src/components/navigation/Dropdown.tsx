import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export function Dropdown({
  label,
  items,
  className,
}: {
  label: ReactNode;
  items: DropdownItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triggerId = useId();
  const menuId = useId();
  const enabledIndices = items.flatMap((item, index) => item.disabled ? [] : [index]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) itemRefs.current[enabledIndices[0]]?.focus();
  }, [open, enabledIndices]);

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const focusRelativeItem = (direction: 1 | -1) => {
    if (enabledIndices.length === 0) return;
    const focusedIndex = itemRefs.current.findIndex((item) => item === document.activeElement);
    const position = enabledIndices.indexOf(focusedIndex);
    const nextPosition = position < 0
      ? direction === 1 ? 0 : enabledIndices.length - 1
      : (position + direction + enabledIndices.length) % enabledIndices.length;
    itemRefs.current[enabledIndices[nextPosition]]?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (event.key === "ArrowUp") {
        requestAnimationFrame(() => itemRefs.current[enabledIndices[enabledIndices.length - 1] ?? -1]?.focus());
      }
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusRelativeItem(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const index = event.key === "Home" ? enabledIndices[0] : enabledIndices[enabledIndices.length - 1];
      if (index !== undefined) itemRefs.current[index]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu();
    }
  };

  return (
    <div ref={rootRef} className={cn("relative inline-block text-left", className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      >
        {label}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-[var(--z-dropdown)] mt-2 min-w-48 rounded-xl border border-border bg-surface p-1.5 shadow-lg focus:outline-none"
        >
          {items.map((item, index) => (
            <button
              key={item.label}
              ref={(element) => { itemRefs.current[index] = element; }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                item.onSelect();
                closeMenu(true);
              }}
              disabled={item.disabled}
              className={cn(
                "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm focus:bg-surface-secondary focus:outline-none",
                item.destructive ? "text-error" : "text-ink",
                item.disabled && "opacity-50",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}