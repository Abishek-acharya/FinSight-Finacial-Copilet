import { SparklesIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { detectUnusualTransactions } from "@/services/transactionAnomalies";
import { detectMonthlySubscriptions } from "@/services/financialEngine";
import { generateSavingsRecommendations } from "@/services/budget/savingsPlanner";
import { formatCurrencyINR } from "@/utils/financeCalculations";
import type { SavingsRecommendation } from "@/types/budget";

function priorMonthKeys(now: Date): string[] {
  return [1, 2, 3].map((offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

function reviewedStatus(transaction: { reviewStatus?: string; confidence?: number }) {
  return transaction.reviewStatus ?? ((transaction.confidence ?? 1) < 0.6 ? "pending" : "reviewed");
}

function recommendationFor(
  transactions: ReturnType<typeof useFinanceStore>["transactions"],
  now: Date,
): SavingsRecommendation | null {
  const recordedMonths = new Set(
    transactions
      .filter((transaction) => transaction.date < `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`)
      .map((transaction) => transaction.date.slice(0, 7)),
  );
  if (!priorMonthKeys(now).every((month) => recordedMonths.has(month))) return null;

  const recurring = detectMonthlySubscriptions(transactions).map((item) => ({
    merchant: item.merchant,
    averageAmount: item.monthlyAmount,
    frequency: "monthly",
  }));
  const recommendations = generateSavingsRecommendations(transactions, null, recurring, now);
  return recommendations.find((item) => item.tone !== "positive") ?? recommendations[0] ?? null;
}

export function FinancialCopilot() {
  const snapshot = useFinanceStore();
  const { status } = useAuth();
  const transactions = snapshot.transactions;
  const pendingCount = transactions.filter((transaction) => reviewedStatus(transaction) === "pending").length;
  const unusualIds = detectUnusualTransactions(transactions);
  const reviewFlags = transactions.filter((transaction) => unusualIds.has(transaction.id));
  const now = new Date();
  const monthKeys = new Set(transactions.map((transaction) => transaction.date.slice(0, 7)));
  const hasForecastHistory = priorMonthKeys(now).slice(0, 2).every((month) => monthKeys.has(month));
  const recommendation = recommendationFor(transactions, now);
  const unusualTotal = reviewFlags.reduce((sum, transaction) => sum + transaction.amount, 0);

  const stages = [
    {
      label: "Statement intake",
      detail: snapshot.statements.length ? `${snapshot.statements.length} saved` : "Upload to begin",
      complete: snapshot.statements.length > 0,
      href: "/app/statements",
    },
    {
      label: "Categorization",
      detail: pendingCount ? `${pendingCount} need review` : transactions.length ? "Ready" : "Awaiting data",
      complete: transactions.length > 0 && pendingCount === 0,
      href: "/app/transactions",
    },
    {
      label: "Spending signals",
      detail: reviewFlags.length ? `${reviewFlags.length} to review` : transactions.length >= 5 ? "No outliers" : "Building history",
      complete: transactions.length >= 5 && reviewFlags.length === 0,
      href: "/app/transactions",
    },
    {
      label: "Forecast",
      detail: hasForecastHistory ? "History available" : "Needs 2 months",
      complete: hasForecastHistory,
      href: "/app/forecast",
    },
  ];

  let title = "Your financial copilot is ready";
  let description = "Upload a statement to get guidance grounded in your own transactions.";
  let evidence = "No transactions are sent to an external language model for these insights.";
  let actionHref = "/app/statements";
  let actionLabel = "Upload a statement";

  if (transactions.length > 0 && pendingCount > 0) {
    title = `${pendingCount} transaction${pendingCount === 1 ? "" : "s"} need a category review`;
    description = "Confirm uncertain imported categories before relying on summaries or recommendations.";
    evidence = "Based on transaction review status and categorization confidence.";
    actionHref = "/app/transactions";
    actionLabel = "Review transactions";
  } else if (transactions.length > 0 && reviewFlags.length > 0) {
    title = `${reviewFlags.length} unusually large expense${reviewFlags.length === 1 ? "" : "s"} to review`;
    description = `These statistical outlier flags total ${formatCurrencyINR(unusualTotal)}. Check the merchant and statement before deciding whether anything is wrong.`;
    evidence = "Interquartile-range screening across recorded expenses; a review signal, not a fraud finding.";
    actionHref = "/app/transactions";
    actionLabel = "Review flagged amounts";
  } else if (transactions.length > 0 && recommendation) {
    title = recommendation.title;
    description = recommendation.explanation;
    evidence = recommendation.evidence;
    actionHref = recommendation.actionHref ?? "/app/budget-goals";
    actionLabel = recommendation.actionLabel ?? "Explore budget tools";
  } else if (transactions.length > 0) {
    title = "Building a reliable spending baseline";
    description = "Keep reviewing imported categories and add completed monthly history to unlock trend-based suggestions.";
    evidence = "Recommendations require three completed months; forecasts require at least two months.";
    actionHref = "/app/transactions";
    actionLabel = "Review transactions";
  }

  return (
    <section aria-label="Financial copilot" className="mx-auto w-full max-w-[var(--content-max)] px-[var(--space-page)] pt-3">
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/[0.07] via-surface/90 to-accent-primary/[0.06] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
              <SparklesIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300">FinSight Copilot</p>
                <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                  Rules + statistics · no LLM
                </span>
                {status === "offline" && (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">Offline · read-only</span>
                )}
              </div>
              <h2 className="mt-1 text-sm font-semibold text-ink">{title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-ink-muted">{description}</p>
              <p className="mt-1 text-[11px] leading-4 text-ink-muted">{evidence}</p>
              <Link to={actionHref} className="mt-2 inline-flex text-xs font-semibold text-accent-secondary underline underline-offset-2">
                {actionLabel} →
              </Link>
            </div>
          </div>

          <ol className="grid grid-cols-2 gap-2 xl:min-w-[27rem] xl:grid-cols-4" aria-label="Financial analysis pipeline">
            {stages.map((stage, index) => (
              <li key={stage.label}>
                <Link to={stage.href} className="block h-full rounded-xl border border-border/70 bg-surface/70 px-3 py-2 transition-colors hover:border-accent-primary/50">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    <span className={`grid size-4 place-items-center rounded-full text-[9px] ${stage.complete ? "bg-success/15 text-success" : "bg-surface-secondary text-ink-muted"}`}>
                      {stage.complete ? "✓" : index + 1}
                    </span>
                    {stage.label}
                  </span>
                  <span className="mt-1 block truncate text-xs font-medium text-ink">{stage.detail}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
