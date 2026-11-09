import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryBreakdownPoint } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function ExpenseCategoryChart({ data }: { data: CategoryBreakdownPoint[] }) {
  const tooltipFormatter = (value: number | string | ReadonlyArray<number | string> | undefined) => {
    const numeric = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
    return [formatCurrencyINR(numeric), "Spend"];
  };

  return (
    <div className="rounded-[28px] border border-border/70 bg-surface/85 p-6 shadow-[0_2px_10px_-4px_rgba(37,37,34,0.07)] backdrop-blur-md">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Category mix</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Spending breakdown</h2>

      <div className="mt-5 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: "1px solid #eae5dc", background: "rgba(255,255,255,0.92)", boxShadow: "0 12px 30px -12px rgba(37,37,34,0.22)", backdropFilter: "blur(12px)" }} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={90} paddingAngle={3}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-ink-muted">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </div>
            <span className="financial-number text-sm">{formatCurrencyINR(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
