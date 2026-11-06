import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import type { DashboardRange } from "@/types/finance";

const ranges: DashboardRange[] = ["1M", "3M", "6M"];

export function DashboardHeader({
  name,
  selectedRange,
  onSelectRange,
}: {
  name: string;
  selectedRange: DashboardRange;
  onSelectRange: (range: DashboardRange) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[30px] border border-border bg-surface p-6 shadow-sm md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Overview</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
          Good evening, {name}.
        </h1>
        <p className="mt-2 text-sm text-ink-muted">A summary of activity from your uploaded financial data.</p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-secondary px-3 py-2">
        <CalendarDaysIcon className="size-4 text-accent-secondary" />
        <div className="flex items-center gap-1 rounded-xl bg-surface p-1">
          {ranges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onSelectRange(range)}
              className={[
                "min-w-11 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                selectedRange === range ? "bg-[#f8e9df] text-[#803d22]" : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
