import { useState } from "react";
import { ArrowUpRightIcon, ChatBubbleLeftRightIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { ScrollReveal } from "@/components/animation/ScrollReveal";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

const examples = [
  {
    prompt: "What changed in my sample spending?",
    response: "In this example, dining is a little higher than the previous period. You could review a few recent transactions to see what changed.",
  },
  {
    prompt: "Help me think about a monthly goal",
    response: "A useful first step is choosing a comfortable amount and time frame. This demo doesn't use your real account activity to make a plan.",
  },
  {
    prompt: "How do recurring costs add up?",
    response: "Recurring costs can be easier to review together. In a connected product, you could start by checking the date and amount of each repeat charge.",
  },
];

export function AssistantShowcase() {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-[var(--content-max)] items-center gap-12 px-[var(--space-page)] lg:grid-cols-2 lg:gap-20">
        <ScrollReveal>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">A more useful conversation</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Ask better questions about your money.</h2>
          <p className="mt-5 leading-7 text-ink-muted">Explore a guided example of how a financial assistant could offer context in plain language. The responses below are scripted examples—not a live AI service or financial advice.</p>
          <ButtonLink to="/demo" variant="ghost" className="mt-5 -ml-3 text-accent-secondary">
            Explore the guided demo <ArrowUpRightIcon className="size-4" />
          </ButtonLink>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="rounded-[1.5rem] border border-border bg-surface p-5 shadow-md sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[#f8e9df] text-accent-secondary"><SparklesIcon className="size-5" /></span>
                <div><p className="text-sm font-semibold">FinSight assistant</p><p className="text-xs text-ink-muted">Guided conversation preview</p></div>
              </div>
              <Badge variant="warning">Scripted demo</Badge>
            </div>
            <div className="space-y-4 py-5" aria-live="polite">
              <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-sm bg-[#f8e9df] px-4 py-3 text-sm leading-6 text-ink">{example.prompt}</div>
              <div className="flex max-w-[94%] items-start gap-2.5">
                <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg bg-accent-primary text-ink"><ChatBubbleLeftRightIcon className="size-4" /></span>
                <p className="rounded-2xl rounded-bl-sm bg-background px-4 py-3 text-sm leading-6 text-ink-muted">{example.response}</p>
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-[11px] font-medium text-ink-muted">Try an example prompt</p>
              <div className="flex flex-wrap gap-2">
                {examples.map((item, index) => (
                  <button
                    key={item.prompt}
                    type="button"
                    aria-pressed={selected === index}
                    onClick={() => setSelected(index)}
                    className={`min-h-9 rounded-full border px-3 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${selected === index ? "border-accent-primary bg-[#fff7f1] text-ink" : "border-border bg-surface text-ink-muted hover:bg-surface-secondary"}`}
                  >
                    {item.prompt}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-[10px] leading-5 text-ink-muted">Sample dialogue only. No question is sent to an AI model and no personal financial data is used.</p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
