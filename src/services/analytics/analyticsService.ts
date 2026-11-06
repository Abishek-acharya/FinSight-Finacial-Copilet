import type { Account, Transaction } from "@/types/finance";
import type {
  AnalyticsCategory,
  AnalyticsData,
  AnalyticsFilters,
  AnalyticsInsight,
  AnalyticsMetric,
  AnalyticsMonth,
  RecurringCandidate,
} from "@/types/analytics";
import { CATEGORY_COLORS } from "@/utils/financeCalculations";

const MONTHS: Record<AnalyticsFilters["period"], number> = { "3m": 3, "6m": 6, "12m": 12 };
const DAY_MS = 86_400_000;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function isConsumption(transaction: Transaction): boolean {
  return transaction.category.toLowerCase() !== "transfers";
}

function groupByCategory(transactions: Transaction[], type: Transaction["type"]): AnalyticsCategory[] {
  const grouped = new Map<string, { amount: number; count: number }>();
  for (const transaction of transactions) {
    if (transaction.type !== type || (type === "expense" && !isConsumption(transaction))) continue;
    const current = grouped.get(transaction.category) ?? { amount: 0, count: 0 };
    grouped.set(transaction.category, {
      amount: current.amount + transaction.amount,
      count: current.count + 1,
    });
  }
  const total = [...grouped.values()].reduce((sum, item) => sum + item.amount, 0);
  return [...grouped.entries()]
    .map(([category, value]) => ({
      category,
      ...value,
      percentage: total > 0 ? (value.amount / total) * 100 : 0,
      color: CATEGORY_COLORS[category] ?? "#8b8b83",
    }))
    .sort((a, b) => b.amount - a.amount);
}

function getRecurring(transactions: Transaction[]): RecurringCandidate[] {
  const merchants = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense" || !isConsumption(transaction)) continue;
    const merchant = transaction.merchant.trim();
    if (!merchant) continue;
    const key = merchant.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key) continue;
    merchants.set(key, [...(merchants.get(key) ?? []), transaction]);
  }

  const results: RecurringCandidate[] = [];
  for (const [key, items] of merchants) {
    if (items.length < 3) continue;
    const sorted = [...items].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const intervals = sorted.slice(1).map((transaction, index) =>
      (Date.parse(transaction.date) - Date.parse(sorted[index].date)) / DAY_MS,
    );
    if (intervals.some((interval) => !Number.isFinite(interval) || interval <= 0)) continue;
    const averageInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    const variance = intervals.reduce((sum, value) => sum + (value - averageInterval) ** 2, 0) / intervals.length;
    const cv = averageInterval > 0 ? Math.sqrt(variance) / averageInterval : 1;
    if (cv > 0.35) continue;

    const frequency: RecurringCandidate["frequency"] | null =
      averageInterval >= 5 && averageInterval <= 10 ? "weekly"
        : averageInterval >= 25 && averageInterval <= 35 ? "monthly"
          : averageInterval >= 80 && averageInterval <= 100 ? "quarterly"
            : averageInterval >= 350 && averageInterval <= 380 ? "annually" : null;
    if (!frequency) continue;

    const amounts = sorted.map((transaction) => transaction.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    if (median <= 0 || amounts.filter((amount) => Math.abs(amount - median) / median <= 0.15).length < 3) continue;
    const lastDate = new Date(sorted[sorted.length - 1].date);
    const nextDate = new Date(lastDate);
    if (frequency === "weekly") nextDate.setDate(nextDate.getDate() + 7);
    if (frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1);
    if (frequency === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3);
    if (frequency === "annually") nextDate.setFullYear(nextDate.getFullYear() + 1);

    results.push({
      id: `recurring-${key}`,
      merchant: sorted[0].merchant,
      category: sorted[0].category,
      averageAmount: amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length,
      frequency,
      occurrences: sorted.length,
      lastDate: sorted[sorted.length - 1].date,
      nextExpectedDate: nextDate.toISOString(),
      confidence: Math.max(0, Math.min(1, 1 - cv)),
      status: cv <= 0.25 ? "likely" : "possible",
    });
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}

function makeInsights(
  months: AnalyticsMonth[],
  categories: AnalyticsCategory[],
  recurring: RecurringCandidate[],
): AnalyticsInsight[] {
  if (months.length < 2) return [];
  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const previousCategories = groupByCategory(previous.transactions, "expense");
  const insights: AnalyticsInsight[] = [];

  for (const category of categories) {
    const before = previousCategories.find((item) => item.category === category.category)?.amount ?? 0;
    if (before > 0 && category.amount > before * 1.25 && category.amount - before >= 1000) {
      insights.push({
        id: `category-increase-${category.category}`,
        tone: "warning",
        title: `${category.category} spending increased`,
        description: `${category.category} is up ${Math.round(((category.amount - before) / before) * 100)}% compared with ${previous.label}.`,
      });
    }
  }
  if (previous.savings > 0 && current.savings > previous.savings * 1.2) {
    insights.push({
      id: "savings-increased",
      tone: "positive",
      title: "Savings improved",
      description: `${current.label} net savings were higher than ${previous.label}.`,
    });
  }
  const leading = groupByCategory(current.transactions, "expense")[0];
  if (leading && leading.percentage >= 40) {
    insights.push({
      id: `category-concentration-${leading.category}`,
      tone: "info",
      title: `${leading.category} is your largest spending category`,
      description: `It represents ${leading.percentage.toFixed(0)}% of current-month expenses.`,
    });
  }
  const monthlyRecurring = recurring
    .filter((item) => item.frequency === "monthly")
    .reduce((sum, item) => sum + item.averageAmount, 0);
  if (monthlyRecurring > 0) {
    insights.push({
      id: "recurring-estimate",
      tone: "info",
      title: "Recurring payments detected",
      description: `${recurring.length} recurring pattern(s) found by comparing merchant, amount, and transaction intervals.`,
    });
  }
  return insights.slice(0, 5);
}

export function buildAnalytics(
  transactions: Transaction[],
  accounts: Account[],
  filters: AnalyticsFilters,
  now = new Date(),
): AnalyticsData {
  const selectedTransactions = transactions.filter((transaction) => {
    if (filters.accountId !== "all" && transaction.accountId !== filters.accountId) return false;
    if (filters.type !== "all" && transaction.type !== filters.type) return false;
    if (filters.category !== "all" && transaction.category !== filters.category) return false;
    if (filters.merchant && !transaction.merchant.toLocaleLowerCase().includes(filters.merchant.trim().toLocaleLowerCase())) return false;
    return true;
  });

  const count = MONTHS[filters.period];
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - count + 1, 1);
  const monthDates = Array.from({ length: count }, (_, index) =>
    new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1),
  );
  const rangeTransactions = selectedTransactions.filter((transaction) => {
    const timestamp = Date.parse(transaction.date);
    return Number.isFinite(timestamp) && timestamp >= firstMonth.getTime() &&
      timestamp < new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  });
  const months: AnalyticsMonth[] = monthDates.map((date) => {
    const key = monthKey(date);
    const monthTransactions = rangeTransactions.filter((transaction) => monthKey(new Date(transaction.date)) === key);
    const income = monthTransactions.filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = monthTransactions.filter((transaction) => transaction.type === "expense" && isConsumption(transaction))
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return {
      key,
      label: monthLabel(date),
      shortLabel: date.toLocaleDateString("en-IN", { month: "short" }),
      transactions: monthTransactions,
      income,
      expenses,
      savings: income - expenses,
    };
  });

  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const totalIncome = months.reduce((sum, month) => sum + month.income, 0);
  const totalExpenses = months.reduce((sum, month) => sum + month.expenses, 0);
  const netSavings = totalIncome - totalExpenses;
  const currentCategories = groupByCategory(current?.transactions ?? [], "expense");
  const incomeSources = groupByCategory(rangeTransactions, "income");
  const previousIncome = previous?.income ?? 0;
  const currentIncome = current?.income ?? 0;
  const previousExpenses = previous?.expenses ?? 0;
  const currentExpenses = current?.expenses ?? 0;
  const currentSavings = currentIncome - currentExpenses;
  const previousSavings = previousIncome - previousExpenses;

  const metric = (
    label: string,
    value: number,
    before: number,
    betterWhenHigher: boolean,
  ): AnalyticsMetric => ({
    label,
    current: value,
    previous: before,
    change: value - before,
    percentChange: before === 0 ? null : ((value - before) / Math.abs(before)) * 100,
    betterWhenHigher,
  });

  const metrics = [
    metric("Current month income", currentIncome, previousIncome, true),
    metric("Current month expenses", currentExpenses, previousExpenses, false),
    metric("Net savings", currentSavings, previousSavings, true),
    metric(
      "Savings rate",
      currentIncome > 0 ? (currentSavings / currentIncome) * 100 : 0,
      previousIncome > 0 ? (previousSavings / previousIncome) * 100 : 0,
      true,
    ),
    metric("Average monthly spend", totalExpenses / Math.max(1, months.length), previousExpenses, false),
  ];

  const recurring = getRecurring(rangeTransactions);
  const dailyMap = new Map<string, { amount: number; weekday: number }>();
  for (const transaction of rangeTransactions) {
    if (transaction.type !== "expense" || !isConsumption(transaction)) continue;
    const date = transaction.date.slice(0, 10);
    const parsedDate = new Date(`${date}T00:00:00`);
    const currentDay = dailyMap.get(date) ?? { amount: 0, weekday: parsedDate.getDay() };
    dailyMap.set(date, { amount: currentDay.amount + transaction.amount, weekday: currentDay.weekday });
  }
  const dailySpending = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, ...value }));
  const weekendTotal = dailySpending
    .filter((day) => day.weekday === 0 || day.weekday === 6)
    .reduce((sum, day) => sum + day.amount, 0);
  const merchantMap = new Map<string, { amount: number; count: number }>();
  for (const transaction of rangeTransactions) {
    if (transaction.type !== "expense" || !isConsumption(transaction)) continue;
    const value = merchantMap.get(transaction.merchant) ?? { amount: 0, count: 0 };
    merchantMap.set(transaction.merchant, {
      amount: value.amount + transaction.amount,
      count: value.count + 1,
    });
  }
  const topMerchants = [...merchantMap.entries()]
    .map(([merchant, value]) => ({ merchant, ...value }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
  const insights = makeInsights(months, currentCategories, recurring);
  const matchingAccounts = filters.accountId === "all"
    ? accounts
    : accounts.filter((account) => account.id === filters.accountId);

  return {
    months,
    categories: currentCategories,
    incomeSources,
    metrics,
    recurring,
    insights,
    totalTransactions: rangeTransactions.length,
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate: totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0,
    dailySpending,
    weekendShare: totalExpenses > 0 ? (weekendTotal / totalExpenses) * 100 : 0,
    topMerchants,
    currentBalance: matchingAccounts.length > 0
      ? matchingAccounts.reduce((sum, account) => sum + account.balance, 0)
      : null,
  };
}
