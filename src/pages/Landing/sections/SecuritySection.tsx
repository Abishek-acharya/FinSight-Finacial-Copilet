import { EyeSlashIcon, LockClosedIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { ScrollReveal } from "@/components/animation/ScrollReveal";
import { Badge } from "@/components/ui/Badge";

const principles = [
  { icon: EyeSlashIcon, title: "Illustrative data only", description: "Examples on this page are fictional. This preview does not read or store personal financial records." },
  { icon: LockClosedIcon, title: "No live account connections", description: "There is no bank linking or financial data import in this demonstration experience." },
  { icon: ShieldCheckIcon, title: "Clear about what’s available", description: "We don't claim security certifications, integrations, or protections that this preview has not implemented." },
];

export function SecuritySection() {
  return (
    <section id="security" className="bg-[#292824] py-20 text-white sm:py-24">
      <div className="mx-auto grid max-w-[var(--content-max)] gap-12 px-[var(--space-page)] lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
        <ScrollReveal>
          <Badge variant="accent">Trust starts with clarity</Badge>
          <h2 className="mt-5 font-display text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">Your financial life deserves thoughtful care.</h2>
          <p className="mt-5 leading-7 text-white/70">This is an early product preview, not a financial service. We want to be clear about the boundaries: there are no live bank connections, real account data, or verified compliance certifications in this experience.</p>
        </ScrollReveal>
        <div className="space-y-3">
          {principles.map(({ icon: Icon, title, description }, index) => (
            <ScrollReveal key={title} delay={index * 0.06}>
              <article className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5 sm:p-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#f0b38f]"><Icon className="size-5" aria-hidden="true" /></span>
                <div><h3 className="font-display text-base font-semibold text-white">{title}</h3><p className="mt-1.5 text-sm leading-6 text-white/65">{description}</p></div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
