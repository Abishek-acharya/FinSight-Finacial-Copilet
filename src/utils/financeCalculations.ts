import type { Budget, CategoryBreakdownPoint, DashboardData, DashboardRange, MonthlyTrendPoint, RecurringPayment, Transaction } from "@/types/finance";

export const CATEGORY_COLORS: Record<string, string> = {
  Salary: "#1c5233",
  Freelance: "#2d7a4d",
  "Business Income": "#1c5233",
  Interest: "#0d9488",
  Cashback: "#14b8a6",
  Refund: "#10b981",
  "Other Income": "#34d399",
  "Food & Dining": "#b8860b",
  Groceries: "#84cc16",
  Shopping: "#b95f3d",
  Transportation: "#38bdf8",
  Fuel: "#f97316",
  "Housing & Rent": "#d97745",
  Housing: "#d97745",
  Utilities: "#06b6d4",
  Healthcare: "#10b981",
  "Health & Wellness": "#10b981",
  Education: "#6366f1",
  Entertainment: "#ec4899",
  Travel: "#0ea5e9",
  Insurance: "#64748b",
  Investments: "#2563eb",
  "EMI & Loans": "#ef4444",
  Subscriptions: "#a855f7",
  "Personal Care": "#d946ef",
  Transfers: "#78716c",
  "Other Expenses": "#94a3b8",
  Other: "#94a3b8",
  Transport: "#38bdf8",
};

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}


export function formatCurrencyINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value)}`;
}

export function getIncomeAmount(transactions: Transaction[]): number {
  return transactions
    .filter((transaction) => transaction.type.toLowerCase() === "income" && transaction.category.toLowerCase() !== "transfers")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function getExpenseAmount(transactions: Transaction[]): number {
  return transactions
    .filter((transaction) => transaction.type.toLowerCase() === "expense" && transaction.category.toLowerCase() !== "transfers")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function getMonthlyTrend(transactions: Transaction[], range: DashboardRange = "6M"): MonthlyTrendPoint[] {
  const points: MonthlyTrendPoint[] = [];
  const now = new Date();
  const monthsToShow = range === "1M" ? 1 : range === "3M" ? 3 : 6;

  for (let index = monthsToShow - 1; index >= 0; index -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const monthName = monthDate.toLocaleString("en-IN", { month: "short" });
    const year = monthDate.getFullYear();

    const income = transactions
      .filter(
        (transaction) =>
          transaction.type.toLowerCase() === "income" &&
          transaction.category.toLowerCase() !== "transfers" &&
          new Date(transaction.date).getFullYear() === year &&
          new Date(transaction.date).getMonth() === monthDate.getMonth(),
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const expenses = transactions
      .filter(
        (transaction) =>
          transaction.type.toLowerCase() === "expense" &&
          transaction.category.toLowerCase() !== "transfers" &&
          new Date(transaction.date).getFullYear() === year &&
          new Date(transaction.date).getMonth() === monthDate.getMonth(),
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    points.push({
      month: monthName,
      income,
      expenses,
      savings: income - expenses,
    });
  }

  return points;
}

export function getCategoryBreakdown(transactions: Transaction[]): CategoryBreakdownPoint[] {
  const categoryMap = new Map<string, number>();

  transactions
    .filter((transaction) => transaction.type.toLowerCase() === "expense" && transaction.category.toLowerCase() !== "transfers")
    .forEach((transaction) => {
      categoryMap.set(transaction.category, (categoryMap.get(transaction.category) ?? 0) + transaction.amount);
    });

  const palette = ["#f97316", "#f59e0b", "#10b981", "#38bdf8", "#a78bfa", "#f472b6", "#2dd4bf", "#ef4444"];

  return [...categoryMap.entries()]
    .map(([name, value], index) => ({ name, value, color: palette[index % palette.length] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

export function getRecentTransactions(transactions: Transaction[], limit = 7): Transaction[] {
  return [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function getBudgetOverview(transactions: Transaction[], budgets: Budget[] = []): Budget[] {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return budgets.map((budget) => {
    const spent = transactions
      .filter((transaction) => {
        const date = new Date(transaction.date);
        return (
          transaction.type.toLowerCase() === "expense" &&
          transaction.category.toLowerCase() !== "transfers" &&
          matchesBudgetCategory(transaction.category, budget.category) &&
          date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear
        );
      })
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      ...budget,
      spent,
    };
  });
}

export function matchesBudgetCategory(transactionCategory: string, budgetCategory: string): boolean {
  const aliases: Record<string, string[]> = {
    "Food & Dining": ["Food & Dining", "Groceries"],
    Transport: ["Transport", "Transportation", "Fuel"],
    Housing: ["Housing", "Housing & Rent"],
    "Health & Wellness": ["Health & Wellness", "Healthcare", "Personal Care"],
  };
  return (aliases[budgetCategory] ?? [budgetCategory]).includes(transactionCategory);
}

export function getDailySpendTrend(transactions: Transaction[], days = 7): Array<{ day: string; amount: number }> {
  const data = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    return {
      day: date.toLocaleString("en-IN", { weekday: "short" }),
      amount: 0,
    };
  });

  transactions
    .filter((transaction) => transaction.type.toLowerCase() === "expense" && transaction.category.toLowerCase() !== "transfers")
    .forEach((transaction) => {
      const transactionDate = new Date(transaction.date);
      const diffDays = Math.floor((Date.now() - transactionDate.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays < days) {
        const index = days - diffDays - 1;
        if (index >= 0 && index < data.length) {
          data[index].amount += transaction.amount;
        }
      }
    });

  return data;
}

export function calculateHealthScore(income: number, expenses: number, budgets: Budget[]): number {
  return calculateHealthScoreBreakdown(income, expenses, budgets).score;
}

export interface FinancialHealthScoreBreakdown {
  score: number;
  savingsRate: number;
  savingsScore: number;
  budgetAdherence: number;
  spendingStability: number;
  hasBudgetData: boolean;
  hasStabilityData: boolean;
}

export function calculateHealthScoreBreakdown(
  income: number,
  expenses: number,
  budgets: Budget[],
  monthlyExpenses: number[] = [],
  plannedMonthlySavings = 0,
): FinancialHealthScoreBreakdown {
  const savingsRate = income > 0 ? ((income - expenses + plannedMonthlySavings) / income) * 100 : 0;
  const savingsScore = Math.min(100, Math.max(0, (savingsRate / 20) * 100));

  const budgetAdherence = budgets.length
    ? budgets.reduce((sum, budget) => {
      if (budget.limit <= 0) return sum + (budget.spent <= 0 ? 100 : 0);
      const overagePercent = Math.max(0, ((budget.spent - budget.limit) / budget.limit) * 100);
      return sum + Math.max(0, 100 - overagePercent);
    }, 0) / budgets.length
    : 50;

  const validMonthlyExpenses = monthlyExpenses.filter((amount) => Number.isFinite(amount) && amount >= 0);
  const spendingStability = validMonthlyExpenses.length > 1
    ? Math.max(0, 100 - validMonthlyExpenses.slice(1).reduce((sum, amount, index) => {
      const previous = validMonthlyExpenses[index];
      return sum + (previous > 0 ? Math.abs((amount - previous) / previous) * 100 : amount > 0 ? 100 : 0);
    }, 0) / (validMonthlyExpenses.length - 1))
    : 50;

  return {
    score: Math.round(savingsScore * 0.4 + budgetAdherence * 0.3 + spendingStability * 0.3),
    savingsRate: Math.round(savingsRate * 10) / 10,
    savingsScore: Math.round(savingsScore),
    budgetAdherence: Math.round(budgetAdherence),
    spendingStability: Math.round(spendingStability),
    hasBudgetData: budgets.length > 0,
    hasStabilityData: validMonthlyExpenses.length > 1,
  };
}

export function buildInsightCards(monthlyTrend: MonthlyTrendPoint[], categoryBreakdown: CategoryBreakdownPoint[]): Array<{ title: string; description: string; value: string }> {
  const currentMonth = monthlyTrend[monthlyTrend.length - 1];
  const previousMonth = monthlyTrend[monthlyTrend.length - 2] ?? currentMonth;
  const topCategory = categoryBreakdown[0];
  const change = currentMonth?.savings && previousMonth?.savings
    ? ((currentMonth.savings - previousMonth.savings) / Math.max(previousMonth.savings, 1)) * 100
    : 0;

  return [
    {
      title: "Savings momentum",
      description: "Compared with the prior month",
      value: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
    },
    {
      title: "Top category",
      description: "Largest spending bucket",
      value: topCategory ? topCategory.name : "N/A",
    },
    {
      title: "Current month",
      description: "Projected goal progress",
      value: currentMonth ? formatCompactCurrency(currentMonth.savings) : "₹0",
    },
  ];
}

export function buildCashFlow(transactions: Transaction[]): DashboardData["cashFlow"] {
  const inflow = getIncomeAmount(transactions);
  const outflow = getExpenseAmount(transactions);
  return {
    inflow,
    outflow,
    net: inflow - outflow,
  };
}

export function getCurrentMonthTransactions(transactions: Transaction[]): Transaction[] {
  const now = new Date();
  return transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
}

export function getRecurringPaymentsForMonth(transactions: Transaction[], payments: RecurringPayment[]): RecurringPayment[] {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return payments.filter((payment) => {
    const date = new Date(payment.nextDate);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).concat(
    transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return (
        transaction.type === "expense" &&
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear &&
        transaction.amount >= 500
      );
    }).slice(0, 2).map((transaction) => ({
      id: `matched-${transaction.id}`,
      merchant: transaction.merchant,
      category: transaction.category,
      amount: transaction.amount,
      frequency: "One-time",
      nextDate: new Date(transaction.date).toISOString(),
    })),
  );
}
