import type { Account, Transaction } from "@/types/finance";
import type { BudgetPlan } from "@/types/budget";
import type {
  CategoryForecast,
  ForecastData,
  ForecastFilters,
  ForecastInsight,
  ForecastMonth,
  ForecastRecurringItem,
} from "@/types/forecast";
import { CATEGORY_COLORS } from "@/utils/financeCalculations";
import {
  applyForecastMethod,
  evaluateMethod,
  monthsForForecastPeriod,
  periodScale,
  predictionRange,
} from "./forecastingCalculations";

const DAY_MS = 86_400_000;
const IRREGULAR_INCOME_CATEGORIES = new Set(["Freelance", "Business Income", "Other Income"]);
const PASS_THROUGH_CATEGORIES = new Set(["Cashback", "Refund"]);

function keyFor(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function labelFor(date: Date): string {
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function buildHistory(
  transactions: Transaction[],
  historyCount: number,
  now: Date,
): ForecastMonth[] {
  return Array.from({ length: historyCount }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - historyCount + index, 1);
    const key = keyFor(date);
    const matching = transactions.filter((transaction) => transaction.date.slice(0, 7) === key);
    const income = matching.filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = matching.filter((transaction) =>
      transaction.type === "expense" && transaction.category.toLowerCase() !== "transfers",
    ).reduce((sum, transaction) => sum + transaction.amount, 0);
    return { key, label: labelFor(date), income, expenses, net: income - expenses, isForecast: false };
  });
}

function forecastCategories(
  transactions: Transaction[],
  history: ForecastMonth[],
  method: ForecastFilters["method"],
): CategoryForecast[] {
  const categorySet = new Set(transactions
    .filter((transaction) => transaction.type === "expense" && transaction.category.toLowerCase() !== "transfers")
    .map((transaction) => transaction.category));
  return [...categorySet].map((category) => {
    const values = history.map((month) => transactions
      .filter((transaction) => transaction.type === "expense" && transaction.category === category && transaction.date.slice(0, 7) === month.key)
      .reduce((sum, transaction) => sum + transaction.amount, 0));
    const activeMonths = values.filter((value) => value > 0).length;
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    if (activeMonths < 2 || average < 50) {
      return {
        category,
        historicalAverage: average,
        forecast: 0,
        available: false,
        reason: activeMonths < 2 ? `Recorded in only ${activeMonths} complete month(s); at least two are required.` : "Historical average is too small to estimate reliably.",
      };
    }
    return { category, historicalAverage: average, forecast: applyForecastMethod(values, method), available: true };
  }).sort((a, b) => Number(b.available) - Number(a.available) || b.forecast - a.forecast)
    .map((item) => ({ ...item, color: CATEGORY_COLORS[item.category] ?? "#8b8b83" })) as CategoryForecast[];
}

function findRecurring(transactions: Transaction[], now: Date): ForecastRecurringItem[] {
  const grouped = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense" || transaction.category.toLowerCase() === "transfers" || !transaction.merchant.trim()) continue;
    const key = transaction.merchant.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    grouped.set(key, [...(grouped.get(key) ?? []), transaction]);
  }
  const results: ForecastRecurringItem[] = [];
  for (const [key, items] of grouped) {
    if (!key || items.length < 3) continue;
    const sorted = [...items].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const intervals = sorted.slice(1).map((transaction, index) =>
      (Date.parse(transaction.date) - Date.parse(sorted[index].date)) / DAY_MS,
    );
    if (intervals.some((interval) => !Number.isFinite(interval) || interval <= 0)) continue;
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + (interval - averageInterval) ** 2, 0) / intervals.length;
    const cv = averageInterval > 0 ? Math.sqrt(variance) / averageInterval : 1;
    const frequency: ForecastRecurringItem["frequency"] | null =
      averageInterval >= 5 && averageInterval <= 10 ? "weekly"
        : averageInterval >= 25 && averageInterval <= 35 ? "monthly"
          : averageInterval >= 80 && averageInterval <= 100 ? "quarterly"
            : averageInterval >= 350 && averageInterval <= 380 ? "annually" : null;
    if (!frequency || cv > 0.35) continue;
    const amounts = sorted.map((item) => item.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    if (median <= 0 || amounts.filter((amount) => Math.abs(amount - median) / median <= 0.15).length < 3) continue;
    const lastDate = new Date(sorted[sorted.length - 1].date);
    const next = new Date(lastDate);
    if (frequency === "weekly") next.setDate(next.getDate() + 7);
    else if (frequency === "monthly") next.setMonth(next.getMonth() + 1);
    else if (frequency === "quarterly") next.setMonth(next.getMonth() + 3);
    else next.setFullYear(next.getFullYear() + 1);
    if (next.getTime() < now.getTime() - 7 * DAY_MS) continue;
    results.push({
      id: `recurring-${key}`,
      merchant: sorted[0].merchant,
      category: sorted[0].category,
      amount: amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length,
      frequency,
      nextExpectedDate: next.toISOString(),
      confidence: Math.max(0, Math.min(1, 1 - cv)),
      occurrences: sorted.length,
    });
  }
  return results.sort((a, b) => Date.parse(a.nextExpectedDate) - Date.parse(b.nextExpectedDate));
}

export function buildForecast(
  allTransactions: Transaction[],
  accounts: Account[],
  plans: BudgetPlan[],
  filters: ForecastFilters,
  now = new Date(),
): ForecastData {
  const transactions = allTransactions.filter((transaction) =>
    filters.accountId === "all" || transaction.accountId === filters.accountId,
  );
  const historyCount = Number(filters.historyMonths.slice(0, -1));
  const history = buildHistory(transactions, historyCount, now);
  const activeExpenseMonths = history.filter((month) => month.expenses > 0).length;
  const forecastIncomeValues = history.map((month) => transactions
    .filter((transaction) => transaction.type === "income" &&
      !PASS_THROUGH_CATEGORIES.has(transaction.category) &&
      transaction.date.slice(0, 7) === month.key)
    .reduce((sum, transaction) => sum + transaction.amount, 0));
  const activeIncomeMonths = forecastIncomeValues.filter((income) => income > 0).length;
  const sufficient = activeExpenseMonths >= 3;
  const reason = sufficient
    ? undefined
    : `At least three complete months with expense activity are required; found ${activeExpenseMonths}.`;
  const expenseValues = history.map((month) => month.expenses);
  const incomeValues = forecastIncomeValues;
  const method = filters.method;
  const monthlyExpenses = sufficient ? applyForecastMethod(expenseValues, method) : null;
  const monthlyIncome = activeIncomeMonths >= 2 ? applyForecastMethod(incomeValues, method) : null;
  const scale = periodScale(filters.period);
  const expenseForecast = monthlyExpenses === null ? null : predictionRange(monthlyExpenses * scale, expenseValues, scale);
  const incomeForecast = monthlyIncome === null ? null : predictionRange(monthlyIncome * scale, incomeValues, scale);
  const netValues = history.map((month) => month.net);
  const netForecast = monthlyExpenses === null || monthlyIncome === null
    ? null
    : predictionRange((monthlyIncome - monthlyExpenses) * scale, netValues, scale, false);

  const regularIncomeMonthly = history.reduce((sum, month) => sum + transactions
    .filter((transaction) => transaction.type === "income" && transaction.category === "Salary" &&
      transaction.date.slice(0, 7) === month.key)
    .reduce((monthSum, transaction) => monthSum + transaction.amount, 0), 0) / historyCount;
  const irregularIncomeMonthly = history.reduce((sum, month) => sum + transactions
    .filter((transaction) => transaction.type === "income" && IRREGULAR_INCOME_CATEGORIES.has(transaction.category) &&
      transaction.date.slice(0, 7) === month.key)
    .reduce((monthSum, transaction) => monthSum + transaction.amount, 0), 0) / historyCount;
  const otherIncomeMonthly = history.reduce((sum, month) => sum + transactions
    .filter((transaction) => transaction.type === "income" && transaction.category !== "Salary" &&
      !IRREGULAR_INCOME_CATEGORIES.has(transaction.category) && !PASS_THROUGH_CATEGORIES.has(transaction.category) &&
      transaction.date.slice(0, 7) === month.key)
    .reduce((monthSum, transaction) => monthSum + transaction.amount, 0), 0) / historyCount;

  const categories = forecastCategories(transactions, history, method);
  const nextMonthKey = keyFor(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const thisMonthKey = keyFor(now);
  const budgetPlan = plans.find((plan) => plan.month === nextMonthKey) ?? plans.find((plan) => plan.month === thisMonthKey) ?? null;
  const riskCategories = (budgetPlan?.categoryAllocations ?? []).map((allocation) => {
    const categoryForecast = categories.find((item) => item.category === allocation.category && item.available);
    const forecast = categoryForecast?.forecast ?? 0;
    const utilization = allocation.amount > 0 ? forecast / allocation.amount * 100 : 0;
    const risk = !categoryForecast ? "insufficient" as const : utilization >= 100 ? "overspending" as const : utilization >= 85 ? "approaching" as const : "within" as const;
    return { category: allocation.category, allocated: allocation.amount, forecast, utilization, risk };
  });
  const validRiskCategories = riskCategories.filter((item) => item.risk !== "insufficient");
  const forecastBudgetSpend = validRiskCategories.reduce((sum, item) => sum + item.forecast, 0);
  const budgetTotal = budgetPlan?.totalAmount ?? null;
  const over = Math.max(0, forecastBudgetSpend - (budgetTotal ?? 0));
  const riskLevel = !budgetPlan || !validRiskCategories.length ? "insufficient" as const
    : over > 0 ? "overspending" as const
      : budgetTotal && forecastBudgetSpend / budgetTotal >= 0.85 ? "approaching" as const : "within" as const;

  const recurring = findRecurring(transactions, now);
  const evaluation = (["wma", "sma", "ema"] as const).flatMap((candidate) => {
    const result = evaluateMethod(expenseValues, candidate);
    return result ? [{ method: candidate, ...result }] : [];
  });
  const monthCount = monthsForForecastPeriod(filters.period);
  const forecastSeries = sufficient && monthlyExpenses !== null
    ? Array.from({ length: monthCount }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() + index + 1, 1);
      const forecastIncome = monthlyIncome ?? 0;
      return {
        key: keyFor(date),
        label: labelFor(date),
        income: forecastIncome,
        expenses: monthlyExpenses,
        net: forecastIncome - monthlyExpenses,
        isForecast: true,
      };
    })
    : [];
  const selectedAccounts = filters.accountId === "all"
    ? accounts
    : accounts.filter((account) => account.id === filters.accountId);
  const openingBalance = selectedAccounts.length > 0 && selectedAccounts.every((account) => account.balance !== 0)
    ? selectedAccounts.reduce((sum, account) => sum + account.balance, 0)
    : null;
  const closingBalance = openingBalance !== null && forecastSeries.length
    ? openingBalance + forecastSeries.reduce((sum, month) => sum + month.net, 0) * (filters.period === "7d" ? periodScale(filters.period) : 1)
    : null;

  const insights: ForecastInsight[] = [];
  const rising = categories.filter((category) => category.available && category.forecast > category.historicalAverage * 1.2)
    .sort((a, b) => b.forecast / b.historicalAverage - a.forecast / a.historicalAverage)[0];
  if (rising) insights.push({
    id: `category-rise-${rising.category}`,
    tone: "warning",
    title: `${rising.category} estimate is above its historical average`,
    explanation: `The selected method estimates ${Math.round((rising.forecast / rising.historicalAverage - 1) * 100)}% more than the history-window average.`,
  });
  if (riskLevel === "overspending" && budgetTotal !== null) insights.push({
    id: "budget-risk",
    tone: "warning",
    title: "Estimated spending exceeds the selected budget",
    explanation: `Available category estimates total ${forecastBudgetSpend.toLocaleString("en-IN")} against a budget of ${budgetTotal.toLocaleString("en-IN")}.`,
  });
  if (irregularIncomeMonthly > regularIncomeMonthly * 0.3 && irregularIncomeMonthly > 0) insights.push({
    id: "income-variability",
    tone: "info",
    title: "Irregular income is a meaningful part of the estimate",
    explanation: "Freelance and business income are averaged from history and may vary significantly.",
  });
  if (recurring.length) insights.push({
    id: "recurring-detected",
    tone: "info",
    title: "Possible recurring payments detected",
    explanation: "These are transaction patterns, not confirmed subscriptions or guaranteed future charges.",
  });

  return {
    sufficient,
    reason: reason ?? (monthlyIncome === null ? "Income estimate unavailable: income activity was found in fewer than two complete months." : undefined),
    method,
    historyMonthCount: historyCount,
    dataMonthsUsed: Math.min(activeExpenseMonths, activeIncomeMonths),
    period: filters.period,
    expenseForecast,
    incomeForecast,
    netForecast,
    expenseMonthlyEstimate: monthlyExpenses,
    incomeMonthlyEstimate: monthlyIncome,
    regularIncomeMonthly,
    irregularIncomeMonthly,
    otherIncomeMonthly,
    categories,
    recurring,
    budgetRisk: {
      level: riskLevel,
      budget: budgetTotal,
      forecast: budgetPlan ? forecastBudgetSpend : null,
      over,
      label: budgetPlan ? `${budgetPlan.name} · ${budgetPlan.month}` : "No budget plan for the forecast period",
      categories: riskCategories,
    },
    evaluation,
    insights,
    history,
    forecastSeries,
    openingBalance,
    closingBalance,
  };
}

export function forecastCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#8b8b83";
}
