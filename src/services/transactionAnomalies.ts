import type { Transaction } from "@/types/finance";

export function detectUnusualTransactions(transactions: Transaction[]): Set<string> {
  const expenses = transactions
    .filter((transaction) => transaction.type === "expense" && transaction.category.toLowerCase() !== "transfers")
    .map((transaction) => transaction.amount)
    .sort((a, b) => a - b);
  if (expenses.length < 5) return new Set();

  const percentile = (values: number[], position: number) => {
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return values[lower];
    return values[lower] + (values[upper] - values[lower]) * (position - lower);
  };
  const q1 = percentile(expenses, (expenses.length - 1) * 0.25);
  const q3 = percentile(expenses, (expenses.length - 1) * 0.75);
  const upperBound = q3 + 1.5 * (q3 - q1);

  return new Set(
    transactions
      .filter((transaction) =>
        transaction.type === "expense" &&
        transaction.category.toLowerCase() !== "transfers" &&
        transaction.amount > upperBound,
      )
      .map((transaction) => transaction.id),
  );
}
