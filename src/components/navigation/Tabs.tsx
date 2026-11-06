import type { ReactNode } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { cn } from "@/lib/utils";

export interface TabItem {
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export function Tabs({
  items,
  defaultIndex = 0,
  className,
}: {
  items: TabItem[];
  defaultIndex?: number;
  className?: string;
}) {
  return (
    <TabGroup defaultIndex={defaultIndex} className={className}>
      <TabList className="flex max-w-full gap-1 overflow-x-auto border-b border-border">
        {items.map((item) => (
          <Tab
            key={item.label}
            disabled={item.disabled}
            className={({ selected }) => cn(
              "min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-primary",
              selected ? "border-accent-primary text-ink" : "border-transparent text-ink-muted hover:text-ink",
              item.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {item.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels className="pt-4">
        {items.map((item) => <TabPanel key={item.label} className="focus-visible:outline-none">{item.content}</TabPanel>)}
      </TabPanels>
    </TabGroup>
  );
}