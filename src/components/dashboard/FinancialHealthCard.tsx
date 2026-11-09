import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import type { FinancialHealthScoreBreakdown } from "@/utils/financeCalculations";

const scoreTone = (score: number) => score >= 80
  ? { label: "Excellent", color: "#2d7a4d" }
  : score >= 50
    ? { label: "Needs improvement", color: "#d97706" }
    : { label: "Needs attention", color: "#dc2626" };

function ScoreFactor({ label, score, detail }: { label: string; score: number; detail?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-semibold tabular-nums text-ink">{score}/100</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
        <div className="h-full rounded-full bg-accent-primary" style={{ width: `${score}%` }} />
      </div>
      {detail && <p className="mt-1 text-[10px] text-ink-muted">{detail}</p>}
    </div>
  );
}

export function FinancialHealthCard({
  score,
  details,
}: {
  score: number;
  details?: FinancialHealthScoreBreakdown;
}) {
  const normalizedScore = Math.min(100, Math.max(0, score));
  const tone = scoreTone(normalizedScore);

  return (
    <section className="rounded-[28px] border border-border/70 bg-surface/85 p-6 shadow-[0_2px_10px_-4px_rgba(37,37,34,0.07)] backdrop-blur-md" aria-label="Financial health score">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Financial health score</p>
      <div className="relative mx-auto mt-3 h-44 max-w-[220px]" role="img" aria-label={`Financial health score ${normalizedScore} out of 100: ${tone.label}`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ name: "Score", value: normalizedScore, fill: tone.color }]}
            startAngle={90}
            endAngle={-270}
            innerRadius="76%"
            outerRadius="100%"
            barSize={14}
          >
            <RadialBar dataKey="value" background={{ fill: "var(--color-surface-secondary)" }} cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-1">
          <span className="font-display text-4xl font-semibold tabular-nums text-ink">{normalizedScore}</span>
          <span className="text-xs text-ink-muted">out of 100</span>
          <span className="mt-1 text-xs font-semibold" style={{ color: tone.color }}>{tone.label}</span>
        </div>
      </div>
      <div className="space-y-3">
        {details ? (
          <>
            <ScoreFactor label="Savings rate · 40%" score={details.savingsScore} detail={`${details.savingsRate}% of income`} />
            <ScoreFactor
              label="Budget adherence · 30%"
              score={details.budgetAdherence}
              detail={details.hasBudgetData ? undefined : "No budget set · neutral score"}
            />
            <ScoreFactor
              label="Spending stability · 30%"
              score={details.spendingStability}
              detail={details.hasStabilityData ? undefined : "Add more history for a stability score"}
            />
          </>
        ) : (
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-secondary">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${normalizedScore}%`, backgroundColor: tone.color }} />
          </div>
        )}
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">A planning indicator from recent savings, budget adherence, and monthly spending consistency—not a credit score or financial advice.</p>
    </section>
  );
}
