import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function SpendingTrendChart({ data }: { data: Array<{ day: string; amount: number }> }) {
  const tooltipFormatter = (value: number | string | ReadonlyArray<number | string> | undefined) => {
    const numeric = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
    return [formatCurrencyINR(numeric), "Spend"];
  };

  return (
    <div className="rounded-[28px] border border-border/70 bg-surface/85 p-6 shadow-[0_2px_10px_-4px_rgba(37,37,34,0.07)] backdrop-blur-md">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Spend pattern</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Last 7 days</h2>
      <div className="mt-5 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#eae5dc" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#85847f" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}k`} tick={{ fontSize: 12, fill: "#85847f" }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={{ borderRadius: 12, border: "1px solid #eae5dc", background: "rgba(255,255,255,0.92)", boxShadow: "0 12px 30px -12px rgba(37,37,34,0.22)", backdropFilter: "blur(12px)" }}
            />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]} fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
