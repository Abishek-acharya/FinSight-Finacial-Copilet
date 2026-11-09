import type { DashboardData } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function CashFlowSummary({ cashFlow }: { cashFlow: DashboardData["cashFlow"] }) {
  return (
    <div className="rounded-[28px] border border-border/70 bg-surface/85 p-6 shadow-[0_2px_10px_-4px_rgba(37,37,34,0.07)] backdrop-blur-md">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Cash flow</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Cashflow summary</h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-secondary p-4">
          <p className="text-xs text-ink-muted">Inflow</p>
          <p className="financial-number mt-2 text-2xl text-wealth-green">{formatCurrencyINR(cashFlow.inflow)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-secondary p-4">
          <p className="text-xs text-ink-muted">Outflow</p>
          <p className="financial-number mt-2 text-2xl text-accent-secondary">{formatCurrencyINR(cashFlow.outflow)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-secondary p-4">
          <p className="text-xs text-ink-muted">Net</p>
          <p className="financial-number mt-2 text-2xl">{formatCurrencyINR(cashFlow.net)}</p>
        </div>
      </div>
    </div>
  );
}
