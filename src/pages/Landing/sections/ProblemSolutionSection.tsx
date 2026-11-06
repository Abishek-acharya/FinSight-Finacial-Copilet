import { ArrowRightIcon, ExclamationCircleIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { ScrollReveal } from "@/components/animation/ScrollReveal";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

const painPoints = [
  "Important details scattered across different places",
  "Hard to tell what changed month to month",
  "Too much information, not enough context",
];

export function ProblemSolutionSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-[var(--content-max)] gap-12 px-[var(--space-page)] lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">
        <ScrollReveal>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">A more human view of money</p>
          <h2 className="mt-4 max-w-xl font-display text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            Your finances tell a story. You deserve to see the whole picture.
          </h2>
          <p className="mt-5 max-w-xl leading-7 text-ink-muted">
            A pile of transactions can make it difficult to spot the patterns that matter. FinSight is being shaped around clarity, context, and useful next steps—not more noise.
          </p>
          <ButtonLink to="/demo" variant="ghost" className="mt-5 -ml-3 text-accent-secondary">
            See the product preview <ArrowRightIcon className="size-4" />
          </ButtonLink>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="relative rounded-[1.75rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
            <div className="absolute -right-3 -top-3 grid size-12 place-items-center rounded-2xl bg-[#f8e9df] text-accent-secondary shadow-sm">
              <SparklesIcon className="size-6" aria-hidden="true" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Badge variant="warning">The challenge</Badge>
                <ul className="mt-5 space-y-4">
                  {painPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm leading-6 text-ink-muted">
                      <ExclamationCircleIcon className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-background p-4 sm:p-5">
                <Badge variant="success">The FinSight approach</Badge>
                <p className="mt-5 font-display text-lg font-semibold leading-snug">Make the important things easier to notice.</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">A considered overview, simple categories, and explainable insights—all presented with room to think.</p>
                <div className="mt-6 space-y-3" aria-hidden="true">
                  <div className="h-2 w-full rounded-full bg-border"><div className="h-2 w-[76%] rounded-full bg-accent-primary" /></div>
                  <div className="h-2 w-4/5 rounded-full bg-border"><div className="h-2 w-[54%] rounded-full bg-[#dba17f]" /></div>
                  <div className="h-2 w-3/5 rounded-full bg-border"><div className="h-2 w-[82%] rounded-full bg-[#e8cbb7]" /></div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
