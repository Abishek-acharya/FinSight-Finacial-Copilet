export interface CategoryAllocation {
  category: string;
  amount: number;
}

export interface BudgetPlan {
  id: string;
  name: string;
  month: string;
  totalAmount: number;
  categoryAllocations: CategoryAllocation[];
  currency: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type GoalCategory =
  | "Emergency Fund"
  | "Education"
  | "Travel"
  | "Vehicle"
  | "Home Purchase"
  | "Debt Repayment"
  | "Gadget"
  | "Custom";
export type GoalPriority = "low" | "medium" | "high";
export type GoalStatus = "active" | "paused" | "completed";

export interface GoalContribution {
  id: string;
  date: string;
  amount: number;
  note?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;
  description?: string;
  contributions: GoalContribution[];
  createdAt: string;
  updatedAt: string;
}

export type AlertThreshold = 70 | 85 | 100;
export interface BudgetAlert {
  id: string;
  planId: string;
  planName: string;
  category: string | "ALL";
  threshold: AlertThreshold;
  utilization: number;
  spent: number;
  limit: number;
  message: string;
  severity: "info" | "warning" | "error";
}

export interface CategoryUtilization {
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  utilization: number;
  transactionCount: number;
  status: "normal" | "warning" | "over";
}

export interface BudgetUtilization {
  planId: string;
  planName: string;
  month: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  utilization: number;
  categories: CategoryUtilization[];
  overBudget: CategoryUtilization[];
  nearLimit: CategoryUtilization[];
}

export interface GoalProgress {
  goal: SavingsGoal;
  remaining: number;
  percent: number;
  monthsToGoal: number | null;
  requiredMonthly: number | null;
  projectedCompletionDate: string | null;
  shortfall: number | null;
  surplus: number | null;
  isOverdue: boolean;
  isCompleted: boolean;
}

export interface ScenarioInputs {
  monthlySavings: number;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
}
export interface ScenarioResult {
  monthsToGoal: number | null;
  projectedCompletionDate: string | null;
  requiredMonthly: number | null;
  shortfall: number | null;
  surplus: number | null;
  feasible: boolean;
}

export interface SavingsRecommendation {
  id: string;
  tone: "positive" | "info" | "warning";
  title: string;
  explanation: string;
  monthlyAmount: number | null;
  evidence: string;
  actionLabel?: string;
  actionHref?: string;
}
export interface SavingsOpportunity {
  id: string;
  title: string;
  evidence: string;
  monthlyAmount: number | null;
  action: string;
  category?: string;
}
export interface MonthlyHistoryRow {
  monthKey: string;
  monthLabel: string;
  planned: number;
  actual: number;
  remaining: number;
  overBudgetCategories: number;
  savingsAchieved: number;
}
