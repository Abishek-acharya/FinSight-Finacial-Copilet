import type { Transaction } from "@/types/finance";
import type { AlertThreshold, BudgetAlert, BudgetPlan } from "@/types/budget";
import { computeUtilization } from "./budgetCalculations";

export const ALERT_THRESHOLDS: AlertThreshold[] = [70, 85, 100];

export function evaluateBudgetAlerts(plan: BudgetPlan, transactions: Transaction[]): BudgetAlert[] {
  const utilization = computeUtilization(plan, transactions);
  const alerts: BudgetAlert[] = [];
  const currency = (amount: number) => amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  for (const category of utilization.categories) {
    for (const threshold of ALERT_THRESHOLDS) {
      if (category.utilization < threshold) continue;
      const severity = threshold >= 100 ? "error" : threshold >= 85 ? "warning" : "info";
      alerts.push({
        id: `alert-${plan.id}-${category.category}-${threshold}`,
        planId: plan.id,
        planName: plan.name,
        category: category.category,
        threshold,
        utilization: category.utilization,
        spent: category.spent,
        limit: category.allocated,
        message: threshold >= 100
          ? `${category.category} budget exceeded (₹${currency(category.spent)} of ₹${currency(category.allocated)}).`
          : `${category.category} budget ${threshold}% used (₹${currency(category.spent)} of ₹${currency(category.allocated)}).`,
        severity,
      });
    }
  }
  if (utilization.utilization >= 85) {
    alerts.push({
      id: `alert-${plan.id}-ALL-85`,
      planId: plan.id,
      planName: plan.name,
      category: "ALL",
      threshold: 85,
      utilization: utilization.utilization,
      spent: utilization.totalSpent,
      limit: utilization.totalBudget,
      message: utilization.utilization >= 100
        ? `Overall monthly budget exceeded (₹${currency(utilization.totalSpent)} of ₹${currency(utilization.totalBudget)}).`
        : `${utilization.utilization.toFixed(0)}% of overall monthly budget used. ₹${currency(utilization.remaining)} remaining.`,
      severity: utilization.utilization >= 100 ? "error" : "warning",
    });
  }
  return alerts;
}
