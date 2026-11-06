import { ArrowRightIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { ScrollReveal } from "@/components/animation/ScrollReveal";
import { ButtonLink } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="px-[var(--space-page)] pb-20 sm:pb-28">
      <ScrollReveal>
        <div className="relative mx-auto max-w-[var(--content-max)] overflow-hidden rounded-[2rem] bg-[#f2e7dc] px-6 py-14 text-center sm:px-12 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-32 size-72 rounded-full bg-white/70 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-12 size-80 rounded-full bg-[#e5b391]/30 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/80 bg-white/70 text-accent-secondary shadow-sm"><SparklesIcon className="size-6" /></span>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">A clearer relationship with money starts with a first look.</h2>
            <p className="mx-auto mt-5 max-w-xl leading-7 text-ink-muted">Explore the guided preview or see what FinSight is being designed to become.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 min-[420px]:flex-row">
              <ButtonLink to="/demo" size="lg">Explore the demo <ArrowRightIcon className="size-4" /></ButtonLink>
              <ButtonLink to="/register" variant="outline" size="lg">Get started</ButtonLink>
            </div>
            <p className="mt-5 text-xs text-ink-muted">The preview uses fictional information and does not create an account.</p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
