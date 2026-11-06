import { useId, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/utils";

export interface AccordionItemData {
  question: string;
  answer: string;
}

export function Accordion({
  items,
  className,
}: {
  items: AccordionItemData[];
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const instanceId = useId();

  return (
    <div className={cn("divide-y divide-border border-y border-border", className)}>
      {items.map(({ question, answer }, index) => {
        const open = openIndex === index;
        const panelId = `${instanceId}-panel-${index}`;
        return (
          <div key={question} className="py-1">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex min-h-16 w-full items-center justify-between gap-4 py-4 text-left font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              >
                <span>{question}</span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className={cn("size-5 shrink-0 text-ink-muted transition-transform duration-200", open && "rotate-180")}
                />
              </button>
            </h3>
            {open && (
              <div id={panelId} role="region" className="max-w-3xl pb-5 pr-8 text-sm leading-6 text-ink-muted">
                {answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
