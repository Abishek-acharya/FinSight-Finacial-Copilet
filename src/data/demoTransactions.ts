import type { Transaction } from "@/types/finance";

function isoDate(monthOffset: number, day: number): string {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, day, 12, 0, 0, 0);
  return date.toISOString();
}

const monthOffsets = [-5, -4, -3, -2, -1, 0];

const months: Transaction[] = monthOffsets.flatMap((offset) => [
  { id: `salary-${offset}`, merchant: "Salary deposit", category: "Income", type: "income" as const, accountId: "hdfc-savings", date: isoDate(offset, 1), amount: 110000 },
  { id: `freelance-${offset}`, merchant: "Freelance work", category: "Income", type: "income" as const, accountId: "icici-current", date: isoDate(offset, 12), amount: 42000 },
  { id: `rent-${offset}`, merchant: "Home rent", category: "Housing", type: "expense" as const, accountId: "hdfc-savings", date: isoDate(offset, 5), amount: 29000 },
  { id: `groceries-1-${offset}`, merchant: "DMart", category: "Food & Dining", type: "expense" as const, accountId: "hdfc-savings", date: isoDate(offset, 8), amount: 6800 },
  { id: `groceries-2-${offset}`, merchant: "BigBasket", category: "Food & Dining", type: "expense" as const, accountId: "hdfc-savings", date: isoDate(offset, 13), amount: 9200 },
  { id: `dining-1-${offset}`, merchant: "Swiggy", category: "Food & Dining", type: "expense" as const, accountId: "sbi-credit", date: isoDate(offset, 10), amount: 2600 },
  { id: `dining-2-${offset}`, merchant: "Zomato", category: "Food & Dining", type: "expense" as const, accountId: "sbi-credit", date: isoDate(offset, 18), amount: 3200 },
  { id: `transport-1-${offset}`, merchant: "Uber", category: "Transport", type: "expense" as const, accountId: "icici-current", date: isoDate(offset, 9), amount: 1200 },
  { id: `transport-2-${offset}`, merchant: "Metro card", category: "Transport", type: "expense" as const, accountId: "icici-current", date: isoDate(offset, 21), amount: 1500 },
  { id: `utilities-${offset}`, merchant: "Airtel", category: "Utilities", type: "expense" as const, accountId: "hdfc-savings", date: isoDate(offset, 14), amount: 799 },
  { id: `shopping-1-${offset}`, merchant: "Amazon", category: "Shopping", type: "expense" as const, accountId: "sbi-credit", date: isoDate(offset, 16), amount: 12500 },
  { id: `shopping-2-${offset}`, merchant: "Myntra", category: "Shopping", type: "expense" as const, accountId: "sbi-credit", date: isoDate(offset, 23), amount: 8300 },
  { id: `entertainment-${offset}`, merchant: "Netflix", category: "Entertainment", type: "expense" as const, accountId: "hdfc-savings", date: isoDate(offset, 18), amount: 649 },
  { id: `health-${offset}`, merchant: "Apollo Pharmacy", category: "Health & Wellness", type: "expense" as const, accountId: "icici-current", date: isoDate(offset, 25), amount: 3200 },
  { id: `insurance-${offset}`, merchant: "Policy premium", category: "Insurance", type: "expense" as const, accountId: "hdfc-savings", date: isoDate(offset, 27), amount: 4800 },
]);

export const demoTransactions: Transaction[] = months;
