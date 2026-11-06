import type { GoalProgress, SavingsGoal, ScenarioInputs, ScenarioResult } from "@/types/budget";

const DAY_MS = 86_400_000;

export function goalProgress(goal: SavingsGoal, now = new Date()): GoalProgress {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const percent = goal.targetAmount > 0 ? Math.min(100, goal.currentAmount / goal.targetAmount * 100) : 0;
  const contributions = [...goal.contributions].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  let averageMonthly: number | null = null;
  if (contributions.length) {
    const first = Date.parse(contributions[0].date);
    const last = Date.parse(contributions[contributions.length - 1].date);
    const months = Math.max(1, (last - first) / DAY_MS / 30.4375);
    const total = contributions.reduce((sum, contribution) => sum + contribution.amount, 0);
    averageMonthly = total / months;
  }

  const isCompleted = goal.status === "completed" || remaining === 0;
  const monthsToGoal = isCompleted ? 0
    : averageMonthly && averageMonthly > 0 ? Math.ceil(remaining / averageMonthly) : null;
  const projected = monthsToGoal !== null ? new Date(now.getFullYear(), now.getMonth() + monthsToGoal, now.getDate()) : null;
  const requiredMonthly = goal.targetDate && remaining > 0
    ? remaining / Math.max(1, Math.ceil((Date.parse(goal.targetDate) - now.getTime()) / (DAY_MS * 30.4375)))
    : null;
  const shortfall = requiredMonthly !== null && averageMonthly !== null && averageMonthly < requiredMonthly
    ? requiredMonthly - averageMonthly
    : null;
  const surplus = requiredMonthly !== null && averageMonthly !== null && averageMonthly > requiredMonthly
    ? averageMonthly - requiredMonthly
    : null;
  return {
    goal,
    remaining,
    percent,
    monthsToGoal,
    requiredMonthly,
    projectedCompletionDate: projected?.toISOString() ?? null,
    shortfall,
    surplus,
    isOverdue: !!goal.targetDate && Date.parse(goal.targetDate) < now.getTime() && !isCompleted,
    isCompleted,
  };
}

export function calculateScenario(inputs: ScenarioInputs, now = new Date()): ScenarioResult {
  const remaining = Math.max(0, inputs.targetAmount - inputs.currentAmount);
  if (remaining === 0) {
    return { monthsToGoal: 0, projectedCompletionDate: now.toISOString(), requiredMonthly: 0, shortfall: 0, surplus: 0, feasible: true };
  }
  const monthsToGoal = inputs.monthlySavings > 0 ? Math.ceil(remaining / inputs.monthlySavings) : null;
  const projected = monthsToGoal !== null
    ? new Date(now.getFullYear(), now.getMonth() + monthsToGoal, now.getDate())
    : null;
  const monthsUntilTarget = inputs.targetDate
    ? Math.max(1, Math.ceil((Date.parse(inputs.targetDate) - now.getTime()) / (DAY_MS * 30.4375)))
    : null;
  const requiredMonthly = monthsUntilTarget === null ? null : remaining / monthsUntilTarget;
  const shortfall = requiredMonthly !== null && inputs.monthlySavings < requiredMonthly
    ? requiredMonthly - inputs.monthlySavings
    : null;
  const surplus = requiredMonthly !== null && inputs.monthlySavings > requiredMonthly
    ? inputs.monthlySavings - requiredMonthly
    : null;
  return {
    monthsToGoal,
    projectedCompletionDate: projected?.toISOString() ?? null,
    requiredMonthly,
    shortfall,
    surplus,
    feasible: inputs.monthlySavings > 0 && (monthsUntilTarget === null || monthsToGoal !== null && monthsToGoal <= monthsUntilTarget),
  };
}

export function formatProjection(months: number | null, date: string | null): string {
  if (months === null) return "—";
  if (months === 0) return "Reached";
  if (months > 120) return "Over 10 years at current rate";
  const label = date ? new Date(date).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "";
  return `${months} month${months === 1 ? "" : "s"}${label ? ` (${label})` : ""}`;
}
