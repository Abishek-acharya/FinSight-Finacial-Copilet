import { ArrowUpRightIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { ScrollReveal } from "@/components/animation/ScrollReveal";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/navigation/Tabs";

const overviewPoints = [33, 38, 35, 44, 41, 54, 51, 49, 61, 58, 68, 64, 71, 66, 78, 74, 84, 79, 91, 87];
const spendingPoints = [42, 48, 44, 50, 45, 59, 55, 62, 58, 53, 65, 60, 69, 64, 72, 68, 75, 70, 81, 77];

function ProductChart({ points, label }: { points: number[]; label: string }) {
  const width = 620;
  const height = 180;
  const padding = 10;
  const coords = points.map((point, index) => {
    const x = padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = padding + ((100 - point) / 100) * (height - padding * 2);
    return [x, y] as const;
  });
  const line = coords.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const area = `${line} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-40 w-full overflow-visible" role="img" aria-label={label}>
      <defs>
        <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#D97745" stopOpacity=".22" />
          <stop offset="100%" stopColor="#D97745" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((row) => {
        const y = padding + (row / 3) * (height - padding * 2);
        return <line key={row} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#EAE5DC" strokeDasharray="3 5" />;
      })}
      <path d={area} fill="url(#chart-fill)" />
      <path d={line} fill="none" stroke="#B95F3D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      {coords.filter((_, index) => index === coords.length - 1).map(([x, y]) => (
        <circle key="last-point" cx={x} cy={y} r="5" fill="#B95F3D" stroke="white" strokeWidth="3" />
      ))}
    </svg>
  );
}

function DashboardMockup() {
  const transactions = [
    { name: "Market & Co.", category: "Groceries", value: "−$84.20", color: "bg-[#f3e5db]" },
    { name: "Monthly pay", category: "Income", value: "+$3,250.00", color: "bg-[#e6f3eb]" },
    { name: "Metro Transit", category: "Transport", value: "−$32.50", color: "bg-[#f1eee8]" },
  ];

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-border bg-white shadow-[0_28px_90px_-40px_rgba(70,49,35,0.28)]">
      <div className="flex items-center justify-between border-b border-border bg-[#fcfbf8] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-accent-primary text-[11px] font-bold text-ink">F</span>
          <span className="text-xs font-semibold">FinSight <span className="font-normal text-ink-muted">/ Overview</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-[9px]">Sample data</Badge>
          <button type="button" aria-label="More preview options" className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-secondary"><EllipsisHorizontalIcon className="size-5" /></button>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-ink-muted">Your snapshot</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">$12,480.00</p>
            <p className="mt-1 text-[11px] text-ink-muted">Illustrative balance · Updated just now</p>
          </div>
          <span className="rounded-full bg-[#e6f3eb] px-2.5 py-1 text-[10px] font-semibold text-success">↑ 4.2% sample change</span>
        </div>
        <div className="mt-5">
          <Tabs
            items={[
              { label: "Overview", content: <ProductChart points={overviewPoints} label="Illustrative overview trend chart" /> },
              { label: "Spending", content: <ProductChart points={spendingPoints} label="Illustrative spending trend chart" /> },
            ]}
            className="product-preview-tabs"
          />
        </div>
        <div className="mt-4 flex justify-between text-[10px] text-ink-muted"><span>Jan 01</span><span>Jan 08</span><span>Jan 15</span><span>Jan 22</span><span>Jan 31</span></div>
        <div className="mt-6 border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold">Recent activity</p>
            <span className="text-[10px] text-ink-muted">Illustrative transactions</span>
          </div>
          <div className="space-y-2.5">
            {transactions.map((transaction) => (
              <div key={transaction.name} className="flex items-center gap-3">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${transaction.color}`} aria-hidden="true"><span className="size-2 rounded-full bg-accent-secondary/70" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium">{transaction.name}</p><p className="text-[10px] text-ink-muted">{transaction.category}</p></div>
                <span className="text-[11px] font-semibold tabular-nums">{transaction.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductPreviewSection() {
  return (
    <section id="product" className="overflow-hidden bg-[#f3eee6] py-20 sm:py-28">
      <div className="mx-auto max-w-[var(--content-max)] px-[var(--space-page)]">
        <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <ScrollReveal>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">Product preview</p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">Your financial picture, with room to breathe.</h2>
            <p className="mt-5 leading-7 text-ink-muted">A calm home for the details you want to understand. This interactive preview uses made-up numbers and does not connect to financial accounts.</p>
            <ul className="mt-6 space-y-3 text-sm text-ink-muted">
              {["A considered overview of everyday activity", "Simple visual patterns, not information overload", "Clear labels that distinguish sample data"].map((item) => <li key={item} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent-primary" />{item}</li>)}
            </ul>
            <ButtonLink to="/demo" variant="outline" className="mt-8">
              Explore the guided demo <ArrowUpRightIcon className="size-4" />
            </ButtonLink>
          </ScrollReveal>
          <ScrollReveal delay={0.12}>
            <DashboardMockup />
            <p className="mt-3 text-center text-[11px] text-ink-muted">Demonstration interface · All values and activity are illustrative</p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
