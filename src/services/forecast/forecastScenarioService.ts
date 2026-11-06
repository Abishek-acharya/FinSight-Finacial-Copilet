export interface ForecastScenario {
  expenseChangePercent: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  budget: number | null;
}

export function simulateForecastScenario(input: ForecastScenario) {
  const expenses = input.monthlyExpenses * (1 + input.expenseChangePercent / 100);
  const net = input.monthlyIncome - expenses;
  const cumulative = { value: 0 };
  const months = Array.from({ length: 6 }, (_, index) => {
    cumulative.value += net;
    return { month: index + 1, net, cumulative: cumulative.value };
  });
  return {
    monthlyExpenses: expenses,
    monthlyNet: net,
    annualNet: net * 12,
    budgetUtilization: input.budget && input.budget > 0 ? expenses / input.budget * 100 : null,
    months,
  };
}
