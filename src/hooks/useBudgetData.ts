import { useMemo } from "react";
import { computeUtilization, currentMonthKey, getMonthlyHistory } from "@/services/budget/budgetCalculations";
import { evaluateBudgetAlerts } from "@/services/budget/budgetAlertService";
import { goalProgress } from "@/services/budget/savingsCalculations";
import { generateSavingsRecommendations, identifyOpportunities } from "@/services/budget/savingsPlanner";
import { useFinanceStore } from "@/hooks/useFinanceStore";

export function useBudgetData(selectedMonth: string) {
  const snapshot = useFinanceStore();
  return useMemo(() => {
    const plan = snapshot.budgetPlans.find((item) => item.month === selectedMonth) ?? null;
    const utilization = plan ? computeUtilization(plan, snapshot.transactions) : null;
    const alerts = plan
      ? evaluateBudgetAlerts(plan, snapshot.transactions)
        .filter((alert) => !snapshot.dismissedAlerts.includes(alert.id))
      : [];
    const goalProgressList = snapshot.savingsGoals.map((goal) => goalProgress(goal));
    const history = getMonthlyHistory(snapshot.budgetPlans, snapshot.transactions);
    const totalGoalTarget = snapshot.savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalGoalSaved = snapshot.savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const recurringGroups = snapshot.transactions
      .filter((transaction) => transaction.type === "expense" && transaction.category.toLowerCase() !== "transfers")
      .reduce((groups, transaction) => {
        const key = transaction.merchant.trim().toLocaleLowerCase();
        if (key) groups.set(key, [...(groups.get(key) ?? []), transaction]);
        return groups;
      }, new Map<string, typeof snapshot.transactions>());
    const recurringCandidates = [...recurringGroups.values()].flatMap((items) => {
      if (items.length < 3) return [];
      const sorted = [...items].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
      const amounts = sorted.map((item) => item.amount).sort((a, b) => a - b);
      const median = amounts[Math.floor(amounts.length / 2)];
      if (median <= 0 || amounts.filter((amount) => Math.abs(amount - median) / median <= 0.15).length < 3) return [];
      const intervals = sorted.slice(1).map((item, index) => (Date.parse(item.date) - Date.parse(sorted[index].date)) / 86_400_000);
      const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
      const variance = intervals.reduce((sum, value) => sum + (value - averageInterval) ** 2, 0) / intervals.length;
      const cv = averageInterval > 0 ? Math.sqrt(variance) / averageInterval : 1;
      if (averageInterval < 25 || averageInterval > 35 || cv > 0.35) return [];
      return [{
        merchant: sorted[0].merchant,
        averageAmount: sorted.reduce((sum, item) => sum + item.amount, 0) / sorted.length,
        frequency: "monthly",
      }];
    });
    return {
      plan,
      utilization,
      alerts,
      goals: snapshot.savingsGoals,
      goalProgress: goalProgressList,
      history,
      recommendations: generateSavingsRecommendations(snapshot.transactions, utilization, recurringCandidates),
      opportunities: identifyOpportunities(snapshot.transactions, utilization),
      summary: {
        totalBudget: plan?.totalAmount ?? 0,
        totalSpentThisMonth: utilization?.totalSpent ?? 0,
        totalRemaining: utilization?.remaining ?? 0,
        utilizationPct: utilization?.utilization ?? 0,
        totalGoals: snapshot.savingsGoals.length,
        totalGoalTarget,
        totalGoalSaved,
        goalProgressPct: totalGoalTarget > 0 ? totalGoalSaved / totalGoalTarget * 100 : 0,
      },
      allTransactions: snapshot.transactions,
      currentMonth: currentMonthKey(),
    };
  }, [
    selectedMonth,
    snapshot.budgetPlans,
    snapshot.savingsGoals,
    snapshot.transactions,
    snapshot.dismissedAlerts,
  ]);
}
