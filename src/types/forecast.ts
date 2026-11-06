export type ForecastPeriod = "7d" | "30d" | "3m" | "6m";
export type HistoryPeriod = "3m" | "6m" | "12m";
export type ForecastMethod = "wma" | "sma" | "ema";
export type BudgetRiskLevel = "within" | "approaching" | "overspending" | "insufficient";

export interface ForecastFilters {
  period: ForecastPeriod;
  historyMonths: HistoryPeriod;
  accountId: "all" | string;
  method: ForecastMethod;
}

export interface PredictionRange {
  estimate: number;
  lower: number;
  upper: number;
  explanation: string;
}

export interface CategoryForecast {
  category: string;
  historicalAverage: number;
  forecast: number;
  available: boolean;
  reason?: string;
}

export interface ForecastMonth {
  key: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
  isForecast: boolean;
}

export interface ForecastRecurringItem {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  frequency: "weekly" | "monthly" | "quarterly" | "annually";
  nextExpectedDate: string;
  confidence: number;
  occurrences: number;
}

export interface ForecastEvaluation {
  method: ForecastMethod;
  mae: number;
  rmse: number;
  mape: number | null;
  samples: number;
}

export interface ForecastInsight {
  id: string;
  tone: "info" | "warning" | "positive";
  title: string;
  explanation: string;
}

export interface ForecastData {
  sufficient: boolean;
  reason?: string;
  method: ForecastMethod;
  historyMonthCount: number;
  dataMonthsUsed: number;
  period: ForecastPeriod;
  expenseForecast: PredictionRange | null;
  incomeForecast: PredictionRange | null;
  netForecast: PredictionRange | null;
  expenseMonthlyEstimate: number | null;
  incomeMonthlyEstimate: number | null;
  regularIncomeMonthly: number;
  irregularIncomeMonthly: number;
  otherIncomeMonthly: number;
  categories: CategoryForecast[];
  recurring: ForecastRecurringItem[];
  budgetRisk: {
    level: BudgetRiskLevel;
    budget: number | null;
    forecast: number | null;
    over: number;
    label: string;
    categories: Array<{
      category: string;
      allocated: number;
      forecast: number;
      utilization: number;
      risk: BudgetRiskLevel;
    }>;
  };
  evaluation: ForecastEvaluation[];
  insights: ForecastInsight[];
  history: ForecastMonth[];
  forecastSeries: ForecastMonth[];
  openingBalance: number | null;
  closingBalance: number | null;
}

export const DEFAULT_FORECAST_FILTERS: ForecastFilters = {
  period: "30d",
  historyMonths: "6m",
  accountId: "all",
  method: "wma",
};
