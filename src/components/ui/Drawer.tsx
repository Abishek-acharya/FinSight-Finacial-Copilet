import type { ReactNode } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  side = "right",
  className,
}: DrawerProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      className="fixed inset-0 z-[var(--z-modal)]"
    >
      <DialogBackdrop className="fixed inset-0 bg-ink/40 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150" />
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className={cn("pointer-events-none fixed inset-y-0 flex max-w-full", side === "right" ? "right-0 pl-8" : "left-0 pr-8")}>
            <DialogPanel
              transition
              className={cn(
                "pointer-events-auto flex h-full w-screen max-w-md flex-col bg-surface shadow-lg transition duration-200 ease-out",
                side === "right"
                  ? "data-[closed]:translate-x-full"
                  : "data-[closed]:-translate-x-full",
                className,
              )}
            >
              <header className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
                <div>
                  <DialogTitle className="font-display text-lg font-bold">{title}</DialogTitle>
                  {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
                </div>
                <Button variant="ghost" size="icon" aria-label="Close drawer" onClick={onClose} className="-mr-2 -mt-2 size-9">
                  <XMarkIcon className="size-5" />
                </Button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );
}