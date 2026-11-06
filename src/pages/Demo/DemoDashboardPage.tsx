import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { AssistantShowcase } from "@/pages/Landing/sections/AssistantShowcase";
import { LandingFooter } from "@/pages/Landing/sections/LandingFooter";
import { ProductPreviewSection } from "@/pages/Landing/sections/ProductPreviewSection";

export default function DemoDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[var(--content-max)] items-center justify-between gap-3 px-[var(--space-page)]">
          <Link to="/" className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-muted hover:bg-surface-secondary hover:text-ink">
            <ArrowLeftIcon className="size-4" aria-hidden="true" /> Back to FinSight
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="warning">Guided demo</Badge>
            <span className="hidden text-xs text-ink-muted sm:inline">Illustrative data only</span>
          </div>
          <ButtonLink to="/register" size="sm">Get started</ButtonLink>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-[var(--content-max)] px-[var(--space-page)] pt-10 sm:pt-14">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">Product tour</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">A closer look at the preview.</h1>
          <p className="mt-3 max-w-2xl leading-7 text-ink-muted">Explore a sample financial overview and a scripted assistant conversation. Nothing here connects to a real account or AI service.</p>
        </div>
        <ProductPreviewSection />
        <AssistantShowcase />
      </main>
      <LandingFooter />
    </div>
  );
}
