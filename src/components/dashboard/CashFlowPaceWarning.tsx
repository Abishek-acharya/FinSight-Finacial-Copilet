import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { formatCurrencyINR } from "@/utils/financeCalculations";

export function CashFlowPaceWarning({ income, expenses }: { income: number; expenses: number }) {
  const today = new Date();
  const elapsedDays = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dailySpend = expenses / elapsedDays;
  const projectedExpenses = dailySpend * daysInMonth;

  if (income <= 0 || expenses <= 0 || projectedExpenses <= income) return null;

  const exceedsBy = projectedExpenses - income;
  const crossingDay = Math.min(daysInMonth, Math.max(1, Math.ceil(income / dailySpend)));
  const alreadyExceeded = expenses >= income;
  const estimatedDate = alreadyExceeded
    ? today
    : new Date(today.getFullYear(), today.getMonth(), crossingDay);
  const dateLabel = estimatedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
  });

  return (
    <section
      role="status"
      aria-label="Cash-flow pace warning"
      className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-ink sm:p-5"
    >
      <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold">
            {alreadyExceeded
              ? "Recorded expenses have reached this month's recorded income"
              : `Spending pace may exceed recorded income around ${dateLabel}`}
          </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          This month’s expense pace projects about {formatCurrencyINR(projectedExpenses)} against {formatCurrencyINR(income)} in recorded income—an estimated gap of {formatCurrencyINR(exceedsBy)}.
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
          A simple month-to-date estimate from saved transactions, not a bank-balance forecast. Future income and bills may change the result.
        </p>
      </div>
    </section>
  );
}
