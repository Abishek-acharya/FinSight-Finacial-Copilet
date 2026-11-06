import type { ReactNode } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  showCloseButton?: boolean;
}

const sizes = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
  showCloseButton = true,
}: ModalProps) {
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
      <DialogBackdrop className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150" />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
        <DialogPanel
          transition
          className={cn(
            "relative my-auto w-full rounded-2xl border border-border bg-surface p-5 shadow-lg transition duration-200 data-[closed]:translate-y-2 data-[closed]:scale-[0.98] data-[closed]:opacity-0 sm:p-6",
            sizes[size],
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="font-display text-lg font-bold">{title}</DialogTitle>
              {description && <p className="mt-1.5 text-sm text-ink-muted">{description}</p>}
            </div>
            {showCloseButton && (
              <Button variant="ghost" size="icon" aria-label="Close dialog" onClick={onClose} className="-mr-2 -mt-2 size-9">
                <XMarkIcon className="size-5" />
              </Button>
            )}
          </div>
          <div className="mt-5">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}