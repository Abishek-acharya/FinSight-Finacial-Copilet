export interface ForecastScenario {
  expenseChangePercent: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  budget: number | null;
  foodExpenses?: number;
  foodReductionPercent?: number;
  plannedMonthlySavings?: number;
}

export function simulateForecastScenario(input: ForecastScenario) {
  const foodReductionPercent = input.foodReductionPercent ?? 0;
  const foodExpenses = Math.min(input.monthlyExpenses, Math.max(0, input.foodExpenses ?? 0));
  const foodSavings = foodExpenses * foodReductionPercent / 100;
  const expenses = Math.max(0, input.monthlyExpenses * (1 + input.expenseChangePercent / 100) - foodSavings);
  const net = input.monthlyIncome - expenses;
  const plannedMonthlySavings = Math.max(0, input.plannedMonthlySavings ?? 0);
  const cumulative = { value: 0 };
  const months = Array.from({ length: 6 }, (_, index) => {
    cumulative.value += net;
    return { month: index + 1, net, cumulative: cumulative.value };
  });
  return {
    monthlyExpenses: expenses,
    monthlyNet: net,
    annualNet: net * 12,
    foodSavings,
    plannedMonthlySavings,
    annualSavingsPotential: (foodSavings + plannedMonthlySavings) * 12,
    monthlyAvailableAfterSavings: net - plannedMonthlySavings,
    budgetUtilization: input.budget && input.budget > 0 ? expenses / input.budget * 100 : null,
    months,
  };
}
