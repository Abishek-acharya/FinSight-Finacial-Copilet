import { ArrowRightIcon, ArrowTrendingUpIcon, BanknotesIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

const metrics = [
  { label: "Net cash flow", value: "$4,240", delta: "+12.4%" },
  { label: "Monthly spend", value: "$2,080", delta: "-3.1%" },
  { label: "Savings rate", value: "31.8%", delta: "+4.2%" },
];

export default function OverviewPage() {
  const { user } = useAuth();

  return (
    <PageContainer className="space-y-8">
      <div className="flex flex-col gap-4 rounded-[30px] border border-border bg-surface p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Overview</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
            Good evening, {user?.name?.split(" ")[0] ?? "there"}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            Your finances are on track. The team is preparing this workspace for the next module release.
          </p>
        </div>
        <ButtonLink to="/app/assistant" variant="secondary" size="md" className="w-fit">
          Ask FinSight AI
        </ButtonLink>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm text-ink-muted">{metric.label}</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <span className="font-display text-3xl font-semibold text-ink">{metric.value}</span>
              <span className="rounded-full bg-[#eaf7f1] px-2 py-1 text-xs font-semibold text-[#2d7a5a]">
                {metric.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[28px] border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">AI summary</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Momentum is building</h2>
            </div>
            <SparklesIcon className="size-8 text-accent-secondary" />
          </div>

          <div className="mt-6 space-y-4 text-sm leading-6 text-ink-muted">
            <p>
              Your spending is down 3.1% this month and your emergency fund is now 74% funded. The
              assistant predicts you can comfortably cover the next two months of fixed costs with a buffer.
            </p>
            <p>
              Next recommended action: review recurring subscriptions and move another $250 toward your high-yield savings goal.
            </p>
          </div>

          <Link to="/app/reports" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-secondary hover:underline">
            Review your monthly report
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <BanknotesIcon className="size-6 text-accent-secondary" />
              <h3 className="font-display text-xl font-semibold text-ink">Savings goal</h3>
            </div>
            <p className="mt-4 text-3xl font-display font-semibold text-ink">$8,250</p>
            <p className="mt-2 text-sm text-ink-muted">of $12,000 set aside for the next quarter</p>
          </div>

          <div className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ArrowTrendingUpIcon className="size-6 text-accent-secondary" />
              <h3 className="font-display text-xl font-semibold text-ink">Trend</h3>
            </div>
            <p className="mt-4 text-3xl font-display font-semibold text-ink">+7.8%</p>
            <p className="mt-2 text-sm text-ink-muted">quarter-over-quarter growth in your investment contributions</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
