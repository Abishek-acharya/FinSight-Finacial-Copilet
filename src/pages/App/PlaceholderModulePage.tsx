import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { ButtonLink } from "@/components/ui/Button";

export interface PlaceholderModulePageProps {
  eyebrow: string;
  title: string;
  summary: string;
  highlights: string[];
}

export function PlaceholderModulePage({ eyebrow, title, summary, highlights }: PlaceholderModulePageProps) {
  return (
    <PageContainer className="py-10">
      <div className="rounded-[32px] border border-border bg-surface p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">{eyebrow}</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">{summary}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-surface-secondary p-4 text-sm leading-6 text-ink-muted">
              {item}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink to="/app/overview" variant="primary" size="md">
            Back to overview
          </ButtonLink>
          <Link to="/app/assistant" className="inline-flex items-center gap-2 text-sm font-semibold text-accent-secondary hover:underline">
            Explore the assistant
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
