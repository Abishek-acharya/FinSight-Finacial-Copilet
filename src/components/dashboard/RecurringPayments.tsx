import type { RecurringPayment } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function RecurringPayments({ payments }: { payments: RecurringPayment[] }) {
  return (
    <div className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Bills</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Recurring payments</h2>

      <div className="mt-5 space-y-3">
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-secondary p-3">
            <div>
              <p className="font-medium text-ink">{payment.merchant}</p>
              <p className="mt-1 text-xs text-ink-muted">{payment.frequency} • {payment.category}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-ink">{formatCurrencyINR(payment.amount)}</p>
              <p className="mt-1 text-[11px] text-ink-muted">{new Date(payment.nextDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
