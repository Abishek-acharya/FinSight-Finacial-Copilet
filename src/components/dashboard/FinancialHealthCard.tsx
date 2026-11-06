export function FinancialHealthCard({ score }: { score: number }) {
  const progress = Math.min(100, Math.max(0, score));

  return (
    <div className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Financial health</p>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <div className="font-display text-4xl font-semibold text-ink">{score}</div>
          <p className="mt-1 text-sm text-ink-muted">out of 100</p>
        </div>
        <div className="grid size-16 place-items-center rounded-full border-[7px] border-[#f8e9df] bg-surface">
          <div
            className="grid size-11 place-items-center rounded-full bg-accent-primary text-xs font-bold text-ink"
            style={{ transform: `rotate(${progress * 3.6}deg)` }}
          >
            {score}
          </div>
        </div>
      </div>

      <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-surface-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] via-[#f97316] to-[#22c55e]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-ink-muted">
        <span>Strong</span>
        <span>On track</span>
      </div>
    </div>
  );
}
