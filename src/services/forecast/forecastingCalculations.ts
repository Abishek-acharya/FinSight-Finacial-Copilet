import type { ForecastMethod } from "@/types/forecast";

export function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
}

export function weightedMovingAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const denominator = values.length * (values.length + 1) / 2;
  return values.reduce((sum, value, index) => sum + value * (index + 1), 0) / denominator;
}

export function simpleMovingAverage(values: number[]): number {
  return mean(values);
}

export function exponentialSmoothing(values: number[], alpha = 0.35): number {
  if (values.length === 0) return 0;
  return values.slice(1).reduce((smoothed, value) => alpha * value + (1 - alpha) * smoothed, values[0]);
}

export function applyForecastMethod(values: number[], method: ForecastMethod): number {
  if (method === "sma") return simpleMovingAverage(values);
  if (method === "ema") return exponentialSmoothing(values);
  return weightedMovingAverage(values);
}

export function predictionRange(estimate: number, history: number[], scale = 1, nonNegative = true): {
  estimate: number;
  lower: number;
  upper: number;
  explanation: string;
} {
  const deviation = standardDeviation(history) * 1.5 * scale;
  const margin = Math.max(deviation, Math.abs(estimate) * 0.05);
  return {
    estimate,
    lower: nonNegative ? Math.max(0, estimate - margin) : estimate - margin,
    upper: nonNegative ? Math.max(0, estimate + margin) : estimate + margin,
    explanation: "Heuristic range based on historical variability (approximately ±1.5 standard deviations); not a statistical confidence interval.",
  };
}

export function monthsForForecastPeriod(period: "7d" | "30d" | "3m" | "6m"): number {
  if (period === "3m") return 3;
  if (period === "6m") return 6;
  return 1;
}

export function periodScale(period: "7d" | "30d" | "3m" | "6m"): number {
  if (period === "7d") return 7 / 30;
  if (period === "30d") return 1;
  return monthsForForecastPeriod(period);
}

export function evaluateMethod(values: number[], method: ForecastMethod): {
  mae: number;
  rmse: number;
  mape: number | null;
  samples: number;
} | null {
  if (values.length < 6) return null;
  const holdoutCount = Math.min(3, Math.floor(values.length / 3));
  const errors: number[] = [];
  const percentageErrors: number[] = [];
  for (let index = values.length - holdoutCount; index < values.length; index += 1) {
    const actual = values[index];
    const predicted = applyForecastMethod(values.slice(0, index), method);
    errors.push(actual - predicted);
    if (actual > 0) percentageErrors.push(Math.abs((actual - predicted) / actual));
  }
  return {
    mae: mean(errors.map(Math.abs)),
    rmse: Math.sqrt(mean(errors.map((error) => error ** 2))),
    mape: percentageErrors.length ? mean(percentageErrors) * 100 : null,
    samples: errors.length,
  };
}
