import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Transaction } from "@/types/finance";
import { formatCurrencyINR } from "@/utils/financeCalculations";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function heatLevel(amount: number): number {
  if (amount <= 0) return 0;
  if (amount <= 500) return 1;
  if (amount <= 1500) return 2;
  if (amount <= 3000) return 3;
  if (amount <= 5000) return 4;
  return 5;
}

const levelClasses = [
  "bg-surface-secondary",
  "bg-emerald-200",
  "bg-lime-300",
  "bg-amber-300",
  "bg-orange-400",
  "bg-red-700",
];

export function ExpenseHeatmap({ transactions }: { transactions: Transaction[] }) {
  const { days, total, peak } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentSunday = new Date(today);
    currentSunday.setDate(today.getDate() - today.getDay());
    const start = new Date(currentSunday.getTime() - 12 * 7 * DAY_MS);
    const amountsByDay = new Map<string, number>();

    for (const transaction of transactions) {
      if (transaction.type !== "expense" || transaction.category.toLowerCase() === "transfers") continue;
      const key = transaction.date.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      const [year, month, day] = key.split("-").map(Number);
      const parsedDate = new Date(year, month - 1, day);
      if (dateKey(parsedDate) !== key || parsedDate < start || parsedDate > today) continue;
      amountsByDay.set(key, (amountsByDay.get(key) ?? 0) + transaction.amount);
    }

    const calendarDays = Array.from({ length: 13 * 7 }, (_, index) => {
      const date = new Date(start.getTime() + index * DAY_MS);
      const amount = amountsByDay.get(dateKey(date)) ?? 0;
      return { date, amount };
    });
    const amounts = calendarDays.map(({ amount }) => amount);
    return {
      days: calendarDays,
      total: amounts.reduce((sum, amount) => sum + amount, 0),
      peak: Math.max(0, ...amounts),
    };
  }, [transactions]);

  const monthLabels = days
    .filter(({ date }) => date.getDate() <= 7)
    .map(({ date }) => ({ label: date.toLocaleString("en-IN", { month: "short" }), week: Math.floor((date.getTime() - days[0].date.getTime()) / (7 * DAY_MS)) }));

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">Spending activity</p>
        <CardTitle className="mt-1">Expense heatmap</CardTitle>
        <p className="text-xs text-ink-muted">Daily expenses over the past 13 weeks, excluding transfers.</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[590px]">
            <div className="mb-2 ml-9 grid h-4 grid-cols-[repeat(13,minmax(0,1fr))] gap-1 text-[10px] text-ink-muted">
              {Array.from({ length: 13 }, (_, week) => {
                const month = monthLabels.find((item) => item.week === week);
                return <span key={week}>{month?.label ?? ""}</span>;
              })}
            </div>
            <div className="grid grid-cols-[2rem_1fr] gap-x-2">
              <div className="grid grid-rows-7 gap-1 text-[9px] leading-3 text-ink-muted">
                {DAY_LABELS.map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="grid grid-flow-col grid-cols-[repeat(13,minmax(0,1fr))] grid-rows-7 gap-1">
                {days.map(({ date, amount }) => {
                  const key = dateKey(date);
                  return (
                    <div
                      key={key}
                      title={`${key}: ${formatCurrencyINR(amount)}`}
                      aria-label={`${date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}: ${formatCurrencyINR(amount)} spent`}
                      className={`aspect-square min-w-0 rounded-[3px] ${levelClasses[heatLevel(amount)]} ${key === dateKey(new Date()) ? "ring-1 ring-ink-muted" : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
          <span>{formatCurrencyINR(total)} recorded · peak day {formatCurrencyINR(peak)}</span>
          <div className="flex items-center gap-1.5" aria-label="Spending intensity legend">
            <span>Less</span>
            {levelClasses.map((color, index) => <span key={index} aria-hidden="true" className={`size-3 rounded-[3px] ${color}`} />)}
            <span>More</span>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-ink-muted">Color bands: ₹0, up to ₹500, ₹1,500, ₹3,000, ₹5,000, and above ₹5,000.</p>
      </CardContent>
    </Card>
  );
}
