import { demoAccounts } from "@/data/demoAccounts";
import { demoRecurringPayments } from "@/data/demoRecurringPayments";
import { demoTransactions } from "@/data/demoTransactions";
import {
  buildCashFlow,
  buildInsightCards,
  calculateHealthScore,
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
import type { DashboardData, DashboardRange, Transaction } from "@/types/finance";

export function getDashboardData(
  range: DashboardRange = "6M",
  transactions: Transaction[] = demoTransactions,
): DashboardData {
  const monthlyTrend = getMonthlyTrend(transactions, range);
  const currentMonthTransactions = getCurrentMonthTransactions(transactions);
  const categoryBreakdown = getCategoryBreakdown(currentMonthTransactions);
  const recentTransactions = getRecentTransactions(transactions, 7);
  const budgetOverview = getBudgetOverview(currentMonthTransactions);
  const income = getIncomeAmount(currentMonthTransactions);
  const expenses = getExpenseAmount(currentMonthTransactions);
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  const healthScore = calculateHealthScore(income, expenses, budgetOverview);
  const cashFlow = buildCashFlow(currentMonthTransactions);

  return {
    accounts: demoAccounts,
    totalBalance: demoAccounts.reduce((sum, account) => sum + account.balance, 0),
    income,
    expenses,
    savings,
    savingsRate,
    healthScore,
    monthlyTrend,
    categoryBreakdown,
    recentTransactions,
    budgetOverview,
    recurringPayments: getRecurringPaymentsForMonth(currentMonthTransactions, demoRecurringPayments),
    insightCards: buildInsightCards(monthlyTrend, categoryBreakdown),
    dailySpendTrend: getDailySpendTrend(currentMonthTransactions, 7),
    cashFlow,
  };
}

export function formatMetricValue(value: number): string {
  return formatCurrencyINR(value);
}
