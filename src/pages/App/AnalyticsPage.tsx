import { useMemo, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { useToast } from "@/components/ui/Toast";
import { buildAnalytics } from "@/services/analytics/analyticsService";
import { downloadAnalyticsCsv, openAnalyticsPrintReport } from "@/services/analytics/analyticsExport";
import {
  DEFAULT_ANALYTICS_FILTERS,
  type AnalyticsFilters,
  type AnalyticsTab,
} from "@/types/analytics";
import type { Account } from "@/types/finance";
import { formatCompactCurrency, formatINR } from "@/utils/financeCalculations";

const TABS: Array<{ id: AnalyticsTab; label: string }> = [
  { id: "spending", label: "Spending" },
  { id: "income", label: "Income" },
  { id: "comparison", label: "Monthly comparison" },
  { id: "trends", label: "Category trends" },
  { id: "recurring", label: "Recurring" },
  { id: "cashflow", label: "Cash flow" },
  { id: "patterns", label: "Patterns" },
];

const PERIOD_LABELS: Record<AnalyticsFilters["period"], string> = {
  "3m": "3 months",
  "6m": "6 months",
  "12m": "12 months",
};

function getAccounts(
  accounts: Account[],
  transactions: ReturnType<typeof useFinanceStore>["transactions"],
  statements: ReturnType<typeof useFinanceStore>["statements"],
): Account[] {
  const byId = new Map(accounts.map((account) => [account.id, account]));
  for (const statement of statements) {
    if (statement.status !== "completed" || !statement.maskedAccount || statement.maskedAccount === "—") continue;
    const digits = statement.maskedAccount.replace(/\D/g, "");
    const id = `imported-${digits || "x"}`;
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        name: statement.accountNickname || statement.bank || "Imported account",
        type: statement.accountType === "credit" || statement.accountType === "current"
          ? statement.accountType
          : "savings",
        last4: digits.slice(-4),
        balance: null,
      });
    }
  }
  for (const transaction of transactions) {
    if (!byId.has(transaction.accountId)) {
      byId.set(transaction.accountId, {
        id: transaction.accountId,
        name: transaction.accountId,
        type: "savings",
        last4: "",
        balance: null,
      });
    }
  }
  return [...byId.values()];
}

function MetricCard({
  label,
  value,
  description,
  tone = "default",
}: {
  label: string;
  value: string;
  description: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        <p className={`financial-number mt-2 text-xl font-bold sm:text-2xl ${tone === "positive" ? "text-success" : tone === "negative" ? "text-error" : "text-ink"}`}>
          {value}
        </p>
        <p className="mt-1 text-xs text-ink-muted">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ children = "No transactions match these filters." }: { children?: string }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-ink-muted">
      {children}
    </div>
  );
}

function AnalyticsTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/70 bg-surface/90 p-3 text-xs shadow-lg backdrop-blur-md">
      {label && <p className="mb-1 font-semibold text-ink">{label}</p>}
      {payload.map((item, index) => (
        <p key={`${item.name}-${index}`} className="text-ink-muted">
          <span style={{ color: item.color }} aria-hidden="true">● </span>
          {item.name}: {formatINR(Number(item.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

function SpendingPanel({
  data,
  selectedCategory,
  onSelectCategory,
}: {
  data: ReturnType<typeof buildAnalytics>;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}) {
  const trend = data.months.map((month) => ({
    month: month.shortLabel,
    Income: month.income,
    Expenses: month.expenses,
    Savings: month.savings,
  }));
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Current-month spending by category</CardTitle></CardHeader>
        <CardContent>
          {data.categories.length === 0 ? <EmptyChart /> : (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(160px,0.8fr)]">
              <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categories}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius="55%"
                      outerRadius="82%"
                      paddingAngle={2}
                      cursor="pointer"
                      onClick={(entry) => {
                        const payload = entry?.payload;
                        const category = payload && typeof payload === "object" && "category" in payload
                          ? payload.category
                          : null;
                        onSelectCategory(typeof category === "string" ? category : null);
                      }}
                    >
                      {data.categories.map((item) => <Cell key={item.category} fill={item.color} />)}
                    </Pie>
                    <Tooltip content={<AnalyticsTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2">
                {data.categories.slice(0, 7).map((item) => (
                  <li key={item.category} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-ink-muted">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.category}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-ink">{item.percentage.toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      {selectedCategory && (
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{selectedCategory} transactions</CardTitle>
              <Button variant="outline" size="sm" onClick={() => onSelectCategory(null)}>Clear selection</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.months
                .flatMap((month) => month.transactions)
                .filter((transaction) => transaction.category === selectedCategory && transaction.type === "expense")
                .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
                .slice(0, 10)
                .map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{transaction.merchant}</p>
                      <p className="text-xs text-ink-muted">{new Date(transaction.date).toLocaleDateString("en-IN")}</p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-ink">{formatINR(transaction.amount)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Income, expenses and net savings</CardTitle></CardHeader>
        <CardContent>
          {trend.length === 0 ? <EmptyChart /> : (
            <div className="h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid stroke="#eae5dc" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#85847f" }} />
                  <YAxis tickFormatter={formatCompactCurrency} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#85847f" }} width={52} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar dataKey="Income" fill="#1C5233" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#B95F3D" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Savings" fill="#B8860B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IncomePanel({ data }: { data: ReturnType<typeof buildAnalytics> }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Income by month</CardTitle></CardHeader>
        <CardContent>
          {data.months.every((month) => month.income === 0) ? <EmptyChart /> : (
            <div className="h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.months.map((month) => ({ month: month.shortLabel, income: month.income }))}>
                  <CartesianGrid stroke="#eae5dc" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#85847f" }} />
                  <YAxis tickFormatter={formatCompactCurrency} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#85847f" }} width={52} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar dataKey="income" name="Income" fill="#1C5233" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Income sources</CardTitle></CardHeader>
        <CardContent>
          {data.incomeSources.length === 0 ? <EmptyChart /> : (
            <ul className="divide-y divide-border">
              {data.incomeSources.map((source) => (
                <li key={source.category} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                    <span className="truncate text-sm font-medium">{source.category}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatINR(source.amount)}</p>
                    <p className="text-xs text-ink-muted">{source.percentage.toFixed(1)}% · {source.count} transactions</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ComparisonPanel({ data }: { data: ReturnType<typeof buildAnalytics> }) {
  const current = data.months[data.months.length - 1];
  const previous = data.months[data.months.length - 2];
  if (!current || !previous) return <EmptyChart />;
  const values = [
    { label: "Income", current: current.income, previous: previous.income },
    { label: "Expenses", current: current.expenses, previous: previous.expenses },
    { label: "Net savings", current: current.savings, previous: previous.savings },
  ];
  const categoryNames = new Set([
    ...current.transactions.filter((item) => item.type === "expense" && item.category.toLowerCase() !== "transfers").map((item) => item.category),
    ...previous.transactions.filter((item) => item.type === "expense" && item.category.toLowerCase() !== "transfers").map((item) => item.category),
  ]);
  const categoryRows = [...categoryNames].map((category) => {
    const sum = (month: typeof current) => month.transactions
      .filter((item) => item.type === "expense" && item.category === category && item.category.toLowerCase() !== "transfers")
      .reduce((total, item) => total + item.amount, 0);
    return { category, current: sum(current), previous: sum(previous) };
  }).sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous));
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{current.label} compared with {previous.label}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-ink-muted">
                <th className="pb-2 font-medium">Metric</th><th className="pb-2 text-right font-medium">{previous.label}</th>
                <th className="pb-2 text-right font-medium">{current.label}</th><th className="pb-2 text-right font-medium">Change</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {values.map((row) => {
                  const change = row.current - row.previous;
                  return <tr key={row.label}>
                    <th scope="row" className="py-3 text-left font-medium">{row.label}</th>
                    <td className="py-3 text-right tabular-nums">{formatINR(row.previous)}</td>
                    <td className="py-3 text-right tabular-nums">{formatINR(row.current)}</td>
                    <td className={`py-3 text-right tabular-nums ${change > 0 ? "text-ink" : change < 0 ? "text-success" : "text-ink-muted"}`}>
                      {change > 0 ? "+" : change < 0 ? "−" : ""}{formatINR(Math.abs(change))}
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Category changes</CardTitle></CardHeader>
        <CardContent>
          {categoryRows.length === 0 ? <EmptyChart /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead><tr className="border-b border-border text-left text-xs text-ink-muted">
                  <th className="pb-2 font-medium">Category</th><th className="pb-2 text-right font-medium">{previous.label}</th>
                  <th className="pb-2 text-right font-medium">{current.label}</th><th className="pb-2 text-right font-medium">Change</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {categoryRows.map((row) => <tr key={row.category}>
                    <th scope="row" className="py-3 text-left font-medium">{row.category}</th>
                    <td className="py-3 text-right tabular-nums">{formatINR(row.previous)}</td>
                    <td className="py-3 text-right tabular-nums">{formatINR(row.current)}</td>
                    <td className="py-3 text-right tabular-nums">{row.current > row.previous ? "+" : row.current < row.previous ? "−" : ""}{formatINR(Math.abs(row.current - row.previous))}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrendsPanel({ data }: { data: ReturnType<typeof buildAnalytics> }) {
  const categories = data.categories.slice(0, 5);
  const trendData = data.months.map((month) => {
    const row: Record<string, string | number> = { month: month.shortLabel };
    for (const category of categories) {
      row[category.category] = month.transactions
        .filter((transaction) => transaction.type === "expense" && transaction.category === category.category && transaction.category.toLowerCase() !== "transfers")
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    }
    return row;
  });
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Monthly spend by top current categories</CardTitle></CardHeader>
        <CardContent>
          {categories.length === 0 ? <EmptyChart /> : (
            <div className="h-80 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid stroke="#eae5dc" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#85847f" }} />
                  <YAxis tickFormatter={formatCompactCurrency} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#85847f" }} width={52} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  {categories.map((category) => (
                    <Line key={category.category} dataKey={category.category} type="monotone" stroke={category.color} strokeWidth={3} strokeLinecap="round" dot={{ r: 3 }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      <Alert variant="info">Trend lines are calculated from transactions in each month; categories are selected from this month’s largest spending categories.</Alert>
    </div>
  );
}

function RecurringPanel({ data }: { data: ReturnType<typeof buildAnalytics> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Possible recurring payments</CardTitle>
        <p className="text-sm text-ink-muted">Rule-based patterns from at least three similar merchant transactions. A repeat pattern does not confirm a subscription.</p>
      </CardHeader>
      <CardContent>
        {data.recurring.length === 0 ? <EmptyChart>Not enough consistent repeat transactions were found in this period.</EmptyChart> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-ink-muted">
                <th className="pb-2 font-medium">Merchant</th><th className="pb-2 font-medium">Category</th>
                <th className="pb-2 font-medium">Frequency</th><th className="pb-2 text-right font-medium">Average amount</th>
                <th className="pb-2 text-right font-medium">Observed</th><th className="pb-2 text-right font-medium">Last seen</th>
                <th className="pb-2 text-right font-medium">Next expected</th><th className="pb-2 text-right font-medium">Pattern score</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {data.recurring.map((item) => <tr key={item.id}>
                  <th scope="row" className="py-3 text-left font-medium">{item.merchant}</th>
                  <td className="py-3">{item.category}</td><td className="py-3 capitalize">{item.frequency}</td>
                  <td className="py-3 text-right tabular-nums">{formatINR(item.averageAmount)}</td>
                  <td className="py-3 text-right tabular-nums">{item.occurrences} times</td>
                  <td className="py-3 text-right tabular-nums">{new Date(item.lastDate).toLocaleDateString("en-IN")}</td>
                  <td className="py-3 text-right tabular-nums">{new Date(item.nextExpectedDate).toLocaleDateString("en-IN")}</td>
                  <td className="py-3 text-right"><Badge variant={item.status === "likely" ? "success" : "warning"}>{Math.round(item.confidence * 100)}%</Badge></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CashFlowPanel({ data }: { data: ReturnType<typeof buildAnalytics> }) {
  const chartData = data.months.map((month) => ({
    month: month.shortLabel,
    Income: month.income,
    Expenses: month.expenses,
    "Net flow": month.savings,
  }));
  return (
    <div className="space-y-4">
      <Alert variant="info">Cash-flow totals are based on recorded transactions. Transfers are excluded from expenses. Account balances below are current snapshots, not historical balance estimates.</Alert>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Period inflow" value={formatINR(data.totalIncome)} description="Income transactions in selected period" tone="positive" />
        <MetricCard label="Period outflow" value={formatINR(data.totalExpenses)} description="Expenses excluding transfers" />
        <MetricCard label="Current account balance" value={data.currentBalance === null ? "Unavailable" : formatINR(data.currentBalance)} description="Current account snapshot; not a period-end balance" />
      </div>
      <Card>
        <CardHeader><CardTitle>Monthly cash flow</CardTitle></CardHeader>
        <CardContent>
          {chartData.length === 0 ? <EmptyChart /> : (
            <div className="h-80 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="#eae5dc" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#85847f" }} />
                  <YAxis tickFormatter={formatCompactCurrency} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#85847f" }} width={52} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar dataKey="Income" fill="#2D7A4D" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#D97745" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Net flow" fill="#6d79bd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PatternsPanel({ data }: { data: ReturnType<typeof buildAnalytics> }) {
  const weekdaySpend = data.totalExpenses * (1 - data.weekendShare / 100);
  const weekendSpend = data.totalExpenses * data.weekendShare / 100;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Daily spending</CardTitle></CardHeader>
        <CardContent>
          {data.dailySpending.length === 0 ? <EmptyChart /> : (
            <div className="h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailySpending}>
                  <CartesianGrid stroke="#eae5dc" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#85847f" }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={formatCompactCurrency} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#85847f" }} width={52} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar dataKey="amount" name="Spend" fill="#D97745">
                    {data.dailySpending.map((day) => <Cell key={day.date} fill={day.weekday === 0 || day.weekday === 6 ? "#6d79bd" : "#D97745"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Weekend and weekday spending</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm"><span>Weekend</span><span className="tabular-nums">{formatINR(weekendSpend)} · {data.weekendShare.toFixed(0)}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-secondary"><div className="h-full rounded-full bg-accent-secondary" style={{ width: `${Math.min(100, data.weekendShare)}%` }} /></div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm"><span>Weekday</span><span className="tabular-nums">{formatINR(weekdaySpend)} · {(100 - data.weekendShare).toFixed(0)}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-secondary"><div className="h-full rounded-full bg-accent-primary" style={{ width: `${Math.max(0, 100 - data.weekendShare)}%` }} /></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top merchants</CardTitle></CardHeader>
          <CardContent>
            {data.topMerchants.length === 0 ? <EmptyChart /> : (
              <ol className="space-y-3">
                {data.topMerchants.slice(0, 5).map((item, index) => (
                  <li key={item.merchant} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink-muted">{index + 1}. {item.merchant} <span className="text-xs">({item.count})</span></span>
                    <span className="shrink-0 font-medium tabular-nums">{formatINR(item.amount)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const snapshot = useFinanceStore();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_ANALYTICS_FILTERS);
  const [tab, setTab] = useState<AnalyticsTab>("spending");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const accounts = useMemo(
    () => getAccounts(snapshot.accounts, snapshot.transactions, snapshot.statements),
    [snapshot.accounts, snapshot.transactions, snapshot.statements],
  );
  const data = useMemo(
    () => buildAnalytics(snapshot.transactions, accounts, filters),
    [snapshot.transactions, accounts, filters],
  );
  const categories = useMemo(
    () => [...new Set(snapshot.transactions.map((transaction) => transaction.category))].sort((a, b) => a.localeCompare(b)),
    [snapshot.transactions],
  );

  const updateFilter = <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const exportCsv = () => {
    try {
      downloadAnalyticsCsv(data, filters);
      showToast({ kind: "success", title: "Analytics exported", description: "The CSV report has been downloaded." });
    } catch (error) {
      showToast({ kind: "error", title: "Could not export analytics", description: error instanceof Error ? error.message : "Please try again." });
    }
  };
  const exportPrint = () => {
    try {
      if (!openAnalyticsPrintReport(data, filters)) {
        showToast({ kind: "error", title: "Report window blocked", description: "Allow pop-ups for this site and try again." });
      }
    } catch (error) {
      showToast({ kind: "error", title: "Could not prepare report", description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  const activePanel = {
    spending: <SpendingPanel data={data} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />,
    income: <IncomePanel data={data} />,
    comparison: <ComparisonPanel data={data} />,
    trends: <TrendsPanel data={data} />,
    recurring: <RecurringPanel data={data} />,
    cashflow: <CashFlowPanel data={data} />,
    patterns: <PatternsPanel data={data} />,
  }[tab];
  const hasTransactions = data.totalTransactions > 0;
  const currentMonthLabel = data.months[data.months.length - 1]?.label ?? "Current month";

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Insights"
        title="Financial analytics"
        description="Explore income, spending, cash flow, and patterns derived from transactions in your account."
      />
      <div className="mt-6 space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="analytics-period" className="text-xs font-medium text-ink-muted">Time range</label>
            <select id="analytics-period" value={filters.period} onChange={(event) => updateFilter("period", event.target.value as AnalyticsFilters["period"])} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
              {Object.entries(PERIOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="analytics-account" className="text-xs font-medium text-ink-muted">Account</label>
            <select id="analytics-account" value={filters.accountId} onChange={(event) => updateFilter("accountId", event.target.value)} className="h-10 min-w-44 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="all">All accounts</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.last4 ? ` ··${account.last4}` : ""}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="analytics-type" className="text-xs font-medium text-ink-muted">Transaction type</label>
            <select id="analytics-type" value={filters.type} onChange={(event) => updateFilter("type", event.target.value as AnalyticsFilters["type"])} className="h-10 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="all">Income and expenses</option><option value="income">Income</option><option value="expense">Expenses</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="analytics-category" className="text-xs font-medium text-ink-muted">Category</label>
            <select id="analytics-category" value={filters.category} onChange={(event) => updateFilter("category", event.target.value)} className="h-10 min-w-40 rounded-lg border border-border bg-background px-3 text-sm">
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="flex min-w-44 flex-1 flex-col gap-1">
            <label htmlFor="analytics-merchant" className="text-xs font-medium text-ink-muted">Merchant search</label>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input id="analytics-merchant" value={filters.merchant} onChange={(event) => updateFilter("merchant", event.target.value)} placeholder="Search merchant" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_ANALYTICS_FILTERS)}><ArrowPathIcon className="size-4" /> Reset</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><ArrowDownTrayIcon className="size-4" /> CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPrint}><DocumentArrowDownIcon className="size-4" /> Print</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Rule-based analytics</Badge>
            <span className="text-xs text-ink-muted">{data.totalTransactions} transactions · {PERIOD_LABELS[filters.period]}</span>
          </div>
          <span className="text-xs text-ink-muted">Numbers reflect transactions matching the selected filters. Transfers are excluded from spending.</span>
        </div>

        {!hasTransactions ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-surface-secondary"><ChartBarIcon className="size-6 text-ink-muted" /></span>
              <h2 className="text-lg font-semibold">No transactions in this view</h2>
              <p className="max-w-md text-sm text-ink-muted">Try another time range or clear filters. Imported and saved transactions will appear here.</p>
              <Button variant="outline" onClick={() => setFilters(DEFAULT_ANALYTICS_FILTERS)}>Clear filters</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Income in period" value={formatINR(data.totalIncome)} description={`${currentMonthLabel} vs prior-month comparisons below`} tone="positive" />
              <MetricCard label="Spending in period" value={formatINR(data.totalExpenses)} description="Transfers excluded from spending" />
              <MetricCard label="Net savings in period" value={formatINR(data.netSavings)} description="Income less recorded expenses" tone={data.netSavings >= 0 ? "positive" : "negative"} />
              <MetricCard label="Savings rate" value={`${data.savingsRate.toFixed(1)}%`} description="Net savings divided by income" tone={data.savingsRate >= 0 ? "positive" : "negative"} />
            </div>

            {data.insights.length > 0 && (
              <section aria-labelledby="analytics-insights">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 id="analytics-insights" className="text-base font-semibold">Highlights</h2>
                  <span className="text-xs text-ink-muted">Deterministic comparisons, not AI-generated advice</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.insights.map((insight) => (
                    <Card key={insight.id} className="p-4">
                      <div className="flex items-start gap-2">
                        <Badge variant={insight.tone === "positive" ? "success" : insight.tone === "warning" ? "warning" : "outline"}>{insight.tone}</Badge>
                        <div><h3 className="text-sm font-semibold">{insight.title}</h3><p className="mt-1 text-xs leading-relaxed text-ink-muted">{insight.description}</p></div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <div className="overflow-x-auto border-b border-border">
              <div className="flex min-w-max gap-1" role="tablist" aria-label="Analytics sections">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    id={`analytics-tab-${item.id}`}
                    role="tab"
                    aria-selected={tab === item.id}
                    aria-controls="analytics-tab-panel"
                    onClick={() => setTab(item.id)}
                    className={`rounded-t-lg border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${tab === item.id ? "border-accent-primary text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <section id="analytics-tab-panel" role="tabpanel" aria-labelledby={`analytics-tab-${tab}`} className="min-w-0">
              {activePanel}
            </section>
            <p className="text-xs leading-relaxed text-ink-muted">
              Analytics are computed locally from transaction records. Recurring payments are pattern-based estimates, not confirmed subscriptions.
              Account balances, when shown, are current account snapshots and should not be read as historical cash balances.
            </p>
          </>
        )}
      </div>
    </PageContainer>
  );
}
