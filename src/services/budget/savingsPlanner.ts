import type { Transaction } from "@/types/finance";
import type {
  BudgetUtilization,
  SavingsOpportunity,
  SavingsRecommendation,
} from "@/types/budget";
import { currentMonthKey, transactionsInMonth } from "./budgetCalculations";
import { formatINR } from "@/utils/financeCalculations";

function priorMonthKey(offset: number, now = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return currentMonthKey(date);
}

function monthlyAverages(transactions: Transaction[], now = new Date()): Map<string, number> {
  const result = new Map<string, number>();
  const grouped = new Map<string, number>();
  for (let offset = 1; offset <= 3; offset += 1) {
    for (const transaction of transactionsInMonth(transactions, priorMonthKey(offset, now))) {
      if (transaction.type !== "expense" || transaction.category.toLowerCase() === "transfers") continue;
      grouped.set(transaction.category, (grouped.get(transaction.category) ?? 0) + transaction.amount);
    }
  }
  for (const [category, total] of grouped) result.set(category, total / 3);
  return result;
}

export function generateSavingsRecommendations(
  transactions: Transaction[],
  utilization: BudgetUtilization | null,
  recurring: Array<{ merchant: string; averageAmount: number; frequency: string }> = [],
  now = new Date(),
): SavingsRecommendation[] {
  const recommendations: SavingsRecommendation[] = [];
  const averages = monthlyAverages(transactions, now);
  let averageIncome = 0;
  for (let offset = 1; offset <= 3; offset += 1) {
    averageIncome += transactionsInMonth(transactions, priorMonthKey(offset, now))
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }
  averageIncome /= 3;
  const averageSpend = [...averages.values()].reduce((sum, value) => sum + value, 0);
  if (averageIncome > 0 && averageSpend > 0) {
    const monthlyNet = averageIncome - averageSpend;
    if (monthlyNet >= 0) {
      recommendations.push({
        id: "savings-rate",
        tone: "positive",
        title: `Your recent average savings are about ${Math.round(monthlyNet / averageIncome * 100)}% of income`,
        explanation: `Average monthly income was ${formatINR(Math.round(averageIncome))} and consumption spending was ${formatINR(Math.round(averageSpend))}.`,
        monthlyAmount: Math.round(monthlyNet),
        evidence: "Average of the three most recent completed calendar months.",
      });
    } else {
      recommendations.push({
        id: "spend-over-income",
        tone: "warning",
        title: `Recent average spending exceeded income by ${formatINR(Math.round(-monthlyNet))}`,
        explanation: "Review recent spending categories and transaction details before changing your plan.",
        monthlyAmount: Math.round(-monthlyNet),
        evidence: "Average of the three most recent completed calendar months.",
      });
    }
  }

  const discretionary = ["Food & Dining", "Shopping", "Entertainment", "Personal Care", "Subscriptions"];
  const largest = [...averages.entries()]
    .filter(([category, amount]) => discretionary.includes(category) && amount > 500)
    .sort((a, b) => b[1] - a[1])[0];
  if (largest) {
    const suggestion = Math.round(largest[1] * 0.15);
    recommendations.push({
      id: `reduce-${largest[0]}`,
      tone: "info",
      title: `A 15% reduction in ${largest[0]} could free about ${formatINR(suggestion)} monthly`,
      explanation: `The recent average for this category was ${formatINR(Math.round(largest[1]))} per month.`,
      monthlyAmount: suggestion,
      evidence: "Illustrative 15% scenario from the three most recent completed months, not a guaranteed saving.",
    });
  }
  if (utilization) {
    for (const category of utilization.overBudget.slice(0, 2)) {
      recommendations.push({
        id: `over-${category.category}`,
        tone: "warning",
        title: `${category.category} exceeded its allocation`,
        explanation: `${formatINR(category.spent)} spent against ${formatINR(category.allocated)} allocated this month.`,
        monthlyAmount: Math.round(category.spent - category.allocated),
        evidence: "Current selected-month budget and matching expense transactions.",
        actionLabel: "Review transactions",
        actionHref: `/app/transactions?category=${encodeURIComponent(category.category)}`,
      });
    }
  }
  const monthlyRecurring = recurring
    .filter((item) => item.frequency === "monthly")
    .reduce((sum, item) => sum + item.averageAmount, 0);
  if (monthlyRecurring > 500) {
    recommendations.push({
      id: "recurring-review",
      tone: "info",
      title: `Detected monthly repeat payments totaling about ${formatINR(Math.round(monthlyRecurring))}`,
      explanation: "Review each possible recurring payment; repeated transactions do not confirm a subscription.",
      monthlyAmount: Math.round(monthlyRecurring),
      evidence: "Rule-based merchant, amount, and interval matching.",
    });
  }
  return recommendations.slice(0, 5);
}

export function identifyOpportunities(
  transactions: Transaction[],
  utilization: BudgetUtilization | null,
  now = new Date(),
): SavingsOpportunity[] {
  const averages = monthlyAverages(transactions, now);
  const lastMonthKey = priorMonthKey(1, now);
  const lastMonthTotals = new Map<string, number>();
  for (const transaction of transactionsInMonth(transactions, lastMonthKey)) {
    if (transaction.type !== "expense" || transaction.category.toLowerCase() === "transfers") continue;
    lastMonthTotals.set(transaction.category, (lastMonthTotals.get(transaction.category) ?? 0) + transaction.amount);
  }
  const opportunities: SavingsOpportunity[] = [];
  for (const [category, spent] of lastMonthTotals) {
    const average = averages.get(category) ?? 0;
    if (average > 0 && spent > average * 1.3 && spent - average > 500) {
      opportunities.push({
        id: `spike-${category}`,
        title: `${category} was ${formatINR(Math.round(spent - average))} above its recent average`,
        evidence: `Last month ${formatINR(Math.round(spent))}; average of the three preceding completed months ${formatINR(Math.round(average))}.`,
        monthlyAmount: Math.round(spent - average),
        action: "Check whether this was a one-off expense before adjusting your budget.",
        category,
      });
    }
  }
  for (const category of utilization?.overBudget ?? []) {
    opportunities.push({
      id: `budget-over-${category.category}`,
      title: `${category.category} is over its current budget allocation`,
      evidence: `${formatINR(Math.round(category.spent))} spent against ${formatINR(category.allocated)} allocated.`,
      monthlyAmount: Math.round(category.spent - category.allocated),
      action: "Review this month's transactions and consider adjusting the plan.",
      category: category.category,
    });
  }
  return opportunities.slice(0, 6);
}
