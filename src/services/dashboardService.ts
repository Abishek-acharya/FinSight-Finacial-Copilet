import {
  buildCashFlow,
  buildInsightCards,
  calculateHealthScoreBreakdown,
  CATEGORY_COLORS,
  formatCurrencyINR,
  getBudgetOverview,
  getCategoryBreakdown,
  getCurrentMonthTransactions,
  getDailySpendTrend,
  getExpenseAmount,
  getIncomeAmount,
  getMonthlyTrend,
  getRecentTransactions,
  getRecurringPaymentsForMonth,
} from "@/utils/financeCalculations";
import type { BudgetPlan } from "@/types/budget";
import type { Account, DashboardData, DashboardRange, Transaction } from "@/types/finance";

export function getDashboardData(
  range: DashboardRange,
  transactions: Transaction[],
  accounts: Account[],
  budgetPlans: BudgetPlan[],
): DashboardData {
  const monthlyTrend = getMonthlyTrend(transactions, range);
  const currentMonthTransactions = getCurrentMonthTransactions(transactions);
  const categoryBreakdown = getCategoryBreakdown(currentMonthTransactions);
  const recentTransactions = getRecentTransactions(transactions, 7);
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentPlan = budgetPlans.find((plan) => plan.month === monthKey);
  const budgetOverview = currentPlan
    ? getBudgetOverview(
      currentMonthTransactions,
      currentPlan.categoryAllocations.map((allocation) => ({
        category: allocation.category,
        limit: allocation.amount,
        spent: 0,
        color: CATEGORY_COLORS[allocation.category] ?? "#94a3b8",
      })),
    )
    : [];
  const income = getIncomeAmount(currentMonthTransactions);
  const expenses = getExpenseAmount(currentMonthTransactions);
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  const historicalMonthlyExpenses = Array.from({ length: 3 }, (_, index) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - 3 + index, 1);
    const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    const monthTransactions = transactions.filter((transaction) =>
      transaction.date.slice(0, 7) === key &&
      transaction.type === "expense" &&
      transaction.category.toLowerCase() !== "transfers",
    );
    return monthTransactions.length
      ? monthTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
      : null;
  }).filter((amount): amount is number => amount !== null);
  const healthScoreDetails = calculateHealthScoreBreakdown(
    income,
    expenses,
    budgetOverview,
    historicalMonthlyExpenses,
  );
  const healthScore = healthScoreDetails.score;
  const cashFlow = buildCashFlow(currentMonthTransactions);

  return {
    accounts,
    totalBalance: accounts.length === 0
      ? 0
      : accounts.every((account) => account.balance !== null)
        ? accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0)
        : null,
    income,
    expenses,
    savings,
    savingsRate,
    healthScore,
    healthScoreDetails,
    monthlyTrend,
    categoryBreakdown,
    recentTransactions,
    budgetOverview,
    recurringPayments: getRecurringPaymentsForMonth(currentMonthTransactions, []),
    insightCards: buildInsightCards(monthlyTrend, categoryBreakdown),
    dailySpendTrend: getDailySpendTrend(currentMonthTransactions, 7),
    cashFlow,
  };
}

export function formatMetricValue(value: number): string {
  return formatCurrencyINR(value);
}
