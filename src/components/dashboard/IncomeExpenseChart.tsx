import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyTrendPoint } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function IncomeExpenseChart({ data }: { data: MonthlyTrendPoint[] }) {
  const tooltipFormatter = (value: number | string | ReadonlyArray<number | string> | undefined) => {
    const numeric = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
    return [formatCurrencyINR(numeric), ""];
  };

  return (
    <div className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Cash flow</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Income vs expense</h2>
        </div>
      </div>

      <div className="mt-5 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 10, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#2d7a5a" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#2d7a5a" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="expenseFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e6e0d6" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#5f625d" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}k`} tick={{ fontSize: 12, fill: "#5f625d" }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={tooltipFormatter}
              labelFormatter={(label) => `${label}`}
              contentStyle={{ borderRadius: 12, border: "1px solid #e6e0d6", background: "#fff" }}
            />
            <Area type="monotone" dataKey="income" stroke="#2d7a5a" fill="url(#incomeFill)" strokeWidth={3} />
            <Area type="monotone" dataKey="expenses" stroke="#f97316" fill="url(#expenseFill)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
