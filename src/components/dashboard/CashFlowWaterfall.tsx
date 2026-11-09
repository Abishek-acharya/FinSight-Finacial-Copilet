import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Transaction } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

interface WaterfallPoint {
  label: string;
  start: number;
  end: number;
  offset: number;
  increase: number;
  decrease: number;
  amount: number;
  kind: "income" | "expense" | "total";
}

function currentMonthTransactions(transactions: Transaction[]) {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return transactions.filter((transaction) => transaction.date.startsWith(monthPrefix));
}

function buildWaterfall(transactions: Transaction[]): WaterfallPoint[] {
  const monthly = currentMonthTransactions(transactions);
  const grouped = new Map<string, { income: number; expense: number }>();
  for (const transaction of monthly) {
    const values = grouped.get(transaction.category) ?? { income: 0, expense: 0 };
    values[transaction.type] += transaction.amount;
    grouped.set(transaction.category, values);
  }

  const income = [...grouped.entries()]
    .map(([label, values]) => ({ label, amount: values.income }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const expenses = [...grouped.entries()]
    .map(([label, values]) => ({ label, amount: values.expense }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const visibleExpenses = expenses.slice(0, 4);
  const remainingExpense = expenses.slice(4).reduce((sum, item) => sum + item.amount, 0);
  if (remainingExpense > 0) visibleExpenses.push({ label: "Other expenses", amount: remainingExpense });

  const steps = [
    ...income.map((item) => ({ ...item, kind: "income" as const })),
    ...visibleExpenses.map((item) => ({ ...item, kind: "expense" as const })),
  ];
  let balance = 0;
  const points: WaterfallPoint[] = steps.map((step) => {
    const change = step.kind === "income" ? step.amount : -step.amount;
    const start = balance;
    balance += change;
    return {
      label: step.label,
      start,
      end: balance,
      offset: Math.min(start, balance),
      increase: Math.max(change, 0),
      decrease: Math.max(-change, 0),
      amount: step.amount,
      kind: step.kind,
    };
  });
  if (steps.length) {
    points.push({
      label: "Net cash flow",
      start: 0,
      end: balance,
      offset: Math.min(0, balance),
      increase: Math.max(balance, 0),
      decrease: Math.max(-balance, 0),
      amount: Math.abs(balance),
      kind: "total",
    });
  }
  return points;
}

function WaterfallTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: WaterfallPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const prefix = point.kind === "expense" ? "−" : point.kind === "income" ? "+" : "";
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-ink">{point.label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">
        {prefix}{formatCurrencyINR(point.amount)}
      </p>
    </div>
  );
}

export function CashFlowWaterfall({ transactions }: { transactions: Transaction[] }) {
  const data = buildWaterfall(transactions);
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date());

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Cash flow</p>
        <CardTitle className="font-display text-2xl">Monthly waterfall</CardTitle>
        <p className="text-sm text-ink-muted">Recorded inflows and outflows · {monthLabel}</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="grid h-64 place-items-center rounded-xl bg-surface-secondary px-5 text-center text-sm text-ink-muted">
            No transactions recorded for this month yet.
          </div>
        ) : (
          <>
            <div className="h-64 w-full" role="img" aria-label={`Cash flow waterfall for ${monthLabel}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid stroke="#eae5dc" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#85847f" }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={52} />
                  <YAxis tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}k`} tick={{ fontSize: 10, fill: "#85847f" }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<WaterfallTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
                  <Bar dataKey="offset" stackId="waterfall" fill="transparent" isAnimationActive={false} />
                  <Bar dataKey="increase" stackId="waterfall" fill="#2d7a4d" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="decrease" stackId="waterfall" fill="#d97745" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Steps are grouped by category; the final bar is recorded income minus expenses, not a bank balance.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
