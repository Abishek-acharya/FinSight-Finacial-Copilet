import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryBreakdownPoint } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function ExpenseCategoryChart({ data }: { data: CategoryBreakdownPoint[] }) {
  const tooltipFormatter = (value: number | string | ReadonlyArray<number | string> | undefined) => {
    const numeric = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
    return [formatCurrencyINR(numeric), "Spend"];
  };

  return (
    <div className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Category mix</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Spending breakdown</h2>

      <div className="mt-5 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 12, border: "1px solid #e6e0d6", background: "#fff" }} />
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
            <span className="font-semibold text-ink">{formatCurrencyINR(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
