import type { Transaction } from "@/types/finance";
import type {
  BudgetPlan,
  BudgetUtilization,
  CategoryUtilization,
  MonthlyHistoryRow,
} from "@/types/budget";

export const WARN_THRESHOLD = 85;
export const OVER_THRESHOLD = 100;

export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function transactionsInMonth(transactions: Transaction[], monthKey: string): Transaction[] {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return [];
  const [year, month] = monthKey.split("-").map(Number);
  const from = new Date(year, month - 1, 1).getTime();
  const to = new Date(year, month, 1).getTime();
  return transactions.filter((transaction) => {
    const time = Date.parse(transaction.date);
    return Number.isFinite(time) && time >= from && time < to;
  });
}

export function computeUtilization(plan: BudgetPlan, transactions: Transaction[]): BudgetUtilization {
  const expenses = transactionsInMonth(transactions, plan.month)
    .filter((transaction) => transaction.type === "expense" && transaction.category.toLowerCase() !== "transfers");
  const categories: CategoryUtilization[] = plan.categoryAllocations.map((allocation) => {
    const matching = expenses.filter((transaction) => transaction.category === allocation.category);
    const spent = matching.reduce((sum, transaction) => sum + transaction.amount, 0);
    const utilization = allocation.amount > 0 ? spent / allocation.amount * 100 : 0;
    return {
      category: allocation.category,
      allocated: allocation.amount,
      spent,
      remaining: allocation.amount - spent,
      utilization,
      transactionCount: matching.length,
      status: utilization >= OVER_THRESHOLD ? "over" : utilization >= WARN_THRESHOLD ? "warning" : "normal",
    };
  });
  const totalSpent = categories.reduce((sum, category) => sum + category.spent, 0);
  return {
    planId: plan.id,
    planName: plan.name,
    month: plan.month,
    totalBudget: plan.totalAmount,
    totalSpent,
    remaining: plan.totalAmount - totalSpent,
    utilization: plan.totalAmount > 0 ? totalSpent / plan.totalAmount * 100 : 0,
    categories,
    overBudget: categories.filter((category) => category.status === "over"),
    nearLimit: categories.filter((category) => category.status === "warning"),
  };
}

export function getMonthlyHistory(plans: BudgetPlan[], transactions: Transaction[]): MonthlyHistoryRow[] {
  return [...plans].sort((a, b) => b.month.localeCompare(a.month)).map((plan) => {
    const utilization = computeUtilization(plan, transactions);
    const income = transactionsInMonth(transactions, plan.month)
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const [year, month] = plan.month.split("-").map(Number);
    return {
      monthKey: plan.month,
      monthLabel: new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      planned: plan.totalAmount,
      actual: utilization.totalSpent,
      remaining: utilization.remaining,
      overBudgetCategories: utilization.overBudget.length,
      savingsAchieved: income - utilization.totalSpent,
    };
  });
}

export function suggestAllocation(
  plan: BudgetPlan,
  transactions: Transaction[],
): Array<{ category: string; suggested: number }> {
  const [year, month] = plan.month.split("-").map(Number);
  return plan.categoryAllocations.map((allocation) => {
    let total = 0;
    for (let offset = 1; offset <= 3; offset += 1) {
      const historicalMonth = new Date(year, month - 1 - offset, 1);
      const key = currentMonthKey(historicalMonth);
      total += transactionsInMonth(transactions, key)
        .filter((transaction) => transaction.type === "expense" && transaction.category === allocation.category)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    }
    return { category: allocation.category, suggested: Math.round(total / 3) };
  });
}
