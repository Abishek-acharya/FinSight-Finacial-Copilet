export function AIInsightsPanel({ insights }: { insights: Array<{ title: string; description: string; value: string }> }) {
  return (
    <div className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">AI signals</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Insights</h2>

      <div className="mt-5 space-y-3">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-2xl border border-border bg-surface-secondary p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-ink">{insight.title}</span>
              <span className="rounded-full bg-[#eaf7f1] px-2 py-1 text-[11px] font-semibold text-[#2d7a5a]">{insight.value}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{insight.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
