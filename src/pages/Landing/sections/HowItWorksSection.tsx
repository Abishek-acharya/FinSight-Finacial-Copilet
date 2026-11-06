import { CheckCircleIcon, DocumentTextIcon, EyeIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { ScrollReveal } from "@/components/animation/ScrollReveal";

const steps = [
  { icon: DocumentTextIcon, number: "01", title: "Bring things together", text: "Start with a more complete view of the financial details you choose to explore." },
  { icon: EyeIcon, number: "02", title: "Notice the patterns", text: "See everyday activity organized into a calm, readable overview." },
  { icon: SparklesIcon, number: "03", title: "Explore the context", text: "Use plain-language prompts to consider what may be changing." },
  { icon: CheckCircleIcon, number: "04", title: "Choose your next step", text: "Keep the decisions yours, with a clearer place to begin." },
];

export function HowItWorksSection() {
  const lineRef = useRef<HTMLDivElement>(null);
  const inView = useInView(lineRef, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();

  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-[var(--content-max)] px-[var(--space-page)]">
        <ScrollReveal className="mb-14 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">A simpler flow</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">From scattered details to a clearer next move.</h2>
          <p className="mt-4 leading-7 text-ink-muted">A straightforward journey that helps put your financial information in context.</p>
        </ScrollReveal>
        <div ref={lineRef} className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <div aria-hidden="true" className="absolute left-[8%] right-[8%] top-6 hidden h-px bg-border lg:block">
            <motion.div
              className="h-full origin-left bg-accent-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: inView ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.9, ease: "easeOut" }}
            />
          </div>
          {steps.map(({ icon: Icon, ...step }, index) => (
            <ScrollReveal key={step.number} delay={index * 0.08} className="relative">
              <div className="relative z-10 grid size-12 place-items-center rounded-2xl border border-border bg-background text-accent-secondary shadow-sm">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <p className="mt-5 text-xs font-bold tracking-[0.15em] text-accent-secondary">{step.number}</p>
              <h3 className="mt-2 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{step.text}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
