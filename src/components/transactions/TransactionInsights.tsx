import { LightBulbIcon } from "@heroicons/react/24/outline";
import type { TransactionInsight } from "@/services/transactionFilters";

export function TransactionInsights({ insights }: { insights: TransactionInsight[] }) {
  if (!insights.length) return null;
  return (
    <section aria-label="Transaction insights" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {insights.map((insight) => (
        <article key={insight.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-[#eed9cb] bg-[#fffaf6] p-4">
          <LightBulbIcon className="mt-0.5 size-4 shrink-0 text-accent-secondary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-ink-muted">{insight.label}</p>
            <p className="truncate text-sm font-semibold" title={insight.value}>{insight.value}</p>
            <p className="truncate text-xs text-ink-muted" title={insight.hint}>{insight.hint}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
