import type { Transaction } from "@/types/finance";

export type AnalyticsPeriod = "3m" | "6m" | "12m";
export type AnalyticsTab =
  | "spending"
  | "income"
  | "comparison"
  | "trends"
  | "recurring"
  | "cashflow"
  | "patterns";

export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  accountId: "all" | string;
  type: "all" | "income" | "expense";
  category: "all" | string;
  merchant: string;
}

export interface AnalyticsMonth {
  key: string;
  label: string;
  shortLabel: string;
  transactions: Transaction[];
  income: number;
  expenses: number;
  savings: number;
}

export interface AnalyticsCategory {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

export interface AnalyticsMetric {
  label: string;
  current: number;
  previous: number;
  change: number;
  percentChange: number | null;
  betterWhenHigher: boolean;
}

export interface RecurringCandidate {
  id: string;
  merchant: string;
  category: string;
  averageAmount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "annually";
  occurrences: number;
  lastDate: string;
  nextExpectedDate: string;
  confidence: number;
  status: "likely" | "possible";
}

export interface AnalyticsInsight {
  id: string;
  tone: "positive" | "warning" | "info";
  title: string;
  description: string;
}

export interface AnalyticsData {
  months: AnalyticsMonth[];
  categories: AnalyticsCategory[];
  incomeSources: AnalyticsCategory[];
  metrics: AnalyticsMetric[];
  recurring: RecurringCandidate[];
  insights: AnalyticsInsight[];
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  dailySpending: Array<{ date: string; amount: number; weekday: number }>;
  weekendShare: number;
  topMerchants: Array<{ merchant: string; amount: number; count: number }>;
  currentBalance: number | null;
}

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  period: "6m",
  accountId: "all",
  type: "all",
  category: "all",
  merchant: "",
};
