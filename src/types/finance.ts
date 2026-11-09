export type AccountType = "savings" | "current" | "credit";
export type TransactionType = "income" | "expense";
export type DashboardRange = "1M" | "3M" | "6M";
export const TRANSACTION_CATEGORIES = [
  "Salary",
  "Freelance",
  "Business Income",
  "Interest",
  "Cashback",
  "Refund",
  "Other Income",
  "Food & Dining",
  "Groceries",
  "Shopping",
  "Transportation",
  "Fuel",
  "Housing & Rent",
  "Utilities",
  "Healthcare",
  "Education",
  "Entertainment",
  "Travel",
  "Insurance",
  "Investments",
  "EMI & Loans",
  "Subscriptions",
  "Personal Care",
  "Transfers",
  "Other Expenses",
  "Housing",
  "Transport",
  "Health & Wellness",
  "Other",
] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];
export type CategorizationSource = "rule" | "user" | "import" | "manual";
export type TransactionReviewStatus = "pending" | "reviewed" | "flagged";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  last4: string;
  balance: number | null;
  balanceAsOf?: string;
  bank?: string;
}

export interface Transaction {
  id: string;
  merchant: string;
  description?: string;
  category: string;
  type: TransactionType;
  accountId: string;
  date: string;
  amount: number;
  note?: string;
  categorizationSource?: CategorizationSource;
  reviewStatus?: TransactionReviewStatus;
  confidence?: number;
  originalDescription?: string;
  originalCategory?: string;
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
  color: string;
  month?: string;
}

export interface RecurringPayment {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  frequency: string;
  nextDate: string;
}

export interface MonthlyTrendPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

export interface CategoryBreakdownPoint {
  name: string;
  value: number;
  color: string;
}

export interface DashboardData {
  accounts: Account[];
  totalBalance: number | null;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  healthScore: number;
  healthScoreDetails: {
    score: number;
    savingsRate: number;
    savingsScore: number;
    budgetAdherence: number;
    spendingStability: number;
    hasBudgetData: boolean;
    hasStabilityData: boolean;
  };
  monthlyTrend: MonthlyTrendPoint[];
  categoryBreakdown: CategoryBreakdownPoint[];
  recentTransactions: Transaction[];
  budgetOverview: Budget[];
  recurringPayments: RecurringPayment[];
  insightCards: Array<{
    title: string;
    description: string;
    value: string;
  }>;
  dailySpendTrend: Array<{ day: string; amount: number }>;
  cashFlow: {
    inflow: number;
    outflow: number;
    net: number;
  };
}
