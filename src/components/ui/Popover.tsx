import type { ReactNode } from "react";
import { Popover as HeadlessPopover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { cn } from "@/lib/utils";

export { PopoverButton, PopoverPanel };

export function Popover({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <HeadlessPopover className={cn("relative inline-flex", className)}>{children}</HeadlessPopover>;
}