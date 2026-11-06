import { ArrowDownRightIcon, ArrowUpRightIcon } from "@heroicons/react/20/solid";
import { cn } from "@/lib/utils";

export function FinancialMetricCard({
  label,
  value,
  delta,
  tone,
}: {
  label: string;
  value: string;
  delta: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const toneStyles = {
    positive: "bg-[#eaf7f1] text-[#2d7a5a]",
    negative: "bg-[#fae5e1] text-[#9b2c26]",
    neutral: "bg-surface-secondary text-ink",
  };

  const trendPath = tone === "positive"
    ? "M2 18 C8 14, 14 10, 20 6 S30 5, 38 4"
    : tone === "negative"
      ? "M2 4 C8 8, 14 12, 20 14 S30 20, 38 18"
      : "M2 12 C8 10, 14 12, 20 11 S30 10, 38 8";

  return (
    <div className="rounded-[24px] border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">{label}</p>
          <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">{value}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold", toneStyles[tone])}>
          {tone === "negative"
            ? <ArrowDownRightIcon className="size-3" />
            : tone === "positive"
              ? <ArrowUpRightIcon className="size-3" />
              : null}
          {delta}
        </span>
      </div>

      <svg viewBox="0 0 40 20" className="mt-4 h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
        <path d={trendPath} fill="none" stroke={tone === "negative" ? "#d97706" : tone === "positive" ? "#2d7a5a" : "#8a7d66"} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
