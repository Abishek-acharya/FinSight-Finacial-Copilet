import type { Account, Transaction } from "@/types/finance";
import { matchesBudgetCategory } from "@/utils/financeCalculations";

export interface TrialBalanceRow {
  account: string;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  debitTotal: number;
  creditTotal: number;
  balanced: boolean;
}

export interface SubscriptionCandidate {
  merchant: string;
  amount: number;
  monthlyAmount: number;
  occurrences: number;
  lastDate: string;
}

export interface Achievement {
  id: "super-saver" | "budget-master" | "debt-slayer";
  title: string;
  description: string;
  earned: boolean;
}

const cents = (amount: number) => Math.round(amount * 100) / 100;

export function buildTrialBalance(transactions: Transaction[], accounts: Account[]): TrialBalance {
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const balances = new Map<string, { debit: number; credit: number }>();
  const addEntry = (name: string, side: "debit" | "credit", amount: number) => {
    const balance = balances.get(name) ?? { debit: 0, credit: 0 };
    balance[side] = cents(balance[side] + amount);
    balances.set(name, balance);
  };

  for (const transaction of transactions) {
    const rawAmount = Number(transaction.amount);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) continue;
    const amount = cents(rawAmount);
    if (amount === 0) continue;
    const cashAccount = accountNames.get(transaction.accountId) || "Unassigned cash";
    const category = typeof transaction.category === "string" ? transaction.category.trim() || "Uncategorized" : "Uncategorized";
    if (category.toLocaleLowerCase() === "transfers") {
      if (transaction.type === "income") {
        addEntry(cashAccount, "debit", amount);
        addEntry("Transfer clearing", "credit", amount);
      } else {
        addEntry("Transfer clearing", "debit", amount);
        addEntry(cashAccount, "credit", amount);
      }
    } else if (transaction.type === "income") {
      addEntry(cashAccount, "debit", amount);
      addEntry(`${category} · income`, "credit", amount);
    } else {
      addEntry(`${category} · expense`, "debit", amount);
      addEntry(cashAccount, "credit", amount);
    }
  }

  const rows = [...balances.entries()]
    .map(([account, balance]) => ({
      account,
      debit: cents(Math.max(balance.debit - balance.credit, 0)),
      credit: cents(Math.max(balance.credit - balance.debit, 0)),
    }))
    .filter((row) => row.debit !== 0 || row.credit !== 0)
    .sort((left, right) => left.account.localeCompare(right.account));
  const debitTotal = cents(rows.reduce((sum, row) => sum + row.debit, 0));
  const creditTotal = cents(rows.reduce((sum, row) => sum + row.credit, 0));

  return {
    rows,
    debitTotal,
    creditTotal,
    balanced: Math.abs(debitTotal - creditTotal) < 0.01,
  };
}

function parseDate(value: string): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) return null;
  return timestamp;
}

function normalizedMerchant(merchant: string): string {
  return merchant.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function detectMonthlySubscriptions(transactions: Transaction[]): SubscriptionCandidate[] {
  const byMerchant = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense" || transaction.category?.toLocaleLowerCase() === "transfers") continue;
    if (typeof transaction.merchant !== "string") continue;
    const merchantKey = normalizedMerchant(transaction.merchant);
    if (!merchantKey) continue;
    byMerchant.set(merchantKey, [...(byMerchant.get(merchantKey) ?? []), transaction]);
  }

  const candidates: SubscriptionCandidate[] = [];
  for (const merchantTransactions of byMerchant.values()) {
    const occurrences = merchantTransactions
      .map((transaction) => ({ transaction, timestamp: parseDate(transaction.date) }))
      .filter((item): item is { transaction: Transaction; timestamp: number } => item.timestamp !== null)
      .sort((left, right) => left.timestamp - right.timestamp);
    let best: typeof occurrences = [];

    for (let start = 0; start < occurrences.length; start += 1) {
      const seedAmount = occurrences[start].transaction.amount;
      if (!Number.isFinite(seedAmount) || seedAmount <= 0) continue;
      const tolerance = Math.max(1, seedAmount * 0.01);
      const series: typeof occurrences = [];
      for (let index = start; index < occurrences.length; index += 1) {
        const current = occurrences[index];
        if (Math.abs(current.transaction.amount - seedAmount) > tolerance) continue;
        if (series.length > 0) {
          const days = (current.timestamp - series[series.length - 1].timestamp) / 86_400_000;
          if (days < 25 || days > 35) continue;
        }
        series.push(current);
      }
      if (series.length > best.length) best = series;
    }

    if (best.length < 3) continue;
    const sortedAmounts = best.map(({ transaction }) => transaction.amount).sort((a, b) => a - b);
    const middle = Math.floor(sortedAmounts.length / 2);
    const monthlyAmount = cents(sortedAmounts.length % 2
      ? sortedAmounts[middle]
      : (sortedAmounts[middle - 1] + sortedAmounts[middle]) / 2);
    candidates.push({
      merchant: best[best.length - 1].transaction.merchant.trim(),
      amount: monthlyAmount,
      monthlyAmount,
      occurrences: best.length,
      lastDate: best[best.length - 1].transaction.date,
    });
  }

  return candidates.sort((left, right) => right.monthlyAmount - left.monthlyAmount);
}

export function calculateEmi(principal: number, annualInterestPercent: number, years: number): number {
  if (
    ![principal, annualInterestPercent, years].every(Number.isFinite) ||
    principal <= 0 ||
    annualInterestPercent < 0 ||
    years <= 0
  ) return 0;
  const months = years * 12;
  const monthlyRate = annualInterestPercent / 1200;
  if (monthlyRate === 0) return principal / months;
  const growth = (1 + monthlyRate) ** months;
  return principal * monthlyRate * growth / (growth - 1);
}

export function getFinancialAchievements(
  transactions: Transaction[],
  budgetPlans: Array<{ month: string; categoryAllocations: Array<{ category: string; amount: number }> }>,
  now = new Date(),
): Achievement[] {
  const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, "0")}`;
  const currentMonth = monthKey(now.getFullYear(), now.getMonth());
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const olderMonthDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const previousMonth = monthKey(previousMonthDate.getFullYear(), previousMonthDate.getMonth());
  const olderMonth = monthKey(olderMonthDate.getFullYear(), olderMonthDate.getMonth());
  const spendingByMonth = new Map<string, number>();
  const expensesByMonth = new Map<string, Transaction[]>();
  let incomeThisMonth = 0;
  let expensesThisMonth = 0;

  for (const transaction of transactions) {
    const key = typeof transaction.date === "string" ? transaction.date.slice(0, 7) : "";
    const amount = Number(transaction.amount);
    if (!/^\d{4}-\d{2}$/.test(key) || !Number.isFinite(amount) || amount < 0) continue;
    if (transaction.type === "income" && key === currentMonth && transaction.category?.toLocaleLowerCase() !== "transfers") {
      incomeThisMonth += amount;
    }
    if (transaction.type !== "expense" || transaction.category?.toLocaleLowerCase() === "transfers") continue;
    spendingByMonth.set(key, (spendingByMonth.get(key) ?? 0) + amount);
    expensesByMonth.set(key, [...(expensesByMonth.get(key) ?? []), transaction]);
    if (key === currentMonth) expensesThisMonth += amount;
  }

  const plan = budgetPlans.find((item) => item.month === currentMonth);
  const hasBudgets = Boolean(plan?.categoryAllocations.length);
  const withinBudget = hasBudgets && plan!.categoryAllocations.every((allocation) => {
    const spent = (expensesByMonth.get(currentMonth) ?? [])
      .filter((transaction) => matchesBudgetCategory(transaction.category, allocation.category))
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return spent <= allocation.amount;
  });
  const priorSpending = spendingByMonth.get(previousMonth) ?? 0;
  const olderSpending = spendingByMonth.get(olderMonth) ?? 0;

  return [
    {
      id: "super-saver",
      title: "Super Saver",
      description: incomeThisMonth > 0
        ? `Save at least 20% of your income this month (${Math.max(0, (incomeThisMonth - expensesThisMonth) / incomeThisMonth * 100).toFixed(0)}% so far).`
        : "Record income and save at least 20% this month.",
      earned: incomeThisMonth > 0 && (incomeThisMonth - expensesThisMonth) / incomeThisMonth >= 0.2,
    },
    {
      id: "budget-master",
      title: "Budget Master",
      description: hasBudgets
        ? "Stay within every category budget this month."
        : "Set a monthly budget to unlock this achievement.",
      earned: Boolean(withinBudget),
    },
    {
      id: "debt-slayer",
      title: "Debt Slayer",
      description: priorSpending > 0 && olderSpending > 0
        ? "Spend less than the previous completed month."
        : "Add at least two completed months of expense history.",
      earned: priorSpending > 0 && olderSpending > 0 && priorSpending < olderSpending,
    },
  ];
}
