import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import type { TransactionSummary } from "@/services/transactionFilters";
import { formatINR } from "@/utils/financeCalculations";

export function TransactionSummaryCards({ summary }: { summary: TransactionSummary }) {
  const cards = [
    { label: "Income", value: formatINR(summary.income), color: "text-success", icon: ArrowTrendingUpIcon },
    { label: "Expenses", value: formatINR(summary.expenses), color: "text-ink", icon: ArrowTrendingDownIcon },
    { label: "Net cash flow", value: formatINR(summary.net), color: summary.net >= 0 ? "text-success" : "text-error", icon: ScaleIcon },
    { label: "Average expense", value: formatINR(summary.averageExpense), color: "text-ink", icon: BanknotesIcon },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map(({ label, value, color, icon: Icon }) => (
        <article key={label} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ink-muted">{label}</p>
            <Icon className="size-4 text-ink-muted" aria-hidden="true" />
          </div>
          <p className={`mt-2 font-display text-lg font-bold tabular-nums sm:text-xl ${color}`}>{value}</p>
        </article>
      ))}
    </div>
  );
}
