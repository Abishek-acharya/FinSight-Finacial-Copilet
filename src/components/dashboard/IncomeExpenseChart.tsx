import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyTrendPoint } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function IncomeExpenseChart({ data }: { data: MonthlyTrendPoint[] }) {
  const tooltipFormatter = (value: number | string | ReadonlyArray<number | string> | undefined) => {
    const numeric = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
    return [formatCurrencyINR(numeric), ""];
  };

  return (
    <div className="rounded-[28px] border border-border/70 bg-surface/85 p-6 shadow-[0_2px_10px_-4px_rgba(37,37,34,0.07)] backdrop-blur-md">
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
                <stop offset="5%" stopColor="#1c5233" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#1c5233" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="expenseFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#d97745" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#d97745" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#eae5dc" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#85847f" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(value) => `₹${Math.round(Number(value) / 1000)}k`} tick={{ fontSize: 12, fill: "#85847f" }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={tooltipFormatter}
              labelFormatter={(label) => `${label}`}
              contentStyle={{ borderRadius: 12, border: "1px solid #eae5dc", background: "rgba(255,255,255,0.92)", boxShadow: "0 12px 30px -12px rgba(37,37,34,0.22)", backdropFilter: "blur(12px)" }}
            />
            <Area type="monotone" dataKey="income" stroke="#1c5233" fill="url(#incomeFill)" strokeWidth={3} strokeLinecap="round" />
            <Area type="monotone" dataKey="expenses" stroke="#d97745" fill="url(#expenseFill)" strokeWidth={3} strokeLinecap="round" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
