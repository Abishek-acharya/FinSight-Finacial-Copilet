import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { TrialBalance } from "@/services/financialEngine";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function TrialBalanceCard({ trialBalance }: { trialBalance: TrialBalance }) {
  const tone = trialBalance.balanced ? "text-success" : "text-error";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Smart Ledger · Trial balance</CardTitle>
            <p className="mt-1 text-xs text-ink-muted">Double-entry balances generated from your saved transactions.</p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${trialBalance.balanced ? "border-success/30 bg-success/10" : "border-error/30 bg-error/10"} ${tone}`}>
            {trialBalance.balanced ? "Balanced" : "Out of balance"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {trialBalance.rows.length === 0 ? (
          <p className="text-sm text-ink-muted">Import transactions to build your double-entry ledger.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-ink-muted">
                  <th className="pb-2 font-medium">Ledger account</th>
                  <th className="pb-2 text-right font-medium">Debit</th>
                  <th className="pb-2 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.rows.map((row) => (
                  <tr key={row.account} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3">{row.account}</td>
                    <td className="py-2 text-right tabular-nums">{row.debit ? formatCurrencyINR(row.debit) : "—"}</td>
                    <td className="py-2 text-right tabular-nums">{row.credit ? formatCurrencyINR(row.credit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="pt-3">Trial balance total</td>
                  <td className={`pt-3 text-right tabular-nums ${tone}`}>{formatCurrencyINR(trialBalance.debitTotal)}</td>
                  <td className={`pt-3 text-right tabular-nums ${tone}`}>{formatCurrencyINR(trialBalance.creditTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
