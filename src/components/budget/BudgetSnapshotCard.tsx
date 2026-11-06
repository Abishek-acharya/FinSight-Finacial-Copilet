import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { computeUtilization, currentMonthKey } from "@/services/budget/budgetCalculations";
import { goalProgress } from "@/services/budget/savingsCalculations";
import { formatINR } from "@/utils/financeCalculations";

export function BudgetSnapshotCard() {
  const snapshot = useFinanceStore();
  const month = currentMonthKey();
  const plan = snapshot.budgetPlans.find((item) => item.month === month);
  const utilization = plan ? computeUtilization(plan, snapshot.transactions) : null;
  const goals = snapshot.savingsGoals
    .filter((goal) => goal.status === "active")
    .slice(0, 3)
    .map((goal) => goalProgress(goal));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Budget & goals</CardTitle>
        <Link to="/app/budget-goals" className="text-xs font-semibold text-accent-secondary hover:underline">Manage →</Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {utilization ? (
          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-ink-muted">This month</span>
              <Badge variant={utilization.utilization >= 100 ? "error" : utilization.utilization >= 85 ? "warning" : "success"}>
                {utilization.utilization.toFixed(0)}% used
              </Badge>
            </div>
            <Progress value={utilization.utilization} className="mt-2" />
            <p className="mt-1 text-xs text-ink-muted">
              {formatINR(utilization.totalSpent)} spent of {formatINR(utilization.totalBudget)} ·{" "}
              {formatINR(utilization.remaining)} remaining
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No budget plan for this month.</p>
        )}
        {goals.length > 0 && (
          <ul className="space-y-3 border-t border-border pt-3">
            {goals.map(({ goal, percent }) => (
              <li key={goal.id}>
                <div className="flex justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{goal.name}</span>
                  <span className="tabular-nums text-ink-muted">{percent.toFixed(0)}%</span>
                </div>
                <Progress value={percent} className="mt-1.5" />
              </li>
            ))}
          </ul>
        )}
        {!utilization && goals.length === 0 && (
          <Link to="/app/budget-goals" className="inline-block text-xs font-semibold text-accent-secondary hover:underline">
            Create a budget or savings goal
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
