import type { Budget } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function BudgetOverview({ budgetOverview }: { budgetOverview: Budget[] }) {
  return (
    <div className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Budget health</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Budget overview</h2>

      <div className="mt-5 space-y-4">
        {budgetOverview.map((budget) => {
          const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
          return (
            <div key={budget.category}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{budget.category}</span>
                <span className="text-ink-muted">{formatCurrencyINR(budget.spent)} / {formatCurrencyINR(budget.limit)}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-secondary">
                <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: budget.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
