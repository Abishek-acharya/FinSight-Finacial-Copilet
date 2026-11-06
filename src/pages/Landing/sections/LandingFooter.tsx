import { Link } from "react-router-dom";
import { ArrowUpRightIcon } from "@heroicons/react/20/solid";

const footerLinks = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security preview", href: "#security" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-[var(--content-max)] px-[var(--space-page)] py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-ink">
              <span className="grid size-8 place-items-center rounded-lg bg-accent-primary text-xs font-bold text-ink">F</span>
              FinSight<span className="-ml-2 text-accent-secondary">AI</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-ink-muted">A thoughtful preview of a clearer way to understand everyday finances.</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Explore</h2>
            <ul className="mt-3 space-y-2">
              {footerLinks.map((link) => <li key={link.href}><a href={link.href} className="text-sm text-ink hover:text-accent-secondary">{link.label}</a></li>)}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Your next step</h2>
            <ul className="mt-3 space-y-2">
              <li><Link to="/demo" className="inline-flex items-center gap-1 text-sm text-ink hover:text-accent-secondary">Guided demo <ArrowUpRightIcon className="size-4" /></Link></li>
              <li><Link to="/login" className="text-sm text-ink hover:text-accent-secondary">Log in</Link></li>
              <li><Link to="/register" className="text-sm text-ink hover:text-accent-secondary">Get started</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-9 flex flex-col gap-2 border-t border-border pt-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} FinSight AI</span>
          <span>Concept preview · Illustrative data only · Not financial advice</span>
        </div>
      </div>
    </footer>
  );
}
