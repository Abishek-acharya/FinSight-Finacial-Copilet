import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { formatCurrency } from "@/lib/utils";

export interface BudgetCardProps {
  category: string;
  spent: number;
  limit: number;
  currency?: string;
  className?: string;
}

export function BudgetCard({ category, spent, limit, currency = "USD", className }: BudgetCardProps) {
  const percentage = limit > 0 ? Math.min(100, Math.max(0, (spent / limit) * 100)) : 0;
  const overBudget = spent > limit;
  const remaining = Math.max(0, limit - spent);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{category}</CardTitle>
          <span className={`text-xs font-semibold ${overBudget ? "text-error" : "text-ink-muted"}`}>
            {overBudget ? "Over budget" : `${Math.round(percentage)}% used`}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Progress
          value={percentage}
          label={`${formatCurrency(spent, currency)} of ${formatCurrency(limit, currency)}`}
          indicatorClassName={overBudget ? "bg-error" : undefined}
        />
        <p className="mt-3 text-xs text-ink-muted" aria-live="polite">
          {overBudget
            ? `${formatCurrency(spent - limit, currency)} over your limit`
            : `${formatCurrency(remaining, currency)} remaining`}
        </p>
      </CardContent>
    </Card>
  );
}