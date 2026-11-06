import { ChevronRightIcon } from "@heroicons/react/20/solid";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRightIcon aria-hidden="true" className="size-4 text-ink-muted" />}
              {current || !item.href ? (
                <span aria-current={current ? "page" : undefined} className={current ? "font-medium text-ink" : "text-ink-muted"}>
                  {item.label}
                </span>
              ) : (
                <a href={item.href} className="rounded-sm text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}