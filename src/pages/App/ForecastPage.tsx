import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowPathIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { useForecast } from "@/hooks/useForecast";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { simulateForecastScenario } from "@/services/forecast/forecastScenarioService";
import { periodScale } from "@/services/forecast/forecastingCalculations";
import { DEFAULT_FORECAST_FILTERS, type ForecastFilters, type ForecastMethod } from "@/types/forecast";
import { formatCompactCurrency, formatINR } from "@/utils/financeCalculations";

const METHODS: Record<ForecastMethod, { label: string; description: string }> = {
  wma: { label: "Weighted average", description: "Recent complete months receive more weight." },
  sma: { label: "Simple average", description: "All complete months receive equal weight." },
  ema: { label: "Exponential smoothing", description: "Recent observations receive exponentially more weight (α = 0.35)." },
};

function EstimateCard({
  title,
  range,
  fallback,
}: {
  title: string;
  range: { estimate: number; lower: number; upper: number; explanation: string } | null;
  fallback: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{title}</p>
        {range ? <>
          <p className="mt-2 text-xl font-bold tabular-nums text-ink">{formatINR(range.estimate)}</p>
          <p className="mt-1 text-xs text-ink-muted">Range: {formatINR(range.lower)}–{formatINR(range.upper)}</p>
          <p className="mt-1 text-[10px] text-ink-muted">Selected period · estimate only</p>
        </> : <p className="mt-2 text-sm text-ink-muted">{fallback}</p>}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.filter((item) => item.value !== null && item.value !== undefined).map((item) => (
        <p key={item.name} className="text-ink-muted">
          <span style={{ color: item.color }}>● </span>{item.name}: {formatINR(item.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

function ForecastChart({
  data,
}: {
  data: ReturnType<typeof useForecast>;
}) {
  const chartData = [
    ...data.history.map((month) => ({
      month: month.label,
      actualIncome: month.income,
      actualExpenses: month.expenses,
      forecastIncome: null as number | null,
      forecastExpenses: null as number | null,
    })),
    ...data.forecastSeries.map((month) => {
      const monthlyExpenses = data.expenseMonthlyEstimate;
      const forecastScale = data.period === "7d" ? 7 / 30 : 1;
      return {
        month: data.period === "7d" ? "Next 7 days" : month.label,
        actualIncome: null,
        actualExpenses: null,
        forecastIncome: data.incomeForecast === null ? null : month.income * forecastScale,
        forecastExpenses: monthlyExpenses === null ? null : monthlyExpenses * forecastScale,
      };
    }),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical cash flow and estimates</CardTitle>
        <p className="text-xs text-ink-muted">Solid lines show complete historical months; dashed lines are statistical estimates.</p>
      </CardHeader>
      <CardContent>
        <div className="h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 10 }} width={54} />
              <Tooltip content={<ChartTooltip />} />
              {data.history.length > 0 && <ReferenceLine x={data.history[data.history.length - 1].label} stroke="#8b8b83" strokeDasharray="3 3" />}
              <Area type="monotone" dataKey="actualIncome" name="Actual income" stroke="#2D7A4D" fill="#2D7A4D" fillOpacity={0.1} connectNulls={false} />
              <Area type="monotone" dataKey="actualExpenses" name="Actual expenses" stroke="#D97745" fill="#D97745" fillOpacity={0.08} connectNulls={false} />
              <Line type="monotone" dataKey="forecastIncome" name="Estimated income" stroke="#2D7A4D" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="forecastExpenses" name="Estimated expenses" stroke="#D97745" strokeDasharray="6 4" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetRiskCard({ data }: { data: ReturnType<typeof useForecast> }) {
  const risk = data.budgetRisk;
  const variant = risk.level === "overspending" ? "error" : risk.level === "approaching" ? "warning" : risk.level === "within" ? "success" : "outline";
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Monthly budget risk</CardTitle>
        <Badge variant={variant}>{risk.level}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-ink-muted">{risk.label}</p>
        {risk.budget !== null && risk.forecast !== null && <>
          <div className="flex justify-between gap-3 text-sm">
            <span>Estimated category spend</span><strong className="tabular-nums">{formatINR(risk.forecast)}</strong>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span>Budget total</span><span className="tabular-nums">{formatINR(risk.budget)}</span>
          </div>
          {risk.over > 0 && <p className="text-sm font-medium text-error">Estimated overage: {formatINR(risk.over)}</p>}
        </>}
        {risk.categories.length === 0 ? <p className="text-sm text-ink-muted">Create a monthly budget to compare estimates with category allocations.</p> : (
          <ul className="max-h-64 space-y-2 overflow-auto border-t border-border pt-3">
            {risk.categories.map((item) => (
              <li key={item.category} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate">{item.category}</span>
                <span className="shrink-0 text-right tabular-nums text-ink-muted">
                  {item.risk === "insufficient" ? "Not enough data" : `${formatINR(item.forecast)} / ${formatINR(item.allocated)} · ${item.utilization.toFixed(0)}%`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ScenarioCard({
  data,
  expenseBaseline,
  incomeBaseline,
}: {
  data: ReturnType<typeof useForecast>;
  expenseBaseline: number;
  incomeBaseline: number;
}) {
  const [changePercent, setChangePercent] = useState(0);
  const scenario = useMemo(() => simulateForecastScenario({
    expenseChangePercent: changePercent,
    monthlyIncome: incomeBaseline,
    monthlyExpenses: expenseBaseline,
    budget: data.budgetRisk.budget,
  }), [changePercent, incomeBaseline, expenseBaseline, data.budgetRisk.budget]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending scenario</CardTitle>
        <p className="text-xs text-ink-muted">What-if calculation using your monthly baseline. Not a forecast of actual behavior.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block text-sm font-medium">
          Adjust expenses: {changePercent > 0 ? "+" : ""}{changePercent}%
          <input type="range" min="-50" max="50" step="5" value={changePercent} onChange={(event) => setChangePercent(Number(event.target.value))} className="mt-2 w-full accent-[var(--color-accent-primary)]" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-surface-secondary/50 p-3">
            <p className="text-xs text-ink-muted">Scenario monthly spending</p>
            <p className="mt-1 font-semibold tabular-nums">{formatINR(scenario.monthlyExpenses)}</p>
          </div>
          <div className="rounded-lg bg-surface-secondary/50 p-3">
            <p className="text-xs text-ink-muted">Scenario monthly net</p>
            <p className={`mt-1 font-semibold tabular-nums ${scenario.monthlyNet < 0 ? "text-error" : "text-success"}`}>{formatINR(scenario.monthlyNet)}</p>
          </div>
          <div className="rounded-lg bg-surface-secondary/50 p-3">
            <p className="text-xs text-ink-muted">Annualized net (simple ×12)</p>
            <p className="mt-1 font-semibold tabular-nums">{formatINR(scenario.annualNet)}</p>
          </div>
          <div className="rounded-lg bg-surface-secondary/50 p-3">
            <p className="text-xs text-ink-muted">Budget utilization</p>
            <p className="mt-1 font-semibold tabular-nums">{scenario.budgetUtilization === null ? "No budget" : `${scenario.budgetUtilization.toFixed(0)}%`}</p>
          </div>
        </div>
        <p className="text-xs text-ink-muted">This simple scenario assumes income remains unchanged and excludes investment growth and unusual expenses.</p>
      </CardContent>
    </Card>
  );
}

export default function ForecastPage() {
  const snapshot = useFinanceStore();
  const [filters, setFilters] = useState<ForecastFilters>(DEFAULT_FORECAST_FILTERS);
  const data = useForecast(filters);
  const methodOptions = Object.entries(METHODS) as Array<[ForecastMethod, (typeof METHODS)[ForecastMethod]]>;
  const forecastIncome = data.incomeMonthlyEstimate ?? 0;
  const forecastExpenses = data.expenseMonthlyEstimate ?? 0;
  const periodLabels: Record<ForecastFilters["period"], string> = {
    "7d": "Next 7 days",
    "30d": "Next 30 days",
    "3m": "Next 3 months",
    "6m": "Next 6 months",
  };
  const monthlyScale = periodScale(filters.period);
  const accountsById = new Map(snapshot.accounts.map((account) => [account.id, account]));
  for (const transaction of snapshot.transactions) {
    if (!accountsById.has(transaction.accountId)) accountsById.set(transaction.accountId, {
      id: transaction.accountId, name: transaction.accountId, type: "savings", last4: "", balance: 0,
    });
  }
  for (const statement of snapshot.statements) {
    if (statement.status !== "completed" || !statement.maskedAccount || statement.maskedAccount === "—") continue;
    const digits = statement.maskedAccount.replace(/\D/g, "");
    const id = `imported-${digits || "x"}`;
    if (!accountsById.has(id)) accountsById.set(id, {
      id,
      name: statement.accountNickname || statement.bank || "Imported account",
      type: statement.accountType === "credit" || statement.accountType === "current" ? statement.accountType : "savings",
      last4: digits.slice(-4),
      balance: 0,
    });
  }
  const accounts = [...accountsById.values()];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Predictions"
        title="Financial forecast"
        description="Estimated spending, income, and cash flow from your saved transaction history. These are statistical baselines, not guarantees or AI-generated predictions."
        actions={<Badge variant="outline">Statistical estimates · Not ML</Badge>}
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-medium text-ink-muted">Forecast period
            <select value={filters.period} onChange={(event) => setFilters({ ...filters, period: event.target.value as ForecastFilters["period"] })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-ink">
              <option value="7d">Next 7 days (pro-rated)</option><option value="30d">Next 30 days</option><option value="3m">Next 3 months</option><option value="6m">Next 6 months</option>
            </select>
          </label>
          <label className="text-xs font-medium text-ink-muted">History window
            <select value={filters.historyMonths} onChange={(event) => setFilters({ ...filters, historyMonths: event.target.value as ForecastFilters["historyMonths"] })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-ink">
              <option value="3m">3 complete months</option><option value="6m">6 complete months</option><option value="12m">12 complete months</option>
            </select>
          </label>
          <label className="text-xs font-medium text-ink-muted">Account
            <select value={filters.accountId} onChange={(event) => setFilters({ ...filters, accountId: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-ink">
              <option value="all">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}{account.last4 ? ` ··${account.last4}` : ""}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-ink-muted">Forecast method
            <select value={filters.method} onChange={(event) => setFilters({ ...filters, method: event.target.value as ForecastMethod })} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-ink">
              {methodOptions.map(([value, method]) => <option key={value} value={value}>{method.label}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={() => setFilters((current) => ({ ...current }))}>
              <ArrowPathIcon className="size-4" /> Recompute estimates
            </Button>
          </div>
        </CardContent>
      </Card>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
        <InformationCircleIcon className="mt-0.5 size-4 shrink-0" />
        Uses {data.historyMonthCount} complete calendar months, excluding the current incomplete month. {METHODS[filters.method].description}{" "}
        Transfers are excluded from spending; estimates assume historical patterns continue.
      </p>

      {!data.sufficient ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-lg font-semibold">Not enough history for a spending forecast</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-ink-muted">{data.reason} Import additional statements or choose a wider history window.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <EstimateCard title={`${periodLabels[filters.period]} · expenses`} range={data.expenseForecast} fallback="Insufficient data" />
            <EstimateCard title={`${periodLabels[filters.period]} · income`} range={data.incomeForecast} fallback="Income activity in fewer than two complete months" />
            <EstimateCard title={`${periodLabels[filters.period]} · net cash flow`} range={data.netForecast} fallback="Unavailable without sufficient income and expense data" />
            <Card><CardContent className="p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Historical cash balance</p>
              <p className="mt-2 text-xl font-bold tabular-nums">{data.openingBalance === null ? "Unavailable" : formatINR(data.openingBalance)}</p>
              <p className="mt-1 text-xs text-ink-muted">Current account snapshot, not historical balance.</p>
              {data.closingBalance !== null && <p className="mt-1 text-[10px] text-ink-muted">Illustrative closing estimate: {formatINR(data.closingBalance)}</p>}
            </CardContent></Card>
          </div>

          <ForecastChart data={data} />

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Category spending estimates</CardTitle><p className="text-xs text-ink-muted">Per-category estimates use the selected method; categories need at least two active months.</p></CardHeader>
              <CardContent>
                {data.categories.length === 0 ? <p className="text-sm text-ink-muted">No expense categories found in this history.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead><tr className="border-b border-border text-left text-xs text-ink-muted"><th className="pb-2">Category</th><th className="pb-2 text-right">Historical avg.</th><th className="pb-2 text-right">Estimate / month</th><th className="pb-2 text-right">Status</th></tr></thead>
                      <tbody className="divide-y divide-border">{data.categories.map((item) => <tr key={item.category}>
                        <th scope="row" className="py-2.5 text-left font-medium">{item.category}</th>
                        <td className="py-2.5 text-right tabular-nums">{formatINR(item.historicalAverage)}</td>
                        <td className="py-2.5 text-right tabular-nums">{item.available ? formatINR(item.forecast * monthlyScale) : "—"}</td>
                        <td className="py-2.5 text-right">{item.available ? <Badge variant="success">Estimate</Badge> : <span className="text-xs text-ink-muted" title={item.reason}>{item.reason}</span>}</td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            <BudgetRiskCard data={data} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Possible recurring outflows</CardTitle><p className="text-xs text-ink-muted">Pattern matches only; verify before treating these as future charges.</p></CardHeader>
              <CardContent>
                {data.recurring.length === 0 ? <p className="text-sm text-ink-muted">No consistent repeating transaction patterns detected.</p> : (
                  <ul className="divide-y divide-border">{data.recurring.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{item.merchant}</p><p className="text-xs text-ink-muted">{item.category} · {item.frequency} · {item.occurrences} transactions</p></div>
                    <div className="text-right"><p className="text-sm font-semibold tabular-nums">{formatINR(item.amount)}</p><p className="text-xs text-ink-muted">Possible next: {new Date(item.nextExpectedDate).toLocaleDateString("en-IN")} · {Math.round(item.confidence * 100)}% pattern consistency</p></div>
                  </li>)}</ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Forecast observations</CardTitle><p className="text-xs text-ink-muted">Deterministic explanations from the selected history window.</p></CardHeader>
              <CardContent>
                {data.insights.length === 0 ? <p className="text-sm text-ink-muted">No notable changes or budget risks were detected.</p> : <ul className="space-y-3">{data.insights.map((insight) => <li key={insight.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start gap-2"><Badge variant={insight.tone === "warning" ? "warning" : insight.tone === "positive" ? "success" : "outline"}>{insight.tone}</Badge><div><h3 className="text-sm font-semibold">{insight.title}</h3><p className="mt-1 text-xs text-ink-muted">{insight.explanation}</p></div></div>
                </li>)}</ul>}
              </CardContent>
            </Card>
          </div>

          {data.incomeForecast && (
            <Card>
              <CardHeader><CardTitle>Income estimate composition</CardTitle><p className="text-xs text-ink-muted">Income categories are classified by category labels. Irregular income is especially uncertain.</p></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div><p className="text-xs text-ink-muted">Salary average</p><p className="mt-1 font-semibold">{formatINR(data.regularIncomeMonthly * monthlyScale)}</p></div>
                <div><p className="text-xs text-ink-muted">Irregular income average</p><p className="mt-1 font-semibold">{formatINR(data.irregularIncomeMonthly * monthlyScale)}</p></div>
                <div><p className="text-xs text-ink-muted">Other income average</p><p className="mt-1 font-semibold">{formatINR(data.otherIncomeMonthly * monthlyScale)}</p></div>
                <div><p className="text-xs text-ink-muted">Overall selected-method estimate</p><p className="mt-1 font-semibold">{formatINR(data.incomeForecast?.estimate ?? 0)}</p></div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <ScenarioCard data={data} expenseBaseline={forecastExpenses} incomeBaseline={forecastIncome} />
            <Card>
              <CardHeader><CardTitle>Historical backtest</CardTitle><p className="text-xs text-ink-muted">Hold out recent complete months, forecast from earlier months, and compare with recorded expenses.</p></CardHeader>
              <CardContent>
                {data.evaluation.length === 0 ? <p className="text-sm text-ink-muted">Backtesting requires at least six complete months in the selected history.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[460px] text-sm">
                      <thead><tr className="border-b border-border text-left text-xs text-ink-muted"><th className="pb-2">Method</th><th className="pb-2 text-right">Holdouts</th><th className="pb-2 text-right">MAE</th><th className="pb-2 text-right">RMSE</th><th className="pb-2 text-right">MAPE</th></tr></thead>
                      <tbody className="divide-y divide-border">{data.evaluation.map((item) => <tr key={item.method}>
                        <th scope="row" className="py-2.5 text-left font-medium">{METHODS[item.method].label}</th>
                        <td className="py-2.5 text-right">{item.samples}</td><td className="py-2.5 text-right tabular-nums">{formatINR(item.mae)}</td><td className="py-2.5 text-right tabular-nums">{formatINR(item.rmse)}</td><td className="py-2.5 text-right tabular-nums">{item.mape === null ? "n/a" : `${item.mape.toFixed(1)}%`}</td>
                      </tr>)}</tbody>
                    </table>
                    <p className="mt-3 text-xs text-ink-muted">Lower errors indicate closer fit on these historical holdouts only; they do not guarantee future accuracy.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-3 text-xs text-ink-muted"><strong className="text-ink">No ML model:</strong> estimates use deterministic moving averages or exponential smoothing only.</div>
            <div className="rounded-xl border border-border p-3 text-xs text-ink-muted"><strong className="text-ink">Heuristic range:</strong> variability bounds are not confidence intervals and are not calibrated probabilities.</div>
            <div className="rounded-xl border border-border p-3 text-xs text-ink-muted"><strong className="text-ink">Past fit:</strong> backtest metrics summarize held-out months, not a guarantee of future performance.</div>
          </div>
        </>
      )}
    </div>
  );
}
