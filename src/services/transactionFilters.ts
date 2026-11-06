import type { Transaction } from "@/types/finance";
import { formatINR } from "@/utils/financeCalculations";
import type { Account } from "@/types/finance";

export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "merchant-asc";
export type DatePreset = "all" | "this-month" | "last-month" | "last-3-months" | "custom";
export type ReviewFilter = "all" | "pending" | "reviewed" | "flagged";

export interface TransactionFiltersState {
  search: string;
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  type: "all" | "income" | "expense";
  category: string;
  accountId: string;
  minAmount: string;
  maxAmount: string;
  review: ReviewFilter;
}

export const DEFAULT_FILTERS: TransactionFiltersState = {
  search: "",
  datePreset: "all",
  dateFrom: "",
  dateTo: "",
  type: "all",
  category: "all",
  accountId: "all",
  minAmount: "",
  maxAmount: "",
  review: "all",
};

function dayStart(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function presetRange(preset: DatePreset, now = new Date()): [number, number] | null {
  if (preset === "all" || preset === "custom") return null;
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (preset === "last-month") {
    start.setMonth(start.getMonth() - 1);
    return [start.getTime(), new Date(now.getFullYear(), now.getMonth(), 1).getTime() - 1];
  }
  if (preset === "last-3-months") {
    start.setMonth(start.getMonth() - 2);
  }
  return [start.getTime(), now.getTime()];
}

export function applyFilters(
  transactions: Transaction[],
  filters: TransactionFiltersState,
  accounts: Account[] = [],
): Transaction[] {
  const search = filters.search.trim().toLocaleLowerCase();
  const range = presetRange(filters.datePreset);
  const customStart = filters.datePreset === "custom" && filters.dateFrom ? dayStart(filters.dateFrom) : null;
  const customEnd = filters.datePreset === "custom" && filters.dateTo ? dayStart(filters.dateTo) + 86_399_999 : null;
  const minimum = filters.minAmount.trim() ? Number(filters.minAmount) : null;
  const maximum = filters.maxAmount.trim() ? Number(filters.maxAmount) : null;

  return transactions.filter((transaction) => {
    if (filters.type !== "all" && transaction.type !== filters.type) return false;
    if (filters.category !== "all" && transaction.category !== filters.category) return false;
    if (filters.accountId !== "all" && transaction.accountId !== filters.accountId) return false;
    if (filters.review !== "all") {
      const status = transaction.reviewStatus ?? ((transaction.confidence ?? 1) < 0.6 ? "pending" : "reviewed");
      if (status !== filters.review) return false;
    }

    const time = new Date(transaction.date).getTime();
    if (!Number.isFinite(time)) return false;
    if (range && (time < range[0] || time > range[1])) return false;
    if (customStart !== null && time < customStart) return false;
    if (customEnd !== null && time > customEnd) return false;
    if (minimum !== null && Number.isFinite(minimum) && transaction.amount < minimum) return false;
    if (maximum !== null && Number.isFinite(maximum) && transaction.amount > maximum) return false;

    if (search) {
      const account = accounts.find((item) => item.id === transaction.accountId);
      const content = [
        transaction.merchant,
        transaction.description,
        transaction.category,
        transaction.id,
        transaction.accountId,
        account?.name,
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      if (!content.includes(search)) return false;
    }
    return true;
  });
}

export function applySort(transactions: Transaction[], sort: SortKey): Transaction[] {
  return [...transactions].sort((a, b) => {
    switch (sort) {
      case "date-asc":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "amount-desc":
        return b.amount - a.amount;
      case "amount-asc":
        return a.amount - b.amount;
      case "merchant-asc":
        return a.merchant.localeCompare(b.merchant);
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });
}

export interface TransactionSummary {
  count: number;
  income: number;
  expenses: number;
  net: number;
  averageExpense: number;
  largestExpense: Transaction | null;
  topCategory: { category: string; amount: number } | null;
  reviewCount: number;
}

export function summarize(transactions: Transaction[]): TransactionSummary {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenseTransactions = transactions.filter((transaction) => transaction.type === "expense");
  const expenses = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const categoryTotals = new Map<string, number>();
  for (const transaction of expenseTransactions) {
    categoryTotals.set(
      transaction.category,
      (categoryTotals.get(transaction.category) ?? 0) + transaction.amount,
    );
  }
  const topCategory = [...categoryTotals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)[0] ?? null;

  return {
    count: transactions.length,
    income,
    expenses,
    net: income - expenses,
    averageExpense: expenseTransactions.length ? expenses / expenseTransactions.length : 0,
    largestExpense: expenseTransactions.reduce<Transaction | null>(
      (largest, transaction) => !largest || transaction.amount > largest.amount ? transaction : largest,
      null,
    ),
    topCategory,
    reviewCount: transactions.filter((transaction) => {
      const status = transaction.reviewStatus ?? ((transaction.confidence ?? 1) < 0.6 ? "pending" : "reviewed");
      return status === "pending" || status === "flagged";
    }).length,
  };
}

export interface TransactionInsight {
  id: string;
  label: string;
  value: string;
  hint: string;
}

export function buildInsights(transactions: Transaction[]): TransactionInsight[] {
  if (!transactions.length) return [];
  const summary = summarize(transactions);
  const insights: TransactionInsight[] = [];
  if (summary.largestExpense) {
    insights.push({
      id: "largest",
      label: "Largest expense",
      value: formatINR(summary.largestExpense.amount),
      hint: summary.largestExpense.merchant,
    });
  }
  if (summary.topCategory) {
    insights.push({
      id: "category",
      label: "Top spending category",
      value: summary.topCategory.category,
      hint: `${formatINR(summary.topCategory.amount)} in filtered results`,
    });
  }
  const merchantCounts = new Map<string, number>();
  expenseTransactionsForInsight(transactions).forEach((transaction) => {
    merchantCounts.set(transaction.merchant, (merchantCounts.get(transaction.merchant) ?? 0) + 1);
  });
  const topMerchant = [...merchantCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topMerchant) {
    insights.push({
      id: "merchant",
      label: "Most frequent merchant",
      value: topMerchant[0],
      hint: `${topMerchant[1]} transaction(s)`,
    });
  }
  if (summary.reviewCount) {
    insights.push({
      id: "review",
      label: "Needs review",
      value: `${summary.reviewCount} transaction(s)`,
      hint: "Low-confidence or flagged categorization",
    });
  }
  return insights.slice(0, 4);
}

function expenseTransactionsForInsight(transactions: Transaction[]) {
  return transactions.filter((transaction) => transaction.type === "expense");
}
