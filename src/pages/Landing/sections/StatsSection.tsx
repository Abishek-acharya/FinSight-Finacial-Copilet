import { AnimatedCounter } from "@/components/animation/AnimatedCounter";
import { ScrollReveal } from "@/components/animation/ScrollReveal";

const indicators = [
  { value: 6, suffix: "", label: "ways to explore your financial picture" },
  { value: 4, suffix: " steps", label: "from overview to a clearer next move" },
  { value: 1, suffix: " view", label: "to bring key money moments together" },
  { value: 0, suffix: "", label: "live account connections in this preview" },
];

export function StatsSection() {
  return (
    <section id="stats" className="border-y border-border/80 bg-surface/75 py-11 sm:py-14">
      <div className="mx-auto max-w-[var(--content-max)] px-[var(--space-page)]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">At a glance</p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">Less noise. More perspective.</h2>
          </div>
          <span className="rounded-full bg-surface-secondary px-3 py-1 text-[11px] font-medium text-ink-muted">Illustrative product preview</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          {indicators.map((item, index) => (
            <ScrollReveal key={item.label} delay={index * 0.04} className="px-4 py-5 first:pl-0 sm:px-6 sm:py-2">
              <p className="font-display text-3xl font-semibold tracking-tight tabular-nums text-ink sm:text-4xl">
                <AnimatedCounter value={item.value} suffix={item.suffix} duration={700} />
              </p>
              <p className="mt-2 max-w-44 text-xs leading-5 text-ink-muted sm:text-sm">{item.label}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
