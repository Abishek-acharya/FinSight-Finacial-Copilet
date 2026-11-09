import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Transaction } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

interface CategoryTotal {
  category: string;
  amount: number;
  transactions: number;
}

function getFinancialYear(now: Date) {
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-03-31`,
    label: `FY ${startYear}-${String(startYear + 1).slice(-2)}`,
  };
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadSummary(yearLabel: string, totals: CategoryTotal[]) {
  const rows = [
    ["Financial year", yearLabel],
    ["Category", "Recorded spend (INR)", "Transaction count"],
    ...totals.map((item) => [item.category, item.amount.toFixed(2), String(item.transactions)]),
  ];
  const csv = rows.map((row) => row.map((cell) => escapeCsv(String(cell))).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `finsight-tax-prep-${yearLabel.replace(/\s+/g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function TaxSummaryCard({ transactions }: { transactions: Transaction[] }) {
  const year = getFinancialYear(new Date());
  const categoriesToReview = new Set(["Education", "Insurance", "Investments", "Healthcare", "Health & Wellness"]);
  const totals = new Map<string, CategoryTotal>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense" || transaction.date < year.start || transaction.date > year.end) continue;
    const category = transaction.category.trim();
    if (!categoriesToReview.has(category)) continue;
    const current = totals.get(category) ?? { category, amount: 0, transactions: 0 };
    current.amount += transaction.amount;
    current.transactions += 1;
    totals.set(category, current);
  }
  const summary = [...totals.values()].sort((a, b) => b.amount - a.amount);
  const totalRecorded = summary.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Tax preparation</p>
        <CardTitle className="font-display text-2xl">Potentially relevant spending</CardTitle>
        <p className="text-sm text-ink-muted">{year.label} · based on your transaction categories</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border bg-surface-secondary p-4">
          <p className="text-xs text-ink-muted">Recorded spend in categories to review</p>
          <p className="financial-number mt-1 text-2xl text-ink">{formatCurrencyINR(totalRecorded)}</p>
        </div>
        {summary.length ? (
          <ul className="space-y-2">
            {summary.map((item) => (
              <li key={item.category} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-ink-muted">{item.category} <span className="text-xs">({item.transactions})</span></span>
                <span className="financial-number shrink-0 font-medium text-ink">{formatCurrencyINR(item.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">No expenses in the selected review categories are recorded for this financial year.</p>
        )}
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ArrowDownTrayIcon className="size-4" />}
          disabled={summary.length === 0}
          onClick={() => downloadSummary(year.label, summary)}
        >
          Download CSV summary
        </Button>
        <p className="text-xs leading-relaxed text-ink-muted">
          This is a categorized spending summary, not a deduction or tax-saving estimate. Categories alone cannot verify eligibility, payment type, documentation, limits, or tax regime. Confirm records with a qualified tax professional.
        </p>
      </CardContent>
    </Card>
  );
}
