import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Transaction } from "@/types/finance";
import { detectMonthlySubscriptions } from "@/services/financialEngine";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function SubscriptionDetectorCard({ transactions }: { transactions: Transaction[] }) {
  const subscriptions = useMemo(() => detectMonthlySubscriptions(transactions), [transactions]);
  const monthlyTotal = subscriptions.reduce((sum, item) => sum + item.monthlyAmount, 0);

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">Recurring payment detector</p>
        <CardTitle className="mt-1">Zombie subscriptions</CardTitle>
        <p className="text-xs text-ink-muted">Likely monthly charges to review—not confirmed active subscriptions.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-secondary p-4">
          <p className="text-sm text-ink-muted">Detected monthly spend · {subscriptions.length} candidate{subscriptions.length === 1 ? "" : "s"}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatCurrencyINR(monthlyTotal)}</p>
          {subscriptions.length > 0 && (
            <p className="mt-1 text-xs text-ink-muted">Potential yearly spend: {formatCurrencyINR(monthlyTotal * 12)}</p>
          )}
        </div>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-ink-muted">No monthly pattern found. A candidate needs at least 3 similar payments about 25–35 days apart.</p>
        ) : (
          <ul className="space-y-2">
            {subscriptions.map((subscription) => (
              <li key={`${subscription.merchant}-${subscription.lastDate}`} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{subscription.merchant}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{subscription.occurrences} similar payments · latest {new Date(`${subscription.lastDate.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrencyINR(subscription.monthlyAmount)}<span className="text-xs font-normal text-ink-muted"> / mo</span></p>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] leading-relaxed text-ink-muted">Pattern match: same merchant, similar amount, and regular monthly dates. Check with the provider before cancelling.</p>
      </CardContent>
    </Card>
  );
}
