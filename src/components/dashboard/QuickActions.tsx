import { ArrowUpRightIcon, CreditCardIcon, SparklesIcon, WalletIcon } from "@heroicons/react/24/outline";

export function QuickActions() {
  const items = [
    { title: "Add income", icon: WalletIcon, accent: "bg-[#eaf7f1] text-[#2d7a5a]" },
    { title: "Review budget", icon: CreditCardIcon, accent: "bg-[#fef3c7] text-[#92400e]" },
    { title: "AI insight", icon: SparklesIcon, accent: "bg-[#f8e9df] text-[#803d22]" },
  ];

  return (
    <div className="rounded-[28px] border border-border/70 bg-surface/85 p-6 shadow-[0_2px_10px_-4px_rgba(37,37,34,0.07)] backdrop-blur-md">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-secondary">Quick actions</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">Take action</h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {items.map(({ title, icon: Icon, accent }) => (
          <button key={title} type="button" className="rounded-2xl border border-border bg-surface-secondary p-4 text-left transition hover:bg-surface">
            <div className={`mb-4 inline-flex rounded-xl p-2 ${accent}`}>
              <Icon className="size-5" />
            </div>
            <p className="text-sm font-semibold text-ink">{title}</p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-accent-secondary">
              Open <ArrowUpRightIcon className="size-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
