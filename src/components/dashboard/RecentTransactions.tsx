import type { Transaction } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Activity</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Recent transactions</h2>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {transactions.map((transaction) => {
          const dateLabel = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(transaction.date));
          return (
            <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-secondary p-3">
              <div>
                <p className="font-medium text-ink">{transaction.merchant}</p>
                <p className="mt-1 text-xs text-ink-muted">{transaction.category} • {dateLabel}</p>
              </div>
              <p className={transaction.type === "income" ? "font-semibold text-[#2d7a5a]" : "font-semibold text-ink"}>
                {transaction.type === "income" ? "+" : "-"}{formatCurrencyINR(transaction.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
