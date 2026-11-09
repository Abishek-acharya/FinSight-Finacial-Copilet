import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon, CommandLineIcon } from "@heroicons/react/24/outline";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { formatCurrencyINR } from "@/utils/financeCalculations";

const pages = [
  { label: "Overview", description: "Dashboard and financial summary", href: "/app/overview", keywords: "home dashboard" },
  { label: "Statements", description: "Upload or review statements", href: "/app/statements", keywords: "upload import csv pdf" },
  { label: "Transactions", description: "Search and review transactions", href: "/app/transactions", keywords: "ledger expenses income" },
  { label: "Analytics", description: "Spending and income charts", href: "/app/analytics", keywords: "charts trends" },
  { label: "Forecast", description: "Spending forecasts and scenarios", href: "/app/forecast", keywords: "prediction future" },
  { label: "Budget goals", description: "Budgets and savings goals", href: "/app/budget-goals", keywords: "budget savings target" },
  { label: "Assistant", description: "Ask about your financial data", href: "/app/assistant", keywords: "copilot chat" },
  { label: "Reports", description: "Generate or download reports", href: "/app/reports", keywords: "pdf export" },
  { label: "Activity history", description: "Review recent account events", href: "/app/activity", keywords: "audit security log" },
  { label: "Settings", description: "Privacy and account controls", href: "/app/settings", keywords: "preferences profile delete export" },
];

type PaletteResult = {
  id: string;
  title: string;
  description: string;
  href: string;
  kind: "page" | "transaction";
};

export function CommandPalette() {
  const navigate = useNavigate();
  const { transactions } = useFinanceStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const results = useMemo<PaletteResult[]>(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) {
      return pages.map((page) => ({
        id: page.href,
        title: page.label,
        description: page.description,
        href: page.href,
        kind: "page",
      }));
    }

    const pageResults = pages
      .filter((page) => `${page.label} ${page.description} ${page.keywords}`.toLocaleLowerCase().includes(value))
      .map((page) => ({
        id: page.href,
        title: page.label,
        description: page.description,
        href: page.href,
        kind: "page" as const,
      }));
    const transactionResults = transactions
      .filter((transaction) =>
        `${transaction.merchant} ${transaction.description ?? ""} ${transaction.category} ${transaction.date}`
          .toLocaleLowerCase()
          .includes(value),
      )
      .slice(0, 6)
      .map((transaction) => ({
        id: transaction.id,
        title: transaction.merchant || transaction.category,
        description: `${transaction.date} · ${transaction.category} · ${formatCurrencyINR(transaction.amount)}`,
        href: `/app/transactions?search=${encodeURIComponent(query.trim())}`,
        kind: "transaction" as const,
      }));
    return [...pageResults, ...transactionResults];
  }, [query, transactions]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(results.length - 1, 0)));
  }, [results.length]);

  const selectResult = (result: PaletteResult) => {
    setOpen(false);
    navigate(result.href);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => results.length ? (current + 1) % results.length : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => results.length ? (current - 1 + results.length) % results.length : 0);
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      selectResult(results[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      event.preventDefault();
      inputRef.current?.focus();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-muted shadow-lg transition-colors hover:border-accent-primary/50 hover:text-ink sm:bottom-5 sm:right-5"
        aria-label="Open command palette"
        title="Search pages and transactions (Ctrl+K)"
      >
        <CommandLineIcon className="size-4" aria-hidden="true" />
        <span>Quick search</span>
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:inline">Ctrl K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center bg-ink/40 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(event) => {
      if (event.target === event.currentTarget) setOpen(false);
    }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <h2 id="command-palette-title" className="sr-only">Quick search</h2>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <MagnifyingGlassIcon className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={results[activeIndex] ? `command-result-${activeIndex}` : undefined}
            aria-autocomplete="list"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages or transactions…"
            className="h-14 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-ink-muted sm:inline">ESC</kbd>
        </div>
        <ul id="command-palette-results" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
          {results.map((result, index) => (
            <li
              key={`${result.kind}-${result.id}`}
              id={`command-result-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer rounded-xl px-3 py-2.5 ${index === activeIndex ? "bg-accent-primary/10" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectResult(result)}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-ink">{result.title}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-ink-muted">
                  {result.kind === "page" ? "Page" : "Transaction"}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink-muted">{result.description}</span>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-ink-muted">No matching pages or transactions.</li>
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-ink-muted">
          <span>Navigate anywhere in FinSight</span>
          <span>↑ ↓ to move · Enter to open</span>
        </div>
      </section>
    </div>
  );
}
