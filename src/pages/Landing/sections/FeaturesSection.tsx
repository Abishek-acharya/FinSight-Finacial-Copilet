import {
  ArrowPathRoundedSquareIcon,
  BanknotesIcon,
  ChartBarSquareIcon,
  CircleStackIcon,
  LightBulbIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { ScrollReveal } from "@/components/animation/ScrollReveal";
import { Badge } from "@/components/ui/Badge";

const features = [
  {
    icon: CircleStackIcon,
    title: "Everything in context",
    description: "A composed overview to help make sense of balances, spending, and everyday activity together.",
    label: "A clearer overview",
    kind: "overview",
  },
  {
    icon: BanknotesIcon,
    title: "Understand your spending",
    description: "Explore illustrative transaction categories and see where your money may be going.",
    label: "Spending patterns",
    kind: "spending",
  },
  {
    icon: ChartBarSquareIcon,
    title: "See cash flow over time",
    description: "A simple visual story for money in and money out, with space to consider the details.",
    label: "Cash flow",
    kind: "flow",
  },
  {
    icon: ArrowPathRoundedSquareIcon,
    title: "Make budgets feel practical",
    description: "Turn broad intentions into clear category targets that are easy to review.",
    label: "Flexible planning",
    kind: "budget",
  },
  {
    icon: LightBulbIcon,
    title: "Find thoughtful insights",
    description: "Bring patterns forward with plain-language explanations rather than opaque scores.",
    label: "Helpful context",
    kind: "insight",
  },
  {
    icon: ShieldCheckIcon,
    title: "Built around trust",
    description: "Manual statement files are processed in your browser; no live bank connections or compliance claims.",
    label: "Browser-only imports",
    kind: "trust",
  },
];

function FeatureVisual({ kind }: { kind: string }) {
  if (kind === "overview") {
    return (
      <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
        <div className="flex items-center justify-between"><span className="text-[11px] text-ink-muted">Available balance</span><span className="size-2 rounded-full bg-success" /></div>
        <p className="mt-2 font-display text-2xl font-semibold tabular-nums">$8,420</p>
        <div className="mt-4 flex h-12 items-end gap-1.5" aria-hidden="true">
          {[28, 43, 35, 60, 49, 78, 64, 86, 72, 92, 73, 100].map((height, index) => <span key={index} className="flex-1 rounded-t bg-accent-primary/70" style={{ height: `${height}%` }} />)}
        </div>
      </div>
    );
  }
  if (kind === "spending") {
    return <div className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm"><div className="relative size-16 rounded-full" style={{ background: "conic-gradient(#D97745 0 42%, #efc8ad 42% 72%, #f4e3d8 72% 100%)" }}><div className="absolute inset-2 rounded-full bg-white" /></div><div className="space-y-2 text-[11px] text-ink-muted"><p><i className="mr-2 inline-block size-2 rounded-full bg-accent-primary" />Essentials</p><p><i className="mr-2 inline-block size-2 rounded-full bg-[#efc8ad]" />Everyday</p><p><i className="mr-2 inline-block size-2 rounded-full bg-[#f4e3d8]" />Other</p></div></div>;
  }
  if (kind === "flow") {
    return <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm"><div className="flex justify-between text-[11px] text-ink-muted"><span>Income</span><span>Outflow</span></div><div className="mt-3 flex h-12 items-end gap-2">{[35, 54, 42, 75, 58, 86, 62, 78].map((height, index) => <div key={index} className="flex flex-1 items-end gap-0.5"><span className="w-1/2 rounded-t bg-accent-primary/80" style={{ height: `${height}%` }} /><span className="w-1/2 rounded-t bg-[#e9d8c9]" style={{ height: `${Math.max(20, height - 18)}%` }} /></div>)}</div></div>;
  }
  if (kind === "budget") {
    return <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm"><div className="flex justify-between text-xs"><span className="font-medium">Monthly plan</span><span className="text-ink-muted">68%</span></div><div className="mt-3 h-2 rounded-full bg-surface-secondary"><div className="h-2 w-[68%] rounded-full bg-accent-primary" /></div><div className="mt-4 flex justify-between text-[11px] text-ink-muted"><span>Spent</span><span>Remaining</span></div></div>;
  }
  if (kind === "insight") {
    return <div className="rounded-2xl border border-[#eed9cb] bg-[#fffaf6] p-4 shadow-sm"><div className="flex items-center gap-2"><LightBulbIcon className="size-4 text-accent-secondary" /><span className="text-xs font-semibold">A pattern to explore</span></div><div className="mt-3 h-2 w-4/5 rounded-full bg-[#eed9cb]" /><div className="mt-2 h-2 w-3/5 rounded-full bg-[#f3e5db]" /></div>;
  }
  return <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm"><ShieldCheckIcon className="size-8 text-success" /><div><p className="text-xs font-semibold">Preview environment</p><p className="mt-1 text-[11px] text-ink-muted">Illustrative data · No account links</p></div></div>;
}

export function FeaturesSection() {
  return (
    <section id="features" className="bg-surface-secondary/65 py-20 sm:py-28">
      <div className="mx-auto max-w-[var(--content-max)] px-[var(--space-page)]">
        <ScrollReveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">A thoughtful toolkit</p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Designed around the questions that matter.</h2>
          <p className="mt-4 leading-7 text-ink-muted">One flexible foundation for seeing, understanding, and planning—without making finance feel more complicated.</p>
        </ScrollReveal>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {features.map(({ icon: Icon, ...feature }, index) => (
            <ScrollReveal key={feature.kind} delay={(index % 3) * 0.06}>
              <article className="group h-full rounded-2xl border border-border bg-surface p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-md sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[#f8e9df] text-accent-secondary"><Icon className="size-5" aria-hidden="true" /></span>
                  <Badge variant="outline" className="text-[10px]">{feature.label}</Badge>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-ink-muted">{feature.description}</p>
                <div className="mt-5"><FeatureVisual kind={feature.kind} /></div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
