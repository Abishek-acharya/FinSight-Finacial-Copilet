import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function SpendingTrendChart({ data }: { data: Array<{ day: string; amount: number }> }) {
  const tooltipFormatter = (value: number | string | ReadonlyArray<number | string> | undefined) => {
    const numeric = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
    return [formatCurrencyINR(numeric), "Spend"];
  };

  return (
    <div className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Spend pattern</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Last 7 days</h2>
      <div className="mt-5 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#e6e0d6" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#5f625d" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}k`} tick={{ fontSize: 12, fill: "#5f625d" }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={{ borderRadius: 12, border: "1px solid #e6e0d6", background: "#fff" }}
            />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
